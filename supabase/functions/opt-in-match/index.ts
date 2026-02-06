import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
})

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

    // Get user profile for Stripe customer creation
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', user.id)
      .single()

    if (profileError) throw profileError

    // Create Stripe PaymentIntent with manual capture
    const paymentIntent = await stripe.paymentIntents.create({
      amount: 500, // $5.00 in cents
      currency: 'usd',
      capture_method: 'manual', // Don't capture until both users opt in
      description: `Matcha connection fee - Match ${match_id}`,
      metadata: {
        match_id: match_id,
        user_id: user.id,
        user_name: `${profile.first_name} ${profile.last_name || ''}`.trim()
      }
    })

    // Record the opt-in decision with payment intent
    const { error: optInError } = await supabaseClient
      .from('matcha_opt_ins')
      .upsert({
        match_id: match_id,
        user_id: user.id,
        decision: 'opt_in',
        stripe_payment_intent_id: paymentIntent.id,
        payment_status: 'authorized',
        payment_amount: 500
      })

    if (optInError) throw optInError

    // Update match status
    const isUserA = match.user_a === user.id
    const newStatus = isUserA ? 'opted_in_a' : 'opted_in_b'
    
    const { error: updateError } = await supabaseClient
      .from('matcha_match_candidates')
      .update({ status: newStatus })
      .eq('id', match_id)

    if (updateError) throw updateError

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

    if (otherOptIn && otherOptIn.stripe_payment_intent_id) {
      // Both users have opted in - capture payments and create chat
      try {
        // Capture both payment intents
        await stripe.paymentIntents.capture(paymentIntent.id)
        await stripe.paymentIntents.capture(otherOptIn.stripe_payment_intent_id)

        // Update payment statuses
        await supabaseClient
          .from('matcha_opt_ins')
          .update({ payment_status: 'succeeded' })
          .eq('match_id', match_id)
          .in('user_id', [user.id, otherUserId])

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

      } catch (captureError) {
        console.error('Error capturing payments:', captureError)
        
        // Cancel both payment intents if capture fails
        try {
          await stripe.paymentIntents.cancel(paymentIntent.id)
          await stripe.paymentIntents.cancel(otherOptIn.stripe_payment_intent_id)
        } catch (cancelError) {
          console.error('Error canceling payments:', cancelError)
        }

        // Update payment statuses to failed
        await supabaseClient
          .from('matcha_opt_ins')
          .update({ payment_status: 'failed' })
          .eq('match_id', match_id)
          .in('user_id', [user.id, otherUserId])

        throw captureError
      }
    } else {
      // Update match status to show mutual opt-in pending
      await supabaseClient
        .from('matcha_match_candidates')
        .update({ status: 'mutual_opt_in' })
        .eq('id', match_id)
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        client_secret: paymentIntent.client_secret,
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