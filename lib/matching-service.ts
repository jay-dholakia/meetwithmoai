import { supabase } from './mcp-supabase';
import { openAIService } from './openai';

export interface MatchCandidate {
  id: string;
  batch_week: string;
  user_a: string;
  user_b: string;
  score: number;
  reasons: {
    overlaps: string[];
    complement: string;
  };
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  expires_at: string;
}

export interface UserProfile {
  id: string;
  name: string;
  initial: string;
  city: string;
  lat: number;
  lng: number;
  radius_km: number;
  avatar_url?: string;
  bio_text?: string;
  is_active: boolean;
  is_paused: boolean;
}

export interface IntakeResponse {
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

export interface UserPreferences {
  user_id: string;
  languages: string[];
  availability_slots: any;
  reminder_opt_in: boolean;
}

export class MatchingService {
  // Calculate distance between two points using Haversine formula
  private static calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  // Calculate Jaccard similarity between two arrays
  private static calculateJaccardSimilarity(arr1: string[], arr2: string[]): number {
    if (arr1.length === 0 && arr2.length === 0) return 1;
    if (arr1.length === 0 || arr2.length === 0) return 0;
    
    const set1 = new Set(arr1);
    const set2 = new Set(arr2);
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size;
  }

  // Calculate cosine similarity between two vectors
  private static calculateCosineSimilarity(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length) return 0;
    
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;
    
    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      norm1 += vec1[i] * vec1[i];
      norm2 += vec2[i] * vec2[i];
    }
    
    if (norm1 === 0 || norm2 === 0) return 0;
    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  // Extract traits and hobbies from intake responses
  private static extractTraitsAndHobbies(intake: IntakeResponse): { traits: string[], hobbies: string[] } {
    const traits: string[] = [];
    const hobbies: string[] = [];
    
    // Extract from answers (this would be more sophisticated in production)
    const answers = intake.answers;
    
    // Example extraction logic
    if (answers.q01) {
      hobbies.push(...answers.q01.split(',').map((h: string) => h.trim()));
    }
    
    if (answers.q04 && answers.q04.includes('Agree')) {
      traits.push('adventurous');
    }
    
    if (answers.q05 && answers.q05.includes('Agree')) {
      traits.push('consistent');
    }
    
    return { traits, hobbies };
  }

  // Calculate match score between two users
  private static calculateMatchScore(
    userA: { profile: UserProfile; intake: IntakeResponse; prefs: UserPreferences },
    userB: { profile: UserProfile; intake: IntakeResponse; prefs: UserPreferences }
  ): { score: number; reasons: { overlaps: string[]; complement: string } } {
    const overlaps: string[] = [];
    const reasons: string[] = [];
    
    // Distance penalty
    const distance = this.calculateDistance(
      userA.profile.lat, userA.profile.lng,
      userB.profile.lat, userB.profile.lng
    );
    
    if (distance > userA.profile.radius_km || distance > userB.profile.radius_km) {
      return { score: 0, reasons: { overlaps: [], complement: 'Too far apart' } };
    }
    
    const distancePenalty = Math.min(distance / 10, 0.3); // Max 30% penalty
    
    // Language overlap
    const languageOverlap = this.calculateJaccardSimilarity(
      userA.prefs.languages, userB.prefs.languages
    );
    if (languageOverlap > 0) {
      overlaps.push('speak common languages');
      reasons.push(`Language similarity: ${(languageOverlap * 100).toFixed(0)}%`);
    }
    
    // Hobbies overlap
    const hobbySimilarity = this.calculateJaccardSimilarity(
      userA.intake.hobbies, userB.intake.hobbies
    );
    if (hobbySimilarity > 0.3) {
      overlaps.push('share hobbies');
      reasons.push(`Hobby overlap: ${(hobbySimilarity * 100).toFixed(0)}%`);
    }
    
    // Bio embedding similarity (if available)
    let bioSimilarity = 0;
    if (userA.intake.embed_vector && userB.intake.embed_vector) {
      bioSimilarity = this.calculateCosineSimilarity(
        userA.intake.embed_vector, userB.intake.embed_vector
      );
      if (bioSimilarity > 0.5) {
        overlaps.push('similar communication style');
        reasons.push(`Communication similarity: ${(bioSimilarity * 100).toFixed(0)}%`);
      }
    }
    
    // Availability overlap
    const availabilityOverlap = this.calculateJaccardSimilarity(
      Object.keys(userA.prefs.availability_slots || {}),
      Object.keys(userB.prefs.availability_slots || {})
    );
    if (availabilityOverlap > 0.5) {
      overlaps.push('similar availability');
      reasons.push(`Schedule compatibility: ${(availabilityOverlap * 100).toFixed(0)}%`);
    }
    
    // Calculate final score
    const baseScore = (languageOverlap * 0.2) + 
                     (hobbySimilarity * 0.3) + 
                     (bioSimilarity * 0.3) + 
                     (availabilityOverlap * 0.2);
    
    const finalScore = Math.max(0, baseScore - distancePenalty);
    
    // Generate complement reason
    const complement = this.generateComplementReason(userA, userB);
    
    return {
      score: Math.round(finalScore * 100) / 100,
      reasons: {
        overlaps,
        complement
      }
    };
  }

