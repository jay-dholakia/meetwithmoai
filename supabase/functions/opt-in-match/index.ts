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

    // Check if user has reached chat limit (3 active chats)
    const { data: activeChatCount } = await supabaseClient
      .rpc('count_active_matcha_chats', { user_uuid: user.id })

    if (activeChatCount >= 3) {
      throw new Error('Maximum active chats reached (3)')
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

    // Check if match has expired
    if (new Date(match.expires_at) < new Date()) {
      throw new Error('Match has expired')
    }

    // Check if user already opted in
    const { data: existingOptIn } = await supabaseClient
      .from('matcha_opt_ins')
      .select('*')
      .eq('match_id', match_id)
      .eq('user_id', user.id)
      .single()

    if (existingOptIn && existingOptIn.decision === 'opt_in') {
      throw new Error('Already opted in to this match')
    }

    // Record the opt-in decision (no payment required - use 'succeeded' to indicate opt-in is complete)
    console.log(`Creating opt-in record for match ${match_id}, user ${user.id}`)
    const { data: optInData, error: optInError } = await supabaseClient
      .from('matcha_opt_ins')
      .upsert({
        match_id: match_id,
        user_id: user.id,
        decision: 'opt_in',
        payment_status: 'succeeded' // Using 'succeeded' since no payment is required
      }, {
        onConflict: 'match_id,user_id'
      })
      .select()

    if (optInError) {
      console.error('Error creating opt-in record:', optInError)
      throw optInError
    }
    
    console.log(`Successfully created opt-in record:`, optInData)

    // Update match status
    const isUserA = match.user_a === user.id
    const newStatus = isUserA ? 'opted_in_a' : 'opted_in_b'
    
    console.log(`Updating match ${match_id} status to ${newStatus} for user ${user.id} (isUserA: ${isUserA})`)
    
    const { data: updateData, error: updateError } = await supabaseClient
      .from('matcha_match_candidates')
      .update({ status: newStatus })
      .eq('id', match_id)
      .select()

    if (updateError) {
      console.error('Error updating match status:', updateError)
      throw updateError
    }
    
    if (!updateData || updateData.length === 0) {
      console.error(`No rows updated for match ${match_id}. Match may not exist or RLS policy blocked update.`)
      throw new Error('Failed to update match status - no rows affected')
    }
    
    console.log(`Successfully updated match ${match_id} status to ${newStatus}. Updated rows:`, updateData.length)

    // Check if other user has also opted in
    const otherUserId = isUserA ? match.user_b : match.user_a
    const { data: otherOptIn } = await supabaseClient
      .from('matcha_opt_ins')
      .select('*')
      .eq('match_id', match_id)
      .eq('user_id', otherUserId)
      .eq('decision', 'opt_in')
      .single()

    let chatCreated = false

    if (otherOptIn) {
      // Both users have opted in - create chat
      // Create conversation
      const { data: conversation, error: conversationError } = await supabaseClient
        .from('conversations')
        .insert({
          user_a: Math.min(user.id, otherUserId),
          user_b: Math.max(user.id, otherUserId),
          conversation_type: 'matcha',
          matcha_match_id: match_id,
          ai_present: true,
          status: 'active'
        })
        .select()
        .single()

      if (conversationError) throw conversationError

      // Update match status to converted
      await supabaseClient
        .from('matcha_match_candidates')
        .update({ status: 'converted' })
        .eq('id', match_id)

      // Generate and send AI intro message
      await generateAIIntroMessage(supabaseClient, conversation.id, user.id, otherUserId, match.reasons)

      chatCreated = true
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        chat_created: chatCreated,
        waiting_for_other: !chatCreated
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in opt-in-match:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

async function generateAIIntroMessage(
  supabaseClient: any, 
  conversationId: string, 
  userAId: string, 
  userBId: string, 
  matchReasons: any
) {
  // Get both user profiles
  const { data: profiles, error: profilesError } = await supabaseClient
    .from('profiles')
    .select('id, first_name, last_name')
    .in('id', [userAId, userBId])

  if (profilesError) {
    console.error('Error fetching profiles for AI intro:', profilesError)
    return
  }

  const userA = profiles.find(p => p.id === userAId)
  const userB = profiles.find(p => p.id === userBId)

  // Generate intro message based on match reasons
  const sharedInterests = matchReasons?.shared_interests || []
  const conversationHooks = matchReasons?.conversation_hooks || []

  let introText = `🍵 Welcome to your Matcha connection, ${userA.first_name} and ${userB.first_name}!\n\n`

  if (sharedInterests.length > 0) {
    introText += `I noticed you both enjoy: ${sharedInterests.slice(0, 2).join(' and ')}\n\n`
  }

  if (conversationHooks.length > 0) {
    introText += `Here are some conversation starters:\n`
    conversationHooks.slice(0, 3).forEach((hook, index) => {
      introText += `${index + 1}. ${hook}\n`
    })
    introText += '\n'
  }

  introText += `Feel free to plan a café meetup when you're both ready. I'll step back now and let you two connect! ☕️`

  // Insert AI message
  const { error: messageError } = await supabaseClient
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_type: 'ai',
      sender_id: null,
      text: introText,
      metadata: { type: 'matcha_intro' }
    })

  if (messageError) {
    console.error('Error inserting AI intro message:', messageError)
  }

  // Mark AI intro as sent
  await supabaseClient
    .from('conversations')
    .update({ ai_intro_sent: true })
    .eq('id', conversationId)
}