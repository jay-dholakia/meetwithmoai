// Generate embeddings for all users in batch
const OpenAI = require('openai');
require('dotenv').config();

const openaiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;

if (!openaiKey) {
  console.error('Missing EXPO_PUBLIC_OPENAI_API_KEY');
  process.exit(1);
}

const openai = new OpenAI({ apiKey: openaiKey });

// User data with their embedding text (we'll get this via MCP SQL)
const users = [
  { 
    id: '59c3821f-e90c-491a-ab54-67f7b200c108', 
    name: 'Sarah Chen',
    // Text will be fetched via MCP SQL
  },
  { 
    id: 'a59b17b3-2a94-47ba-99bf-4698a3540bb8', 
    name: 'Mike Rodriguez' 
  },
  { 
    id: 'e91c132b-7f7f-420f-930b-295a9ace7693', 
    name: 'Chris Anderson' 
  },
  { 
    id: 'aefe665e-cb19-4ca3-ab74-15150104ea35', 
    name: 'Emma Williams' 
  },
  { 
    id: '66d52eeb-2258-4c5e-8ddd-feeba7784fc7', 
    name: 'Maria Garcia' 
  },
  { 
    id: 'f88c1dab-d3c0-41a5-89d6-774d6f0165bd', 
    name: 'David Thompson' 
  },
  { 
    id: '6e56e72b-066f-47f6-ab39-f1e068cadeb2', 
    name: 'Lisa Patel' 
  },
  { 
    id: '637602f0-af1d-4020-86fb-1653849e9860', 
    name: 'Alex Martinez' 
  },
  { 
    id: '4a862f2c-0690-4c2a-867f-ef9118dc7682', 
    name: 'Jessica Kim' 
  },
  { 
    id: '63814809-bd8c-4b59-92ad-16ecee81d69d', 
    name: 'James Wilson' 
  },
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
  console.log('This script requires embedding text for each user.');
  console.log('Run this SQL for each user to get their text:');
  console.log('SELECT get_open_ended_text_for_embedding(\'USER_ID\') as embedding_text;\n');
  console.log('Then generate embeddings and update via:');
  console.log('UPDATE intake_responses_v4 SET embed_vector = \'[EMBEDDING]\'::vector WHERE user_id = \'USER_ID\';\n');
  console.log('Or use the Edge Function approach.\n');
  console.log('For now, generating Sarah\'s embedding as an example...\n');
  
  // Sarah's text (from previous SQL query)
  const sarahText = `What are you passionate about or curious about right now?: I'm really into sustainable living and urban gardening. I've been learning about permaculture and trying to grow my own vegetables on my apartment balcony. Also really curious about how technology can help solve climate issues.

How would your closest friends describe your personality?: My friends say I'm thoughtful, a bit introverted but warm once you get to know me. I'm the friend who remembers birthdays and brings homemade snacks to gatherings.

How do you recharge when you're feeling drained?: I need quiet time alone - usually reading a book, doing yoga, or just sitting in a park. Too much socializing drains me, so I'm careful about balancing my energy.

What's taking up most of your time and energy these days?: Work is pretty demanding - I'm a software engineer working on climate tech. Also trying to maintain my garden and keep up with friends, which feels like a lot sometimes.

Tell me about what you do day-to-day.: I code most of the day, attend meetings, and try to squeeze in a walk or gym session. Evenings are for cooking, reading, or catching up with friends.

What's your relationship with work? Is it just a job, or is your career a big part of who you are?: My career is definitely a big part of who I am. I chose this field because I want to make a difference, so it's not just a paycheck - it's meaningful to me.

How do you usually spend your weekends?: Saturday mornings at the farmers market, then either hiking, working on my garden, or having a low-key brunch with friends. Sundays are for meal prep and relaxation.

What activities or hobbies do you genuinely enjoy?: Yoga, hiking, urban gardening, reading sci-fi novels, trying new vegetarian restaurants, and board games with friends.

What could you talk about or do for hours?: Climate solutions, books I've read, sustainable living practices, or deep conversations about life goals and values.

What's something new you've been wanting to try or learn?: I want to learn pottery and maybe join a community garden. Also thinking about taking a cooking class focused on plant-based cuisine.

What kind of food, music, books, shows, or podcasts are you into right now? Spill it all.: Food: I love exploring new vegetarian and vegan spots, especially Asian fusion. Music: Indie folk, electronic, and some jazz. Books: Sci-fi, climate fiction, and memoirs. Shows: The Last of Us, Severance, and nature documentaries.

What issues or causes matter most to you personally? What gets you fired up or concerned about the world?: Climate change is my biggest concern. I'm also passionate about sustainable food systems and environmental justice. It keeps me up at night thinking about the future.

What matters most to you in a friendship?: Authenticity, shared values around sustainability, and people who understand my need for balance between social time and alone time.

What kinds of friends are you hoping to find?: I'm looking for activity partners for hiking and farmers market trips, and people who enjoy deep conversations about meaningful topics.

What are you hoping to get out of using Matcha? What would make this feel successful for you?: I hope to find a few close friends who share my values and interests. Success would be having 2-3 people I can regularly do activities with and have meaningful conversations.`;

  console.log('Generating embedding for Sarah Chen...');
  const embedding = await generateEmbedding(sarahText);
  console.log(`✅ Generated embedding (${embedding.length} dimensions)`);
  console.log('\nSQL to update Sarah:');
  console.log(`UPDATE intake_responses_v4 SET embed_vector = '[${embedding.join(',')}]'::vector WHERE user_id = '59c3821f-e90c-491a-ab54-67f7b200c108';`);
}

main().catch(console.error);
