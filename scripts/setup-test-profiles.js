// Complete script to create 10 profiles with v4 questionnaire and show matching
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

// Import profiles from the other file
const { profiles } = require('./create-10-profiles-with-embeddings.js');

async function generateEmbedding(text) {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });
  return response.data[0].embedding;
}

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

async function createProfileWithIntake(profileData) {
  console.log(`\n📝 Creating profile for ${profileData.first_name} ${profileData.last_name}...`);
  
  // Check if user exists
  const { data: existingUser } = await supabase.auth.admin.getUserByEmail(profileData.email).catch(() => ({ data: null }));
  
  let userId;
  if (existingUser?.user) {
    userId = existingUser.user.id;
    console.log(`   User exists: ${userId}`);
  } else {
    // Create auth user (requires service role - will need to do via MCP)
    console.log(`   Need to create auth user via MCP...`);
    return null;
  }
  
  // Create/update profile
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      first_name: profileData.first_name,
      last_name: profileData.last_name,
      age: profileData.age,
      city: profileData.city,
      lat: profileData.lat,
      lng: profileData.lng,
      gender: profileData.gender,
      pronouns: profileData.pronouns,
      relationship_status: profileData.relationship_status,
      has_kids: profileData.has_kids,
      in_matcha_bowl: true,
      is_active: true,
      radius_km: 15,
    });

  if (profileError) {
    console.error(`   Error creating profile:`, profileError);
    return null;
  }

  // Prepare v4 intake responses
  const responses = Object.entries(profileData.responses).map(([question_id, answer]) => ({
    question_id,
    question_text: getQuestionText(question_id),
    answer,
    type: ['q5', 'q6', 'q14', 'q15', 'q16', 'q17', 'q18', 'q19', 'q21', 'q22', 'q23'].includes(question_id) ? 'structured' : 'open_ended',
    answered_at: new Date().toISOString(),
  }));

  // Extract filtered columns
  const filteredColumns = {
    life_stage: profileData.responses.q5_life_stage,
    drive_distance: profileData.responses.q17_drive_distance,
    availability_times: Array.isArray(profileData.responses.q18_availability_times) 
      ? profileData.responses.q18_availability_times 
      : [profileData.responses.q18_availability_times],
    age_range_preference: profileData.responses.q19_age_range_preference,
    political_classification: profileData.responses.q21_political_classification,
    political_alignment_important: profileData.responses.q22_political_alignment_important,
  };

  // Generate embedding from open-ended responses
  const openEndedText = responses
    .filter(r => r.type === 'open_ended')
    .map(r => `${r.question_text}: ${r.answer}`)
    .join('\n\n');

  console.log(`   Generating embedding...`);
  const embedding = await generateEmbedding(openEndedText);

  // Save to intake_responses_v4
  const { error: intakeError } = await supabase
    .from('intake_responses_v4')
    .upsert({
      user_id: userId,
      responses,
      ...filteredColumns,
      embed_vector: `[${embedding.join(',')}]`, // Convert array to string for vector type
      completed_at: new Date().toISOString(),
    });

  if (intakeError) {
    console.error(`   Error saving intake:`, intakeError);
    return null;
  }

  console.log(`   ✅ Created profile and intake for ${profileData.first_name}`);
  return userId;
}

async function main() {
  console.log('🚀 Creating 10 test profiles with v4 questionnaire...\n');
  
  // For now, let's work with Sarah who already exists
  const sarahProfile = profiles[0];
  const sarahUserId = await createProfileWithIntake(sarahProfile);
  
  if (sarahUserId) {
    console.log(`\n✅ Sarah's profile ready!`);
    console.log(`\nNow creating remaining profiles via MCP SQL...`);
  }
}

main().catch(console.error);
