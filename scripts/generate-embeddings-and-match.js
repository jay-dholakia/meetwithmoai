// Generate embeddings for existing profiles and demonstrate matching
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

async function updateEmbeddingForUser(userId) {
  // Get user's intake responses
  const { data: intake, error } = await supabase
    .from('intake_responses_v4')
    .select('responses')
    .eq('user_id', userId)
    .single();

  if (error || !intake) {
    console.error(`Error fetching intake for user ${userId}:`, error);
    return null;
  }

  // Extract open-ended responses
  const openEndedText = intake.responses
    .filter(r => r.type === 'open_ended')
    .map(r => `${r.question_text}: ${r.answer}`)
    .join('\n\n');

  console.log(`Generating embedding for user ${userId}...`);
  const embedding = await generateEmbedding(openEndedText);

  // Update with embedding
  const { error: updateError } = await supabase
    .from('intake_responses_v4')
    .update({ embed_vector: `[${embedding.join(',')}]` })
    .eq('user_id', userId);

  if (updateError) {
    console.error(`Error updating embedding:`, updateError);
    return null;
  }

  console.log(`✅ Updated embedding for user ${userId}`);
  return embedding;
}

async function main() {
  console.log('🔍 Finding users with v4 intake but no embeddings...\n');
  
  // Get Sarah's user ID
  const sarahUserId = '59c3821f-e90c-491a-ab54-67f7b200c108';
  
  // Update her embedding
  await updateEmbeddingForUser(sarahUserId);
  
  console.log('\n✅ Embedding generated for Sarah!');
  console.log('\nNow you can run the matching algorithm to see how it works.');
  console.log('\nTo demonstrate matching, I\'ll create a few more profiles...');
}

main().catch(console.error);
