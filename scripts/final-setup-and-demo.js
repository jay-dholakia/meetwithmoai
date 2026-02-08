// Final script: Generate embeddings for all profiles and demonstrate matching
const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');
require('dotenv').config();

const supabaseUrl = 'https://hgllvhohhyamsbljekrd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhnbGx2aG9oaHlhbXNibGpla3JkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4MTM5NTgsImV4cCI6MjA3MTM4OTk1OH0.VOsDwCxyqCkxuYPuFXCUpw4u2NCC-aX0BhwGJVIMPPY';
const openaiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;

if (!openaiKey) {
  console.error('Missing EXPO_PUBLIC_OPENAI_API_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const openai = new OpenAI({ apiKey: openaiKey });

async function generateEmbedding(text) {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });
  return response.data[0].embedding;
}

async function generateEmbeddingForUser(userId) {
  const { data: intake, error } = await supabase
    .from('intake_responses_v4')
    .select('responses')
    .eq('user_id', userId)
    .single();

  if (error || !intake) {
    return null;
  }

  const openEndedText = intake.responses
    .filter(r => r.type === 'open_ended')
    .map(r => `${r.question_text}: ${r.answer}`)
    .join('\n\n');

  console.log(`   Generating embedding...`);
  const embedding = await generateEmbedding(openEndedText);
  
  const { error: updateError } = await supabase
    .from('intake_responses_v4')
    .update({ embed_vector: `[${embedding.join(',')}]` })
    .eq('user_id', userId);

  if (updateError) {
    console.error(`   Error:`, updateError.message);
    return null;
  }

  return embedding;
}

async function showMatchingResults(userId, userName) {
  console.log(`\n📊 Matching Results for ${userName}:`);
  console.log('=' .repeat(60));
  
  // Get user's matches
  const { data: matches, error } = await supabase
    .from('matcha_match_candidates')
    .select(`
      *,
      user_a_profile:profiles!matcha_match_candidates_user_a_fkey(first_name, last_name, age, city),
      user_b_profile:profiles!matcha_match_candidates_user_b_fkey(first_name, last_name, age, city)
    `)
    .or(`user_a.eq.${userId},user_b.eq.${userId}`)
    .order('score', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Error fetching matches:', error);
    return;
  }

  if (!matches || matches.length === 0) {
    console.log('   No matches yet. Run replenish-matches to generate matches.');
    return;
  }

  matches.forEach((match, i) => {
    const otherUser = match.user_a === userId ? match.user_b_profile : match.user_a_profile;
    const scorePercent = (match.score * 100).toFixed(1);
    
    console.log(`\n${i + 1}. ${otherUser.first_name} ${otherUser.last_name} (Age ${otherUser.age}, ${otherUser.city})`);
    console.log(`   Match Score: ${scorePercent}%`);
    console.log(`   Status: ${match.status}`);
    
    if (match.reasons) {
      if (match.reasons.shared_interests && match.reasons.shared_interests.length > 0) {
        console.log(`   Shared Interests: ${match.reasons.shared_interests.join(', ')}`);
      }
      if (match.reasons.conversation_hooks && match.reasons.conversation_hooks.length > 0) {
        console.log(`   Conversation Hooks: ${match.reasons.conversation_hooks.join(', ')}`);
      }
    }
  });
}

async function main() {
  console.log('🚀 Final Setup: Generate Embeddings & Demonstrate Matching\n');
  
  // Get all users with v4 intake
  const { data: allIntakes } = await supabase
    .from('intake_responses_v4')
    .select('user_id, embed_vector')
    .is('embed_vector', null);
  
  console.log(`Found ${allIntakes?.length || 0} users needing embeddings...\n`);
  
  // Generate embeddings for all users without them
  if (allIntakes && allIntakes.length > 0) {
    for (const intake of allIntakes) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', intake.user_id)
        .single();
      
      if (profile) {
        console.log(`Generating embedding for ${profile.first_name} ${profile.last_name}...`);
        await generateEmbeddingForUser(intake.user_id);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limit
      }
    }
  }
  
  console.log('\n✅ All embeddings generated!\n');
  
  // Now demonstrate matching for Sarah
  const sarahUserId = '59c3821f-e90c-491a-ab54-67f7b200c108';
  
  console.log('🔄 Running matching algorithm for Sarah Chen...');
  const matchResponse = await fetch(`${supabaseUrl}/functions/v1/replenish-matches`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseAnonKey}`,
    },
    body: JSON.stringify({ user_id: sarahUserId }),
  });
  
  const matchResult = await matchResponse.json();
  console.log('Match result:', matchResult);
  
  // Show matching results
  await showMatchingResults(sarahUserId, 'Sarah Chen');
  
  console.log('\n\n📈 How the Matching Algorithm Works:');
  console.log('=' .repeat(60));
  console.log(`
1. **Embedding Similarity (50% weight)**: 
   - Uses OpenAI embeddings to find semantic similarity in open-ended responses
   - Sarah (climate/sustainability) would match well with Chris (climate activism)
   - Higher similarity = higher match score

2. **Structured Filters (must pass)**:
   - Distance: Within drive_distance preference (Sarah: 10 miles)
   - Age: Within age_range_preference (Sarah: within 3 years)
   - Availability: Must have overlapping availability_times
   - Political: If alignment is "Very important", must match classification

3. **Additional Scoring (50% weight)**:
   - Distance proximity (20%)
   - Life stage compatibility (15%)
   - Age similarity (10%)
   - Availability overlap (5%)

4. **Match Reasons**:
   - Shared interests extracted from open-ended responses
   - Conversation hooks based on common topics
   - Life stage matches

The algorithm ensures:
- No duplicates (cooldown system)
- No blocked users
- No users already matched
- Minimum score threshold (0.3)
- Maintains up to 5 active matches per user
  `);
}

main().catch(console.error);
