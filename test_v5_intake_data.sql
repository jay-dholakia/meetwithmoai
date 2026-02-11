-- Test data for V5 intake questionnaire
-- This script populates intake_responses_v5 and profiles.age_range_preference for all users

-- Step 1: Set age_range_preference in profiles table for all users (default to 5 = ±5 years)
UPDATE profiles
SET age_range_preference = 5
WHERE age_range_preference IS NULL;

-- Step 2: Insert/Update intake_responses_v5 for all users with sample V5 questionnaire responses
-- This uses a CTE to generate sample responses for each user

WITH sample_responses AS (
  SELECT 
    p.id as user_id,
    jsonb_build_array(
      -- q1_life_stages (multi-select)
      jsonb_build_object(
        'question_id', 'q1_life_stages',
        'question_text', 'Which stages of life feel relevant to you right now?',
        'answer', ARRAY['Early career', 'Career-focused']::text[],
        'type', 'structured',
        'answered_at', NOW()::text
      ),
      -- q2_connection_types (multi-select)
      jsonb_build_object(
        'question_id', 'q2_connection_types',
        'question_text', 'What kinds of connections are you most open to through Convi?',
        'answer', ARRAY['Casual conversation / coffee chats', 'Exploring hobbies or activities together']::text[],
        'type', 'structured',
        'answered_at', NOW()::text
      ),
      -- q3_introvert_extrovert (single-select)
      jsonb_build_object(
        'question_id', 'q3_introvert_extrovert',
        'question_text', 'Do you see yourself as more introverted or extroverted?',
        'answer', 'Somewhere in between',
        'type', 'structured',
        'answered_at', NOW()::text
      ),
      -- q4_enjoy_doing (open-ended)
      jsonb_build_object(
        'question_id', 'q4_enjoy_doing',
        'question_text', 'What kinds of things do you enjoy doing in your free time—lately or in general?',
        'answer', 'I love hiking, reading sci-fi novels, and trying new coffee shops. I also enjoy photography and going to concerts.',
        'type', 'open_ended',
        'answered_at', NOW()::text
      ),
      -- q5_enjoy_consuming (open-ended)
      jsonb_build_object(
        'question_id', 'q5_enjoy_consuming',
        'question_text', 'What kinds of things do you enjoy consuming in your free time?',
        'answer', 'I listen to a lot of podcasts about technology and startups. I watch documentaries and enjoy reading non-fiction books about psychology and history.',
        'type', 'open_ended',
        'answered_at', NOW()::text
      ),
      -- q6_excited_to_try (open-ended)
      jsonb_build_object(
        'question_id', 'q6_excited_to_try',
        'question_text', 'Is there anything you''re excited to try, learn, or get into next?',
        'answer', 'I want to learn rock climbing and maybe try pottery. Also interested in getting better at cooking.',
        'type', 'open_ended',
        'answered_at', NOW()::text
      ),
      -- q7_conversation_type (single-select)
      jsonb_build_object(
        'question_id', 'q7_conversation_type',
        'question_text', 'What kind of conversations tend to feel best to you?',
        'answer', 'A mix of both',
        'type', 'structured',
        'answered_at', NOW()::text
      ),
      -- q8_conversation_flows (open-ended)
      jsonb_build_object(
        'question_id', 'q8_conversation_flows',
        'question_text', 'When a conversation really flows for you, what does it usually end up being about?',
        'answer', 'Usually ends up being about shared interests, life experiences, or ideas we''re both curious about. Sometimes it''s about work or creative projects.',
        'type', 'open_ended',
        'answered_at', NOW()::text
      ),
      -- q9_important_parts (open-ended)
      jsonb_build_object(
        'question_id', 'q9_important_parts',
        'question_text', 'Are there any parts of who you are that feel especially important to you? (Culture, creativity, faith, family, upbringing, values, etc.)',
        'answer', 'My family and upbringing are really important to me. I value creativity and always trying to learn new things. I also care a lot about being authentic and genuine.',
        'type', 'open_ended',
        'answered_at', NOW()::text
      ),
      -- q10_work_study (open-ended)
      jsonb_build_object(
        'question_id', 'q10_work_study',
        'question_text', 'What do you do for work or study right now?',
        'answer', 'I work in tech as a software engineer. I enjoy building products and solving problems.',
        'type', 'open_ended',
        'answered_at', NOW()::text
      ),
      -- q11_availability_times (multi-select)
      jsonb_build_object(
        'question_id', 'q11_availability_times',
        'question_text', 'When does it usually feel easiest for you to make time to meet someone new?',
        'answer', ARRAY['Weekday evening', 'Weekend daytime']::text[],
        'type', 'structured',
        'answered_at', NOW()::text
      ),
      -- q12_age_range_preference (slider - stored as formatted string in responses, but number in profiles)
      jsonb_build_object(
        'question_id', 'q12_age_range_preference',
        'question_text', 'What age range are you most comfortable connecting with?',
        'answer', '± 5 years',
        'type', 'structured',
        'answered_at', NOW()::text
      ),
      -- q13_first_conversation_note (open-ended, optional)
      jsonb_build_object(
        'question_id', 'q13_first_conversation_note',
        'question_text', 'Anything else you''d want someone to know before sitting down for a first conversation with you?',
        'answer', 'I''m pretty easygoing and love meeting new people. Always up for trying new things!',
        'type', 'open_ended',
        'answered_at', NOW()::text
      )
    ) as responses,
    ARRAY['Early career', 'Career-focused']::text[] as life_stage,
    ARRAY['Weekday evening', 'Weekend daytime']::text[] as availability_times
  FROM profiles p
  WHERE p.is_active = true
)
INSERT INTO intake_responses_v5 (user_id, responses, life_stage, availability_times, completed_at, updated_at, created_at)
SELECT 
  user_id,
  responses,
  life_stage,
  availability_times,
  NOW() as completed_at,
  NOW() as updated_at,
  NOW() as created_at
FROM sample_responses
ON CONFLICT (user_id) 
DO UPDATE SET
  responses = EXCLUDED.responses,
  life_stage = EXCLUDED.life_stage,
  availability_times = EXCLUDED.availability_times,
  completed_at = EXCLUDED.completed_at,
  updated_at = EXCLUDED.updated_at;

-- Note: embed_vector will need to be generated separately using the OpenAI API
-- You can generate embeddings later by calling the completion flow in the app,
-- or by running a separate script that processes the open-ended responses.
