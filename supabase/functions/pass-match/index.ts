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

    const { match_id } = await req.json()

    if (!match_id) {
      throw new Error('match_id is required')
    }

    // Get the match candidate
    const { data: match, error: matchError } = await supabaseClient
      .from('matcha_match_candidates')
      .select('*')
      .eq('id', match_id)
      .single()

    if (matchError || !match) {
      throw new Error('Match not found')
    }

    // Verify user is part of this match
    if (match.user_a !== user.id && match.user_b !== user.id) {
      throw new Error('Unauthorized')
    }

    // Record the pass decision
    const { error: optInError } = await supabaseClient
      .from('matcha_opt_ins')
      .upsert({
        match_id: match_id,
        user_id: user.id,
        decision: 'pass'
      })

    if (optInError) throw optInError

    // Update match status
    const newStatus = match.user_a === user.id ? 'passed_by_a' : 'passed_by_b'
    
    const { error: updateError } = await supabaseClient
      .from('matcha_match_candidates')
      .update({ status: newStatus })
      .eq('id', match_id)

    if (updateError) throw updateError

    // Add to cooldown to prevent re-matching
    const orderedUserA = match.user_a < match.user_b ? match.user_a : match.user_b
    const orderedUserB = match.user_a < match.user_b ? match.user_b : match.user_a
    
    const { error: cooldownError } = await supabaseClient
      .from('matcha_cooldowns')
      .upsert({
        user_a: orderedUserA,
        user_b: orderedUserB,
        last_matched_at: new Date().toISOString(),
        cooldown_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
      })

    if (cooldownError) throw cooldownError

    // Trigger replenishment for this user (async)
    fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/replenish-matches`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ user_id: user.id })
    }).catch(console.error) // Fire and forget

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