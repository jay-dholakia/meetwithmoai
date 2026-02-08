// Generate embeddings for all users - using direct user IDs
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

// All 10 user IDs that need embeddings
const users = [
  { id: '59c3821f-e90c-491a-ab54-67f7b200c108', name: 'Sarah Chen' },
  { id: 'a59b17b3-2a94-47ba-99bf-4698a3540bb8', name: 'Mike Rodriguez' },
  { id: 'e91c132b-7f7f-420f-930b-295a9ace7693', name: 'Chris Anderson' },
  { id: 'aefe665e-cb19-4ca3-ab74-15150104ea35', name: 'Emma Williams' },
  { id: '66d52eeb-2258-4c5e-8ddd-feeba7784fc7', name: 'Maria Garcia' },
  { id: 'f88c1dab-d3c0-41a5-89d6-774d6f0165bd', name: 'David Thompson' },
  { id: '6e56e72b-066f-47f6-ab39-f1e068cadeb2', name: 'Lisa Patel' },
  { id: '637602f0-af1d-4020-86fb-1653849e9860', name: 'Alex Martinez' },
  { id: '4a862f2c-0690-4c2a-867f-ef9118dc7682', name: 'Jessica Kim' },
  { id: '63814809-bd8c-4b59-92ad-16ecee81d69d', name: 'James Wilson' },
];

async function generateEmbedding(text) {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });
  return response.data[0].embedding;
}

async function generateEmbeddingForUser(userId, userName) {
  // Use RPC or direct SQL to get responses (bypassing RLS)
  // For now, let's try with the client - if RLS blocks, we'll use MCP SQL
  const { data: intake, error } = await supabase
    .from('intake_responses_v4')
    .select('responses')
    .eq('user_id', userId)
    .single();

  if (error) {
    console.error(`   Error fetching ${userName}:`, error.message);
    // Try via MCP SQL instead
    return null;
  }

  if (!intake || !intake.responses) {
    console.error(`   No responses found for ${userName}`);
    return null;
  }

  const openEndedText = intake.responses
    .filter(r => r.type === 'open_ended')
    .map(r => `${r.question_text}: ${r.answer}`)
    .join('\n\n');

  console.log(`   Generating embedding (${openEndedText.length} chars)...`);
  const embedding = await generateEmbedding(openEndedText);
  
  const { error: updateError } = await supabase
    .from('intake_responses_v4')
    .update({ embed_vector: `[${embedding.join(',')}]` })
    .eq('user_id', userId);

  if (updateError) {
    console.error(`   Error updating ${userName}:`, updateError.message);
    return null;
  }

  console.log(`   ✅ ${userName} embedding generated`);
  return embedding;
}

async function main() {
  console.log('🚀 Generating embeddings for all 10 profiles...\n');
  
  let successCount = 0;
  
  for (const user of users) {
    console.log(`\n📝 Processing ${user.name} (${user.id.substring(0, 8)}...)...`);
    const result = await generateEmbeddingForUser(user.id, user.name);
    
    if (result) {
      successCount++;
    }
    
    // Rate limit to avoid OpenAI throttling
    await new Promise(resolve => setTimeout(resolve, 1500));
  }

  console.log(`\n✅ Generated ${successCount}/${users.length} embeddings!\n`);
  
  if (successCount === users.length) {
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
    
    // Wait for matches to be created
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Show matches via SQL query
    console.log('\n📊 Checking matches...');
    console.log('   (Matches will be shown in the next step)');
  }
}

main().catch(console.error);
