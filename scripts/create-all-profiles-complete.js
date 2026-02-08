// Complete script to create 10 profiles, generate embeddings, and show matching
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

// All 10 profiles with complete questionnaire responses
const allProfiles = [
  {
    email: 'sarah.tech@test.com',
    first_name: 'Sarah', last_name: 'Chen', age: 28,
    city: 'San Francisco', lat: 37.7749, lng: -122.4194,
    gender: 'Female', pronouns: 'She/Her', relationship_status: 'Single', has_kids: 'No',
    responses: {
      q1_passionate_about: "I'm really into sustainable living and urban gardening. I've been learning about permaculture and trying to grow my own vegetables on my apartment balcony. Also really curious about how technology can help solve climate issues.",
      q2_friends_describe: "My friends say I'm thoughtful, a bit introverted but warm once you get to know me. I'm the friend who remembers birthdays and brings homemade snacks to gatherings.",
      q3_recharge_method: "I need quiet time alone - usually reading a book, doing yoga, or just sitting in a park. Too much socializing drains me, so I'm careful about balancing my energy.",
      q4_time_energy: "Work is pretty demanding - I'm a software engineer working on climate tech. Also trying to maintain my garden and keep up with friends, which feels like a lot sometimes.",
      q5_life_stage: "Career-focused (building my career)",
      q6_industry: "Tech",
      q7_day_to_day: "I code most of the day, attend meetings, and try to squeeze in a walk or gym session. Evenings are for cooking, reading, or catching up with friends.",
      q8_work_relationship: "My career is definitely a big part of who I am. I chose this field because I want to make a difference, so it's not just a paycheck - it's meaningful to me.",
      q9_weekends: "Saturday mornings at the farmers market, then either hiking, working on my garden, or having a low-key brunch with friends. Sundays are for meal prep and relaxation.",
      q10_activities_enjoy: "Yoga, hiking, urban gardening, reading sci-fi novels, trying new vegetarian restaurants, and board games with friends.",
      q11_talk_about_hours: "Climate solutions, books I've read, sustainable living practices, or deep conversations about life goals and values.",
      q12_new_to_try: "I want to learn pottery and maybe join a community garden. Also thinking about taking a cooking class focused on plant-based cuisine.",
      q13_food_music_books: "Food: I love exploring new vegetarian and vegan spots, especially Asian fusion. Music: Indie folk, electronic, and some jazz. Books: Sci-fi, climate fiction, and memoirs. Shows: The Last of Us, Severance, and nature documentaries.",
      q14_friendship_cadence: "A few times a month",
      q15_communication_preference: "Texting",
      q16_planner_spontaneous: "Mostly a planner",
      q17_drive_distance: "10 miles",
      q18_availability_times: ["Weekend daytime", "Weekend evening"],
      q19_age_range_preference: "Similar age (within 3 years)",
      q20_issues_causes: "Climate change is my biggest concern. I'm also passionate about sustainable food systems and environmental justice. It keeps me up at night thinking about the future.",
      q21_political_classification: "Liberal",
      q22_political_alignment_important: "Very important",
      q23_discuss_politics: "I prefer friends who share my views",
      q24_friendship_matters_most: "Authenticity, shared values around sustainability, and people who understand my need for balance between social time and alone time.",
      q25_kinds_of_friends: "I'm looking for activity partners for hiking and farmers market trips, and people who enjoy deep conversations about meaningful topics.",
      q26_matcha_hopes: "I hope to find a few close friends who share my values and interests. Success would be having 2-3 people I can regularly do activities with and have meaningful conversations."
    }
  },
  {
    email: 'mike.music@test.com',
    first_name: 'Mike', last_name: 'Rodriguez', age: 32,
    city: 'Oakland', lat: 37.8044, lng: -122.2712,
    gender: 'Male', pronouns: 'He/Him', relationship_status: 'In a relationship', has_kids: 'No',
    responses: {
      q1_passionate_about: "Music production and live performances. I play guitar and produce electronic music in my spare time. Also really into the local music scene here in the Bay Area.",
      q2_friends_describe: "I'm the energetic, outgoing friend who's always down for an adventure. People say I'm funny, sometimes a bit chaotic, but I bring good vibes to any situation.",
      q3_recharge_method: "Playing music, going to concerts, or just hanging out with friends. I'm an extrovert so being around people actually recharges me.",
      q4_time_energy: "My day job in marketing, working on my music projects, and trying to catch as many live shows as possible. Life feels busy but exciting.",
      q5_life_stage: "Career-focused (building my career)",
      q6_industry: "Creative/Arts",
      q7_day_to_day: "Marketing work during the day, then evenings are for music - either practicing, producing, or going to shows. Weekends are for bigger projects and socializing.",
      q8_work_relationship: "It's a job that pays the bills, but my real passion is music. I'm working towards making music my full-time thing eventually.",
      q9_weekends: "Friday nights at a show or DJ set, Saturday exploring new neighborhoods or working on music, Sunday brunch with friends and maybe a hike if the weather's nice.",
      q10_activities_enjoy: "Playing guitar, producing music, going to concerts, trying new restaurants, dancing, and exploring the city.",
      q11_talk_about_hours: "Music - new albums, production techniques, favorite artists, or the local scene. Could also talk about food, travel, or creative projects.",
      q12_new_to_try: "I want to learn DJing properly and maybe start a podcast about the local music scene. Also interested in trying rock climbing.",
      q13_food_music_books: "Food: I'm a foodie - love trying new spots, especially Mexican, Italian, and fusion places. Music: Indie rock, electronic, hip-hop, jazz. Books: Not a huge reader but I like music biographies. Shows: The Bear, Succession, and music documentaries.",
      q14_friendship_cadence: "Weekly",
      q15_communication_preference: "Mix of all",
      q16_planner_spontaneous: "Very spontaneous - go with the flow",
      q17_drive_distance: "25 miles",
      q18_availability_times: ["Weekday evening", "Weekend daytime", "Weekend evening"],
      q19_age_range_preference: "Slightly younger or older (within 5 years)",
      q20_issues_causes: "Supporting local artists and music venues. Also care about affordable housing and making sure the arts scene stays accessible to everyone.",
      q21_political_classification: "Liberal",
      q22_political_alignment_important: "Somewhat important",
      q23_discuss_politics: "I enjoy respectful debate with different perspectives",
      q24_friendship_matters_most: "Shared interests in music and food, good sense of humor, and people who are up for spontaneous adventures.",
      q25_kinds_of_friends: "Activity partners for concerts and food adventures, and people who appreciate good music and can keep up with my energy.",
      q26_matcha_hopes: "Find people to go to shows with and explore the food scene. Success would be having a crew of music and food-loving friends I can hang with regularly."
    }
  },
  {
    email: 'chris.student@test.com',
    first_name: 'Chris', last_name: 'Anderson', age: 22,
    city: 'Berkeley', lat: 37.8715, lng: -122.2730,
    gender: 'Male', pronouns: 'He/Him', relationship_status: 'Single', has_kids: 'No',
    responses: {
      q1_passionate_about: "Environmental science and climate activism. I'm studying environmental policy and really passionate about finding solutions to climate change.",
      q2_friends_describe: "Idealistic, energetic, and maybe a bit intense about causes I care about. Friends say I'm thoughtful and always down to discuss big ideas.",
      q3_recharge_method: "Being outside, going to protests or climate events, or just hanging with friends who share my values. Activism actually energizes me.",
      q4_time_energy: "School takes up most of my time - classes, studying, research. Also involved in climate activism groups on campus.",
      q5_life_stage: "Student",
      q6_industry: "Student",
      q7_day_to_day: "Classes, studying, maybe a climate event or meeting. Evenings are for homework or hanging with friends.",
      q8_work_relationship: "I'm a student so this is my focus right now. I'm building towards a career in environmental policy.",
      q9_weekends: "Climate marches or events, studying, maybe a hike or beach day. Sometimes just relaxing and catching up on sleep.",
      q10_activities_enjoy: "Hiking, beach cleanups, climate activism, reading, trying new vegan restaurants, and going to talks or events.",
      q11_talk_about_hours: "Climate solutions, environmental policy, activism, or big ideas about changing the world. I love talking about what we can do.",
      q12_new_to_try: "I want to learn to surf and maybe get more involved in local politics. Also interested in learning about sustainable agriculture.",
      q13_food_music_books: "Food: Vegan food - love trying new plant-based spots. Music: Indie, punk, and protest music. Books: Climate books, policy, and activism. Shows: Climate documentaries and political shows.",
      q14_friendship_cadence: "Weekly",
      q15_communication_preference: "Texting",
      q16_planner_spontaneous: "Mix of both",
      q17_drive_distance: "25 miles",
      q18_availability_times: ["Weekend daytime", "Weekend evening"],
      q19_age_range_preference: "Similar age (within 3 years)",
      q20_issues_causes: "Climate change is everything to me. Also care about social justice, environmental justice, and making sure marginalized communities aren't left behind.",
      q21_political_classification: "Liberal",
      q22_political_alignment_important: "Very important",
      q23_discuss_politics: "I prefer friends who share my views",
      q24_friendship_matters_most: "Shared values around climate and social justice, people who are passionate about making change, and friends who get my activism.",
      q25_kinds_of_friends: "Activism partners, people to go to events with, and friends who share my values and energy.",
      q26_matcha_hopes: "Find friends who are also passionate about climate and activism. Success would be having a crew to go to events with and discuss solutions."
    }
  },
  {
    email: 'emma.creative@test.com',
    first_name: 'Emma', last_name: 'Williams', age: 26,
    city: 'San Francisco', lat: 37.7849, lng: -122.4094,
    gender: 'Female', pronouns: 'She/Her', relationship_status: 'Single', has_kids: 'No',
    responses: {
      q1_passionate_about: "Art, design, and creative writing. I'm a graphic designer by day but I paint and write poetry in my free time. Really into the local art scene.",
      q2_friends_describe: "Creative, introspective, and a bit of a dreamer. Friends say I'm thoughtful, sometimes spacey, but I bring a unique perspective to conversations.",
      q3_recharge_method: "Alone time with my art, a good book, or a walk through a museum. I need quiet creative time to feel like myself.",
      q4_time_energy: "My design work, personal art projects, and trying to build my creative portfolio. Also navigating the freelance life which is stressful but freeing.",
      q5_life_stage: "Early career (just starting out)",
      q6_industry: "Creative/Arts",
      q7_day_to_day: "Design work, client meetings, then evenings for painting or writing. I try to visit galleries or art events when I can.",
      q8_work_relationship: "Design is both my job and my passion. I'm building my career but also trying to make time for my personal creative work.",
      q9_weekends: "Art galleries, coffee shops with my sketchbook, maybe a creative workshop or just painting at home. Sometimes brunch with other creative friends.",
      q10_activities_enjoy: "Painting, drawing, creative writing, visiting galleries, reading poetry, trying new art supplies, and journaling.",
      q11_talk_about_hours: "Art, design, creative process, books, or deep conversations about meaning and beauty. I love talking about what inspires people.",
      q12_new_to_try: "I want to try printmaking and maybe join a writing group. Also interested in learning ceramics.",
      q13_food_music_books: "Food: I love trying new cafes and restaurants, especially places with good ambiance. Music: Indie, folk, classical, and ambient. Books: Poetry, literary fiction, art books. Shows: Abstract, Chef's Table, and indie films.",
      q14_friendship_cadence: "A few times a month",
      q15_communication_preference: "Texting",
      q16_planner_spontaneous: "Mostly a planner",
      q17_drive_distance: "10 miles",
      q18_availability_times: ["Weekend daytime", "Weekend evening"],
      q19_age_range_preference: "Similar age (within 3 years)",
      q20_issues_causes: "Supporting local artists and making art accessible. Also care about mental health and creative expression as therapy.",
      q21_political_classification: "Liberal",
      q22_political_alignment_important: "Somewhat important",
      q23_discuss_politics: "I prefer to keep it light and avoid politics",
      q24_friendship_matters_most: "Shared appreciation for art and creativity, deep conversations, and people who understand my need for alone time.",
      q25_kinds_of_friends: "Creative friends to go to galleries with, writing buddies, and people who appreciate thoughtful conversations.",
      q26_matcha_hopes: "Find other creative people to connect with and maybe collaborate. Success would be having friends who inspire me and understand the creative life."
    }
  },
  {
    email: 'maria.foodie@test.com',
    first_name: 'Maria', last_name: 'Garcia', age: 27,
    city: 'San Francisco', lat: 37.7749, lng: -122.4194,
    gender: 'Female', pronouns: 'She/Her', relationship_status: 'Single', has_kids: 'No',
    responses: {
      q1_passionate_about: "Food, cooking, and exploring different cuisines. I'm a food blogger and really passionate about discovering new restaurants and learning to cook authentic dishes.",
      q2_friends_describe: "Enthusiastic, warm, and always hungry! Friends say I'm fun to be around and I bring energy to any gathering, especially food-related ones.",
      q3_recharge_method: "Cooking a good meal, trying a new restaurant, or just relaxing with friends over food. Food is my love language.",
      q4_time_energy: "My day job in marketing, food blogging, and trying to visit as many restaurants as possible. Life is delicious but busy!",
      q5_life_stage: "Career-focused (building my career)",
      q6_industry: "Creative/Arts",
      q7_day_to_day: "Marketing work, then evenings are for trying new restaurants, cooking, or working on blog content. Weekends are for bigger food adventures.",
      q8_work_relationship: "Marketing pays the bills, but food blogging is my real passion. I'm working towards making food my full-time thing.",
      q9_weekends: "Brunch spots, farmers markets, trying new restaurants, or cooking elaborate meals at home. Food is always the plan.",
      q10_activities_enjoy: "Cooking, trying new restaurants, food photography, farmers markets, cooking classes, and sharing meals with friends.",
      q11_talk_about_hours: "Food - new restaurants, recipes, cooking techniques, or food memories. Could talk about food forever.",
      q12_new_to_try: "I want to learn to make pasta from scratch and maybe try more international cuisines. Also interested in food writing.",
      q13_food_music_books: "Food: Everything! Especially Italian, Mexican, Japanese, and trying new fusion spots. Music: Latin, indie, and upbeat playlists. Books: Cookbooks, food memoirs, and food writing. Shows: Chef's Table, The Bear, and food documentaries.",
      q14_friendship_cadence: "Weekly",
      q15_communication_preference: "Texting",
      q16_planner_spontaneous: "Mix of both",
      q17_drive_distance: "25 miles",
      q18_availability_times: ["Weekday evening", "Weekend daytime", "Weekend evening"],
      q19_age_range_preference: "Similar age (within 3 years)",
      q20_issues_causes: "Supporting local restaurants and food businesses. Also care about food sustainability and reducing food waste.",
      q21_political_classification: "Moderate",
      q22_political_alignment_important: "Not important",
      q23_discuss_politics: "I prefer to keep it light and avoid politics",
      q24_friendship_matters_most: "Shared love of food, people who are adventurous eaters, and friends who appreciate good meals and good company.",
      q25_kinds_of_friends: "Food adventure partners, people to cook with, and friends who love trying new restaurants and cuisines.",
      q26_matcha_hopes: "Find food-loving friends to explore restaurants and cook with. Success would be having a crew for food adventures and shared meals."
    }
  },
  {
    email: 'david.outdoor@test.com',
    first_name: 'David', last_name: 'Thompson', age: 29,
    city: 'Mill Valley', lat: 37.9060, lng: -122.5449,
    gender: 'Male', pronouns: 'He/Him', relationship_status: 'Single', has_kids: 'No',
    responses: {
      q1_passionate_about: "Rock climbing and outdoor adventure. I spend most weekends in Yosemite or at local climbing gyms. Also really into trail running and backpacking.",
      q2_friends_describe: "Adventurous, driven, and maybe a bit intense about my hobbies. Friends say I'm reliable for outdoor plans and always down for a challenge.",
      q3_recharge_method: "Being outside - a long trail run, a climbing session, or just sitting by the ocean. Nature is my therapy.",
      q4_time_energy: "Work as a physical therapist, training for climbing, and planning my next outdoor adventure. I'm pretty focused on my fitness goals.",
      q5_life_stage: "Early career (just starting out)",
      q6_industry: "Healthcare",
      q7_day_to_day: "Work with patients, then either hit the climbing gym, go for a run, or plan weekend trips. Evenings are for meal prep and recovery.",
      q8_work_relationship: "I love being a PT - it's meaningful work helping people recover. But my real passion is the outdoors, and work funds that lifestyle.",
      q9_weekends: "Early morning trail runs, climbing trips, or backpacking. If I'm in town, maybe a farmers market and catching up with climbing buddies.",
      q10_activities_enjoy: "Rock climbing, trail running, backpacking, mountain biking, and trying new outdoor sports. Also love cooking healthy meals.",
      q11_talk_about_hours: "Climbing routes, training techniques, gear, upcoming trips, or adventure stories. Could also talk about nutrition and fitness.",
      q12_new_to_try: "I want to learn trad climbing and maybe try mountaineering. Also interested in learning to surf.",
      q13_food_music_books: "Food: Healthy, high-protein meals. Love cooking and meal prep. Music: Indie rock, folk, and workout playlists. Books: Adventure memoirs and climbing guides. Shows: Free Solo, The Alpinist, and outdoor documentaries.",
      q14_friendship_cadence: "Weekly",
      q15_communication_preference: "Texting",
      q16_planner_spontaneous: "Mix of both",
      q17_drive_distance: "50 miles",
      q18_availability_times: ["Weekend daytime", "Weekend evening"],
      q19_age_range_preference: "Similar age (within 3 years)",
      q20_issues_causes: "Environmental conservation and protecting public lands. Access to outdoor spaces for everyone, regardless of background.",
      q21_political_classification: "Moderate",
      q22_political_alignment_important: "Not important",
      q23_discuss_politics: "I prefer to keep it light and avoid politics",
      q24_friendship_matters_most: "Shared love of the outdoors, being active, and people who are up for adventures and challenges.",
      q25_kinds_of_friends: "Climbing and adventure partners, people to train with, and friends who appreciate an active lifestyle.",
      q26_matcha_hopes: "Find reliable adventure partners for climbing and outdoor trips. Success would be having a solid crew for weekend adventures."
    }
  },
  {
    email: 'lisa.yoga@test.com',
    first_name: 'Lisa', last_name: 'Patel', age: 30,
    city: 'San Francisco', lat: 37.7749, lng: -122.4194,
    gender: 'Female', pronouns: 'She/Her', relationship_status: 'Single', has_kids: 'No',
    responses: {
      q1_passionate_about: "Yoga, mindfulness, and holistic wellness. I'm a yoga instructor and really passionate about helping people find balance and peace.",
      q2_friends_describe: "Calm, centered, and nurturing. Friends say I'm a good listener and bring a sense of peace to situations, though sometimes I can be a bit too zen.",
      q3_recharge_method: "Yoga practice, meditation, or time in nature. I need regular practice to stay balanced and grounded.",
      q4_time_energy: "Teaching yoga classes, maintaining my own practice, and building my wellness business. Also trying to balance work with self-care.",
      q5_life_stage: "Early career (just starting out)",
      q6_industry: "Other",
      q7_day_to_day: "Teaching morning and evening yoga classes, maintaining my practice, maybe a workshop or training. Evenings are for rest and reflection.",
      q8_work_relationship: "Yoga is my passion and my career. It's not just a job - it's my calling and how I want to help people.",
      q9_weekends: "Longer yoga practices, maybe a workshop or retreat, nature time, or just quiet rest. I try to keep weekends restorative.",
      q10_activities_enjoy: "Yoga, meditation, hiking, reading spiritual books, trying new wellness practices, and cooking healthy meals.",
      q11_talk_about_hours: "Yoga philosophy, mindfulness, wellness, personal growth, or deep conversations about life and meaning.",
      q12_new_to_try: "I want to learn Ayurveda and maybe try sound healing. Also interested in learning more about plant medicine.",
      q13_food_music_books: "Food: Healthy, plant-based, Ayurvedic principles. Music: Meditation music, kirtan, and calming sounds. Books: Yoga philosophy, spirituality, wellness. Shows: Minimal TV, mostly documentaries about wellness or nature.",
      q14_friendship_cadence: "A few times a month",
      q15_communication_preference: "Texting",
      q16_planner_spontaneous: "Mix of both",
      q17_drive_distance: "10 miles",
      q18_availability_times: ["Weekend daytime"],
      q19_age_range_preference: "Wide range - age doesn't matter much to me",
      q20_issues_causes: "Mental health awareness and making wellness accessible to everyone, regardless of income or background.",
      q21_political_classification: "I don't really follow politics",
      q22_political_alignment_important: "Not important",
      q23_discuss_politics: "I prefer to keep it light and avoid politics",
      q24_friendship_matters_most: "Shared interest in wellness and growth, people who value balance and mindfulness, and friends who understand my lifestyle.",
      q25_kinds_of_friends: "Wellness-minded friends, yoga buddies, and people who appreciate deep conversations about life and growth.",
      q26_matcha_hopes: "Find friends who share my interest in wellness and personal growth. Success would be having a community of like-minded people."
    }
  },
  {
    email: 'alex.finance@test.com',
    first_name: 'Alex', last_name: 'Martinez', age: 31,
    city: 'San Francisco', lat: 37.7749, lng: -122.4194,
    gender: 'Non-binary', pronouns: 'They/Them', relationship_status: 'Single', has_kids: 'No',
    responses: {
      q1_passionate_about: "Financial literacy and helping people understand money. I work in finance but I'm passionate about making financial knowledge accessible to everyone.",
      q2_friends_describe: "Analytical, organized, and a good listener. Friends say I'm reliable and great at giving practical advice, though sometimes I overthink things.",
      q3_recharge_method: "Reading, podcasts, or a quiet evening at home. I'm an introvert so I need alone time to process and recharge.",
      q4_time_energy: "Work is demanding - long hours in finance. I'm also trying to maintain work-life balance and keep up with friends, which is a challenge.",
      q5_life_stage: "Career-focused (building my career)",
      q6_industry: "Finance",
      q7_day_to_day: "Long work days, meetings, analysis. Evenings are for decompressing - usually reading, podcasts, or a quiet dinner.",
      q8_work_relationship: "It's a career I'm building, but I'm also trying to find meaning beyond just making money. I want to help people with financial literacy.",
      q9_weekends: "Sleeping in, catching up on reading, maybe a museum or cultural event. I like low-key weekends that feel different from the work week.",
      q10_activities_enjoy: "Reading, podcasts, trying new restaurants, visiting museums, board games, and learning about personal finance and investing.",
      q11_talk_about_hours: "Books, podcasts, financial topics (if people are interested), current events, or deep conversations about life and goals.",
      q12_new_to_try: "I want to learn to cook better and maybe try rock climbing. Also thinking about starting a financial literacy blog.",
      q13_food_music_books: "Food: I'm a foodie - love trying new restaurants and cuisines. Music: Jazz, indie, and podcasts mostly. Books: Non-fiction, business books, memoirs. Shows: Succession, The Crown, and documentaries.",
      q14_friendship_cadence: "A few times a month",
      q15_communication_preference: "Texting",
      q16_planner_spontaneous: "I'm a planner - I like structure",
      q17_drive_distance: "10 miles",
      q18_availability_times: ["Weekend daytime", "Weekend evening"],
      q19_age_range_preference: "Slightly younger or older (within 5 years)",
      q20_issues_causes: "Financial inequality and making financial education accessible. Also care about LGBTQ+ rights and representation.",
      q21_political_classification: "Liberal",
      q22_political_alignment_important: "Very important",
      q23_discuss_politics: "I prefer friends who share my views",
      q24_friendship_matters_most: "Shared values, intellectual conversations, and people who respect my identity and boundaries.",
      q25_kinds_of_friends: "People for deep conversations, activity partners for cultural events, and friends who understand work-life balance challenges.",
      q26_matcha_hopes: "Find friends who share my values and interests. Success would be having a few close friends I can have meaningful conversations with."
    }
  },
  {
    email: 'jessica.parent@test.com',
    first_name: 'Jessica', last_name: 'Kim', age: 35,
    city: 'Berkeley', lat: 37.8715, lng: -122.2730,
    gender: 'Female', pronouns: 'She/Her', relationship_status: 'Married', has_kids: 'Yes',
    responses: {
      q1_passionate_about: "Parenting and early childhood education. I have two young kids and I'm really into Montessori methods and finding ways to raise thoughtful, independent children.",
      q2_friends_describe: "Organized, caring, and a bit tired! My friends say I'm reliable and always there when you need me, though I'm definitely more selective about my time now.",
      q3_recharge_method: "Honestly? A quiet house and a good book or podcast. Or a walk alone. Mom life is exhausting so I really value those rare moments of solitude.",
      q4_time_energy: "My kids take up most of my time and energy. I work part-time as a teacher, but most of my focus is on being present for my family.",
      q5_life_stage: "Family-focused (kids/family are my priority)",
      q6_industry: "Education",
      q7_day_to_day: "Getting kids ready for school, teaching part-time, picking kids up, activities, homework, dinner, bedtime routine. It's a lot but I love it.",
      q8_work_relationship: "Teaching is meaningful to me, but my family comes first. It's a job that fits my life right now, not my whole identity.",
      q9_weekends: "Kids' activities, playgrounds, maybe a family hike or museum trip. If I'm lucky, my partner watches the kids and I get coffee with a friend.",
      q10_activities_enjoy: "Reading, walking, trying to maintain a yoga practice (when I can), and finding kid-friendly activities that I also enjoy.",
      q11_talk_about_hours: "Parenting challenges and wins, education, books, or just catching up on life. I love talking to other parents who get it.",
      q12_new_to_try: "I'd love to join a book club or take a pottery class. Something just for me that doesn't involve kids.",
      q13_food_music_books: "Food: Quick, healthy meals that kids will actually eat. Music: Whatever keeps me sane - usually indie pop or calming playlists. Books: Parenting books, memoirs, and light fiction. Shows: I watch whatever I can when kids are asleep - lately The Crown and Bluey (with the kids).",
      q14_friendship_cadence: "Monthly",
      q15_communication_preference: "Texting",
      q16_planner_spontaneous: "I'm a planner - I like structure",
      q17_drive_distance: "10 miles",
      q18_availability_times: ["Weekend daytime"],
      q19_age_range_preference: "Slightly younger or older (within 5 years)",
      q20_issues_causes: "Education equity and making sure all kids have access to quality early childhood education. Also care about environmental issues for my kids' future.",
      q21_political_classification: "Liberal",
      q22_political_alignment_important: "Somewhat important",
      q23_discuss_politics: "I prefer to keep it light and avoid politics",
      q24_friendship_matters_most: "Understanding that I'm busy with kids, flexibility, and people who don't mind kid-friendly hangouts sometimes.",
      q25_kinds_of_friends: "Other parents who understand the chaos, and maybe some non-parent friends for adult conversation and perspective.",
      q26_matcha_hopes: "Find a few friends who get the parent life and maybe some kid-free friends too. Success would be having people I can connect with regularly, even if it's less frequent."
    }
  },
  {
    email: 'james.retired@test.com',
    first_name: 'James', last_name: 'Wilson', age: 68,
    city: 'Sausalito', lat: 37.8591, lng: -122.4853,
    gender: 'Male', pronouns: 'He/Him', relationship_status: 'Married', has_kids: 'Yes',
    responses: {
      q1_passionate_about: "Sailing and woodworking. I retired a few years ago and now I spend my time on my boat and in my workshop. Also love reading history.",
      q2_friends_describe: "Steady, reliable, and a good storyteller. Friends say I'm wise and always have an interesting perspective from my years of experience.",
      q3_recharge_method: "Time on the water sailing, working with my hands in the shop, or just reading with a good cup of coffee.",
      q4_time_energy: "Sailing, woodworking projects, and spending time with my grandkids. Retirement is busy in the best way.",
      q5_life_stage: "Retired",
      q6_industry: "Retired",
      q7_day_to_day: "Morning coffee and reading, then either sailing, working in my shop, or spending time with family. Evenings are quiet and relaxed.",
      q8_work_relationship: "I had a good career but I'm glad to be retired. Now I focus on hobbies and family - that's what matters.",
      q9_weekends: "Sailing if weather permits, working on projects, or family time. Sometimes just enjoying a quiet weekend at home.",
      q10_activities_enjoy: "Sailing, woodworking, reading history books, fishing, and spending time with my grandkids.",
      q11_talk_about_hours: "Sailing, history, woodworking techniques, or stories from my career and life experiences.",
      q12_new_to_try: "I want to learn more about boat restoration and maybe try writing about my sailing adventures.",
      q13_food_music_books: "Food: Classic American food, seafood, and good wine. Music: Jazz, classic rock, and classical. Books: History, especially maritime history. Shows: Historical documentaries and classic films.",
      q14_friendship_cadence: "Monthly",
      q15_communication_preference: "Phone calls",
      q16_planner_spontaneous: "Mostly a planner",
      q17_drive_distance: "25 miles",
      q18_availability_times: ["Weekday daytime", "Weekend daytime"],
      q19_age_range_preference: "Wide range - age doesn't matter much to me",
      q20_issues_causes: "Preserving maritime history and supporting local sailing communities. Also care about leaving a good world for my grandkids.",
      q21_political_classification: "Moderate",
      q22_political_alignment_important: "Not important",
      q23_discuss_politics: "I prefer to keep it light and avoid politics",
      q24_friendship_matters_most: "Shared interests, good conversation, and people who appreciate life experience and stories.",
      q25_kinds_of_friends: "Sailing buddies, people to share hobbies with, and friends who enjoy good conversation regardless of age.",
      q26_matcha_hopes: "Find some sailing and woodworking friends. Success would be having a few people to share hobbies and good conversations with."
    }
  }
];

