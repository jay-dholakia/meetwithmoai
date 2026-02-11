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
    // Create Supabase client with service role key
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Find all expired matches that haven't been converted
    const { data: expiredMatches, error: matchesError } = await supabaseClient
      .from('match_candidates')
      .select('*')
      .lt('expires_at', new Date().toISOString())
      .not('status', 'eq', 'converted')
      .not('status', 'eq', 'expired')

    if (matchesError) throw matchesError

    let processedCount = 0

    for (const match of expiredMatches) {
      try {
        // Get any pending payment intents for this match
        const { data: optIns, error: optInsError } = await supabaseClient
          .from('opt_ins')
          .select('*')
          .eq('match_id', match.id)
          .eq('decision', 'opt_in')
          .in('payment_status', ['authorized', 'pending'])

        if (optInsError) {
          console.error(`Error fetching opt-ins for match ${match.id}:`, optInsError)
          continue
        }

        // Cancel any pending Stripe payment intents
        for (const optIn of optIns) {
          if (optIn.stripe_payment_intent_id) {
            try {
              await stripe.paymentIntents.cancel(optIn.stripe_payment_intent_id)
              console.log(`Canceled payment intent ${optIn.stripe_payment_intent_id}`)
            } catch (stripeError) {
              console.error(`Error canceling payment intent ${optIn.stripe_payment_intent_id}:`, stripeError)
            }
          }
        }

        // Update payment statuses to canceled
        if (optIns.length > 0) {
          await supabaseClient
            .from('opt_ins')
            .update({ payment_status: 'canceled' })
            .eq('match_id', match.id)
            .eq('decision', 'opt_in')
        }

        // Update match status to expired
        const { error: updateError } = await supabaseClient
          .from('match_candidates')
          .update({ status: 'expired' })
          .eq('id', match.id)

        if (updateError) {
          console.error(`Error updating match ${match.id} to expired:`, updateError)
          continue
        }

        // Add to cooldown to prevent immediate re-matching
        // Ensure consistent ordering (user_a < user_b per constraint)
        const orderedUserA = match.user_a < match.user_b ? match.user_a : match.user_b
        const orderedUserB = match.user_a < match.user_b ? match.user_b : match.user_a
        
        const { error: cooldownError } = await supabaseClient
          .from('cooldowns')
          .upsert({
            user_a: orderedUserA,
            user_b: orderedUserB,
            last_matched_at: match.created_at,
            cooldown_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days cooldown for expired matches
          })

        if (cooldownError) {
          console.error(`Error adding cooldown for match ${match.id}:`, cooldownError)
        }

        processedCount++

      } catch (error) {
        console.error(`Error processing expired match ${match.id}:`, error)
      }
    }

    // Note: Replenishment removed - matches are now created weekly in batches

    return new Response(
      JSON.stringify({ 
        success: true, 
        expired_matches: processedCount,
        affected_users: affectedUsers.size
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in expire-matches:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})