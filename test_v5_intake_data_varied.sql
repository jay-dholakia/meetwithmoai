-- Test data for V5 intake questionnaire with VARIED responses
-- This creates different response patterns for different users to test scoring

-- Step 1: Set age_range_preference in profiles table for all users with some variation
-- Using hash of user ID to create variation without window functions
UPDATE profiles
SET age_range_preference = CASE 
  WHEN (ABS(HASHTEXT(id::text)) % 3 = 0) THEN 3  -- ±3 years (stricter)
  WHEN (ABS(HASHTEXT(id::text)) % 3 = 1) THEN 5  -- ±5 years (default)
  ELSE 7  -- ±7 years (more flexible)
END
WHERE age_range_preference IS NULL;

-- Step 2: Insert/Update intake_responses_v5 with VARIED sample responses
-- This creates different response patterns based on user ID hash for variety

INSERT INTO intake_responses_v5 (user_id, responses, life_stage, availability_times, completed_at, updated_at, created_at)
SELECT 
  p.id as user_id,
  -- Generate varied responses based on user ID hash
  CASE (ABS(HASHTEXT(p.id::text)) % 4)
    WHEN 0 THEN jsonb_build_array(
      -- Pattern 1: Career-focused, extroverted, thoughtful conversations
      jsonb_build_object('question_id', 'q1_life_stages', 'question_text', 'Which stages of life feel relevant to you right now?', 'answer', ARRAY['Career-focused', 'Building something (company, project, creative work)']::text[], 'type', 'structured', 'answered_at', NOW()::text),
      jsonb_build_object('question_id', 'q2_connection_types', 'question_text', 'What kinds of connections are you most open to through Convi?', 'answer', ARRAY['Professional conversation or support', 'Social friends / broader social circle']::text[], 'type', 'structured', 'answered_at', NOW()::text),
      jsonb_build_object('question_id', 'q3_introvert_extrovert', 'question_text', 'Do you see yourself as more introverted or extroverted?', 'answer', 'Mostly extroverted', 'type', 'structured', 'answered_at', NOW()::text),
      jsonb_build_object('question_id', 'q4_enjoy_doing', 'question_text', 'What kinds of things do you enjoy doing in your free time—lately or in general?', 'answer', 'I love networking events, working on side projects, and going to tech meetups. I also enjoy fitness classes and trying new restaurants.', 'type', 'open_ended', 'answered_at', NOW()::text),
      jsonb_build_object('question_id', 'q5_enjoy_consuming', 'question_text', 'What kinds of things do you enjoy consuming in your free time?', 'answer', 'I listen to business podcasts, read startup blogs, and watch TED talks. I also enjoy documentaries about innovation.', 'type', 'open_ended', 'answered_at', NOW()::text),
      jsonb_build_object('question_id', 'q6_excited_to_try', 'question_text', 'Is there anything you''re excited to try, learn, or get into next?', 'answer', 'Want to learn more about investing and maybe start a podcast. Also interested in public speaking.', 'type', 'open_ended', 'answered_at', NOW()::text),
      jsonb_build_object('question_id', 'q7_conversation_type', 'question_text', 'What kind of conversations tend to feel best to you?', 'answer', 'Thoughtful', 'type', 'structured', 'answered_at', NOW()::text),
      jsonb_build_object('question_id', 'q8_conversation_flows', 'question_text', 'When a conversation really flows for you, what does it usually end up being about?', 'answer', 'Usually about ideas, goals, and how we can help each other grow. Sometimes about industry trends or creative projects.', 'type', 'open_ended', 'answered_at', NOW()::text),
      jsonb_build_object('question_id', 'q9_important_parts', 'question_text', 'Are there any parts of who you are that feel especially important to you?', 'answer', 'My ambition and drive are really important. I value growth and always pushing myself. Family is also central to who I am.', 'type', 'open_ended', 'answered_at', NOW()::text),
      jsonb_build_object('question_id', 'q10_work_study', 'question_text', 'What do you do for work or study right now?', 'answer', 'I work in product management at a tech startup. I love building things that matter.', 'type', 'open_ended', 'answered_at', NOW()::text),
      jsonb_build_object('question_id', 'q11_availability_times', 'question_text', 'When does it usually feel easiest for you to make time to meet someone new?', 'answer', ARRAY['Weekday evening', 'Weekend daytime', 'Weekend evening']::text[], 'type', 'structured', 'answered_at', NOW()::text),
      jsonb_build_object('question_id', 'q12_age_range_preference', 'question_text', 'What age range are you most comfortable connecting with?', 'answer', '± 5 years', 'type', 'structured', 'answered_at', NOW()::text),
      jsonb_build_object('question_id', 'q13_first_conversation_note', 'question_text', 'Anything else you''d want someone to know before sitting down for a first conversation with you?', 'answer', 'I''m very goal-oriented and love talking about ideas and possibilities. Always excited to meet driven people!', 'type', 'open_ended', 'answered_at', NOW()::text)
    )
    WHEN 1 THEN jsonb_build_array(
      -- Pattern 2: Family-focused, introverted, light conversations
      jsonb_build_object('question_id', 'q1_life_stages', 'question_text', 'Which stages of life feel relevant to you right now?', 'answer', ARRAY['Family-focused', 'Career-focused']::text[], 'type', 'structured', 'answered_at', NOW()::text),
      jsonb_build_object('question_id', 'q2_connection_types', 'question_text', 'What kinds of connections are you most open to through Convi?', 'answer', ARRAY['Casual conversation / coffee chats', 'Just meeting new people and seeing what clicks']::text[], 'type', 'structured', 'answered_at', NOW()::text),
      jsonb_build_object('question_id', 'q3_introvert_extrovert', 'question_text', 'Do you see yourself as more introverted or extroverted?', 'answer', 'Mostly introverted', 'type', 'structured', 'answered_at', NOW()::text),
      jsonb_build_object('question_id', 'q4_enjoy_doing', 'question_text', 'What kinds of things do you enjoy doing in your free time—lately or in general?', 'answer', 'I love reading, gardening, and spending quiet time with my family. I enjoy cooking and trying new recipes. Sometimes I go for walks in nature.', 'type', 'open_ended', 'answered_at', NOW()::text),
      jsonb_build_object('question_id', 'q5_enjoy_consuming', 'question_text', 'What kinds of things do you enjoy consuming in your free time?', 'answer', 'I read fiction novels and listen to audiobooks. I watch cooking shows and enjoy quiet music. Sometimes I listen to parenting podcasts.', 'type', 'open_ended', 'answered_at', NOW()::text),
      jsonb_build_object('question_id', 'q6_excited_to_try', 'question_text', 'Is there anything you''re excited to try, learn, or get into next?', 'answer', 'Want to get better at baking and maybe try some local hiking trails. Also interested in learning more about photography.', 'type', 'open_ended', 'answered_at', NOW()::text),
      jsonb_build_object('question_id', 'q7_conversation_type', 'question_text', 'What kind of conversations tend to feel best to you?', 'answer', 'Light and easy', 'type', 'structured', 'answered_at', NOW()::text),
      jsonb_build_object('question_id', 'q8_conversation_flows', 'question_text', 'When a conversation really flows for you, what does it usually end up being about?', 'answer', 'Usually about everyday life, shared experiences, or common interests. I enjoy talking about family, hobbies, or simple pleasures.', 'type', 'open_ended', 'answered_at', NOW()::text),
      jsonb_build_object('question_id', 'q9_important_parts', 'question_text', 'Are there any parts of who you are that feel especially important to you?', 'answer', 'My family is everything to me. I value stability, kindness, and being present for the people I care about. I also value my quiet time.', 'type', 'open_ended', 'answered_at', NOW()::text),
      jsonb_build_object('question_id', 'q10_work_study', 'question_text', 'What do you do for work or study right now?', 'answer', 'I work part-time in education and focus a lot on raising my kids. I enjoy the balance.', 'type', 'open_ended', 'answered_at', NOW()::text),
      jsonb_build_object('question_id', 'q11_availability_times', 'question_text', 'When does it usually feel easiest for you to make time to meet someone new?', 'answer', ARRAY['Weekday daytime', 'Weekend daytime']::text[], 'type', 'structured', 'answered_at', NOW()::text),
      jsonb_build_object('question_id', 'q12_age_range_preference', 'question_text', 'What age range are you most comfortable connecting with?', 'answer', '± 5 years', 'type', 'structured', 'answered_at', NOW()::text),
      jsonb_build_object('question_id', 'q13_first_conversation_note', 'question_text', 'Anything else you''d want someone to know before sitting down for a first conversation with you?', 'answer', 'I''m pretty laid-back and enjoy simple, genuine connections. I appreciate people who are understanding and patient.', 'type', 'open_ended', 'answered_at', NOW()::text)
    )
    WHEN 2 THEN jsonb_build_array(
      -- Pattern 3: Student, in-between, mix of conversations
      jsonb_build_object('question_id', 'q1_life_stages', 'question_text', 'Which stages of life feel relevant to you right now?', 'answer', ARRAY['Student', 'Early career']::text[], 'type', 'structured', 'answered_at', NOW()::text),
      jsonb_build_object('question_id', 'q2_connection_types', 'question_text', 'What kinds of connections are you most open to through Convi?', 'answer', ARRAY['Exploring hobbies or activities together', 'Workout or movement buddy', 'Just meeting new people and seeing what clicks']::text[], 'type', 'structured', 'answered_at', NOW()::text),
      jsonb_build_object('question_id', 'q3_introvert_extrovert', 'question_text', 'Do you see yourself as more introverted or extroverted?', 'answer', 'Somewhere in between', 'type', 'structured', 'answered_at', NOW()::text),
      jsonb_build_object('question_id', 'q4_enjoy_doing', 'question_text', 'What kinds of things do you enjoy doing in your free time—lately or in general?', 'answer', 'I love hiking, rock climbing, and trying new fitness classes. I also enjoy going to concerts and exploring the city. Sometimes I just chill and watch shows.', 'type', 'open_ended', 'answered_at', NOW()::text),
      jsonb_build_object('question_id', 'q5_enjoy_consuming', 'question_text', 'What kinds of things do you enjoy consuming in your free time?', 'answer', 'I listen to indie music and podcasts about science. I watch YouTube videos about travel and adventure. I read sci-fi and fantasy books.', 'type', 'open_ended', 'answered_at', NOW()::text),
      jsonb_build_object('question_id', 'q6_excited_to_try', 'question_text', 'Is there anything you''re excited to try, learn, or get into next?', 'answer', 'Want to try bouldering and maybe learn a new language. Also interested in getting into film photography.', 'type', 'open_ended', 'answered_at', NOW()::text),
      jsonb_build_object('question_id', 'q7_conversation_type', 'question_text', 'What kind of conversations tend to feel best to you?', 'answer', 'A mix of both', 'type', 'structured', 'answered_at', NOW()::text),
      jsonb_build_object('question_id', 'q8_conversation_flows', 'question_text', 'When a conversation really flows for you, what does it usually end up being about?', 'answer', 'Usually about adventures, shared interests, or deep topics we''re both curious about. Sometimes it''s just about life and experiences.', 'type', 'open_ended', 'answered_at', NOW()::text),
      jsonb_build_object('question_id', 'q9_important_parts', 'question_text', 'Are there any parts of who you are that feel especially important to you?', 'answer', 'My curiosity and sense of adventure are really important. I value authenticity and being open to new experiences. I also care about staying active and healthy.', 'type', 'open_ended', 'answered_at', NOW()::text),
      jsonb_build_object('question_id', 'q10_work_study', 'question_text', 'What do you do for work or study right now?', 'answer', 'I''m a graduate student studying environmental science. I also work part-time at a coffee shop.', 'type', 'open_ended', 'answered_at', NOW()::text),
      jsonb_build_object('question_id', 'q11_availability_times', 'question_text', 'When does it usually feel easiest for you to make time to meet someone new?', 'answer', ARRAY['Weekday evening', 'Weekend daytime', 'Weekend evening']::text[], 'type', 'structured', 'answered_at', NOW()::text),
      jsonb_build_object('question_id', 'q12_age_range_preference', 'question_text', 'What age range are you most comfortable connecting with?', 'answer', '± 5 years', 'type', 'structured', 'answered_at', NOW()::text),
      jsonb_build_object('question_id', 'q13_first_conversation_note', 'question_text', 'Anything else you''d want someone to know before sitting down for a first conversation with you?', 'answer', 'I''m pretty easygoing and love trying new things. Always up for an adventure or a good conversation!', 'type', 'open_ended', 'answered_at', NOW()::text)
    )
    ELSE jsonb_build_array(
      -- Pattern 4: Transitioning, depends on person, varied interests
      jsonb_build_object('question_id', 'q1_life_stages', 'question_text', 'Which stages of life feel relevant to you right now?', 'answer', ARRAY['Between phases / transitioning', 'Early career']::text[], 'type', 'structured', 'answered_at', NOW()::text),
      jsonb_build_object('question_id', 'q2_connection_types', 'question_text', 'What kinds of connections are you most open to through Convi?', 'answer', ARRAY['Casual conversation / coffee chats', 'Professional conversation or support', 'Just meeting new people and seeing what clicks']::text[], 'type', 'structured', 'answered_at', NOW()::text),
      jsonb_build_object('question_id', 'q3_introvert_extrovert', 'question_text', 'Do you see yourself as more introverted or extroverted?', 'answer', 'Somewhere in between', 'type', 'structured', 'answered_at', NOW()::text),
      jsonb_build_object('question_id', 'q4_enjoy_doing', 'question_text', 'What kinds of things do you enjoy doing in your free time—lately or in general?', 'answer', 'I enjoy a mix of things - sometimes I want to be active and go hiking or to a yoga class, other times I just want to read or watch movies. I like trying new restaurants and going to art galleries.', 'type', 'open_ended', 'answered_at', NOW()::text),
      jsonb_build_object('question_id', 'q5_enjoy_consuming', 'question_text', 'What kinds of things do you enjoy consuming in your free time?', 'answer', 'I listen to a wide variety of music and podcasts. I read both fiction and non-fiction. I watch documentaries and also enjoy some TV shows. I like exploring different types of media.', 'type', 'open_ended', 'answered_at', NOW()::text),
      jsonb_build_object('question_id', 'q6_excited_to_try', 'question_text', 'Is there anything you''re excited to try, learn, or get into next?', 'answer', 'I''m in a phase of exploring what I want to do next. Maybe learning a new skill or trying a different career path. Also interested in travel and new experiences.', 'type', 'open_ended', 'answered_at', NOW()::text),
      jsonb_build_object('question_id', 'q7_conversation_type', 'question_text', 'What kind of conversations tend to feel best to you?', 'answer', 'Depends on the person', 'type', 'structured', 'answered_at', NOW()::text),
      jsonb_build_object('question_id', 'q8_conversation_flows', 'question_text', 'When a conversation really flows for you, what does it usually end up being about?', 'answer', 'It really depends on who I''m talking to. Sometimes it''s about shared experiences, sometimes about ideas, sometimes just about life in general.', 'type', 'open_ended', 'answered_at', NOW()::text),
      jsonb_build_object('question_id', 'q9_important_parts', 'question_text', 'Are there any parts of who you are that feel especially important to you?', 'answer', 'I value growth and being open to change. I care about authenticity and finding my path. I also value connections with people who understand where I''m coming from.', 'type', 'open_ended', 'answered_at', NOW()::text),
      jsonb_build_object('question_id', 'q10_work_study', 'question_text', 'What do you do for work or study right now?', 'answer', 'I''m currently between jobs and exploring different options. I''ve done a few different things and figuring out what''s next.', 'type', 'open_ended', 'answered_at', NOW()::text),
      jsonb_build_object('question_id', 'q11_availability_times', 'question_text', 'When does it usually feel easiest for you to make time to meet someone new?', 'answer', ARRAY['Weekday daytime', 'Weekday evening', 'Weekend daytime']::text[], 'type', 'structured', 'answered_at', NOW()::text),
      jsonb_build_object('question_id', 'q12_age_range_preference', 'question_text', 'What age range are you most comfortable connecting with?', 'answer', '± 5 years', 'type', 'structured', 'answered_at', NOW()::text),
      jsonb_build_object('question_id', 'q13_first_conversation_note', 'question_text', 'Anything else you''d want someone to know before sitting down for a first conversation with you?', 'answer', 'I''m in a bit of a transition phase in life, so I appreciate people who are understanding and open-minded. I love meeting people from different backgrounds!', 'type', 'open_ended', 'answered_at', NOW()::text)
    )
  END as responses,
  CASE (ABS(HASHTEXT(p.id::text)) % 4)
    WHEN 0 THEN ARRAY['Career-focused', 'Building something (company, project, creative work)']::text[]
    WHEN 1 THEN ARRAY['Family-focused', 'Career-focused']::text[]
    WHEN 2 THEN ARRAY['Student', 'Early career']::text[]
    ELSE ARRAY['Between phases / transitioning', 'Early career']::text[]
  END as life_stage,
  CASE (ABS(HASHTEXT(p.id::text)) % 4)
    WHEN 0 THEN ARRAY['Weekday evening', 'Weekend daytime', 'Weekend evening']::text[]
    WHEN 1 THEN ARRAY['Weekday daytime', 'Weekend daytime']::text[]
    WHEN 2 THEN ARRAY['Weekday evening', 'Weekend daytime', 'Weekend evening']::text[]
    ELSE ARRAY['Weekday daytime', 'Weekday evening', 'Weekend daytime']::text[]
  END as availability_times,
  NOW() as completed_at,
  NOW() as updated_at,
  NOW() as created_at
FROM profiles p
WHERE p.is_active = true
ON CONFLICT (user_id) 
DO UPDATE SET
  responses = EXCLUDED.responses,
  life_stage = EXCLUDED.life_stage,
  availability_times = EXCLUDED.availability_times,
  completed_at = EXCLUDED.completed_at,
  updated_at = EXCLUDED.updated_at;

-- Note: embed_vector will need to be generated separately using the OpenAI API
-- The responses are now ready for testing the new V5 scoring system!
