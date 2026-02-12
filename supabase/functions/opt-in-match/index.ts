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

    console.log('Opt-in request - user:', user.id.substring(0, 8))
    console.log('Request body:', JSON.stringify(requestBody, null, 2))
    console.log('Extracted match_id:', match_id)
    console.log('Match_id type:', typeof match_id)
    console.log('Match_id length:', match_id?.length)

    if (!match_id) {
      console.error('Opt-in error: match_id is required')
      throw new Error('match_id is required')
    }

    // Check if user has reached chat limit (3 active chats)
    const { data: activeChatCount } = await supabaseClient
      .rpc('count_active_match_chats', { user_uuid: user.id })

    if (activeChatCount >= 3) {
      throw new Error('Maximum active chats reached (3)')
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

    // Check if match has expired
    if (new Date(match.expires_at) < new Date()) {
      throw new Error('Match has expired')
    }

    // Check if user already opted in
    const { data: existingOptIn } = await supabaseClient
      .from('opt_ins')
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
      .from('opt_ins')
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
    
    // Only update status if it's not already in a converted state
    // This prevents overwriting 'converted' status if both users opted in simultaneously
    const { data: updateData, error: updateError } = await supabaseClient
      .from('match_candidates')
      .update({ status: newStatus })
      .eq('id', match_id)
      .neq('status', 'converted') // Don't overwrite if already converted
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
    console.log(`=== CHECKING FOR OTHER USER OPT-IN ===`)
    console.log(`match_id=${match_id}`)
    console.log(`currentUserId=${user.id}`)
    console.log(`otherUserId=${otherUserId}`)
    console.log(`isUserA=${isUserA}`)
    
    const { data: otherOptIn, error: otherOptInError } = await supabaseClient
      .from('opt_ins')
      .select('*')
      .eq('match_id', match_id)
      .eq('user_id', otherUserId)
      .eq('decision', 'opt_in')
      .maybeSingle() // Use maybeSingle() instead of single() to avoid errors if not found

    if (otherOptInError) {
      console.error('ERROR checking for other opt-in:', otherOptInError)
    }

    console.log(`Other opt-in check result:`, otherOptIn ? `FOUND - ${JSON.stringify(otherOptIn)}` : 'NOT FOUND')
    console.log(`otherOptIn is truthy: ${!!otherOptIn}`)

    let chatCreated = false

    if (otherOptIn) {
      console.log(`=== BOTH USERS OPTED IN - CREATING CONVERSATION ===`)
      // Both users have opted in - create chat
      // First check if conversation already exists (race condition protection)
      const { data: existingConversation } = await supabaseClient
        .from('conversations')
        .select('id, user_a, user_b')
        .eq('match_id', match_id)
        .maybeSingle()
      
      if (existingConversation) {
        console.log(`Conversation already exists for match ${match_id}:`, existingConversation.id)
        console.log(`Existing conversation - user_a: ${existingConversation.user_a}, user_b: ${existingConversation.user_b}`)
        
        // CRITICAL: Verify the existing conversation has valid user IDs
        if (!existingConversation.user_a || !existingConversation.user_b) {
          console.error('ERROR: Existing conversation has null user IDs! Deleting and recreating...')
          // Delete the broken conversation
          await supabaseClient
            .from('conversations')
            .delete()
            .eq('id', existingConversation.id)
          
          console.log('Deleted broken conversation, will create new one')
          // Fall through to create a new conversation
        } else {
          // Conversation exists and is valid - but do one more explicit check
          const existingUserA = existingConversation.user_a
          const existingUserB = existingConversation.user_b
          const existingHasValidUserA = existingUserA != null && existingUserA !== '' && typeof existingUserA === 'string'
          const existingHasValidUserB = existingUserB != null && existingUserB !== '' && typeof existingUserB === 'string'
          
          console.log('Existing conversation check - userA:', existingUserA, 'userB:', existingUserB)
          console.log('Existing conversation check - validA:', existingHasValidUserA, 'validB:', existingHasValidUserB)
          
          if (!existingHasValidUserA || !existingHasValidUserB) {
            console.error('ERROR: Existing conversation validation failed! Deleting...')
            await supabaseClient
              .from('conversations')
              .delete()
              .eq('id', existingConversation.id)
            console.log('Deleted invalid existing conversation, will create new one')
            // Fall through to create a new conversation
          } else {
            // Conversation exists and is valid
            console.log('Existing conversation is valid')
            chatCreated = true
          }
        }
      }
      
      // Only create new conversation if one doesn't exist or the existing one was broken
      if (!chatCreated) {
        // Create conversation with consistent ordering (user_a < user_b alphabetically)
        // Ensure we have valid UUID strings
        if (!user.id || typeof user.id !== 'string' || user.id.trim() === '') {
          console.error('ERROR: user.id is invalid:', user.id)
          throw new Error('Invalid current user ID')
        }
        
        if (!otherUserId || typeof otherUserId !== 'string' || otherUserId.trim() === '') {
          console.error('ERROR: otherUserId is invalid:', otherUserId)
          throw new Error('Invalid other user ID')
        }
        
        const orderedUserA = user.id < otherUserId ? user.id : otherUserId
        const orderedUserB = user.id < otherUserId ? otherUserId : user.id
        
        console.log(`Creating conversation for match ${match_id}`)
        console.log(`User IDs: user.id=${user.id} (type: ${typeof user.id}), otherUserId=${otherUserId} (type: ${typeof otherUserId})`)
        console.log(`Ordered: user_a=${orderedUserA}, user_b=${orderedUserB}`)
        
        // Double-check the values are valid UUIDs
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        if (!uuidRegex.test(orderedUserA) || !uuidRegex.test(orderedUserB)) {
          console.error('ERROR: Invalid UUID format!')
          console.error(`orderedUserA: ${orderedUserA}, matches: ${uuidRegex.test(orderedUserA)}`)
          console.error(`orderedUserB: ${orderedUserB}, matches: ${uuidRegex.test(orderedUserB)}`)
          throw new Error('Invalid UUID format for user IDs')
        }
        
        // Use Supabase JS client - ensure UUIDs are properly formatted as strings
        console.log('Creating conversation with Supabase JS client')
        console.log('Insert params - user_a:', orderedUserA, 'type:', typeof orderedUserA)
        console.log('Insert params - user_b:', orderedUserB, 'type:', typeof orderedUserB)
        console.log('Insert params - match_id:', match_id, 'type:', typeof match_id)
        
        // Ensure all UUIDs are strings (Supabase client expects strings for UUID columns)
        const userAString = String(orderedUserA)
        const userBString = String(orderedUserB)
        const matchIdString = String(match_id)
        
        console.log('UUID string conversion:')
        console.log(`  orderedUserA: ${orderedUserA} -> ${userAString} (type: ${typeof userAString})`)
        console.log(`  orderedUserB: ${orderedUserB} -> ${userBString} (type: ${typeof userBString})`)
        console.log(`  match_id: ${match_id} -> ${matchIdString} (type: ${typeof matchIdString})`)
        
        const insertPayload = {
          user_a: userAString,
          user_b: userBString,
          conversation_type: 'match',
          match_id: matchIdString,
          ai_present: true,
          status: 'active'
        }
        
        console.log('Insert payload (raw):', insertPayload)
        console.log('Insert payload (JSON):', JSON.stringify(insertPayload, null, 2))
        console.log('Insert payload user_a value:', insertPayload.user_a, 'type:', typeof insertPayload.user_a)
        console.log('Insert payload user_b value:', insertPayload.user_b, 'type:', typeof insertPayload.user_b)
        
        const { data: conversation, error: conversationError } = await supabaseClient
          .from('conversations')
          .insert(insertPayload)
          .select('id, user_a, user_b, match_id, status, created_at')
          .single()
        
        console.log('Insert response - error:', conversationError)
        console.log('Insert response - data:', JSON.stringify(conversation, null, 2))
        if (conversation) {
          console.log('Insert response - user_a:', conversation.user_a, 'type:', typeof conversation.user_a, 'isNull:', conversation.user_a === null)
          console.log('Insert response - user_b:', conversation.user_b, 'type:', typeof conversation.user_b, 'isNull:', conversation.user_b === null)
        }

        if (conversationError) {
          console.error('Error creating conversation:', conversationError)
          // If it's a duplicate key error, conversation was created by the other request
          if (conversationError.code === '23505' || conversationError.message?.includes('duplicate')) {
            console.log('Conversation already exists (duplicate key error), treating as success')
            chatCreated = true
          } else {
            throw conversationError
          }
        } else {
          console.log(`Insert response - conversation:`, JSON.stringify(conversation, null, 2))
          console.log(`Insert response - conversation keys:`, Object.keys(conversation || {}))
          console.log(`Insert response - user_a value:`, conversation?.user_a, `type:`, typeof conversation?.user_a, `isNull:`, conversation?.user_a === null)
          console.log(`Insert response - user_b value:`, conversation?.user_b, `type:`, typeof conversation?.user_b, `isNull:`, conversation?.user_b === null)
          
          // CRITICAL: Verify the conversation was created with correct values immediately
          // Check for null, undefined, or empty string - be very explicit
          const userAValue = conversation?.user_a
          const userBValue = conversation?.user_b
          
          console.log('Verification check - userAValue:', userAValue, 'type:', typeof userAValue, 'isNull:', userAValue === null, 'isUndefined:', userAValue === undefined)
          console.log('Verification check - userBValue:', userBValue, 'type:', typeof userBValue, 'isNull:', userBValue === null, 'isUndefined:', userBValue === undefined)
          
          // Explicit check: value must exist, not be null, not be undefined, and not be empty string
          const hasValidUserA = userAValue != null && userAValue !== '' && typeof userAValue === 'string'
          const hasValidUserB = userBValue != null && userBValue !== '' && typeof userBValue === 'string'
          
          console.log(`Verification result - hasValidUserA: ${hasValidUserA}, hasValidUserB: ${hasValidUserB}`)
          
          if (!conversation || !hasValidUserA || !hasValidUserB) {
            const errorMsg = `CRITICAL ERROR: Conversation insert returned null/undefined/empty user IDs!`
            console.error(errorMsg)
            console.error('Conversation object:', JSON.stringify(conversation, null, 2))
            console.error('Insert payload that was sent:', JSON.stringify(insertPayload, null, 2))
            console.error(`userAValue: ${userAValue}, userBValue: ${userBValue}`)
            console.error(`hasValidUserA: ${hasValidUserA}, hasValidUserB: ${hasValidUserB}`)
            
            // Delete the broken conversation immediately if it exists
            if (conversation?.id) {
              try {
                await supabaseClient
                  .from('conversations')
                  .delete()
                  .eq('id', conversation.id)
                console.log('Deleted broken conversation:', conversation.id)
              } catch (deleteError) {
                console.error('Error deleting broken conversation:', deleteError)
              }
            }
            
            // This error MUST be thrown to prevent chat_created from being set to true
            const error = new Error(`${errorMsg} userA: ${userAValue}, userB: ${userBValue}, Insert payload: ${JSON.stringify(insertPayload)}`)
            console.error('THROWING ERROR - THIS MUST STOP EXECUTION:', error.message)
            throw error
          }
          
          console.log('✓ First verification passed - conversation response has valid user IDs')
          
          // Double-check by fetching the conversation back from the database
          console.log('Fetching conversation from DB to verify...')
          const { data: verifyConversation, error: verifyError } = await supabaseClient
            .from('conversations')
            .select('id, user_a, user_b, match_id')
            .eq('id', conversation.id)
            .single()
          
          if (verifyError) {
            console.error('ERROR: Could not verify conversation after creation:', verifyError)
            const error = new Error(`Failed to verify conversation creation: ${verifyError.message}`)
            console.error('THROWING ERROR:', error.message)
            throw error
          }
          
          if (!verifyConversation) {
            console.error('ERROR: Verification query returned null!')
            const error = new Error('Failed to verify conversation creation - query returned null')
            console.error('THROWING ERROR:', error.message)
            throw error
          }
          
          console.log('Verification query result:', JSON.stringify(verifyConversation, null, 2))
          
          // Check for null, undefined, or empty string in verification - be very explicit
          const verifyUserAValue = verifyConversation.user_a
          const verifyUserBValue = verifyConversation.user_b
          
          console.log('Second verification check - verifyUserAValue:', verifyUserAValue, 'type:', typeof verifyUserAValue, 'isNull:', verifyUserAValue === null)
          console.log('Second verification check - verifyUserBValue:', verifyUserBValue, 'type:', typeof verifyUserBValue, 'isNull:', verifyUserBValue === null)
          
          // Explicit check: value must exist, not be null, not be undefined, and not be empty string
          const verifyHasValidUserA = verifyUserAValue != null && verifyUserAValue !== '' && typeof verifyUserAValue === 'string'
          const verifyHasValidUserB = verifyUserBValue != null && verifyUserBValue !== '' && typeof verifyUserBValue === 'string'
          
          console.log(`Second verification result - verifyHasValidUserA: ${verifyHasValidUserA}, verifyHasValidUserB: ${verifyHasValidUserB}`)
          
          if (!verifyHasValidUserA || !verifyHasValidUserB) {
            const errorMsg = `CRITICAL ERROR: Database returned conversation with null/empty user IDs!`
            console.error(errorMsg)
            console.error('Verified conversation from DB:', JSON.stringify(verifyConversation, null, 2))
            console.error('Original insert payload:', JSON.stringify(insertPayload, null, 2))
            console.error('Conversation ID:', conversation.id)
            console.error(`verifyUserAValue: ${verifyUserAValue}, verifyUserBValue: ${verifyUserBValue}`)
            console.error(`verifyHasValidUserA: ${verifyHasValidUserA}, verifyHasValidUserB: ${verifyHasValidUserB}`)
            
            // Delete the broken conversation
            try {
              await supabaseClient
                .from('conversations')
                .delete()
                .eq('id', conversation.id)
              console.log('Deleted broken conversation from DB:', conversation.id)
            } catch (deleteError) {
              console.error('Error deleting broken conversation:', deleteError)
            }
            
            // This error MUST be thrown to prevent chat_created from being set to true
            const error = new Error(`${errorMsg} This should never happen if insert data was correct.`)
            console.error('THROWING ERROR:', error.message)
            throw error
          }
          
          console.log('✓ Conversation verified successfully in database')
          console.log(`✓ user_a: ${verifyConversation.user_a}, user_b: ${verifyConversation.user_b}`)
          
          // FINAL SAFETY CHECK: One more explicit verification before setting chatCreated
          const finalUserA = verifyConversation.user_a
          const finalUserB = verifyConversation.user_b
          const finalHasValidUserA = finalUserA != null && finalUserA !== '' && typeof finalUserA === 'string'
          const finalHasValidUserB = finalUserB != null && finalUserB !== '' && typeof finalUserB === 'string'
          
          if (!finalHasValidUserA || !finalHasValidUserB) {
            const finalErrorMsg = `FINAL CHECK FAILED: Conversation verification passed but final check failed!`
            console.error(finalErrorMsg)
            console.error(`finalUserA: ${finalUserA}, finalUserB: ${finalUserB}`)
            console.error(`finalHasValidUserA: ${finalHasValidUserA}, finalHasValidUserB: ${finalHasValidUserB}`)
            
            // Delete the broken conversation
            try {
              await supabaseClient
                .from('conversations')
                .delete()
                .eq('id', conversation.id)
              console.log('Deleted broken conversation in final check:', conversation.id)
            } catch (deleteError) {
              console.error('Error deleting broken conversation in final check:', deleteError)
            }
            
            throw new Error(`${finalErrorMsg} This should never happen.`)
          }
          
          chatCreated = true
          
          // Update match to converted BEFORE AI intro so we never skip it if generateAIIntroMessage throws
          const { data: updateStatusData, error: updateStatusError } = await supabaseClient
            .from('match_candidates')
            .update({ status: 'converted' })
            .eq('id', String(match_id))
            .neq('status', 'converted')
            .select('id, status')
          if (updateStatusError) {
            console.error('Error updating match status to converted:', updateStatusError)
          } else if (updateStatusData && updateStatusData.length > 0) {
            console.log(`Successfully updated match ${match_id} status to converted. Updated rows: ${updateStatusData.length}`)
          } else {
            console.log(`Match ${match_id} already converted or update returned no rows`)
          }

          // Generate and send AI intro message (only for newly created conversations)
          try {
            await generateAIIntroMessage(supabaseClient, conversation.id, user.id, otherUserId, match.reasons)
          } catch (introErr) {
            console.error('AI intro message failed (conversation and match status already set):', introErr)
          }
        }
      }
      
      // Update match status to converted if conversation exists (existing-conversation path only; new-conversation path already updated above)
      if (chatCreated) {
        const { data: updateStatusData, error: updateStatusError } = await supabaseClient
          .from('match_candidates')
          .update({ status: 'converted' })
          .eq('id', String(match_id))
          .neq('status', 'converted') // Don't update if already converted
          .select('id, status')
        
        if (updateStatusError) {
          console.error('Error updating match status to converted:', updateStatusError)
          // Don't throw - conversation was created, this is just status update
        } else {
          if (updateStatusData && updateStatusData.length > 0) {
            console.log(`Successfully updated match ${match_id} status to converted. Updated rows: ${updateStatusData.length}`)
            console.log(`Verification - match status after update: ${updateStatusData[0].status}`)
          } else {
            // Check if it's already converted
            const { data: currentMatch } = await supabaseClient
              .from('match_candidates')
              .select('status')
              .eq('id', String(match_id))
              .single()
            
            if (currentMatch?.status === 'converted') {
              console.log(`Match ${match_id} is already converted, no update needed`)
            } else {
              console.error(`WARNING: Update to converted returned no rows! Match status: ${currentMatch?.status}`)
            }
          }
        }
      }
    }

    const responsePayload = { 
      success: true,
      chat_created: chatCreated,
      waiting_for_other: !chatCreated
    }
    
    console.log('=== RETURNING RESPONSE ===')
    console.log('chatCreated value:', chatCreated)
    console.log('Response payload:', JSON.stringify(responsePayload, null, 2))
    
    return new Response(
      JSON.stringify(responsePayload),
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
    .select('id, first_name')
    .in('id', [userAId, userBId])

  if (profilesError) {
    console.error('Error fetching profiles for AI intro:', profilesError)
    return
  }

  const userA = profiles.find(p => p.id === userAId)
  const userB = profiles.find(p => p.id === userBId)

  // Generate intro message based on match reasons
  const sharedInterests = matchReasons?.shared_interests || []

  let introText = `${userA.first_name} and ${userB.first_name}, welcome to your Cove connection!\n\n`

  // Acknowledge mutual opt-in
  introText += `You both opted in to connect, which is great.\n\n`

  // Reference shared interests if available
  if (sharedInterests.length > 0) {
    if (sharedInterests.length === 1) {
      introText += `You both share an interest in ${sharedInterests[0]}, which could be a great starting point for your conversation.\n\n`
    } else if (sharedInterests.length === 2) {
      introText += `You both enjoy ${sharedInterests[0]} and ${sharedInterests[1]}, which could be great starting points for your conversation.\n\n`
    } else {
      const interestsList = sharedInterests.slice(0, 3).join(', ')
      introText += `You both share interests in ${interestsList}, which could be great starting points for your conversation.\n\n`
    }
  }

  introText += `Feel free to start the conversation whenever you're ready. I'm here if you need help finding meetup spots or conversation ideas.`

  // Insert AI message
  const { error: messageError } = await supabaseClient
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_type: 'ai',
      sender_id: null,
      text: introText,
      metadata: { type: 'match_intro' }
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