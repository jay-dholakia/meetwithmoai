import { supabase } from '../lib/supabase';

/**
 * Migration script to convert old intake_responses (JSONB) to new intake_responses_v2 (structured columns)
 * This script helps transition from the old 50-question format to the new 35-question format
 */

interface OldIntakeResponse {
  user_id: string;
  answers: Record<string, any>;
  traits: string[];
  hobbies: string[];
  embed_vector?: number[];
  completed_at: string;
  updated_at: string;
}

interface NewIntakeResponse {
  user_id: string;
  // Part A: Interests & Activities (10)
  activities_enjoyed: string[];
  top_3_activities: string[];
  active_outdoor_frequency: number;
  indoor_hangs_frequency: number;
  try_new_activities: number;
  competitive_activities: number;
  sports_teams: string;
  music_preferences: string[];
  alcohol_preference: string;
  kid_friendly_preference: string;
  // Part B: Social Style & Reliability (10)
  energy_from_people: number;
  prefer_one_on_one: number;
  comfortable_joining_solo: number;
  like_structured_plans: number;
  enjoy_spontaneous: number;
  conversation_flow: number;
  playful_banter: number;
  reliable_plans: number;
  value_balance_talking: number;
  prefer_deep_friendships: number;
  // Part C: Work, Life & Anchors (5)
  work_study: string;
  industry: string;
  life_stage: string;
  local_status: string;
  hometown: string;
  // Part D: Communication & Boundaries (5)
  favorite_planning_method: string;
  reply_speed: string;
  preferred_meeting_times: string[];
  travel_distance: string;
  avoid_topics: string[];
  // Part E: Creative Open-Ended (5)
  current_media: string;
  free_saturday: string;
  day_brightener: string;
  three_words_description: string;
  new_to_try: string;
  // Metadata
  embed_vector?: number[];
  completed_at: string;
  updated_at: string;
}

function mapOldToNew(oldResponse: OldIntakeResponse): Partial<NewIntakeResponse> {
  const answers = oldResponse.answers;
  
  return {
    user_id: oldResponse.user_id,
    
    // Map old questions to new structure where possible
    activities_enjoyed: answers.q01 || [],
    active_outdoor_frequency: mapScaleToNumber(answers.q02),
    indoor_hangs_frequency: mapScaleToNumber(answers.q03),
    try_new_activities: mapLikertToNumber(answers.q04),
    competitive_activities: mapLikertToNumber(answers.q08),
    sports_teams: answers.q09 || '',
    music_preferences: answers.q10 || [],
    alcohol_preference: mapAlcoholPreference(answers.q11),
    kid_friendly_preference: mapKidFriendlyPreference(answers.q12),
    
    // Social style mapping (approximate)
    energy_from_people: mapLikertToNumber(answers.q13),
    prefer_one_on_one: mapLikertToNumber(answers.q14),
    comfortable_joining_solo: mapLikertToNumber(answers.q15),
    like_structured_plans: mapLikertToNumber(answers.q16),
    enjoy_spontaneous: mapLikertToNumber(answers.q17),
    conversation_flow: mapLikertToNumber(answers.q18),
    playful_banter: mapLikertToNumber(answers.q19),
    reliable_plans: mapLikertToNumber(answers.q20),
    value_balance_talking: mapLikertToNumber(answers.q21),
    prefer_deep_friendships: mapLikertToNumber(answers.q22),
    
    // Work/life mapping
    work_study: answers.q23 || '',
    industry: mapIndustry(answers.q24),
    life_stage: mapLifeStage(answers.q25),
    local_status: mapLocalStatus(answers.q26),
    hometown: answers.q27 || '',
    
    // Communication mapping
    favorite_planning_method: mapPlanningMethod(answers.q28),
    reply_speed: mapReplySpeed(answers.q29),
    preferred_meeting_times: answers.q30 || [],
    travel_distance: mapTravelDistance(answers.q31),
    avoid_topics: answers.q32 || [],
    
    // Creative responses
    current_media: answers.q33 || '',
    free_saturday: answers.q34 || '',
    day_brightener: answers.q35 || '',
    three_words_description: answers.q36 || '',
    new_to_try: answers.q37 || '',
    
    // Metadata
    embed_vector: oldResponse.embed_vector,
    completed_at: oldResponse.completed_at,
    updated_at: oldResponse.updated_at
  };
}

