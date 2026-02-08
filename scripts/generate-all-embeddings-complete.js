// Generate embeddings for all remaining users
const OpenAI = require('openai');
require('dotenv').config();

const openaiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;

if (!openaiKey) {
  console.error('Missing EXPO_PUBLIC_OPENAI_API_KEY');
  process.exit(1);
}

const openai = new OpenAI({ apiKey: openaiKey });

// All users that need embeddings (Sarah already has one)
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

// Embedding texts for each user (extracted from their responses)
const embeddingTexts = {
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

  'e91c132b-7f7f-420f-930b-295a9ace7693': `What are you passionate about or curious about right now?: Environmental science and climate activism. I'm studying environmental policy and really passionate about finding solutions to climate change.

How would your closest friends describe your personality?: Idealistic, energetic, and maybe a bit intense about causes I care about. Friends say I'm thoughtful and always down to discuss big ideas.

How do you recharge when you're feeling drained?: Being outside, going to protests or climate events, or just hanging with friends who share my values. Activism actually energizes me.

What's taking up most of your time and energy these days?: School takes up most of my time - classes, studying, research. Also involved in climate activism groups on campus.

Tell me about what you do day-to-day.: Classes, studying, maybe a climate event or meeting. Evenings are for homework or hanging with friends.

What's your relationship with work? Is it just a job, or is your career a big part of who you are?: I'm a student so this is my focus right now. I'm building towards a career in environmental policy.

How do you usually spend your weekends?: Climate marches or events, studying, maybe a hike or beach day. Sometimes just relaxing and catching up on sleep.

What activities or hobbies do you genuinely enjoy?: Hiking, beach cleanups, climate activism, reading, trying new vegan restaurants, and going to talks or events.

What could you talk about or do for hours?: Climate solutions, environmental policy, activism, or big ideas about changing the world. I love talking about what we can do.

What's something new you've been wanting to try or learn?: I want to learn to surf and maybe get more involved in local politics. Also interested in learning about sustainable agriculture.

What kind of food, music, books, shows, or podcasts are you into right now? Spill it all.: Food: Vegan food - love trying new plant-based spots. Music: Indie, punk, and protest music. Books: Climate books, policy, and activism. Shows: Climate documentaries and political shows.

What issues or causes matter most to you personally? What gets you fired up or concerned about the world?: Climate change is everything to me. Also care about social justice, environmental justice, and making sure marginalized communities aren't left behind.

What matters most to you in a friendship?: Shared values around climate and social justice, people who are passionate about making change, and friends who get my activism.

What kinds of friends are you hoping to find?: Activism partners, people to go to events with, and friends who share my values and energy.

What are you hoping to get out of using Matcha? What would make this feel successful for you?: Find friends who are also passionate about climate and activism. Success would be having a crew to go to events with and discuss solutions.`,

  'aefe665e-cb19-4ca3-ab74-15150104ea35': `What are you passionate about or curious about right now?: Art, design, and creative writing. I'm a graphic designer by day but I paint and write poetry in my free time. Really into the local art scene.

How would your closest friends describe your personality?: Creative, introspective, and a bit of a dreamer. Friends say I'm thoughtful, sometimes spacey, but I bring a unique perspective to conversations.

How do you recharge when you're feeling drained?: Alone time with my art, a good book, or a walk through a museum. I need quiet creative time to feel like myself.

What's taking up most of your time and energy these days?: My design work, personal art projects, and trying to build my creative portfolio. Also navigating the freelance life which is stressful but freeing.

Tell me about what you do day-to-day.: Design work, client meetings, then evenings for painting or writing. I try to visit galleries or art events when I can.

What's your relationship with work? Is it just a job, or is your career a big part of who you are?: Design is both my job and my passion. I'm building my career but also trying to make time for my personal creative work.

How do you usually spend your weekends?: Art galleries, coffee shops with my sketchbook, maybe a creative workshop or just painting at home. Sometimes brunch with other creative friends.

What activities or hobbies do you genuinely enjoy?: Painting, drawing, creative writing, visiting galleries, reading poetry, trying new art supplies, and journaling.

What could you talk about or do for hours?: Art, design, creative process, books, or deep conversations about meaning and beauty. I love talking about what inspires people.

What's something new you've been wanting to try or learn?: I want to try printmaking and maybe join a writing group. Also interested in learning ceramics.

What kind of food, music, books, shows, or podcasts are you into right now? Spill it all.: Food: I love trying new cafes and restaurants, especially places with good ambiance. Music: Indie, folk, classical, and ambient. Books: Poetry, literary fiction, art books. Shows: Abstract, Chef's Table, and indie films.

What issues or causes matter most to you personally? What gets you fired up or concerned about the world?: Supporting local artists and making art accessible. Also care about mental health and creative expression as therapy.

What matters most to you in a friendship?: Shared appreciation for art and creativity, deep conversations, and people who understand my need for alone time.

What kinds of friends are you hoping to find?: Creative friends to go to galleries with, writing buddies, and people who appreciate thoughtful conversations.

What are you hoping to get out of using Matcha? What would make this feel successful for you?: Find other creative people to connect with and maybe collaborate. Success would be having friends who inspire me and understand the creative life.`,

  '66d52eeb-2258-4c5e-8ddd-feeba7784fc7': `What are you passionate about or curious about right now?: Food, cooking, and exploring different cuisines. I'm a food blogger and really passionate about discovering new restaurants and learning to cook authentic dishes.

How would your closest friends describe your personality?: Enthusiastic, warm, and always hungry! Friends say I'm fun to be around and I bring energy to any gathering, especially food-related ones.

How do you recharge when you're feeling drained?: Cooking a good meal, trying a new restaurant, or just relaxing with friends over food. Food is my love language.

What's taking up most of your time and energy these days?: My day job in marketing, food blogging, and trying to visit as many restaurants as possible. Life is delicious but busy!

Tell me about what you do day-to-day.: Marketing work, then evenings are for trying new restaurants, cooking, or working on blog content. Weekends are for bigger food adventures.

What's your relationship with work? Is it just a job, or is your career a big part of who you are?: Marketing pays the bills, but food blogging is my real passion. I'm working towards making food my full-time thing.

How do you usually spend your weekends?: Brunch spots, farmers markets, trying new restaurants, or cooking elaborate meals at home. Food is always the plan.

What activities or hobbies do you genuinely enjoy?: Cooking, trying new restaurants, food photography, farmers markets, cooking classes, and sharing meals with friends.

What could you talk about or do for hours?: Food - new restaurants, recipes, cooking techniques, or food memories. Could talk about food forever.

What's something new you've been wanting to try or learn?: I want to learn to make pasta from scratch and maybe try more international cuisines. Also interested in food writing.

What kind of food, music, books, shows, or podcasts are you into right now? Spill it all.: Food: Everything! Especially Italian, Mexican, Japanese, and trying new fusion spots. Music: Latin, indie, and upbeat playlists. Books: Cookbooks, food memoirs, and food writing. Shows: Chef's Table, The Bear, and food documentaries.

What issues or causes matter most to you personally? What gets you fired up or concerned about the world?: Supporting local restaurants and food businesses. Also care about food sustainability and reducing food waste.

What matters most to you in a friendship?: Shared love of food, people who are adventurous eaters, and friends who appreciate good meals and good company.

What kinds of friends are you hoping to find?: Food adventure partners, people to cook with, and friends who love trying new restaurants and cuisines.

What are you hoping to get out of using Matcha? What would make this feel successful for you?: Find food-loving friends to explore restaurants and cook with. Success would be having a crew for food adventures and shared meals.`,

  'f88c1dab-d3c0-41a5-89d6-774d6f0165bd': `What are you passionate about or curious about right now?: Rock climbing and outdoor adventure. I spend most weekends in Yosemite or at local climbing gyms. Also really into trail running and backpacking.

How would your closest friends describe your personality?: Adventurous, driven, and maybe a bit intense about my hobbies. Friends say I'm reliable for outdoor plans and always down for a challenge.

How do you recharge when you're feeling drained?: Being outside - a long trail run, a climbing session, or just sitting by the ocean. Nature is my therapy.

What's taking up most of your time and energy these days?: Work as a physical therapist, training for climbing, and planning my next outdoor adventure. I'm pretty focused on my fitness goals.

Tell me about what you do day-to-day.: Work with patients, then either hit the climbing gym, go for a run, or plan weekend trips. Evenings are for meal prep and recovery.

What's your relationship with work? Is it just a job, or is your career a big part of who you are?: I love being a PT - it's meaningful work helping people recover. But my real passion is the outdoors, and work funds that lifestyle.

How do you usually spend your weekends?: Early morning trail runs, climbing trips, or backpacking. If I'm in town, maybe a farmers market and catching up with climbing buddies.

What activities or hobbies do you genuinely enjoy?: Rock climbing, trail running, backpacking, mountain biking, and trying new outdoor sports. Also love cooking healthy meals.

What could you talk about or do for hours?: Climbing routes, training techniques, gear, upcoming trips, or adventure stories. Could also talk about nutrition and fitness.

What's something new you've been wanting to try or learn?: I want to learn trad climbing and maybe try mountaineering. Also interested in learning to surf.

What kind of food, music, books, shows, or podcasts are you into right now? Spill it all.: Food: Healthy, high-protein meals. Love cooking and meal prep. Music: Indie rock, folk, and workout playlists. Books: Adventure memoirs and climbing guides. Shows: Free Solo, The Alpinist, and outdoor documentaries.

What issues or causes matter most to you personally? What gets you fired up or concerned about the world?: Environmental conservation and protecting public lands. Access to outdoor spaces for everyone, regardless of background.

What matters most to you in a friendship?: Shared love of the outdoors, being active, and people who are up for adventures and challenges.

What kinds of friends are you hoping to find?: Climbing and adventure partners, people to train with, and friends who appreciate an active lifestyle.

What are you hoping to get out of using Matcha? What would make this feel successful for you?: Find reliable adventure partners for climbing and outdoor trips. Success would be having a solid crew for weekend adventures.`,

  '6e56e72b-066f-47f6-ab39-f1e068cadeb2': `What are you passionate about or curious about right now?: Yoga, mindfulness, and holistic wellness. I'm a yoga instructor and really passionate about helping people find balance and peace.

How would your closest friends describe your personality?: Calm, centered, and nurturing. Friends say I'm a good listener and bring a sense of peace to situations, though sometimes I can be a bit too zen.

How do you recharge when you're feeling drained?: Yoga practice, meditation, or time in nature. I need regular practice to stay balanced and grounded.

What's taking up most of your time and energy these days?: Teaching yoga classes, maintaining my own practice, and building my wellness business. Also trying to balance work with self-care.

Tell me about what you do day-to-day.: Teaching morning and evening yoga classes, maintaining my practice, maybe a workshop or training. Evenings are for rest and reflection.

What's your relationship with work? Is it just a job, or is your career a big part of who you are?: Yoga is my passion and my career. It's not just a job - it's my calling and how I want to help people.

How do you usually spend your weekends?: Longer yoga practices, maybe a workshop or retreat, nature time, or just quiet rest. I try to keep weekends restorative.

What activities or hobbies do you genuinely enjoy?: Yoga, meditation, hiking, reading spiritual books, trying new wellness practices, and cooking healthy meals.

What could you talk about or do for hours?: Yoga philosophy, mindfulness, wellness, personal growth, or deep conversations about life and meaning.

What's something new you've been wanting to try or learn?: I want to learn Ayurveda and maybe try sound healing. Also interested in learning more about plant medicine.

What kind of food, music, books, shows, or podcasts are you into right now? Spill it all.: Food: Healthy, plant-based, Ayurvedic principles. Music: Meditation music, kirtan, and calming sounds. Books: Yoga philosophy, spirituality, wellness. Shows: Minimal TV, mostly documentaries about wellness or nature.

What issues or causes matter most to you personally? What gets you fired up or concerned about the world?: Mental health awareness and making wellness accessible to everyone, regardless of income or background.

What matters most to you in a friendship?: Shared interest in wellness and growth, people who value balance and mindfulness, and friends who understand my lifestyle.

What kinds of friends are you hoping to find?: Wellness-minded friends, yoga buddies, and people who appreciate deep conversations about life and growth.

What are you hoping to get out of using Matcha? What would make this feel successful for you?: Find friends who share my interest in wellness and personal growth. Success would be having a community of like-minded people.`,

  '637602f0-af1d-4020-86fb-1653849e9860': `What are you passionate about or curious about right now?: Financial literacy and helping people understand money. I work in finance but I'm passionate about making financial knowledge accessible to everyone.

How would your closest friends describe your personality?: Analytical, organized, and a good listener. Friends say I'm reliable and great at giving practical advice, though sometimes I overthink things.

How do you recharge when you're feeling drained?: Reading, podcasts, or a quiet evening at home. I'm an introvert so I need alone time to process and recharge.

What's taking up most of your time and energy these days?: Work is demanding - long hours in finance. I'm also trying to maintain work-life balance and keep up with friends, which is a challenge.

Tell me about what you do day-to-day.: Long work days, meetings, analysis. Evenings are for decompressing - usually reading, podcasts, or a quiet dinner.

What's your relationship with work? Is it just a job, or is your career a big part of who you are?: It's a career I'm building, but I'm also trying to find meaning beyond just making money. I want to help people with financial literacy.

How do you usually spend your weekends?: Sleeping in, catching up on reading, maybe a museum or cultural event. I like low-key weekends that feel different from the work week.

What activities or hobbies do you genuinely enjoy?: Reading, podcasts, trying new restaurants, visiting museums, board games, and learning about personal finance and investing.

What could you talk about or do for hours?: Books, podcasts, financial topics (if people are interested), current events, or deep conversations about life and goals.

What's something new you've been wanting to try or learn?: I want to learn to cook better and maybe try rock climbing. Also thinking about starting a financial literacy blog.

What kind of food, music, books, shows, or podcasts are you into right now? Spill it all.: Food: I'm a foodie - love trying new restaurants and cuisines. Music: Jazz, indie, and podcasts mostly. Books: Non-fiction, business books, memoirs. Shows: Succession, The Crown, and documentaries.

What issues or causes matter most to you personally? What gets you fired up or concerned about the world?: Financial inequality and making financial education accessible. Also care about LGBTQ+ rights and representation.

What matters most to you in a friendship?: Shared values, intellectual conversations, and people who respect my identity and boundaries.

What kinds of friends are you hoping to find?: People for deep conversations, activity partners for cultural events, and friends who understand work-life balance challenges.

What are you hoping to get out of using Matcha? What would make this feel successful for you?: Find friends who share my values and interests. Success would be having a few close friends I can have meaningful conversations with.`,

  '4a862f2c-0690-4c2a-867f-ef9118dc7682': `What are you passionate about or curious about right now?: Parenting and early childhood education. I have two young kids and I'm really into Montessori methods and finding ways to raise thoughtful, independent children.

How would your closest friends describe your personality?: Organized, caring, and a bit tired! My friends say I'm reliable and always there when you need me, though I'm definitely more selective about my time now.

How do you recharge when you're feeling drained?: Honestly? A quiet house and a good book or podcast. Or a walk alone. Mom life is exhausting so I really value those rare moments of solitude.

What's taking up most of your time and energy these days?: My kids take up most of my time and energy. I work part-time as a teacher, but most of my focus is on being present for my family.

Tell me about what you do day-to-day.: Getting kids ready for school, teaching part-time, picking kids up, activities, homework, dinner, bedtime routine. It's a lot but I love it.

What's your relationship with work? Is it just a job, or is your career a big part of who you are?: Teaching is meaningful to me, but my family comes first. It's a job that fits my life right now, not my whole identity.

How do you usually spend your weekends?: Kids' activities, playgrounds, maybe a family hike or museum trip. If I'm lucky, my partner watches the kids and I get coffee with a friend.

What activities or hobbies do you genuinely enjoy?: Reading, walking, trying to maintain a yoga practice (when I can), and finding kid-friendly activities that I also enjoy.

What could you talk about or do for hours?: Parenting challenges and wins, education, books, or just catching up on life. I love talking to other parents who get it.

What's something new you've been wanting to try or learn?: I'd love to join a book club or take a pottery class. Something just for me that doesn't involve kids.

What kind of food, music, books, shows, or podcasts are you into right now? Spill it all.: Food: Quick, healthy meals that kids will actually eat. Music: Whatever keeps me sane - usually indie pop or calming playlists. Books: Parenting books, memoirs, and light fiction. Shows: I watch whatever I can when kids are asleep - lately The Crown and Bluey (with the kids).

What issues or causes matter most to you personally? What gets you fired up or concerned about the world?: Education equity and making sure all kids have access to quality early childhood education. Also care about environmental issues for my kids' future.

What matters most to you in a friendship?: Understanding that I'm busy with kids, flexibility, and people who don't mind kid-friendly hangouts sometimes.

What kinds of friends are you hoping to find?: Other parents who understand the chaos, and maybe some non-parent friends for adult conversation and perspective.

What are you hoping to get out of using Matcha? What would make this feel successful for you?: Find a few friends who get the parent life and maybe some kid-free friends too. Success would be having people I can connect with regularly, even if it's less frequent.`,

  '63814809-bd8c-4b59-92ad-16ecee81d69d': `What are you passionate about or curious about right now?: Sailing and woodworking. I retired a few years ago and now I spend my time on my boat and in my workshop. Also love reading history.

How would your closest friends describe your personality?: Steady, reliable, and a good storyteller. Friends say I'm wise and always have an interesting perspective from my years of experience.

How do you recharge when you're feeling drained?: Time on the water sailing, working with my hands in the shop, or just reading with a good cup of coffee.

What's taking up most of your time and energy these days?: Sailing, woodworking projects, and spending time with my grandkids. Retirement is busy in the best way.

Tell me about what you do day-to-day.: Morning coffee and reading, then either sailing, working in my shop, or spending time with family. Evenings are quiet and relaxed.

What's your relationship with work? Is it just a job, or is your career a big part of who you are?: I had a good career but I'm glad to be retired. Now I focus on hobbies and family - that's what matters.

How do you usually spend your weekends?: Sailing if weather permits, working on projects, or family time. Sometimes just enjoying a quiet weekend at home.

What activities or hobbies do you genuinely enjoy?: Sailing, woodworking, reading history books, fishing, and spending time with my grandkids.

What could you talk about or do for hours?: Sailing, history, woodworking techniques, or stories from my career and life experiences.

What's something new you've been wanting to try or learn?: I want to learn more about boat restoration and maybe try writing about my sailing adventures.

What kind of food, music, books, shows, or podcasts are you into right now? Spill it all.: Food: Classic American food, seafood, and good wine. Music: Jazz, classic rock, and classical. Books: History, especially maritime history. Shows: Historical documentaries and classic films.

What issues or causes matter most to you personally? What gets you fired up or concerned about the world?: Preserving maritime history and supporting local sailing communities. Also care about leaving a good world for my grandkids.

What matters most to you in a friendship?: Shared interests, good conversation, and people who appreciate life experience and stories.

What kinds of friends are you hoping to find?: Sailing buddies, people to share hobbies with, and friends who enjoy good conversation regardless of age.

What are you hoping to get out of using Matcha? What would make this feel successful for you?: Find some sailing and woodworking friends. Success would be having a few people to share hobbies and good conversations with.`,
};

