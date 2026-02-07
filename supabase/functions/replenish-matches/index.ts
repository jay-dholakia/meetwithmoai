import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface UserProfile {
  id: string;
  first_name: string;
  last_name: string | null;
  city: string;
  lat: number | null;
  lng: number | null;
  radius_km: number;
  in_matcha_bowl: boolean;
  age: number | null;
  gender: string | null;
  relationship_status: string | null;
  has_kids: string | null;
}

interface IntakeResponse {
  user_id: string;
  embed_vector?: number[];
  responses?: any[];
  life_stage?: string;
  drive_distance?: string;
  availability_times?: string[];
  age_range_preference?: string;
  political_classification?: string;
  political_alignment_important?: string;
  [key: string]: any;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client with service role key
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { user_id } = await req.json()

    // If user_id provided, replenish for specific user, otherwise replenish for all eligible users
    if (user_id) {
      await replenishUserMatches(supabaseClient, user_id)
    } else {
      await replenishAllUsers(supabaseClient)
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in replenish-matches:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

async function replenishAllUsers(supabaseClient: any) {
  // Get all eligible users (in bowl, active chats < 3)
  const { data: eligibleUsers, error: usersError } = await supabaseClient
    .from('profiles')
    .select('id')
    .eq('in_matcha_bowl', true)
    .eq('is_active', true)

  if (usersError) throw usersError

  for (const user of eligibleUsers) {
    const activeChats = await countActiveChats(supabaseClient, user.id)
    if (activeChats < 3) {
      await replenishUserMatches(supabaseClient, user.id)
    }
  }
}

async function replenishUserMatches(supabaseClient: any, userId: string) {
  // Count current active matches for user
  const { data: currentMatches, error: matchError } = await supabaseClient
    .from('matcha_match_candidates')
    .select('id')
    .or(`user_a.eq.${userId},user_b.eq.${userId}`)
    .eq('status', 'active')
    .gt('expires_at', new Date().toISOString())

  if (matchError) throw matchError

  const currentCount = currentMatches?.length || 0
  const needed = Math.max(0, 5 - currentCount)

  // Skip the needed check - create all matches for testing
  // if (needed === 0) return

  // Get user profile and intake data
  const { data: userProfile, error: profileError } = await supabaseClient
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (profileError) throw profileError

  // Try v4 first, fall back to v3 for backward compatibility
  let { data: userIntake, error: intakeError } = await supabaseClient
    .from('intake_responses_v4')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (intakeError && intakeError.code === 'PGRST116') {
    // No v4 record, try v3
    const { data: v3Intake, error: v3Error } = await supabaseClient
      .from('intake_responses_v3')
      .select('*')
      .eq('user_id', userId)
      .single()
    userIntake = v3Intake
    intakeError = v3Error
  }

  if (intakeError) throw intakeError
  if (!userIntake) throw new Error('No intake data found')

  // Find potential matches - use a high limit to see all matches (for testing)
  const potentialMatches = await findPotentialMatches(
    supabaseClient, 
    userProfile, 
    userIntake, 
    100 // High limit to see all potential matches
  )

  console.log(`Found ${potentialMatches.length} potential matches for user ${userId.substring(0, 8)}`)

  // Create match candidates
  // Only create matches above 0.3 threshold (mutual compatibility requirement)
  const MATCH_SCORE_THRESHOLD = 0.3
  let createdCount = 0
  for (const match of potentialMatches) {
    // Only create matches above threshold
    if (match.score >= MATCH_SCORE_THRESHOLD) {
      try {
        await createMatchCandidate(supabaseClient, userId, match.id, match.score, match.reasons)
        createdCount++
        console.log(`Created match ${createdCount}/${potentialMatches.length}: score ${match.score.toFixed(3)}`)
      } catch (error) {
        console.error(`Failed to create match:`, error)
      }
    } else {
      console.log(`Skipping match with score ${match.score.toFixed(3)} (below threshold ${MATCH_SCORE_THRESHOLD})`)
    }
  }
  console.log(`Created ${createdCount} matches above threshold for user ${userId.substring(0, 8)}`)
}

async function findPotentialMatches(
  supabaseClient: any, 
  userProfile: UserProfile, 
  userIntake: any, 
  limit: number
) {
  // Get all potential matches
  const { data: potentialUsers, error: usersError } = await supabaseClient
    .from('profiles')
    .select('*')
    .eq('in_matcha_bowl', true)
    .eq('is_active', true)
    .neq('id', userProfile.id)

  if (usersError) throw usersError

  console.log(`Found ${potentialUsers?.length || 0} potential users to match against`)

  const scoredMatches = []

  // Fetch intake data separately for each candidate
  for (const candidate of potentialUsers || []) {
    // Get candidate's intake data
    const { data: candidateIntakeData, error: intakeError } = await supabaseClient
      .from('intake_responses_v4')
      .select('*')
      .eq('user_id', candidate.id)
      .single()

    if (intakeError || !candidateIntakeData) {
      console.log(`Skipping ${candidate.id.substring(0, 8)} - no intake data: ${intakeError?.message || 'not found'}`)
      continue
    }

    const candidateIntake = candidateIntakeData

    // Apply structured filters from v4 columns - DISABLED FOR TESTING
    // if (!passesStructuredFilters(userIntake, candidateIntake, userProfile, candidate)) {
    //   continue
    // }

    // Check if users are blocked
    const { data: blocked } = await supabaseClient
      .from('blocks')
      .select('id')
      .or(`blocker_id.eq.${userProfile.id},blocker_id.eq.${candidate.id}`)
      .or(`blocked_id.eq.${userProfile.id},blocked_id.eq.${candidate.id}`)
      .limit(1)

    if (blocked?.length > 0) continue

    // Check cooldown - skip for now to see all matches
    // const inCooldown = await checkCooldown(supabaseClient, userProfile.id, candidate.id)
    // if (inCooldown) continue

    // Check if already matched - skip for now to see all matches
    // const { data: existingMatch } = await supabaseClient
    //   .from('matcha_match_candidates')
    //   .select('id')
    //   .or(
    //     `and(user_a.eq.${Math.min(userProfile.id, candidate.id)},user_b.eq.${Math.max(userProfile.id, candidate.id)})`
    //   )
    //   .limit(1)

    // if (existingMatch?.length > 0) continue

    // Calculate compatibility score using embeddings + structured data
    const score = await calculateCompatibilityScoreV4(
      userProfile, 
      userIntake, 
      candidate, 
      candidateIntake
    )

    console.log(`Score for ${candidate.id.substring(0, 8)}: ${score.toFixed(3)}`)

    // Generate match reasons with both users' info (bidirectional)
    const reasons = await generateMatchReasonsV4(userIntake, candidateIntake, userProfile.id, candidate.id)
    reasons.matchScore = score // Set the actual calculated score

    // Create matches for everyone - no score threshold
    scoredMatches.push({
      id: candidate.id,
      score,
      reasons
    })
  }

  // Sort by score and return top matches
  return scoredMatches
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

function calculateCompatibilityScore(
  userProfile: UserProfile,
  userIntake: IntakeResponse,
  candidateProfile: UserProfile,
  candidateIntake: IntakeResponse
): number {
  let score = 0

  // Distance penalty (closer is better)
  if (userProfile.lat && userProfile.lng && candidateProfile.lat && candidateProfile.lng) {
    const distance = calculateDistance(
      userProfile.lat, userProfile.lng,
      candidateProfile.lat, candidateProfile.lng
    )
    const maxDistance = Math.max(userProfile.radius_km, candidateProfile.radius_km)
    if (distance > maxDistance) return 0 // Outside acceptable range
    
    score += Math.max(0, 1 - (distance / maxDistance)) * 0.2 // 20% weight
  }

  // Age compatibility (within reasonable range)
  if (userProfile.age && candidateProfile.age) {
    const ageDiff = Math.abs(userProfile.age - candidateProfile.age)
    score += Math.max(0, 1 - (ageDiff / 15)) * 0.1 // 10% weight
  }

  // Shared interests and activities
  const sharedActivities = calculateSharedInterests(userIntake, candidateIntake)
  score += sharedActivities * 0.3 // 30% weight

  // Complementary traits
  const complementarity = calculateComplementarity(userIntake, candidateIntake)
  score += complementarity * 0.2 // 20% weight

  // Social compatibility
  const socialFit = calculateSocialFit(userIntake, candidateIntake)
  score += socialFit * 0.2 // 20% weight

  return Math.min(1, score)
}

function calculateSharedInterests(userIntake: IntakeResponse, candidateIntake: IntakeResponse): number {
  const userActivities = new Set([
    ...(userIntake.sports_fitness || []),
    ...(userIntake.cultural_activities || []),
    ...(userIntake.fun_activities || [])
  ])
  
  const candidateActivities = new Set([
    ...(candidateIntake.sports_fitness || []),
    ...(candidateIntake.cultural_activities || []),
    ...(candidateIntake.fun_activities || [])
  ])

  const intersection = new Set([...userActivities].filter(x => candidateActivities.has(x)))
  const union = new Set([...userActivities, ...candidateActivities])

  return union.size > 0 ? intersection.size / union.size : 0
}

function calculateComplementarity(userIntake: IntakeResponse, candidateIntake: IntakeResponse): number {
  let complementarity = 0
  let factors = 0

  // Introvert/Extrovert balance
  if (userIntake.personality_type && candidateIntake.personality_type) {
    const userExtroversion = userIntake.personality_type.includes('extrovert') ? 1 : 0
    const candidateExtroversion = candidateIntake.personality_type.includes('extrovert') ? 1 : 0
    complementarity += Math.abs(userExtroversion - candidateExtroversion) * 0.5
    factors++
  }

  // Activity level balance
  if (userIntake.social_activity_level && candidateIntake.social_activity_level) {
    const levels = ['I prefer less frequent, lower-key meetups', 'A few quality hangouts each week is ideal', 'I love being busy with friends often']
    const userLevel = levels.indexOf(userIntake.social_activity_level)
    const candidateLevel = levels.indexOf(candidateIntake.social_activity_level)
    if (userLevel >= 0 && candidateLevel >= 0) {
      complementarity += 1 - (Math.abs(userLevel - candidateLevel) / 2)
      factors++
    }
  }

  return factors > 0 ? complementarity / factors : 0
}

function calculateSocialFit(userIntake: IntakeResponse, candidateIntake: IntakeResponse): number {
  let fit = 0
  let factors = 0

  // Hangout frequency compatibility
  if (userIntake.hangout_frequency && candidateIntake.hangout_frequency) {
    const frequencies = ['Once in a while', 'Weekly', 'A few times a week', 'Daily']
    const userFreq = frequencies.indexOf(userIntake.hangout_frequency)
    const candidateFreq = frequencies.indexOf(candidateIntake.hangout_frequency)
    if (userFreq >= 0 && candidateFreq >= 0) {
      fit += 1 - (Math.abs(userFreq - candidateFreq) / 3)
      factors++
    }
  }

  // Social setting preference
  if (userIntake.social_setting && candidateIntake.social_setting) {
    fit += userIntake.social_setting === candidateIntake.social_setting ? 1 : 0.5
    factors++
  }

  return factors > 0 ? fit / factors : 0
}

function generateMatchReasons(userIntake: IntakeResponse, candidateIntake: IntakeResponse) {
  const shared_interests = []
  const conversation_hooks = []

  // Find shared activities
  const userActivities = [
    ...(userIntake.sports_fitness || []),
    ...(userIntake.cultural_activities || []),
    ...(userIntake.fun_activities || [])
  ]
  
  const candidateActivities = [
    ...(candidateIntake.sports_fitness || []),
    ...(candidateIntake.cultural_activities || []),
    ...(candidateIntake.fun_activities || [])
  ]

  for (const activity of userActivities) {
    if (candidateActivities.includes(activity)) {
      shared_interests.push(activity)
    }
  }

  // Generate conversation hooks
  if (userIntake.coffee_or_tea && candidateIntake.coffee_or_tea) {
    if (userIntake.coffee_or_tea === candidateIntake.coffee_or_tea) {
      conversation_hooks.push(`${userIntake.coffee_or_tea} lovers`)
    }
  }

  if (userIntake.favorite_cuisines && candidateIntake.favorite_cuisines) {
    const sharedCuisines = userIntake.favorite_cuisines.filter(c => 
      candidateIntake.favorite_cuisines.includes(c)
    )
    if (sharedCuisines.length > 0) {
      conversation_hooks.push(`${sharedCuisines[0]} food fans`)
    }
  }

  return {
    shared_interests: shared_interests.slice(0, 3),
    conversation_hooks: conversation_hooks.slice(0, 3),
    complementary_traits: []
  }
}

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371 // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}

async function checkCooldown(supabaseClient: any, userId1: string, userId2: string): Promise<boolean> {
  const { data } = await supabaseClient
    .rpc('users_in_cooldown', { 
      user_a_uuid: userId1, 
      user_b_uuid: userId2 
    })
  
  return data || false
}

async function countActiveChats(supabaseClient: any, userId: string): Promise<number> {
  const { data } = await supabaseClient
    .rpc('count_active_matcha_chats', { user_uuid: userId })
  
  return data || 0
}

async function createMatchCandidate(
  supabaseClient: any, 
  userA: string, 
  userB: string, 
  score: number, 
  reasons: any
) {
  // Ensure consistent ordering (user_a < user_b per constraint)
  const orderedUserA = userA < userB ? userA : userB
  const orderedUserB = userA < userB ? userB : userA

  // Use upsert to avoid duplicate key errors
  // Try insert first, then update if conflict
  const { data: insertData, error: insertError } = await supabaseClient
    .from('matcha_match_candidates')
    .insert({
      user_a: orderedUserA,
      user_b: orderedUserB,
      score,
      reasons,
      status: 'active',
      expires_at: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString() // 72 hours
    })
    .select()

  if (insertError) {
    // If duplicate, try update instead
    if (insertError.code === '23505') { // Unique violation
      console.log(`Match exists, updating: ${orderedUserA.substring(0, 8)}-${orderedUserB.substring(0, 8)} with score ${score}`)
      const { data: updateData, error: updateError } = await supabaseClient
        .from('matcha_match_candidates')
        .update({
          score: score || 0, // Ensure score is never null
          reasons: reasons || {},
          status: 'active',
          expires_at: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString()
        })
        .eq('user_a', orderedUserA)
        .eq('user_b', orderedUserB)
        .select()

      if (updateError) {
        console.error(`Error updating match ${orderedUserA.substring(0, 8)}-${orderedUserB.substring(0, 8)}:`, updateError)
        throw updateError
      }
      return updateData
    } else {
      console.error(`Error creating match ${orderedUserA.substring(0, 8)}-${orderedUserB.substring(0, 8)}:`, insertError)
      throw insertError
    }
  }
  
  return insertData
}

// Apply structured filters from v4 columns
function passesStructuredFilters(
  userIntake: any,
  candidateIntake: any,
  userProfile: UserProfile,
  candidateProfile: UserProfile
): boolean {
  // Filter 1: Drive distance (meeting in the middle = sum of both max distances)
  if (userIntake.drive_distance && candidateIntake.drive_distance && candidateProfile.lat && candidateProfile.lng && userProfile.lat && userProfile.lng) {
    const distance = calculateDistance(userProfile.lat, userProfile.lng, candidateProfile.lat, candidateProfile.lng)
    const userMaxDistance = parseDriveDistance(userIntake.drive_distance)
    const candidateMaxDistance = parseDriveDistance(candidateIntake.drive_distance)
    const totalMaxDistance = userMaxDistance + candidateMaxDistance // They can meet in the middle
    if (distance > totalMaxDistance) return false
  }

  // Filter 2: Age range preference
  if (userIntake.age_range_preference && userProfile.age && candidateProfile.age) {
    const ageDiff = Math.abs(userProfile.age - candidateProfile.age)
    if (userIntake.age_range_preference === 'Similar age (within 3 years)' && ageDiff > 3) return false
    if (userIntake.age_range_preference === 'Slightly younger or older (within 5 years)' && ageDiff > 5) return false
    // "Wide range" allows any age
  }

  // Filter 3: Availability overlap - REMOVED as hard filter (now soft signal in scoring)
  // Availability is now optional - people can be flexible with their schedules

  // Filter 4: Political alignment (if important) - check both users
  const userPoliticsImportant = userIntake.political_alignment_important === 'Very important'
  const candidatePoliticsImportant = candidateIntake.political_alignment_important === 'Very important'
  
  if (userPoliticsImportant || candidatePoliticsImportant) {
    if (userIntake.political_classification && candidateIntake.political_classification) {
      // Only match if classifications align (or both "don't follow politics")
      if (userIntake.political_classification !== candidateIntake.political_classification) {
        // Allow if both don't follow politics
        if (!(userIntake.political_classification === "I don't really follow politics" && 
              candidateIntake.political_classification === "I don't really follow politics")) {
          return false
        }
      }
    }
  }

  return true
}

function parseDriveDistance(distance: string): number {
  const distanceMap: Record<string, number> = {
    '5 miles': 8, // ~8 km
    '10 miles': 16, // ~16 km
    '25 miles': 40, // ~40 km
    '50 miles': 80, // ~80 km
    "I don't have a car": 5 // Very limited range
  }
  return distanceMap[distance] || 16 // Default to 10 miles
}

// Extract keywords from open-ended responses
function extractKeywords(responses: any[]): Set<string> {
  const keywords = new Set<string>()
  const commonInterests = [
    'music', 'food', 'travel', 'reading', 'hiking', 'yoga', 'coffee', 'art', 'photography', 'cooking',
    'fitness', 'running', 'cycling', 'swimming', 'dancing', 'writing', 'gaming', 'movies', 'tv shows',
    'podcasts', 'concerts', 'festivals', 'museums', 'theater', 'comedy', 'sports', 'basketball', 'soccer',
    'tennis', 'volleyball', 'rock climbing', 'surfing', 'skiing', 'camping', 'backpacking', 'gardening',
    'volunteering', 'meditation', 'mindfulness', 'wine', 'beer', 'cocktails', 'brunch', 'dining out',
    'board games', 'puzzles', 'chess', 'books', 'novels', 'non-fiction', 'poetry', 'philosophy',
    'technology', 'coding', 'programming', 'startups', 'entrepreneurship', 'design', 'fashion', 'style'
  ]

  if (!responses) return keywords

  const allText = responses
    .filter((r: any) => r.type === 'open_ended')
    .map((r: any) => (r.answer || '').toLowerCase())
    .join(' ')

  // Extract common interest keywords
  for (const interest of commonInterests) {
    if (allText.includes(interest)) {
      keywords.add(interest)
    }
  }

  return keywords
}

// Calculate keyword overlap score
function calculateKeywordOverlap(userIntake: any, candidateIntake: any): number {
  if (!userIntake.responses || !candidateIntake.responses) return 0

  const userKeywords = extractKeywords(userIntake.responses)
  const candidateKeywords = extractKeywords(candidateIntake.responses)

  if (userKeywords.size === 0 && candidateKeywords.size === 0) return 0

  const intersection = new Set([...userKeywords].filter(x => candidateKeywords.has(x)))
  const union = new Set([...userKeywords, ...candidateKeywords])

  return union.size > 0 ? intersection.size / union.size : 0
}

// Calculate compatibility using embeddings + structured data
async function calculateCompatibilityScoreV4(
  userProfile: UserProfile,
  userIntake: any,
  candidateProfile: UserProfile,
  candidateIntake: any
): Promise<number> {
  let score = 0

  // 1. Embedding similarity (26% weight) - semantic similarity of open-ended responses
  if (userIntake.embed_vector && candidateIntake.embed_vector) {
    const embeddingSimilarity = cosineSimilarity(
      userIntake.embed_vector,
      candidateIntake.embed_vector
    )
    score += embeddingSimilarity * 0.26
  }

  // 2. Life stage compatibility (13% weight)
  if (userIntake.life_stage && candidateIntake.life_stage) {
    if (userIntake.life_stage === candidateIntake.life_stage) {
      score += 0.13
    } else {
      // Some life stages are compatible
      const compatibleStages: Record<string, string[]> = {
        'Student': ['Early career (just starting out)', 'Transitioning / Figuring it out'],
        'Early career (just starting out)': ['Student', 'Career-focused (building my career)'],
        'Career-focused (building my career)': ['Early career (just starting out)', 'Family-focused (kids/family are my priority)'],
        'Family-focused (kids/family are my priority)': ['Career-focused (building my career)', 'Retired'],
        'Retired': ['Family-focused (kids/family are my priority)'],
        'Transitioning / Figuring it out': ['Student', 'Early career (just starting out)']
      }
      if (compatibleStages[userIntake.life_stage]?.includes(candidateIntake.life_stage)) {
        score += 0.065 // Half weight for compatible stages
      }
    }
  }

  // 3. Distance (13% weight) - closer is better
  if (userProfile.lat && userProfile.lng && candidateProfile.lat && candidateProfile.lng) {
    const distance = calculateDistance(
      userProfile.lat, userProfile.lng,
      candidateProfile.lat, candidateProfile.lng
    )
    // Meeting in the middle: both can travel their max distance, so total = sum
    const userMaxDistance = parseDriveDistance(userIntake?.drive_distance || '25 miles')
    const candidateMaxDistance = parseDriveDistance(candidateIntake?.drive_distance || '25 miles')
    const totalMaxDistance = userMaxDistance + candidateMaxDistance
    if (distance <= totalMaxDistance) {
      score += (1 - (distance / totalMaxDistance)) * 0.13
    }
  }

  // 4. Age compatibility (8% weight)
  if (userProfile.age && candidateProfile.age) {
    const ageDiff = Math.abs(userProfile.age - candidateProfile.age)
    score += Math.max(0, 1 - (ageDiff / 15)) * 0.08
  }

  // 5. Politics compatibility (8% weight) - only if not filtered out
  if (userIntake.political_classification && candidateIntake.political_classification) {
    // If both say "I don't really follow politics", give neutral score (0.5)
    if (userIntake.political_classification === "I don't really follow politics" &&
        candidateIntake.political_classification === "I don't really follow politics") {
      score += 0.04 // Half weight for neutral
    } else if (userIntake.political_classification === candidateIntake.political_classification) {
      score += 0.08 // Full weight for alignment
    } else {
      // Different classifications - no score (but not filtered out if not "Very important")
      score += 0
    }
  }

  // 6. Availability overlap (4% weight) - soft signal
  if (userIntake.availability_times && candidateIntake.availability_times) {
    const userTimes = Array.isArray(userIntake.availability_times) ? userIntake.availability_times : []
    const candidateTimes = Array.isArray(candidateIntake.availability_times) ? candidateIntake.availability_times : []
    const overlap = userTimes.filter((time: string) => candidateTimes.includes(time)).length
    const total = new Set([...userTimes, ...candidateTimes]).size
    if (total > 0) {
      score += (overlap / total) * 0.04
    }
  }

  // 7. Keyword overlap (8% weight) - concrete hobby/interest matching
  const keywordOverlap = calculateKeywordOverlap(userIntake, candidateIntake)
  score += keywordOverlap * 0.08

  // 8. Has kids compatibility (8% weight) - parents often connect better with other parents
  if (userProfile.has_kids && candidateProfile.has_kids) {
    const userHasKids = userProfile.has_kids.toLowerCase() === 'yes'
    const candidateHasKids = candidateProfile.has_kids.toLowerCase() === 'yes'
    if (userHasKids === candidateHasKids) {
      score += 0.08 // Both have kids or both don't - boost connection
    }
  }

  // 9. Relationship status compatibility (5% weight) - similar relationship stages might connect better
  if (userProfile.relationship_status && candidateProfile.relationship_status) {
    const userStatus = userProfile.relationship_status.toLowerCase()
    const candidateStatus = candidateProfile.relationship_status.toLowerCase()
    
    // Same status = full boost
    if (userStatus === candidateStatus) {
      score += 0.05
    } else {
      // Compatible statuses (both single, both in relationships, etc.)
      const singleStatuses = ['single']
      const relationshipStatuses = ['married', 'in a relationship', 'engaged']
      
      const userIsSingle = singleStatuses.includes(userStatus)
      const candidateIsSingle = singleStatuses.includes(candidateStatus)
      const userInRelationship = relationshipStatuses.some(s => userStatus.includes(s))
      const candidateInRelationship = relationshipStatuses.some(s => candidateStatus.includes(s))
      
      if ((userIsSingle && candidateIsSingle) || (userInRelationship && candidateInRelationship)) {
        score += 0.025 // Half boost for compatible stages
      }
    }
  }

  // 10. Gender compatibility (5% weight) - boost for same gender (friendship preference)
  if (userProfile.gender && candidateProfile.gender) {
    if (userProfile.gender.toLowerCase() === candidateProfile.gender.toLowerCase()) {
      score += 0.05
    }
  }

  return Math.min(1, score)
}

function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) return 0
  
  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i]
    normA += vecA[i] * vecA[i]
    normB += vecB[i] * vecB[i]
  }

  if (normA === 0 || normB === 0) return 0
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

