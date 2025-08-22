import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://hgllvhohhyamsbljekrd.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhnbGx2aG9oaHlhbXNibGpla3JkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4MTM5NTgsImV4cCI6MjA3MTM4OTk1OH0.VOsDwCxyqCkxuYPuFXCUpw4u2NCC-aX0BhwGJVIMPPY'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

// Database schema for Moai Friends app
export const moaiFriendsSchema = `
-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  initial VARCHAR(1),
  city VARCHAR(100) NOT NULL,
  lat DECIMAL(10, 8),
  lng DECIMAL(11, 8),
  radius_km INTEGER DEFAULT 15,
  avatar_url TEXT,
  bio_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  is_paused BOOLEAN DEFAULT false
);

-- User preferences
CREATE TABLE IF NOT EXISTS preferences (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  languages TEXT[] DEFAULT '{}',
  availability_slots JSONB DEFAULT '{}',
  reminder_opt_in BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Intake responses (50 questions)
CREATE TABLE IF NOT EXISTS intake_responses (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  answers JSONB NOT NULL, -- q01..q50
  traits TEXT[] DEFAULT '{}',
  hobbies TEXT[] DEFAULT '{}',
  embed_vector vector(1536), -- OpenAI embedding
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Match candidates (weekly batches)
CREATE TABLE IF NOT EXISTS match_candidates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  batch_week DATE NOT NULL,
  user_a UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_b UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  score DECIMAL(3,2),
  reasons JSONB, -- {overlaps: [], complement: string}
  status VARCHAR(20) DEFAULT 'pending', -- pending, accepted, rejected, expired
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_a, user_b, batch_week)
);

-- Consent responses
CREATE TABLE IF NOT EXISTS consents (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  candidate_id UUID REFERENCES match_candidates(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  response BOOLEAN NOT NULL, -- true = yes, false = no
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(candidate_id, user_id)
);

-- Conversations (triad chats)
CREATE TABLE IF NOT EXISTS conversations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_a UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_b UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ai_present BOOLEAN DEFAULT true,
  opened_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'active', -- active, archived, blocked
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Messages in conversations
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  sender_type VARCHAR(10) NOT NULL, -- 'user', 'ai'
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  text TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Blocks and reports
CREATE TABLE IF NOT EXISTS blocks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  blocker_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_id)
);

CREATE TABLE IF NOT EXISTS reports (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  reporter_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  details TEXT,
  status VARCHAR(20) DEFAULT 'pending', -- pending, reviewed, resolved
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_city ON profiles(city);
CREATE INDEX IF NOT EXISTS idx_profiles_location ON profiles(lat, lng);
CREATE INDEX IF NOT EXISTS idx_match_candidates_batch ON match_candidates(batch_week);
CREATE INDEX IF NOT EXISTS idx_match_candidates_users ON match_candidates(user_a, user_b);
CREATE INDEX IF NOT EXISTS idx_conversations_users ON conversations(user_a, user_b);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_blocks_users ON blocks(blocker_id, blocked_id);

-- Row Level Security (RLS) policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE intake_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Match candidates policies (users can see candidates involving them)
CREATE POLICY "Users can view their match candidates" ON match_candidates
  FOR SELECT USING (auth.uid() = user_a OR auth.uid() = user_b);

-- Conversations policies (users can see conversations they're part of)
CREATE POLICY "Users can view their conversations" ON conversations
  FOR SELECT USING (auth.uid() = user_a OR auth.uid() = user_b);

-- Messages policies (users can see messages in their conversations)
CREATE POLICY "Users can view messages in their conversations" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversations 
      WHERE conversations.id = messages.conversation_id 
      AND (conversations.user_a = auth.uid() OR conversations.user_b = auth.uid())
    )
  );

CREATE POLICY "Users can insert messages in their conversations" ON messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations 
      WHERE conversations.id = messages.conversation_id 
      AND (conversations.user_a = auth.uid() OR conversations.user_b = auth.uid())
    )
  );

-- Blocks policies
CREATE POLICY "Users can view their blocks" ON blocks
  FOR SELECT USING (auth.uid() = blocker_id);

CREATE POLICY "Users can create blocks" ON blocks
  FOR INSERT WITH CHECK (auth.uid() = blocker_id);

-- Functions for common operations
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_preferences_updated_at BEFORE UPDATE ON preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_intake_responses_updated_at BEFORE UPDATE ON intake_responses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
`

// MCP utility functions
export const getProjectInfo = async () => {
  try {
    const { data, error } = await supabase.from('profiles').select('count').limit(1)
    if (error) throw error
    return {
      name: 'Moai Friends',
      status: 'active',
      tables: ['profiles', 'preferences', 'intake_responses', 'match_candidates', 'consents', 'conversations', 'messages', 'blocks', 'reports'],
      users: data?.length || 0
    }
  } catch (error) {
    console.error('Error getting project info:', error)
    return { name: 'Moai Friends', status: 'error', error: (error as Error).message }
  }
}

export const listTables = async () => {
  try {
    const tables = [
      { name: 'profiles', description: 'User profiles with location and basic info' },
      { name: 'preferences', description: 'User preferences and settings' },
      { name: 'intake_responses', description: '50-question intake responses with embeddings' },
      { name: 'match_candidates', description: 'Weekly match candidates with scores' },
      { name: 'consents', description: 'User consent responses to matches' },
      { name: 'conversations', description: 'Triad conversations between users' },
      { name: 'messages', description: 'Messages in conversations' },
      { name: 'blocks', description: 'User blocks' },
      { name: 'reports', description: 'User reports' }
    ]
    return tables
  } catch (error) {
    console.error('Error listing tables:', error)
    return []
  }
}

export const executeSQL = async (query: string) => {
  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: query })
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    console.error('Error executing SQL:', error)
    return { success: false, error: (error as Error).message }
  }
}

export const applyMigration = async (name: string, sql: string) => {
  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql })
    if (error) throw error
    return { success: true, migration: name, data }
  } catch (error) {
    console.error('Error applying migration:', error)
    return { success: false, migration: name, error: (error as Error).message }
  }
}

export const setupDatabase = async () => {
  try {
    const result = await applyMigration('moai_friends_schema', moaiFriendsSchema)
    return result
  } catch (error) {
    console.error('Error setting up database:', error)
    return { success: false, error: (error as Error).message }
  }
}

// Example data for testing
export const exampleSchema = {
  profiles: [
    {
      id: 'user1',
      name: 'Alex',
      initial: 'A',
      city: 'San Francisco',
      lat: 37.7749,
      lng: -122.4194,
      radius_km: 15,
      bio_text: 'Love hiking and coffee chats!'
    }
  ],
  preferences: [
    {
      user_id: 'user1',
      languages: ['English', 'Spanish'],
      availability_slots: { weekdays: ['evening'], weekends: ['afternoon'] }
    }
  ]
}