  // Generate a complement reason for the match
  private static generateComplementReason(
    userA: { profile: UserProfile; intake: IntakeResponse },
    userB: { profile: UserProfile; intake: IntakeResponse }
  ): string {
    const differences = [];
    
    if (userA.intake.hobbies.length > userB.intake.hobbies.length) {
      differences.push(`${userA.profile.name} could introduce ${userB.profile.name} to new activities`);
    } else if (userB.intake.hobbies.length > userA.intake.hobbies.length) {
      differences.push(`${userB.profile.name} could introduce ${userA.profile.name} to new activities`);
    }
    
    if (userA.profile.city !== userB.profile.city) {
      differences.push('different neighborhoods to explore together');
    }
    
    if (differences.length === 0) {
      return 'complementary personalities';
    }
    
    return differences.join(', ');
  }

  // Generate weekly matches for a user
  static async generateWeeklyMatches(userId: string): Promise<MatchCandidate[]> {
    try {
      // Get current week
      const now = new Date();
      const batchWeek = now.toISOString().split('T')[0]; // YYYY-MM-DD format
      
      // Get user's profile, intake, and preferences
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      const { data: userIntake } = await supabase
        .from('intake_responses')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      const { data: userPrefs } = await supabase
        .from('preferences')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (!userProfile || !userIntake || !userPrefs) {
        throw new Error('User profile, intake, or preferences not found');
      }
      
      // Get all potential matches
      const { data: potentialMatches } = await supabase
        .from('profiles')
        .select(`
          *,
          intake_responses (*),
          preferences (*)
        `)
        .eq('is_active', true)
        .eq('is_paused', false)
        .neq('id', userId);
      
      if (!potentialMatches) return [];
      
      // Calculate scores for all potential matches
      const scoredMatches = potentialMatches
        .map(match => {
          const matchIntake = match.intake_responses?.[0];
          const matchPrefs = match.preferences?.[0];
          
          if (!matchIntake || !matchPrefs) return null;
          
          const { score, reasons } = this.calculateMatchScore(
            { profile: userProfile, intake: userIntake, prefs: userPrefs },
            { profile: match, intake: matchIntake, prefs: matchPrefs }
          );
          
          return {
            user_b: match.id,
            score,
            reasons
          };
        })
        .filter(match => match !== null && match.score > 0.3) // Minimum score threshold
        .sort((a, b) => b.score - a.score);
      
      // Check for recent matches (last 8 weeks)
      const eightWeeksAgo = new Date();
      eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);
      
      const { data: recentMatches } = await supabase
        .from('match_candidates')
        .select('user_b')
        .eq('user_a', userId)
        .gte('created_at', eightWeeksAgo.toISOString());
      
      const recentUserIds = new Set(recentMatches?.map(m => m.user_b) || []);
      
      // Filter out recent matches and take top 3
      const finalMatches = scoredMatches
        .filter(match => !recentUserIds.has(match.user_b))
        .slice(0, 3);
      
      // Create match candidates in database
      const candidates: MatchCandidate[] = [];
      for (const match of finalMatches) {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 6); // Expire Saturday midnight
        
        const { data: candidate, error } = await supabase
          .from('match_candidates')
          .insert({
            batch_week: batchWeek,
            user_a: userId,
            user_b: match.user_b,
            score: match.score,
            reasons: match.reasons,
            status: 'pending',
            expires_at: expiresAt.toISOString()
          })
          .select()
          .single();
        
        if (candidate && !error) {
          candidates.push(candidate);
        }
      }
      