// Generate match reasons from v4 responses (bidirectional - includes both users' info)
async function generateMatchReasonsV4(userIntake: any, candidateIntake: any, userId: string, candidateId: string) {
  const shared_interests: string[] = []
  const conversation_hooks: string[] = []
  const user_a_hobbies: string[] = []
  const user_a_talk_topics: string[] = []
  const user_a_interests: string[] = []
  const user_b_hobbies: string[] = []
  const user_b_talk_topics: string[] = []
  const user_b_interests: string[] = []

  // Determine which user is user_a (alphabetically first ID)
  const userAId = userId < candidateId ? userId : candidateId
  const userBId = userId < candidateId ? candidateId : userId
  const userAIntake = userId < candidateId ? userIntake : candidateIntake
  const userBIntake = userId < candidateId ? candidateIntake : userIntake

  // Extract user A's information
  if (userAIntake.responses && Array.isArray(userAIntake.responses)) {
    // Extract hobbies (q10_activities_enjoy)
    const hobbiesResponse = userAIntake.responses.find((r: any) => r.question_id === 'q10_activities_enjoy')
    if (hobbiesResponse?.answer) {
      const hobbyKeywords = extractKeywords([hobbiesResponse])
      user_a_hobbies.push(...Array.from(hobbyKeywords).slice(0, 5))
    }

    // Extract what they like talking about (q11_talk_about_hours)
    const talkResponse = userAIntake.responses.find((r: any) => r.question_id === 'q11_talk_about_hours')
    if (talkResponse?.answer) {
      const talkKeywords = extractKeywords([talkResponse])
      user_a_talk_topics.push(...Array.from(talkKeywords).slice(0, 4))
    }

    // Extract food/music/books/shows (q13_food_music_books)
    const interestsResponse = userAIntake.responses.find((r: any) => r.question_id === 'q13_food_music_books')
    if (interestsResponse?.answer) {
      const interestKeywords = extractKeywords([interestsResponse])
      user_a_interests.push(...Array.from(interestKeywords).slice(0, 4))
    }
  }

  // Extract user B's information
  if (userBIntake.responses && Array.isArray(userBIntake.responses)) {
    // Extract hobbies (q10_activities_enjoy)
    const hobbiesResponse = userBIntake.responses.find((r: any) => r.question_id === 'q10_activities_enjoy')
    if (hobbiesResponse?.answer) {
      const hobbyKeywords = extractKeywords([hobbiesResponse])
      user_b_hobbies.push(...Array.from(hobbyKeywords).slice(0, 5))
    }

    // Extract what they like talking about (q11_talk_about_hours)
    const talkResponse = userBIntake.responses.find((r: any) => r.question_id === 'q11_talk_about_hours')
    if (talkResponse?.answer) {
      const talkKeywords = extractKeywords([talkResponse])
      user_b_talk_topics.push(...Array.from(talkKeywords).slice(0, 4))
    }

    // Extract food/music/books/shows (q13_food_music_books)
    const interestsResponse = userBIntake.responses.find((r: any) => r.question_id === 'q13_food_music_books')
    if (interestsResponse?.answer) {
      const interestKeywords = extractKeywords([interestsResponse])
      user_b_interests.push(...Array.from(interestKeywords).slice(0, 4))
    }
  }

  // Extract shared interests from open-ended responses (keyword-based for chips)
  if (userIntake.responses && candidateIntake.responses) {
    // Extract keywords using the same function as scoring
    const userKeywords = extractKeywords(userIntake.responses)
    const candidateKeywords = extractKeywords(candidateIntake.responses)
    const sharedKeywords = [...userKeywords].filter(k => candidateKeywords.has(k))
    shared_interests.push(...sharedKeywords.slice(0, 5)) // Top 5 shared keywords
  }

  // Generate comprehensive conversation hooks using OpenAI
  // This analyzes all open-ended responses to find deeper commonalities
  try {
    const openEndedQuestionIds = [
      'q1_passionate_about',
      'q2_friends_describe',
      'q3_recharge_method',
      'q4_time_energy',
      'q7_day_to_day',
      'q8_work_relationship',
      'q9_weekends',
      'q10_activities_enjoy',
      'q11_talk_about_hours',
      'q12_new_to_try',
      'q13_food_music_books',
      'q20_issues_causes',
      'q24_friendship_matters_most',
      'q25_kinds_of_friends',
      'q26_matcha_hopes'
    ]

    // Collect all open-ended responses from both users
    const userResponses: Record<string, string> = {}
    const candidateResponses: Record<string, string> = {}

    if (userIntake.responses && Array.isArray(userIntake.responses)) {
      openEndedQuestionIds.forEach(qId => {
        const response = userIntake.responses.find((r: any) => r.question_id === qId)
        if (response?.answer && response.answer.trim().length > 0) {
          userResponses[qId] = response.answer.trim()
        }
      })
    }

    if (candidateIntake.responses && Array.isArray(candidateIntake.responses)) {
      openEndedQuestionIds.forEach(qId => {
        const response = candidateIntake.responses.find((r: any) => r.question_id === qId)
        if (response?.answer && response.answer.trim().length > 0) {
          candidateResponses[qId] = response.answer.trim()
        }
      })
    }

    // Only call OpenAI if we have substantial responses from both users
    if (Object.keys(userResponses).length >= 3 && Object.keys(candidateResponses).length >= 3) {
      const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
      console.log(`OpenAI API key present: ${!!openaiApiKey}, User responses: ${Object.keys(userResponses).length}, Candidate responses: ${Object.keys(candidateResponses).length}`)
      if (openaiApiKey) {
        const prompt = `Analyze these two people's questionnaire responses and identify 3-5 specific, thoughtful things they have in common. Focus on deeper connections beyond surface-level keywords - look for shared values, similar life experiences, complementary interests, or meaningful patterns.

Person A's responses:
${Object.entries(userResponses).map(([qId, answer]) => `- ${qId}: ${answer.substring(0, 200)}`).join('\n')}

Person B's responses:
${Object.entries(candidateResponses).map(([qId, answer]) => `- ${qId}: ${answer.substring(0, 200)}`).join('\n')}

Generate 3-5 conversation hooks that are:
1. Specific and thoughtful (not generic like "you both love food")
2. Start with "You both..." format
3. Highlight meaningful connections, shared values, or complementary traits
4. Each hook should be a complete sentence (15-30 words)
5. Focus on what would make them want to connect, not just surface similarities

Return ONLY the hooks, one per line, no numbering or bullets. Example format:
You both value deep conversations and meaningful connections over small talk.
You both are navigating career transitions and seeking work-life balance.
You both enjoy exploring new neighborhoods and trying local cafés.

Hooks:`

        const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: 'You are an expert at identifying meaningful connections between people based on their responses to personal questions. Focus on deeper commonalities, shared values, and complementary traits.'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            temperature: 0.7,
            max_tokens: 300,
          }),
        })

        if (openaiResponse.ok) {
          const data = await openaiResponse.json()
          const generatedHooks = data.choices?.[0]?.message?.content || ''
          
          // Parse the response into individual hooks
          const hooks = generatedHooks
            .split('\n')
            .map((line: string) => line.trim())
            .filter((line: string) => line.length > 0 && !line.match(/^(Hooks?:|^\d+[\.\)])/i))
            .slice(0, 5) // Take up to 5 hooks

          conversation_hooks.push(...hooks)
          console.log(`Generated ${hooks.length} conversation hooks from OpenAI`)
        } else {
          const errorText = await openaiResponse.text()
          console.error('OpenAI API error:', openaiResponse.status, errorText)
        }
      } else {
        console.log('OpenAI API key not found in environment variables')
      }
    } else {
      console.log(`Skipping OpenAI - insufficient responses: User=${Object.keys(userResponses).length}, Candidate=${Object.keys(candidateResponses).length}`)
    }
  } catch (error) {
    console.error('Error generating conversation hooks with OpenAI:', error)
    // Fallback to simple keyword-based hooks if OpenAI fails
    if (shared_interests.length >= 2) {
      const topTwo = shared_interests.slice(0, 2)
      conversation_hooks.push(`You both love ${topTwo.join(' and ')}`)
    }
  }

  // Fallback: If we didn't get enough hooks from OpenAI, add simple ones
  if (conversation_hooks.length < 2) {
    if (shared_interests.length >= 2) {
      const topTwo = shared_interests.slice(0, 2)
      conversation_hooks.push(`You both love ${topTwo.join(' and ')}`)
    }
    
    // Life stage match as fallback
    if (userIntake.life_stage && candidateIntake.life_stage && 
        userIntake.life_stage === candidateIntake.life_stage) {
      const lifeStage = userIntake.life_stage.toLowerCase()
      if (lifeStage.includes('career')) {
        conversation_hooks.push(`You both are building your careers`)
      } else if (lifeStage.includes('family')) {
        conversation_hooks.push(`You both are family-focused`)
      } else if (lifeStage.includes('student')) {
        conversation_hooks.push(`You both are students`)
      } else if (lifeStage.includes('early career')) {
        conversation_hooks.push(`You both are early in your careers`)
      }
    }
  }

  return {
    sharedInterests: shared_interests.slice(0, 3),
    conversationHooks: conversation_hooks.slice(0, 3),
    // Store both users' info for bidirectional display
    user_a_hobbies: user_a_hobbies.slice(0, 5),
    user_a_talk_topics: user_a_talk_topics.slice(0, 4),
    user_a_interests: user_a_interests.slice(0, 4),
    user_b_hobbies: user_b_hobbies.slice(0, 5),
    user_b_talk_topics: user_b_talk_topics.slice(0, 4),
    user_b_interests: user_b_interests.slice(0, 4),
    // Keep old fields for backward compatibility (will be deprecated)
    candidateHobbies: user_b_hobbies.slice(0, 5),
    candidateTalkTopics: user_b_talk_topics.slice(0, 4),
    candidateInterests: user_b_interests.slice(0, 4),
    matchScore: 0 // Will be set by caller
  }
}