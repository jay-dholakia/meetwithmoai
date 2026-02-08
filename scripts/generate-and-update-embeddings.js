// Generate and update embeddings directly in database
const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');
require('dotenv').config();

const supabaseUrl = 'https://hgllvhohhyamsbljekrd.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const openaiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;

if (!openaiKey) {
  console.error('Missing EXPO_PUBLIC_OPENAI_API_KEY');
  process.exit(1);
}

const openai = new OpenAI({ apiKey: openaiKey });
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// User IDs that need embeddings
const userIds = [
  'a59b17b3-2a94-47ba-99bf-4698a3540bb8', // Mike
  'e91c132b-7f7f-420f-930b-295a9ace7693', // Chris
  'aefe665e-cb19-4ca3-ab74-15150104ea35', // Emma
  '66d52eeb-2258-4c5e-8ddd-feeba7784fc7', // Maria
  'f88c1dab-d3c0-41a5-89d6-774d6f0165bd', // David
  '6e56e72b-066f-47f6-ab39-f1e068cadeb2', // Lisa
  '637602f0-af1d-4020-86fb-1653849e9860', // Alex
  '4a862f2c-0690-4c2a-867f-ef9118dc7682', // Jessica
  '63814809-bd8c-4b59-92ad-16ecee81d69d', // James
];

async function generateEmbedding(text) {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });
  return response.data[0].embedding;
}

async function getOpenEndedText(userId) {
  // Use SQL function to get text
  const { data, error } = await supabase.rpc('get_open_ended_text_for_embedding', {
    p_user_id: userId
  });
  
  if (error) {
    console.error(`Error getting text for ${userId}:`, error);
    return null;
  }
  
  return data;
}

async function updateEmbedding(userId, embedding) {
  const { error } = await supabase
    .from('intake_responses_v4')
    .update({ embed_vector: `[${embedding.join(',')}]` })
    .eq('user_id', userId);
  
  if (error) {
    console.error(`Error updating embedding for ${userId}:`, error);
    return false;
  }
  
  return true;
}

async function main() {
  console.log('🚀 Generating and updating embeddings for 9 users...\n');
  
  for (const userId of userIds) {
    console.log(`\n📝 Processing ${userId.substring(0, 8)}...`);
    
    // Get embedding text
    const text = await getOpenEndedText(userId);
    if (!text) {
      console.log(`   ⏭️  Skipping - no text found`);
      continue;
    }
    
    // Generate embedding
    console.log(`   Generating embedding...`);
    const embedding = await generateEmbedding(text);
    console.log(`   ✅ Generated (${embedding.length} dimensions)`);
    
    // Update database
    console.log(`   Updating database...`);
    const success = await updateEmbedding(userId, embedding);
    if (success) {
      console.log(`   ✅ Updated!`);
    } else {
      console.log(`   ❌ Failed to update`);
    }
    
    // Rate limit
    await new Promise(resolve => setTimeout(resolve, 1500));
  }
  
  console.log('\n✅ All embeddings generated and updated!');
}

main().catch(console.error);