// Helper functions for mapping old values to new format
function mapScaleToNumber(scale: string): number {
  const scaleMap: Record<string, number> = {
    'Rarely': 1,
    'Sometimes': 2,
    'Often': 3,
    'Very often': 4,
    'All the time': 5
  };
  return scaleMap[scale] || 3;
}

function mapLikertToNumber(likert: string): number {
  const likertMap: Record<string, number> = {
    'Strongly disagree': 1,
    'Disagree': 2,
    'Neutral': 3,
    'Agree': 4,
    'Strongly agree': 5
  };
  return likertMap[likert] || 3;
}

function mapAlcoholPreference(pref: string): string {
  const prefMap: Record<string, string> = {
    'None': 'None',
    'Fine if others drink': 'Fine if others drink',
    'I drink socially': 'I drink socially'
  };
  return prefMap[pref] || 'Fine if others drink';
}

function mapKidFriendlyPreference(pref: string): string {
  const prefMap: Record<string, string> = {
    'Not needed': 'Not needed',
    'Sometimes': 'Sometimes',
    'Prefer kid-friendly': 'Prefer kid-friendly'
  };
  return prefMap[pref] || 'Not needed';
}

function mapIndustry(industry: string): string {
  const industryMap: Record<string, string> = {
    'Technology': 'Tech',
    'Healthcare': 'Healthcare',
    'Education': 'Education',
    'Arts': 'Arts',
    'Business': 'Business',
    'Trades': 'Trades',
    'Student': 'Student'
  };
  return industryMap[industry] || 'Other';
}

function mapLifeStage(stage: string): string {
  const stageMap: Record<string, string> = {
    'Student': 'Student',
    'Early career': 'Early career',
    'Parent': 'Parent',
    'Mid-career': 'Mid-career',
    'Retired': 'Retired'
  };
  return stageMap[stage] || 'Other';
}

function mapLocalStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'Local': 'Local',
    'Newcomer': 'Newcomer',
    'Relocated': 'Relocated'
  };
  return statusMap[status] || 'Local';
}

function mapPlanningMethod(method: string): string {
  const methodMap: Record<string, string> = {
    'In-app chat': 'In-app chat',
    'Text': 'Text',
    'WhatsApp': 'WhatsApp',
    'Discord': 'Discord',
    'Email': 'Email'
  };
  return methodMap[method] || 'Text';
}

function mapReplySpeed(speed: string): string {
  const speedMap: Record<string, string> = {
    'Within hour': 'Within hour',
    'Same day': 'Same day',
    '1-2 days': '1-2 days',
    'Longer': 'Longer'
  };
  return speedMap[speed] || 'Same day';
}

function mapTravelDistance(distance: string): string {
  const distanceMap: Record<string, string> = {
    '<2 km': '<2 km',
    '5 km': '5 km',
    '10 km': '10 km',
    '20 km': '20 km'
  };
  return distanceMap[distance] || '10 km';
}

export async function migrateIntakeData() {
  try {
    console.log('Starting intake data migration...');
    
    // Fetch all old intake responses
    const { data: oldResponses, error: fetchError } = await supabase
      .from('intake_responses')
      .select('*');
    
    if (fetchError) {
      console.error('Error fetching old responses:', fetchError);
      return;
    }
    
    console.log(`Found ${oldResponses?.length || 0} old intake responses to migrate`);
    
    // Migrate each response
    for (const oldResponse of oldResponses || []) {
      const newResponse = mapOldToNew(oldResponse);
      
      // Insert into new table
      const { error: insertError } = await supabase
        .from('intake_responses_v2')
        .upsert(newResponse);
      
      if (insertError) {
        console.error(`Error migrating user ${oldResponse.user_id}:`, insertError);
      } else {
        console.log(`Successfully migrated user ${oldResponse.user_id}`);
      }
    }
    
    console.log('Migration completed!');
    
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

// Run migration if this script is executed directly
if (require.main === module) {
  migrateIntakeData();
}


