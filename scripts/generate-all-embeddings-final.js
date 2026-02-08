// Generate embeddings for all users - final version
const OpenAI = require('openai');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = 'https://hgllvhohhyamsbljekrd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhnbGx2aG9oaHlhbXNibGpla3JkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4MTM5NTgsImV4cCI6MjA3MTM4OTk1OH0.VOsDwCxyqCkxuYPuFXCUpw4u2NCC-aX0BhwGJVIMPPY';
const openaiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;

if (!openaiKey) {
  console.error('Missing EXPO_PUBLIC_OPENAI_API_KEY');
  process.exit(1);
}

const openai = new OpenAI({ apiKey: openaiKey });
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// All user IDs
const userIds = [
  '59c3821f-e90c-491a-ab54-67f7b200c108', // Sarah
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

async function main() {
  console.log('🚀 Generating embeddings for all 10 profiles...\n');
  console.log('Note: This requires MCP SQL access to fetch responses and update embeddings.\n');
  console.log('User IDs to process:');
  userIds.forEach((id, i) => console.log(`  ${i + 1}. ${id}`));
  console.log('\nFor each user, you need to:');
  console.log('1. Get open-ended responses via MCP SQL');
  console.log('2. Generate embedding via OpenAI');
  console.log('3. Update embed_vector via MCP SQL');
  console.log('\nOr use the Edge Function that generates embeddings on intake completion.');
}

main().catch(console.error);
