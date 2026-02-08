import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
})

const endpointSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') || ''

serve(async (req) => {
  try {
    const body = await req.text()
    const sig = req.headers.get('stripe-signature')

    if (!sig || !endpointSecret) {
      throw new Error('Missing signature or webhook secret')
    }

    // Verify webhook signature
    const event = stripe.webhooks.constructEvent(body, sig, endpointSecret)

    // Create Supabase client with service role key
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log(`Received webhook: ${event.type}`)

    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(supabaseClient, event.data.object as Stripe.PaymentIntent)
        break
      
      case 'payment_intent.payment_failed':
        await handlePaymentFailed(supabaseClient, event.data.object as Stripe.PaymentIntent)
        break
      
      case 'payment_intent.canceled':
        await handlePaymentCanceled(supabaseClient, event.data.object as Stripe.PaymentIntent)
        break
      
      case 'payment_intent.requires_action':
        await handlePaymentRequiresAction(supabaseClient, event.data.object as Stripe.PaymentIntent)
        break
      
      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }
})

async function handlePaymentSucceeded(supabaseClient: any, paymentIntent: Stripe.PaymentIntent) {
  const matchId = paymentIntent.metadata.match_id
  const userId = paymentIntent.metadata.user_id

  if (!matchId || !userId) {
    console.error('Missing metadata in payment intent:', paymentIntent.id)
    return
  }

  // Update payment status
  const { error: updateError } = await supabaseClient
    .from('matcha_opt_ins')
    .update({ payment_status: 'succeeded' })
    .eq('stripe_payment_intent_id', paymentIntent.id)

  if (updateError) {
    console.error('Error updating payment status:', updateError)
    return
  }

  // Check if both users have successful payments
  const { data: optIns, error: optInsError } = await supabaseClient
    .from('matcha_opt_ins')
    .select('*')
    .eq('match_id', matchId)
    .eq('decision', 'opt_in')

  if (optInsError) {
    console.error('Error fetching opt-ins:', optInsError)
    return
  }

  const successfulPayments = optIns.filter(optIn => optIn.payment_status === 'succeeded')

  if (successfulPayments.length === 2) {
    // Both payments succeeded - create conversation if not already created
    await createMatchConversation(supabaseClient, matchId)
  }
}

async function handlePaymentFailed(supabaseClient: any, paymentIntent: Stripe.PaymentIntent) {
  // Update payment status
  const { error: updateError } = await supabaseClient
    .from('matcha_opt_ins')
    .update({ payment_status: 'failed' })
    .eq('stripe_payment_intent_id', paymentIntent.id)

  if (updateError) {
    console.error('Error updating payment status:', updateError)
  }
}

async function handlePaymentCanceled(supabaseClient: any, paymentIntent: Stripe.PaymentIntent) {
  // Update payment status
  const { error: updateError } = await supabaseClient
    .from('matcha_opt_ins')
    .update({ payment_status: 'canceled' })
    .eq('stripe_payment_intent_id', paymentIntent.id)

  if (updateError) {
    console.error('Error updating payment status:', updateError)
  }
}

async function handlePaymentRequiresAction(supabaseClient: any, paymentIntent: Stripe.PaymentIntent) {
  // Update payment status
  const { error: updateError } = await supabaseClient
    .from('matcha_opt_ins')
    .update({ payment_status: 'requires_action' })
    .eq('stripe_payment_intent_id', paymentIntent.id)

  if (updateError) {
    console.error('Error updating payment status:', updateError)
  }
}

async function createMatchConversation(supabaseClient: any, matchId: string) {
  // Get match details
  const { data: match, error: matchError } = await supabaseClient
    .from('matcha_match_candidates')
    .select('*')
    .eq('id', matchId)
    .single()

  if (matchError || !match) {
    console.error('Error fetching match:', matchError)
    return
  }

  // Check if conversation already exists
  const { data: existingConversation } = await supabaseClient
    .from('conversations')
    .select('id')
    .eq('matcha_match_id', matchId)
    .single()

  if (existingConversation) {
    console.log('Conversation already exists for match:', matchId)
    return
  }

  // Create conversation
  const { data: conversation, error: conversationError } = await supabaseClient
    .from('conversations')
    .insert({
      user_a: Math.min(match.user_a, match.user_b),
      user_b: Math.max(match.user_a, match.user_b),
      conversation_type: 'matcha',
      matcha_match_id: matchId,
      ai_present: true,
      status: 'active'
    })
    .select()
    .single()

  if (conversationError) {
    console.error('Error creating conversation:', conversationError)
    return
  }

  // Update match status to converted
  await supabaseClient
    .from('matcha_match_candidates')
    .update({ status: 'converted' })
    .eq('id', matchId)

  // Generate AI intro message
  await generateAIIntroMessage(supabaseClient, conversation.id, match.user_a, match.user_b, match.reasons)

  console.log('Successfully created conversation for match:', matchId)
}

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

  let introText = `Welcome to your Flock connection, ${userA.first_name} and ${userB.first_name}!\n\n`

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

  introText += `Feel free to plan a meetup when you're both ready. I'll step back now and let you two connect!`

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