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
    // Create Supabase client with service role key for admin operations
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Calculate the cutoff date (30 days ago)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const cutoffDate = thirtyDaysAgo.toISOString()

    console.log(`Archiving conversations with no activity since ${cutoffDate}`)

    // Find all active conversations with no activity in the last 30 days
    const { data: inactiveConversations, error: findError } = await supabaseClient
      .from('conversations')
      .select('id, user_a, user_b, last_activity_at, status')
      .eq('status', 'active')
      .lt('last_activity_at', cutoffDate)

    if (findError) {
      throw findError
    }

    if (!inactiveConversations || inactiveConversations.length === 0) {
      console.log('No inactive conversations to archive')
      return new Response(
        JSON.stringify({ 
          success: true,
          archived_count: 0,
          message: 'No inactive conversations found'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Found ${inactiveConversations.length} inactive conversations to archive`)

    // Archive all inactive conversations
    const conversationIds = inactiveConversations.map(c => c.id)
    const { data: updateData, error: updateError } = await supabaseClient
      .from('conversations')
      .update({ status: 'archived' })
      .in('id', conversationIds)
      .eq('status', 'active')
      .select('id')

    if (updateError) {
      throw updateError
    }

    const archivedCount = updateData?.length || 0

    console.log(`Successfully archived ${archivedCount} conversations`)

    return new Response(
      JSON.stringify({ 
        success: true,
        archived_count: archivedCount,
        message: `Archived ${archivedCount} inactive conversations`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error archiving inactive chats:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
