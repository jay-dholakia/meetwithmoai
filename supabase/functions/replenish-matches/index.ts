// @deno-types are resolved at runtime by Deno
// @ts-ignore - Deno runtime types
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// @ts-ignore - Deno runtime types
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Deno global is available at runtime
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

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
  in_match_bowl: boolean;
  age: number | null;
  gender: string | null;
  relationship_status: string | null;
  has_kids: string | null;
  age_range_preference: number | null;
}

interface IntakeResponse {
  user_id: string;
  embed_vector?: number[];
  responses?: any[];
  life_stage?: string[]; // Now TEXT[] for multi-select
  availability_times?: string[];
  // Note: age_range_preference is now in profiles table, not here
  [key: string]: any;
}

serve(async (req: Request) => {
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
    const errorMessage = error instanceof Error ? error.message : String(error)
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

function getBatchWeekMonday(now: Date): string {
  const dayOfWeek = now.getDay()
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const monday = new Date(now)
  monday.setDate(now.getDate() - daysToMonday)
  monday.setHours(0, 0, 0, 0)
  return monday.toISOString().split('T')[0]
}

async function replenishAllUsers(supabaseClient: any) {
  const batchWeek = getBatchWeekMonday(new Date())
  // Get user IDs who opted in for this week's match run
  const { data: optIns, error: optInError } = await supabaseClient
    .from('weekly_match_opt_ins')
    .select('user_id')
    .eq('batch_week', batchWeek)

  if (optInError) throw optInError
  const optedInIds = (optIns || []).map((r: { user_id: string }) => r.user_id)
  if (optedInIds.length === 0) {
    console.log(`No users opted in for batch_week ${batchWeek}. Skipping replenish.`)
    return
  }

  // Eligible = in bowl, active, AND opted in for this week
  const { data: eligibleUsers, error: usersError } = await supabaseClient
    .from('profiles')
    .select('id')
    .eq('in_match_bowl', true)
    .eq('is_active', true)
    .in('id', optedInIds)

  if (usersError) throw usersError

  for (const user of eligibleUsers || []) {
    await replenishUserMatches(supabaseClient, user.id)
  }
}

async function replenishUserMatches(supabaseClient: any, userId: string) {
  const batchWeek = getBatchWeekMonday(new Date())

  // Only process users who opted in for this week
  const { data: optIn, error: optInError } = await supabaseClient
    .from('weekly_match_opt_ins')
    .select('user_id')
    .eq('user_id', userId)
    .eq('batch_week', batchWeek)
    .maybeSingle()

  if (optInError) throw optInError
  if (!optIn) {
    console.log(`User ${userId.substring(0, 8)} not opted in for batch_week ${batchWeek}. Skipping.`)
    return
  }

  console.log(`Processing matches for user ${userId.substring(0, 8)}, batch_week: ${batchWeek}`)

  // Check if user already has matches from this week (idempotency check)
  const { data: thisWeekMatches, error: thisWeekError } = await supabaseClient
    .from('match_candidates')
    .select('id')
    .or(`user_a.eq.${userId},user_b.eq.${userId}`)
    .eq('batch_week', batchWeek)

  if (thisWeekError) throw thisWeekError

  const thisWeekCount = thisWeekMatches?.length || 0
  if (thisWeekCount >= 5) {
    console.log(`User ${userId.substring(0, 8)} already has ${thisWeekCount} matches for this week. Skipping.`)
    return
  }

  // Delete/expire all non-converted matches from previous weeks
  const { error: deleteError } = await supabaseClient
    .from('match_candidates')
    .delete()
    .or(`user_a.eq.${userId},user_b.eq.${userId}`)
    .neq('batch_week', batchWeek)
    .neq('status', 'converted')

  if (deleteError) {
    console.error(`Error deleting previous week's matches:`, deleteError)
    // Don't throw - continue with match creation
  } else {
    console.log(`Deleted previous week's non-converted matches for user ${userId.substring(0, 8)}`)
  }

  // Get user profile and intake data
  const { data: userProfile, error: profileError } = await supabaseClient
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (profileError) throw profileError

  // Get v5 intake data (all users must complete new questionnaire)
  const { data: userIntake, error: intakeError } = await supabaseClient
    .from('intake_responses_v5')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (intakeError) throw intakeError
  if (!userIntake) throw new Error('No intake data found')

  // Find potential matches - get enough candidates to fill up to 5 matches (only from users opted in for this week)
  const potentialMatches = await findPotentialMatches(
    supabaseClient,
    userProfile,
    userIntake,
    batchWeek,
    50 // Get top 50 candidates to ensure we have enough above threshold
  )

  console.log(`Found ${potentialMatches.length} potential matches for user ${userId.substring(0, 8)}`)

  // Create match candidates
  // Only create matches above 0.35 threshold
  const MATCH_SCORE_THRESHOLD = 0.35
  const MAX_MATCHES = 5
  const needed = MAX_MATCHES - thisWeekCount
  
  let createdCount = 0
  for (const match of potentialMatches) {
    // Stop if we've created enough matches
    if (createdCount >= needed) {
      break
    }

    // Only create matches above threshold
    if (match.score >= MATCH_SCORE_THRESHOLD) {
      try {
        await createMatchCandidate(supabaseClient, userId, match.id, match.score, match.reasons, batchWeek)
        createdCount++
        console.log(`Created match ${createdCount}/${needed}: score ${match.score.toFixed(3)}`)
      } catch (error) {
        console.error(`Failed to create match:`, error)
      }
    } else {
      console.log(`Skipping match with score ${match.score.toFixed(3)} (below threshold ${MATCH_SCORE_THRESHOLD})`)
    }
  }
  console.log(`Created ${createdCount} matches above threshold for user ${userId.substring(0, 8)} (batch_week: ${batchWeek})`)
}

async function findPotentialMatches(
  supabaseClient: any,
  userProfile: UserProfile,
  userIntake: any,
  batchWeek: string,
  limit: number
) {
  // Get user IDs who opted in for this week
  const { data: optIns, error: optInError } = await supabaseClient
    .from('weekly_match_opt_ins')
    .select('user_id')
    .eq('batch_week', batchWeek)

  if (optInError) throw optInError
  const optedInIds = (optIns || []).map((r: { user_id: string }) => r.user_id).filter((id: string) => id !== userProfile.id)
  if (optedInIds.length === 0) {
    console.log('No other users opted in for this batch_week')
    return []
  }

  // Get potential matches: in bowl, active, and opted in for this week
  const { data: potentialUsers, error: usersError } = await supabaseClient
    .from('profiles')
    .select('*')
    .eq('in_match_bowl', true)
    .eq('is_active', true)
    .in('id', optedInIds)

  if (usersError) throw usersError

  console.log(`Found ${potentialUsers?.length || 0} potential users to match against`)

  const scoredMatches = []

  // Fetch intake data separately for each candidate
  for (const candidate of potentialUsers || []) {
    // Get candidate's intake data
    const { data: candidateIntakeData, error: intakeError } = await supabaseClient
      .from('intake_responses_v5')
      .select('*')
      .eq('user_id', candidate.id)
      .single()

    if (intakeError || !candidateIntakeData) {
      console.log(`Skipping ${candidate.id.substring(0, 8)} - no intake data: ${intakeError?.message || 'not found'}`)
      continue
    }

    const candidateIntake = candidateIntakeData

    // Apply structured filters (age range preference is a hard filter)
    if (!passesStructuredFilters(userIntake, candidateIntake, userProfile, candidate)) {
      console.log(`Skipping ${candidate.id.substring(0, 8)} - failed structured filters (likely age range)`)
      continue
    }

    // Check if users are blocked
    const { data: blocked } = await supabaseClient
      .from('blocks')
      .select('id')
      .or(`blocker_id.eq.${userProfile.id},blocker_id.eq.${candidate.id}`)
      .or(`blocked_id.eq.${userProfile.id},blocked_id.eq.${candidate.id}`)
      .limit(1)

    if (blocked?.length > 0) continue

    // Check cooldown
    const inCooldown = await checkCooldown(supabaseClient, userProfile.id, candidate.id)
    if (inCooldown) {
      console.log(`Skipping ${candidate.id.substring(0, 8)} - in cooldown`)
      continue
    }

    // Check if already matched - skip for now to see all matches
    // const { data: existingMatch } = await supabaseClient
    //   .from('match_candidates')
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
    // Pass both user names so hooks can use names for individual characteristics
    const reasons = await generateMatchReasonsV4(
      userIntake, 
      candidateIntake, 
      userProfile.id, 
      candidate.id,
      userProfile.first_name || 'You',
      candidate.first_name || 'They'
    )
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
    const sharedCuisines = userIntake.favorite_cuisines.filter((c: string) => 
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
      .rpc('count_active_match_chats', { user_uuid: userId })
  
  return data || 0
}

async function createMatchCandidate(
  supabaseClient: any, 
  userA: string, 
  userB: string, 
  score: number, 
  reasons: any,
  batchWeek: string
) {
  // Ensure consistent ordering (user_a < user_b per constraint)
  const orderedUserA = userA < userB ? userA : userB
  const orderedUserB = userA < userB ? userB : userA

  // Use upsert to avoid duplicate key errors
  // Try insert first, then update if conflict
  const { data: insertData, error: insertError } = await supabaseClient
    .from('match_candidates')
    .insert({
      user_a: orderedUserA,
      user_b: orderedUserB,
      score,
      reasons,
      status: 'active',
      batch_week: batchWeek,
      expires_at: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString() // 72 hours
    })
    .select()

  if (insertError) {
    // If duplicate, try update instead
    if (insertError.code === '23505') { // Unique violation
      console.log(`Match exists, updating: ${orderedUserA.substring(0, 8)}-${orderedUserB.substring(0, 8)} with score ${score}`)
      const { data: updateData, error: updateError } = await supabaseClient
        .from('match_candidates')
        .update({
          score: score || 0, // Ensure score is never null
          reasons: reasons || {},
          status: 'active',
          batch_week: batchWeek,
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
  // Filter 1: Age range preference (slider value: 0-10 representing ±X years)
  // Both users' preferences must be satisfied for a match to pass
  if (userProfile.age && candidateProfile.age) {
    const ageDiff = Math.abs(userProfile.age - candidateProfile.age)
    
    // Check user's preference
    if (userProfile.age_range_preference !== null && userProfile.age_range_preference !== undefined) {
      if (ageDiff > userProfile.age_range_preference) {
        console.log(`Age filter: User ${userProfile.id.substring(0, 8)} (age ${userProfile.age}, pref ±${userProfile.age_range_preference}) vs Candidate ${candidateProfile.id.substring(0, 8)} (age ${candidateProfile.age}) - diff ${ageDiff} exceeds user's preference`)
        return false
      }
    }
    
    // Check candidate's preference
    if (candidateProfile.age_range_preference !== null && candidateProfile.age_range_preference !== undefined) {
      if (ageDiff > candidateProfile.age_range_preference) {
        console.log(`Age filter: Candidate ${candidateProfile.id.substring(0, 8)} (age ${candidateProfile.age}, pref ±${candidateProfile.age_range_preference}) vs User ${userProfile.id.substring(0, 8)} (age ${userProfile.age}) - diff ${ageDiff} exceeds candidate's preference`)
        return false
      }
    }
  }

  // Filter 2: Availability overlap - REMOVED as hard filter (now soft signal in scoring)
  // Availability is now optional - people can be flexible with their schedules

  // Note: Removed drive_distance and political filters as they're not in v5 questionnaire

  return true
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

// Helper functions to extract values from JSONB responses array
function getResponseValue(intake: any, questionId: string): any {
  if (!intake?.responses || !Array.isArray(intake.responses)) return null
  const response = intake.responses.find((r: any) => r.question_id === questionId)
  return response?.answer || null
}

function getMultiSelectValue(intake: any, questionId: string): string[] {
  const value = getResponseValue(intake, questionId)
  if (!value) return []
  return Array.isArray(value) ? value : [value]
}

function getSingleSelectValue(intake: any, questionId: string): string | null {
  const value = getResponseValue(intake, questionId)
  return typeof value === 'string' ? value : null
}

// Calculate compatibility using embeddings + structured data (V5 scoring system)
async function calculateCompatibilityScoreV4(
  userProfile: UserProfile,
  userIntake: any,
  candidateProfile: UserProfile,
  candidateIntake: any
): Promise<number> {
  let score = 0

  // 1. Embedding similarity (30% weight) - semantic similarity of open-ended responses
  if (userIntake.embed_vector && candidateIntake.embed_vector) {
    const embeddingSimilarity = cosineSimilarity(
      userIntake.embed_vector,
      candidateIntake.embed_vector
    )
    score += embeddingSimilarity * 0.30
  }

  // 2. Connection type alignment (12% weight) - NEW
  const userConnectionTypes = getMultiSelectValue(userIntake, 'q2_connection_types')
  const candidateConnectionTypes = getMultiSelectValue(candidateIntake, 'q2_connection_types')
  if (userConnectionTypes.length > 0 && candidateConnectionTypes.length > 0) {
    const overlap = userConnectionTypes.filter((type: string) => candidateConnectionTypes.includes(type)).length
    const maxSelections = Math.max(userConnectionTypes.length, candidateConnectionTypes.length)
    if (maxSelections > 0) {
      score += (overlap / maxSelections) * 0.12
    }
  }

  // 3. Life stage compatibility (10% weight) - down from 13%
  if (userIntake.life_stage && candidateIntake.life_stage) {
    const userStages = Array.isArray(userIntake.life_stage) ? userIntake.life_stage : [userIntake.life_stage]
    const candidateStages = Array.isArray(candidateIntake.life_stage) ? candidateIntake.life_stage : [candidateIntake.life_stage]
    
    // Check for any overlap - binary match
    const hasOverlap = userStages.some((stage: string) => candidateStages.includes(stage))
    if (hasOverlap) {
      score += 0.10
    }
  }

  // 4. Conversation type compatibility (10% weight) - NEW
  const userConversationType = getSingleSelectValue(userIntake, 'q7_conversation_type')
  const candidateConversationType = getSingleSelectValue(candidateIntake, 'q7_conversation_type')
  if (userConversationType && candidateConversationType) {
    if (userConversationType === candidateConversationType) {
      score += 0.10 // Exact match
    } else if (userConversationType === 'A mix of both' || candidateConversationType === 'A mix of both') {
      // "A mix" matches with "Light and easy" or "Thoughtful"
      if ((userConversationType === 'Light and easy' || userConversationType === 'Thoughtful') ||
          (candidateConversationType === 'Light and easy' || candidateConversationType === 'Thoughtful')) {
        score += 0.07
      }
    } else if (userConversationType === 'Depends on the person' || candidateConversationType === 'Depends on the person') {
      // "Depends on the person" = neutral, matches with anything
      score += 0.05
    }
  }

  // 5. Introvert/Extrovert compatibility (8% weight) - NEW
  const userIntroExtro = getSingleSelectValue(userIntake, 'q3_introvert_extrovert')
  const candidateIntroExtro = getSingleSelectValue(candidateIntake, 'q3_introvert_extrovert')
  if (userIntroExtro && candidateIntroExtro) {
    if (userIntroExtro === candidateIntroExtro) {
      score += 0.08 // Exact match
    } else if (userIntroExtro === 'Somewhere in between' || candidateIntroExtro === 'Somewhere in between') {
      // "Somewhere in between" matches with either
      score += 0.06
    }
    // Opposite (introverted vs extroverted) = 0% (no score added)
  }

  // 6. Age compatibility (8% weight) - using profiles.age_range_preference
  if (userProfile.age && candidateProfile.age) {
    const ageDiff = Math.abs(userProfile.age - candidateProfile.age)
    
    // Use age_range_preference from profiles table (0-10, representing ±X years)
    const userPreference = userProfile.age_range_preference
    const candidatePreference = candidateProfile.age_range_preference
    
    if (userPreference !== null && userPreference !== undefined && 
        candidatePreference !== null && candidatePreference !== undefined) {
      // Both have preferences set
      if (ageDiff <= userPreference && ageDiff <= candidatePreference) {
        score += 0.08 // Within both preferences
      } else {
        // Partial match - calculate based on how far outside the preference
        const minPreference = Math.min(userPreference, candidatePreference)
        const penalty = Math.max(0, ageDiff - minPreference)
        score += Math.max(0, (1 - penalty / 5)) * 0.08
      }
    } else {
      // Fallback to old logic if preferences not set (15-year window)
      score += Math.max(0, 1 - (ageDiff / 15)) * 0.08
    }
  }

  // 7. Availability overlap (6% weight) - up from 4%
  if (userIntake.availability_times && candidateIntake.availability_times) {
    const userTimes = Array.isArray(userIntake.availability_times) ? userIntake.availability_times : []
    const candidateTimes = Array.isArray(candidateIntake.availability_times) ? candidateIntake.availability_times : []
    const overlap = userTimes.filter((time: string) => candidateTimes.includes(time)).length
    const total = new Set([...userTimes, ...candidateTimes]).size
    if (total > 0) {
      score += (overlap / total) * 0.06
    }
  }

  // 8. Distance (6% weight) - down from 13%, using profiles.radius_km
  if (userProfile.lat && userProfile.lng && candidateProfile.lat && candidateProfile.lng) {
    const distance = calculateDistance(
      userProfile.lat, userProfile.lng,
      candidateProfile.lat, candidateProfile.lng
    )
    // Both can travel their max radius, so total = sum
    const totalMaxDistance = (userProfile.radius_km || 25) + (candidateProfile.radius_km || 25)
    if (distance <= totalMaxDistance) {
      score += (1 - (distance / totalMaxDistance)) * 0.06
    }
  }

  // 9. Profile compatibility (5% weight) - combined from has_kids + relationship_status
  // Has kids compatibility (2.5%)
  if (userProfile.has_kids && candidateProfile.has_kids) {
    const userHasKids = userProfile.has_kids.toLowerCase() === 'yes'
    const candidateHasKids = candidateProfile.has_kids.toLowerCase() === 'yes'
    if (userHasKids === candidateHasKids) {
      score += 0.025 // Both have kids or both don't
    }
  }

  // Relationship status compatibility (2.5%)
  if (userProfile.relationship_status && candidateProfile.relationship_status) {
    const userStatus = userProfile.relationship_status.toLowerCase()
    const candidateStatus = candidateProfile.relationship_status.toLowerCase()
    
    // Same status = full boost
    if (userStatus === candidateStatus) {
      score += 0.025
    } else {
      // Compatible statuses (both single, both in relationships, etc.)
      const singleStatuses = ['single']
      const relationshipStatuses = ['married', 'in a relationship', 'engaged']
      
      const userIsSingle = singleStatuses.includes(userStatus)
      const candidateIsSingle = singleStatuses.includes(candidateStatus)
      const userInRelationship = relationshipStatuses.some(s => userStatus.includes(s))
      const candidateInRelationship = relationshipStatuses.some(s => candidateStatus.includes(s))
      
      if ((userIsSingle && candidateIsSingle) || (userInRelationship && candidateInRelationship)) {
        score += 0.0125 // Half boost for compatible stages
      }
    }
  }

  // 10. Gender compatibility (5% weight) - unchanged
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
async function generateMatchReasonsV4(
  userIntake: any, 
  candidateIntake: any, 
  userId: string, 
  candidateId: string,
  userName: string = 'You',
  candidateName: string = 'They'
) {
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
    // V5 open-ended question IDs
    const openEndedQuestionIds = [
      'q4_enjoy_doing',
      'q5_enjoy_consuming',
      'q6_excited_to_try',
      'q8_conversation_flows',
      'q9_important_parts',
      'q10_work_study',
      'q13_first_conversation_note'
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
        const prompt = `You are analyzing two people's questionnaire responses to identify meaningful, insightful connections that would make them want to have a conversation. Go beyond surface-level similarities - look for deeper patterns, shared values, complementary perspectives, or interesting contrasts that spark curiosity.

${userName}'s responses:
${Object.entries(userResponses).map(([qId, answer]) => {
  const questionText = userIntake.responses.find((r: any) => r.question_id === qId)?.question_text || qId;
  return `- ${questionText}: ${answer}`;
}).join('\n\n')}

${candidateName}'s responses:
${Object.entries(candidateResponses).map(([qId, answer]) => {
  const questionText = candidateIntake.responses.find((r: any) => r.question_id === qId)?.question_text || qId;
  return `- ${questionText}: ${answer}`;
}).join('\n\n')}

Generate 3-5 conversation hooks that are:
1. INSIGHTFUL and SPECIFIC - reveal something interesting about their connection, not just "you both like X"
2. DEEP and MEANINGFUL - focus on values, perspectives, life experiences, or complementary traits
3. CONVERSATION-STARTERS - things that would naturally lead to engaging discussions
4. 15-30 words each - enough detail to be interesting, not just surface-level

CRITICAL FORMATTING RULES:
- For SHARED/COMMON things: Start with "You both..." and NEVER include names in that phrase
- For INDIVIDUAL characteristics: Use names "${userName}" and "${candidateName}" when describing how each person differs
- NEVER say "You both [name] and [name] both" - this is grammatically incorrect
- If describing a shared trait with individual variations, use: "You both [shared trait], with ${userName} [their way] and ${candidateName} [their way]"

Look for:
- Shared values or worldviews (not just hobbies)
- Similar life experiences or challenges
- Complementary interests or perspectives
- Interesting contrasts that create curiosity
- What they're excited about or working toward
- How they approach life, relationships, or growth

BAD examples (grammatically incorrect or too generic):
- "You both chris and jay both value..." (WRONG - redundant "both")
- "You both love music and travel" (too generic)
- "You both are students" (too generic)

GOOD examples (insightful and grammatically correct):
- "You both are in transition phases, which could lead to interesting conversations about navigating change and figuring out what's next."
- "You both value authenticity and meaningful connections, with ${userName} finding it through creative expression and ${candidateName} through deep conversations about ideas."
- "You both are curious about the world, which could spark conversations about how you each explore new perspectives and learn from different experiences."

Return ONLY the hooks, one per line, no numbering or bullets. Each hook should be a complete, thoughtful sentence (15-30 words). Start shared traits with "You both" and never include names in that opening phrase.

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
                content: 'You are an expert at identifying deep, meaningful connections between people. You go beyond surface similarities to find shared values, complementary perspectives, and insights that spark genuine curiosity and conversation. Your hooks are specific, thoughtful, and reveal something interesting about how two people might connect.'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            temperature: 0.8,
            max_tokens: 500,
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
            .map((hook: string) => {
              // Replace any "Person A" or "Person B" references with "you"
              return hook
                .replace(/Person A/gi, 'you')
                .replace(/Person B/gi, 'you')
                .replace(/person a/gi, 'you')
                .replace(/person b/gi, 'you')
                .replace(/\bA\b/g, 'you') // Replace standalone "A" (context-dependent, but safer)
                .replace(/\bB\b/g, 'you') // Replace standalone "B" (context-dependent, but safer)
            })
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
    // Fallback will be handled below
  }

  // Fallback: If we didn't get enough hooks from OpenAI, create more thoughtful ones
  if (conversation_hooks.length < 2) {
    // Try to extract more specific information from responses
    const userEnjoyDoing = getResponseValue(userIntake, 'q4_enjoy_doing')
    const candidateEnjoyDoing = getResponseValue(candidateIntake, 'q4_enjoy_doing')
    const userConversationFlows = getResponseValue(userIntake, 'q8_conversation_flows')
    const candidateConversationFlows = getResponseValue(candidateIntake, 'q8_conversation_flows')
    const userImportantParts = getResponseValue(userIntake, 'q9_important_parts')
    const candidateImportantParts = getResponseValue(candidateIntake, 'q9_important_parts')
    
    // Connection types overlap
    const userConnectionTypes = getMultiSelectValue(userIntake, 'q2_connection_types')
    const candidateConnectionTypes = getMultiSelectValue(candidateIntake, 'q2_connection_types')
    const sharedConnectionTypes = userConnectionTypes.filter((type: string) => candidateConnectionTypes.includes(type))
    
    if (sharedConnectionTypes.length > 0 && conversation_hooks.length < 3) {
      const connectionType = sharedConnectionTypes[0]
      if (connectionType.includes('coffee') || connectionType.includes('conversation')) {
        conversation_hooks.push(`You both are open to casual conversations and coffee chats, which suggests you value genuine connection and relaxed interactions.`)
      } else if (connectionType.includes('hobbies') || connectionType.includes('activities')) {
        conversation_hooks.push(`You both are interested in exploring hobbies and activities together, indicating you enjoy shared experiences and trying new things.`)
      } else if (connectionType.includes('professional')) {
        conversation_hooks.push(`You both are open to professional conversations and support, showing you value growth and meaningful career discussions.`)
      }
    }
    
    // Life stage match with more context
    if (userIntake.life_stage && candidateIntake.life_stage && conversation_hooks.length < 3) {
      const userStages = Array.isArray(userIntake.life_stage) ? userIntake.life_stage : [userIntake.life_stage]
      const candidateStages = Array.isArray(candidateIntake.life_stage) ? candidateIntake.life_stage : [candidateIntake.life_stage]
      const commonStages = userStages.filter((stage: string) => candidateStages.includes(stage))
      
      if (commonStages.length > 0) {
        const lifeStage = commonStages[0]
        if (lifeStage.includes('Career-focused') || lifeStage.includes('Building something')) {
          conversation_hooks.push(`You both are in career-building phases, which could lead to interesting conversations about goals, challenges, and what you're working toward.`)
        } else if (lifeStage.includes('Family-focused')) {
          conversation_hooks.push(`You both are family-focused, suggesting you might connect over shared values around relationships, priorities, and what matters most in life.`)
        } else if (lifeStage.includes('Student') || lifeStage.includes('Early career')) {
          conversation_hooks.push(`You both are in early stages of your journey, which could create space for conversations about growth, learning, and figuring things out together.`)
        } else if (lifeStage.includes('transitioning') || lifeStage.includes('Between phases')) {
          conversation_hooks.push(`You both are navigating transitions, which could lead to meaningful conversations about change, uncertainty, and what's next.`)
        }
      }
    }
    
    // Conversation type compatibility
    const userConvType = getSingleSelectValue(userIntake, 'q7_conversation_type')
    const candidateConvType = getSingleSelectValue(candidateIntake, 'q7_conversation_type')
    if (userConvType && candidateConvType && conversation_hooks.length < 3) {
      if (userConvType === candidateConvType) {
        if (userConvType === 'Thoughtful') {
          conversation_hooks.push(`You both prefer thoughtful conversations, suggesting you enjoy diving deep into ideas, experiences, and meaningful topics.`)
        } else if (userConvType === 'Light and easy') {
          conversation_hooks.push(`You both enjoy light and easy conversations, indicating you appreciate relaxed, low-pressure interactions and natural flow.`)
        } else if (userConvType === 'A mix of both') {
          conversation_hooks.push(`You both appreciate a mix of light and thoughtful conversations, showing you value flexibility and authentic connection.`)
        }
      }
    }
    
    // Last resort: shared interests (but make it more specific)
    if (shared_interests.length >= 2 && conversation_hooks.length < 2) {
      const topTwo = shared_interests.slice(0, 2)
      conversation_hooks.push(`You both share interests in ${topTwo.join(' and ')}, which could be a great starting point for conversations about what draws you to these activities.`)
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