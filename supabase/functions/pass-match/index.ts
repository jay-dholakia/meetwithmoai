import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get user from JWT token
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      throw new Error('Invalid token')
    }

    const requestBody = await req.json()
    const { match_id } = requestBody

    console.log('Pass-match request - user:', user.id.substring(0, 8))
    console.log('Request body:', JSON.stringify(requestBody, null, 2))
    console.log('Extracted match_id:', match_id)
    console.log('Match_id type:', typeof match_id)
    console.log('Match_id length:', match_id?.length)

    if (!match_id) {
      console.error('Pass-match error: match_id is required')
      throw new Error('match_id is required')
    }

    // Get the match candidate
    console.log('Querying match_candidates table for id:', match_id)
    const { data: match, error: matchError } = await supabaseClient
      .from('match_candidates')
      .select('*')
      .eq('id', String(match_id)) // Ensure it's a string
      .single()
    
    console.log('Query result - match found:', !!match)
    console.log('Query result - error:', matchError ? JSON.stringify(matchError, null, 2) : 'none')
    if (match) {
      console.log('Match found - id:', match.id, 'user_a:', match.user_a, 'user_b:', match.user_b)
    }

    if (matchError) {
      console.error('Error fetching match:', matchError)
      console.error('Match ID searched:', match_id)
      console.error('Error code:', matchError.code)
      console.error('Error message:', matchError.message)
      throw new Error(`Match not found: ${matchError.message}`)
    }

    if (!match) {
      console.error('Match not found - match_id:', match_id, 'user:', user.id.substring(0, 8))
      // Check if match exists but user is not part of it
      const { data: anyMatch } = await supabaseClient
        .from('match_candidates')
        .select('id, user_a, user_b, status')
        .eq('id', match_id)
        .single()
      
      if (anyMatch) {
        console.error('Match exists but user verification failed:', {
          match_user_a: anyMatch.user_a,
          match_user_b: anyMatch.user_b,
          requesting_user: user.id
        })
        throw new Error('Unauthorized: You are not part of this match')
      }
      throw new Error('Match not found')
    }

    // Verify user is part of this match
    if (match.user_a !== user.id && match.user_b !== user.id) {
      throw new Error('Unauthorized')
    }

    // Record the pass decision
    const { error: optInError } = await supabaseClient
      .from('opt_ins')
      .upsert({
        match_id: match_id,
        user_id: user.id,
        decision: 'pass'
      })

    if (optInError) throw optInError

    // Update match status
    const newStatus = match.user_a === user.id ? 'passed_by_a' : 'passed_by_b'
    
    const { error: updateError } = await supabaseClient
      .from('match_candidates')
      .update({ status: newStatus })
      .eq('id', match_id)

    if (updateError) throw updateError

    // Add to cooldown to prevent re-matching
    const orderedUserA = match.user_a < match.user_b ? match.user_a : match.user_b
    const orderedUserB = match.user_a < match.user_b ? match.user_b : match.user_a
    
    const { error: cooldownError } = await supabaseClient
      .from('cooldowns')
      .upsert({
        user_a: orderedUserA,
        user_b: orderedUserB,
        last_matched_at: new Date().toISOString(),
        cooldown_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
      })

    if (cooldownError) throw cooldownError

    // Note: Replenishment removed - matches are now created weekly in batches

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in pass-match:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})