async function generateEmbedding(text) {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });
  return response.data[0].embedding;
}

async function main() {
  console.log('🚀 Generating embeddings for 9 remaining profiles...\n');
  
  const results = [];
  
  for (const user of users) {
    const text = embeddingTexts[user.id];
    if (!text) {
      console.error(`❌ No embedding text found for ${user.name}`);
      continue;
    }
    
    console.log(`📝 Generating embedding for ${user.name}...`);
    try {
      const embedding = await generateEmbedding(text);
      console.log(`   ✅ Generated (${embedding.length} dimensions)`);
      
      results.push({
        userId: user.id,
        userName: user.name,
        embedding: embedding,
        sql: `UPDATE intake_responses_v4 SET embed_vector = '${JSON.stringify(embedding)}'::vector WHERE user_id = '${user.id}';`
      });
      
      // Rate limit
      await new Promise(resolve => setTimeout(resolve, 1500));
    } catch (error) {
      console.error(`   ❌ Error:`, error.message);
    }
  }
  
  console.log(`\n✅ Generated ${results.length} embeddings!\n`);
  console.log('SQL commands to update database:\n');
  console.log('='.repeat(80));
  
  results.forEach((result, i) => {
    console.log(`\n-- ${i + 1}. ${result.userName}`);
    console.log(result.sql);
  });
  
  console.log('\n' + '='.repeat(80));
  console.log(`\nRun these SQL commands via MCP to update the database.`);
}

main().catch(console.error);
