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
}

interface IntakeResponse {
  user_id: string;
  embed_vector: number[];
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

  if (needed === 0) return

  // Get user profile and intake data
  const { data: userProfile, error: profileError } = await supabaseClient
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (profileError) throw profileError

  const { data: userIntake, error: intakeError } = await supabaseClient
    .from('intake_responses_v3')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (intakeError) throw intakeError

  // Find potential matches
  const potentialMatches = await findPotentialMatches(
    supabaseClient, 
    userProfile, 
    userIntake, 
    needed
  )

  // Create match candidates
  for (const match of potentialMatches) {
    await createMatchCandidate(supabaseClient, userId, match.id, match.score, match.reasons)
  }
}

async function findPotentialMatches(
  supabaseClient: any, 
  userProfile: UserProfile, 
  userIntake: IntakeResponse, 
  limit: number
) {
  // Get all potential matches (excluding blocked, in cooldown, etc.)
  const { data: potentialUsers, error: usersError } = await supabaseClient
    .from('profiles')
    .select(`
      *,
      intake_responses_v3 (*)
    `)
    .eq('in_matcha_bowl', true)
    .eq('is_active', true)
    .neq('id', userProfile.id)

  if (usersError) throw usersError

  const scoredMatches = []

  for (const candidate of potentialUsers) {
    if (!candidate.intake_responses_v3?.[0]) continue

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
    if (inCooldown) continue

    // Check if already matched
    const { data: existingMatch } = await supabaseClient
      .from('matcha_match_candidates')
      .select('id')
      .or(
        `and(user_a.eq.${Math.min(userProfile.id, candidate.id)},user_b.eq.${Math.max(userProfile.id, candidate.id)})`
      )
      .limit(1)

    if (existingMatch?.length > 0) continue

    // Calculate compatibility score
    const score = calculateCompatibilityScore(
      userProfile, 
      userIntake, 
      candidate, 
      candidate.intake_responses_v3[0]
    )

    if (score > 0.3) { // Minimum threshold
      scoredMatches.push({
        id: candidate.id,
        score,
        reasons: generateMatchReasons(userIntake, candidate.intake_responses_v3[0])
      })
    }
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
  // Ensure consistent ordering
  const orderedUserA = userA < userB ? userA : userB
  const orderedUserB = userA < userB ? userB : userA

  const { error } = await supabaseClient
    .from('matcha_match_candidates')
    .insert({
      user_a: orderedUserA,
      user_b: orderedUserB,
      score,
      reasons,
      status: 'active',
      expires_at: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString() // 72 hours
    })

  if (error) throw error
}