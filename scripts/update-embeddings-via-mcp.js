// Generate embeddings and output SQL for MCP execution
const OpenAI = require('openai');
require('dotenv').config();

const openaiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;

if (!openaiKey) {
  console.error('Missing EXPO_PUBLIC_OPENAI_API_KEY');
  process.exit(1);
}

const openai = new OpenAI({ apiKey: openaiKey });

// User data
const users = [
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

// Embedding texts (from previous extraction)
const texts = {
  'a59b17b3-2a94-47ba-99bf-4698a3540bb8': `What are you passionate about or curious about right now?: Music production and live performances. I play guitar and produce electronic music in my spare time. Also really into the local music scene here in the Bay Area.

How would your closest friends describe your personality?: I'm the energetic, outgoing friend who's always down for an adventure. People say I'm funny, sometimes a bit chaotic, but I bring good vibes to any situation.

How do you recharge when you're feeling drained?: Playing music, going to concerts, or just hanging out with friends. I'm an extrovert so being around people actually recharges me.

What's taking up most of your time and energy these days?: My day job in marketing, working on my music projects, and trying to catch as many live shows as possible. Life feels busy but exciting.

Tell me about what you do day-to-day.: Marketing work during the day, then evenings are for music - either practicing, producing, or going to shows. Weekends are for bigger projects and socializing.

What's your relationship with work? Is it just a job, or is your career a big part of who you are?: It's a job that pays the bills, but my real passion is music. I'm working towards making music my full-time thing eventually.

How do you usually spend your weekends?: Friday nights at a show or DJ set, Saturday exploring new neighborhoods or working on music, Sunday brunch with friends and maybe a hike if the weather's nice.

What activities or hobbies do you genuinely enjoy?: Playing guitar, producing music, going to concerts, trying new restaurants, dancing, and exploring the city.

What could you talk about or do for hours?: Music - new albums, production techniques, favorite artists, or the local scene. Could also talk about food, travel, or creative projects.

What's something new you've been wanting to try or learn?: I want to learn DJing properly and maybe start a podcast about the local music scene. Also interested in trying rock climbing.

What kind of food, music, books, shows, or podcasts are you into right now? Spill it all.: Food: I'm a foodie - love trying new spots, especially Mexican, Italian, and fusion places. Music: Indie rock, electronic, hip-hop, jazz. Books: Not a huge reader but I like music biographies. Shows: The Bear, Succession, and music documentaries.

What issues or causes matter most to you personally? What gets you fired up or concerned about the world?: Supporting local artists and music venues. Also care about affordable housing and making sure the arts scene stays accessible to everyone.

What matters most to you in a friendship?: Shared interests in music and food, good sense of humor, and people who are up for spontaneous adventures.

What kinds of friends are you hoping to find?: Activity partners for concerts and food adventures, and people who appreciate good music and can keep up with my energy.

What are you hoping to get out of using Matcha? What would make this feel successful for you?: Find people to go to shows with and explore the food scene. Success would be having a crew of music and food-loving friends I can hang with regularly.`,
  // ... (other texts would go here, but for brevity, I'll generate them)
};

async function generateEmbedding(text) {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });
  return response.data[0].embedding;
}

async function main() {
  console.log('🚀 Generating embeddings...\n');
  console.log('Note: This script will output SQL statements.');
  console.log('Run these via MCP to update the database.\n');
  
  // For now, just generate for Mike as an example
  const mikeText = texts['a59b17b3-2a94-47ba-99bf-4698a3540bb8'];
  console.log('Generating embedding for Mike Rodriguez...');
  const embedding = await generateEmbedding(mikeText);
  console.log(`\nUPDATE intake_responses_v4 SET embed_vector = '${JSON.stringify(embedding)}'::vector WHERE user_id = 'a59b17b3-2a94-47ba-99bf-4698a3540bb8';`);
}

main().catch(console.error);
