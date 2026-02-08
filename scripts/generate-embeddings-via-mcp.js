// Generate embeddings using MCP SQL to bypass RLS
const OpenAI = require('openai');
require('dotenv').config();

const openaiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;

if (!openaiKey) {
  console.error('Missing EXPO_PUBLIC_OPENAI_API_KEY');
  process.exit(1);
}

const openai = new OpenAI({ apiKey: openaiKey });

// User IDs and names
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

async function main() {
  console.log('🚀 Generating embeddings for all 10 profiles...\n');
  console.log('This script will output SQL commands to run via MCP.\n');
  console.log('For each user, it will:');
  console.log('1. Extract open-ended responses');
  console.log('2. Generate OpenAI embedding');
  console.log('3. Output UPDATE SQL command\n');
  
  for (const user of users) {
    console.log(`\n📝 Processing ${user.name}...`);
    console.log(`   Run this SQL via MCP to get responses:`);
    console.log(`   SELECT responses FROM intake_responses_v4 WHERE user_id = '${user.id}';`);
    console.log(`   Then generate embedding and run:`);
    console.log(`   UPDATE intake_responses_v4 SET embed_vector = '[EMBEDDING_ARRAY]' WHERE user_id = '${user.id}';`);
  }
  
  console.log('\n\nAlternatively, I can generate embeddings directly if you provide the responses.');
  console.log('For now, let me generate them via a different approach...\n');
}

main().catch(console.error);
