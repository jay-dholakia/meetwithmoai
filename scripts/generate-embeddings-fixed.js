// Generate embeddings for all users with v4 intake
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

async function main() {
  console.log('🔍 Finding all users with v4 intake...\n');
  
  // Get all users with v4 intake
  const { data: allIntakes, error } = await supabase
    .from('intake_responses_v4')
    .select('user_id, embed_vector');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Found ${allIntakes?.length || 0} users with v4 intake\n`);

  // Get profile names
  const userIds = (allIntakes || []).map(i => i.user_id);
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, first_name, last_name')
    .in('id', userIds);

  const profileMap = {};
  (profiles || []).forEach(p => {
    profileMap[p.id] = `${p.first_name} ${p.last_name}`;
  });

  // Generate embeddings for all users without them
  let count = 0;
  for (const intake of allIntakes || []) {
    const userName = profileMap[intake.user_id] || intake.user_id;
    
    if (intake.embed_vector) {
      console.log(`⏭️  ${userName} already has embedding`);
      continue;
    }
    
    console.log(`\n📝 Processing ${userName}...`);
    const result = await generateEmbeddingForUser(intake.user_id);
    
    if (result) {
      console.log(`   ✅ ${userName} embedding generated`);
      count++;
    }
    
    // Rate limit
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`\n✅ Generated ${count} new embeddings!\n`);
  
  // Now run matching for Sarah
  console.log('🔄 Running matching algorithm for Sarah Chen...');
  const sarahUserId = '59c3821f-e90c-491a-ab54-67f7b200c108';
  
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
  
  // Wait a bit for matches to be created
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Show matches
  const { data: matches } = await supabase
    .from('matcha_match_candidates')
    .select(`
      *,
      user_a_profile:profiles!match_candidates_user_a_fkey(first_name, last_name, age, city),
      user_b_profile:profiles!match_candidates_user_b_fkey(first_name, last_name, age, city)
    `)
    .or(`user_a.eq.${sarahUserId},user_b.eq.${sarahUserId}`)
    .order('score', { ascending: false })
    .limit(5);
  
  console.log('\n📊 Top Matches for Sarah Chen:');
  console.log('='.repeat(60));
  
  if (matches && matches.length > 0) {
    matches.forEach((match, i) => {
      const otherUser = match.user_a === sarahUserId ? match.user_b_profile : match.user_a_profile;
      const scorePercent = (match.score * 100).toFixed(1);
      
      console.log(`\n${i + 1}. ${otherUser.first_name} ${otherUser.last_name} (Age ${otherUser.age}, ${otherUser.city})`);
      console.log(`   Match Score: ${scorePercent}%`);
      console.log(`   Status: ${match.status}`);
      
      if (match.reasons) {
        if (match.reasons.shared_interests && match.reasons.shared_interests.length > 0) {
          console.log(`   Shared Interests: ${match.reasons.shared_interests.slice(0, 3).join(', ')}`);
        }
        if (match.reasons.conversation_hooks && match.reasons.conversation_hooks.length > 0) {
          console.log(`   Conversation Hooks: ${match.reasons.conversation_hooks.slice(0, 2).join(', ')}`);
        }
      }
    });
  } else {
    console.log('   No matches generated yet.');
  }
}

main().catch(console.error);