function getQuestionText(questionId) {
  const questionMap = {
    q1_passionate_about: "What are you passionate about or curious about right now?",
    q2_friends_describe: "How would your closest friends describe your personality?",
    q3_recharge_method: "How do you recharge when you're feeling drained?",
    q4_time_energy: "What's taking up most of your time and energy these days?",
    q5_life_stage: "Which stage of life feels most like you right now?",
    q6_industry: "What industry or field do you work or study in?",
    q7_day_to_day: "Tell me about what you do day-to-day.",
    q8_work_relationship: "What's your relationship with work? Is it just a job, or is your career a big part of who you are?",
    q9_weekends: "How do you usually spend your weekends?",
    q10_activities_enjoy: "What activities or hobbies do you genuinely enjoy?",
    q11_talk_about_hours: "What could you talk about or do for hours?",
    q12_new_to_try: "What's something new you've been wanting to try or learn?",
    q13_food_music_books: "What kind of food, music, books, shows, or podcasts are you into right now? Spill it all.",
    q14_friendship_cadence: "What's your ideal cadence for new friendships?",
    q15_communication_preference: "How do you like to communicate with friends?",
    q16_planner_spontaneous: "Are you a planner, spontaneous, or somewhere in between?",
    q17_drive_distance: "How far are you willing to drive to meet up with someone?",
    q18_availability_times: "When are you usually most available to meet up with friends?",
    q19_age_range_preference: "What age range would you prefer for new friends?",
    q20_issues_causes: "What issues or causes matter most to you personally? What gets you fired up or concerned about the world?",
    q21_political_classification: "How would you classify yourself politically?",
    q22_political_alignment_important: "Is it important for you and your friends to be aligned politically?",
    q23_discuss_politics: "How do you feel about discussing politics or current events with friends?",
    q24_friendship_matters_most: "What matters most to you in a friendship?",
    q25_kinds_of_friends: "What kinds of friends are you hoping to find?",
    q26_matcha_hopes: "What are you hoping to get out of using Matcha? What would make this feel successful for you?",
  };
  return questionMap[questionId] || questionId;
}

