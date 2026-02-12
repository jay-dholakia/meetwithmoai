import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Helper to calculate midpoint between two coordinates
function calculateMidpoint(lat1: number, lng1: number, lat2: number, lng2: number): { lat: number; lng: number } {
  return {
    lat: (lat1 + lat2) / 2,
    lng: (lng1 + lng2) / 2
  }
}

// Helper to calculate distance between two points (Haversine formula)
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371 // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// Query Google Places API for nearby places
async function searchPlaces(
  query: string,
  location: { lat: number; lng: number },
  radius: number = 5000 // 5km default radius
): Promise<any[]> {
  const apiKey = Deno.env.get('GOOGLE_PLACES_API_KEY')
  if (!apiKey) {
    console.error('Google Places API key not configured')
    return []
  }

  try {
    // First, do a text search for the query near the location
    const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&location=${location.lat},${location.lng}&radius=${radius}&key=${apiKey}`
    
    console.log('Searching Google Places API:', { query, location, radius })
    const response = await fetch(searchUrl)
    const data = await response.json()
    
    console.log('Google Places API response status:', data.status)
    console.log('Google Places API results count:', data.results?.length || 0)

    if (data.status === 'OK' && data.results) {
      // Get details for top 5 results
      const topResults = data.results.slice(0, 5)
      const placesWithDetails = await Promise.all(
        topResults.map(async (place: any) => {
          // Get place details for more info
          const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=name,formatted_address,rating,user_ratings_total,opening_hours,types&key=${apiKey}`
          const detailsResponse = await fetch(detailsUrl)
          const detailsData = await detailsResponse.json()
          
          if (detailsData.status === 'OK' && detailsData.result) {
            const distance = calculateDistance(
              location.lat,
              location.lng,
              place.geometry.location.lat,
              place.geometry.location.lng
            )
            
            // Generate Google Maps URL
            const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.geometry.location.lat)},${encodeURIComponent(place.geometry.location.lng)}&query_place_id=${place.place_id}`
            
            // Distance is from search center (midpoint); show in miles
            const distanceMiles = Math.round(distance * 0.621371 * 10) / 10
            return {
              name: detailsData.result.name,
              address: detailsData.result.formatted_address,
              rating: detailsData.result.rating,
              ratingCount: detailsData.result.user_ratings_total,
              distance: Math.round(distance * 10) / 10,
              distanceMiles,
              isOpen: detailsData.result.opening_hours?.open_now,
              types: detailsData.result.types,
              mapsUrl: mapsUrl,
              placeId: place.place_id
            }
          }
          return null
        })
      )
      
      return placesWithDetails.filter((p: any) => p !== null)
    }
    
    return []
  } catch (error) {
    console.error('Error querying Google Places API:', error)
    return []
  }
}

// Detect if the question is location-based
function isLocationQuery(question: string): boolean {
  const locationKeywords = [
    'coffee shop', 'coffee', 'cafe', 'restaurant', 'meetup', 'meet up',
    'place to meet', 'where to meet', 'between us', 'nearby', 'close to',
    'location', 'spot', 'venue', 'bar', 'park', 'activity', 'things to do'
  ]
  const lowerQuestion = question.toLowerCase()
  return locationKeywords.some(keyword => lowerQuestion.includes(keyword))
}

// Generate Cora's response using OpenAI
async function generateCoraResponse(
  question: string,
  userA: { first_name: string; city: string | null },
  userB: { first_name: string; city: string | null },
  places: any[],
  isLocationQuery: boolean,
  usedCoordinates: boolean
): Promise<string> {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
  if (!openaiApiKey) {
    console.error('OpenAI API key not configured')
    return "I'm sorry, I'm having trouble processing that right now. Please try again later."
  }

  try {
    let systemPrompt = `You are Cora, a thoughtful and helpful AI assistant for Cove, a friendship connection app. You help people who have matched and opted in to connect with each other. You're warm, friendly, and genuinely helpful.

Your role is to:
- Help users find good places to meet up (coffee shops, restaurants, activities, etc.)
- Provide thoughtful suggestions based on their locations
- Be conversational and natural, not robotic
- Use both users' names naturally
- Keep responses concise but helpful (2-4 sentences typically)
- IMPORTANT: Never use the word "date" - these are meetups between friends, not dates. Use "meetup", "get together", "meet", or "hang out" instead.`

    let userPrompt = `${userA.first_name} and ${userB.first_name} are chatting in a Cove connection. `

    if (userA.city && userB.city) {
      userPrompt += `${userA.first_name} is in ${userA.city} and ${userB.first_name} is in ${userB.city}. `
    }

    userPrompt += `\n\nThey asked: "${question}"\n\n`

    if (isLocationQuery && places.length > 0) {
      if (usedCoordinates) {
        userPrompt += `I searched for places from the midpoint between them and found these spots:\n\n`
      } else {
        userPrompt += `I found these places:\n\n`
      }
      
      places.forEach((place, index) => {
        userPrompt += `${index + 1}. ${place.name}`
        if (place.distanceMiles !== undefined) {
          userPrompt += ` (${place.distanceMiles} mi from midpoint)`
        }
        userPrompt += `\n   Maps URL: ${place.mapsUrl}\n\n`
      })
      
      userPrompt += `\nIMPORTANT: Format your response in a clear, brief way:\n`
      userPrompt += `- Start with a warm greeting\n`
      userPrompt += `- Present 2-3 of the best options briefly\n`
      userPrompt += `- For each place mention ONLY the place name and distance from the midpoint in miles (e.g. "0.4 mi away"). Do NOT include addresses or star ratings - the name is the link.\n`
      userPrompt += `- Use line breaks to separate each option\n`
      userPrompt += `- Keep it conversational and brief - don't include status (open/closed) information\n`
      userPrompt += `- DO NOT include the full Google Maps URLs in your response text - just mention the place names naturally\n`
    } else if (isLocationQuery && places.length === 0) {
      if (usedCoordinates) {
        userPrompt += `I searched using their precise locations but couldn't find specific places in that area. Please provide a helpful response about meeting up, suggesting general types of places or activities they might enjoy together based on their cities.`
      } else {
        userPrompt += `I couldn't find specific places, but please still provide a helpful response about meeting up. Maybe suggest general types of places or activities they might enjoy together.`
      }
    } else {
      userPrompt += `Please provide a helpful, thoughtful response to their question. Be warm and conversational. Never use the word "date" - use "meetup", "get together", "meet", or "hang out" instead.`
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 300,
        temperature: 0.7,
      }),
    })

    const data = await response.json()
    
    if (data.choices && data.choices[0] && data.choices[0].message) {
      return data.choices[0].message.content.trim()
    }
    
    throw new Error('Invalid response from OpenAI')
  } catch (error) {
    console.error('Error generating Cora response:', error)
    return "I'm sorry, I'm having trouble processing that right now. Please try again later."
  }
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

    const { conversationId, question } = await req.json()

    if (!conversationId || !question) {
      throw new Error('conversationId and question are required')
    }

    // Get conversation details
    const { data: conversation, error: convError } = await supabaseClient
      .from('conversations')
      .select('id, user_a, user_b')
      .eq('id', conversationId)
      .single()

    if (convError || !conversation) {
      throw new Error('Conversation not found')
    }

    // Verify user is part of this conversation
    if (conversation.user_a !== user.id && conversation.user_b !== user.id) {
      throw new Error('Unauthorized')
    }

    // Get both users' profiles with location data
    const { data: profiles, error: profilesError } = await supabaseClient
      .from('profiles')
      .select('id, first_name, city, lat, lng')
      .in('id', [conversation.user_a, conversation.user_b])

    if (profilesError || !profiles || profiles.length !== 2) {
      throw new Error('Failed to fetch user profiles')
    }

    const userA = profiles.find(p => p.id === conversation.user_a)!
    const userB = profiles.find(p => p.id === conversation.user_b)!

    // Log location data for debugging
    console.log('User A location:', { lat: userA.lat, lng: userA.lng, city: userA.city })
    console.log('User B location:', { lat: userB.lat, lng: userB.lng, city: userB.city })

    // Check if it's a location-based query
    const isLocation = isLocationQuery(question)
    let places: any[] = []
    let usedCoordinates = false

    if (isLocation && userA.lat && userA.lng && userB.lat && userB.lng) {
      usedCoordinates = true
      console.log('Using coordinates for location search')
      // Calculate midpoint
      const midpoint = calculateMidpoint(userA.lat, userA.lng, userB.lat, userB.lng)
      console.log('Calculated midpoint:', midpoint)
      
      // Determine search query from the question
      let searchQuery = 'coffee shop'
      const lowerQuestion = question.toLowerCase()
      if (lowerQuestion.includes('coffee') || lowerQuestion.includes('cafe')) {
        searchQuery = 'coffee shop'
      } else if (lowerQuestion.includes('restaurant') || lowerQuestion.includes('food')) {
        searchQuery = 'restaurant'
      } else if (lowerQuestion.includes('park')) {
        searchQuery = 'park'
      } else if (lowerQuestion.includes('bar')) {
        searchQuery = 'bar'
      } else if (lowerQuestion.includes('activity') || lowerQuestion.includes('things to do')) {
        searchQuery = 'activities'
      } else {
        // Default to coffee shops for meetups
        searchQuery = 'coffee shop'
      }

      // Search for places
      places = await searchPlaces(searchQuery, midpoint, 10000) // 10km radius
      console.log(`Found ${places.length} places for query: ${searchQuery}`)
      if (places.length > 0) {
        console.log('Sample place:', places[0])
      } else {
        console.log('No places found - Google Places API may have returned empty results')
      }
    } else {
      console.log('Not using coordinates - missing lat/lng or not a location query')
      console.log('Has coordinates:', { userA: !!(userA.lat && userA.lng), userB: !!(userB.lat && userB.lng) })
      console.log('Is location query:', isLocation)
    }

    // Generate Cora's response
    console.log('Generating Cora response with:', { placesCount: places.length, usedCoordinates })
    const coraResponse = await generateCoraResponse(
      question,
      { first_name: userA.first_name, city: userA.city },
      { first_name: userB.first_name, city: userB.city },
      places,
      isLocation,
      usedCoordinates
    )

    // Insert Cora's response as an AI message
    // Include places data in metadata for potential future use (like making addresses clickable)
    const { error: messageError } = await supabaseClient
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_type: 'ai',
        sender_id: null,
        text: coraResponse,
        metadata: { 
          type: 'cora_response', 
          original_question: question,
          places: places.length > 0 ? places.map(p => ({
            name: p.name,
            mapsUrl: p.mapsUrl,
            distanceMiles: p.distanceMiles
          })) : null
        }
      })

    if (messageError) {
      console.error('Error inserting Cora response:', messageError)
      throw new Error('Failed to save Cora response')
    }

    return new Response(
      JSON.stringify({ success: true, response: coraResponse }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in ask-cora:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