      return candidates;
    } catch (error) {
      console.error('Error generating weekly matches:', error);
      throw error;
    }
  }

  // Check if both users consented to a match
  static async checkMutualConsent(candidateId: string): Promise<boolean> {
    try {
      const { data: consents } = await supabase
        .from('consents')
        .select('*')
        .eq('candidate_id', candidateId);
      
      if (!consents || consents.length < 2) return false;
      
      return consents.every(consent => consent.response === true);
    } catch (error) {
      console.error('Error checking mutual consent:', error);
      return false;
    }
  }

  // Create a conversation when both users consent
  static async createConversation(candidateId: string): Promise<string | null> {
    try {
      const { data: candidate } = await supabase
        .from('match_candidates')
        .select('*')
        .eq('id', candidateId)
        .single();
      
      if (!candidate) return null;
      
      // Create conversation
      const { data: conversation, error } = await supabase
        .from('conversations')
        .insert({
          user_a: candidate.user_a,
          user_b: candidate.user_b,
          ai_present: true,
          status: 'active'
        })
        .select()
        .single();
      
      if (error || !conversation) return null;
      
      // Generate AI opening message
      const openingMessage = await this.generateOpeningMessage(candidate);
      
      // Add AI message to conversation
      await supabase
        .from('messages')
        .insert({
          conversation_id: conversation.id,
          sender_type: 'ai',
          text: openingMessage,
          metadata: { type: 'opening' }
        });
      
      return conversation.id;
    } catch (error) {
      console.error('Error creating conversation:', error);
      return null;
    }
  }

  // Generate AI opening message for a new conversation
  private static async generateOpeningMessage(candidate: any): Promise<string> {
    try {
      const prompt = `Generate a friendly opening message for two people who just matched on a friend-finding app. 
      
      Match details:
      - Score: ${candidate.score}
      - Overlaps: ${candidate.reasons.overlaps.join(', ')}
      - Complement: ${candidate.reasons.complement}
      
      Keep it warm, brief, and encourage them to start chatting. Include 2-3 icebreaker suggestions.`;
      
      const response = await openAIService.generateChatResponse(prompt);
      return response;
    } catch (error) {
      return "Hi! You two matched! 🎉 You have some things in common and could complement each other well. Why don't you start by sharing what you're up to this week?";
    }
  }

  // Get user's current matches
  static async getUserMatches(userId: string): Promise<MatchCandidate[]> {
    try {
      const { data: matches } = await supabase
        .from('match_candidates')
        .select('*')
        .or(`user_a.eq.${userId},user_b.eq.${userId}`)
        .eq('status', 'pending')
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });
      
      return matches || [];
    } catch (error) {
      console.error('Error getting user matches:', error);
      return [];
    }
  }

  // Record user consent to a match
  static async recordConsent(candidateId: string, userId: string, response: boolean): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('consents')
        .upsert({
          candidate_id: candidateId,
          user_id: userId,
          response
        });
      
      if (error) throw error;
      
      // Check if both users consented
      const mutualConsent = await this.checkMutualConsent(candidateId);
      if (mutualConsent) {
        await this.createConversation(candidateId);
      }
      
      return true;
    } catch (error) {
      console.error('Error recording consent:', error);
      return false;
    }
  }
}