async function generateEmbedding(text) {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });
  return response.data[0].embedding;
}

async function generateEmbeddingForUser(userId) {
  const { data: intake } = await supabase
    .from('intake_responses_v4')
    .select('responses')
    .eq('user_id', userId)
    .single();

  if (!intake) return null;

  const openEndedText = intake.responses
    .filter(r => r.type === 'open_ended')
    .map(r => `${r.question_text}: ${r.answer}`)
    .join('\n\n');

  const embedding = await generateEmbedding(openEndedText);
  
  await supabase
    .from('intake_responses_v4')
    .update({ embed_vector: `[${embedding.join(',')}]` })
    .eq('user_id', userId);

  return embedding;
}

async function main() {
  console.log('🚀 Setting up 10 test profiles with v4 questionnaire...\n');
  
  // First, generate embedding for Sarah who already has intake
  console.log('1. Generating embedding for Sarah Chen...');
  const sarahUserId = '59c3821f-e90c-491a-ab54-67f7b200c108';
  await generateEmbeddingForUser(sarahUserId);
  console.log('   ✅ Sarah\'s embedding generated\n');
  
  console.log('2. Creating remaining 9 profiles via MCP SQL...');
  console.log('   (This requires MCP SQL execution - see next steps)\n');
  
  console.log('3. Once all profiles are created, we\'ll run the matching algorithm\n');
  console.log('📊 Profile Summary:');
  allProfiles.forEach((p, i) => {
    console.log(`   ${i + 1}. ${p.first_name} ${p.last_name} (${p.age}, ${p.city}) - ${p.responses.q1_passionate_about.substring(0, 50)}...`);
  });
}

main().catch(console.error);
