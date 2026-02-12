import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/mcp-supabase';
import { getNextBatchWeekMonday } from '../lib/weeklyMatchOptIn';
import MatchCard from '../components/MatchCard';
import WeeklyMatchOptInCard from '../components/WeeklyMatchOptInCard';

interface MatchCandidate {
  id: string;
  user_a: string;
  user_b: string;
  score: number;
  reasons: {
    shared_interests?: string[];
    conversation_hooks?: string[];
    complementary_traits?: string[];
  };
  status: string;
  created_at: string;
  expires_at: string;
  other_user: {
    id: string;
    first_name: string;
    avatar_url: string | null;
    birthdate: string | null;
    bio_text: string | null;
    city?: string | null;
    relationship_status?: string | null;
  };
}

interface Conversation {
  id: string;
  user_a: string;
  user_b: string;
  conversation_type: string;
  other_user: {
    id: string;
    name: string;
    initial: string;
    avatar_url?: string;
  };
  last_message?: {
    text: string;
    sender_type: 'user' | 'ai';
    created_at: string;
  };
  opened_at: string;
  last_activity_at: string;
  status: 'active' | 'archived' | 'blocked';
}


export default function MoaiMatchesScreen({ navigation }: any) {
  const theme = useTheme();
  const { user } = useAuth();
  const [matches, setMatches] = useState<MatchCandidate[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeChatCount, setActiveChatCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isQuestionnaireComplete, setIsQuestionnaireComplete] = useState(false);
  const [activeTab, setActiveTab] = useState<'matches' | 'chats'>('matches');
  const [optedInForNextWeek, setOptedInForNextWeek] = useState<boolean | null>(null);
  const [optInLoading, setOptInLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadMatches(),
        loadConversations(),
        loadActiveChatCount(),
        checkQuestionnaireCompletion(),
        loadWeeklyOptInStatus(),
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadWeeklyOptInStatus = useCallback(async () => {
    if (!user?.id) return;
    const batchWeek = getNextBatchWeekMonday();
    const { data, error } = await supabase
      .from('weekly_match_opt_ins')
      .select('user_id')
      .eq('user_id', user.id)
      .eq('batch_week', batchWeek)
      .maybeSingle();
    if (error) {
      console.error('Error loading weekly opt-in:', error);
      setOptedInForNextWeek(null);
      return;
    }
    setOptedInForNextWeek(!!data);
  }, [user?.id]);

  const setWeeklyOptIn = useCallback(async (value: boolean) => {
    if (!user?.id) return;
    setOptInLoading(true);
    const batchWeek = getNextBatchWeekMonday();
    try {
      if (value) {
        const { error } = await supabase
          .from('weekly_match_opt_ins')
          .upsert(
            { user_id: user.id, batch_week: batchWeek, opted_in_at: new Date().toISOString() },
            { onConflict: 'user_id,batch_week' }
          );
        if (error) throw error;
        await supabase.from('profiles').update({ in_match_bowl: true }).eq('id', user.id);
        setOptedInForNextWeek(true);
      } else {
        const { error } = await supabase
          .from('weekly_match_opt_ins')
          .delete()
          .eq('user_id', user.id)
          .eq('batch_week', batchWeek);
        if (error) throw error;
        await supabase.from('profiles').update({ in_match_bowl: false }).eq('id', user.id);
        setOptedInForNextWeek(false);
      }
    } catch (e) {
      console.error('Error updating weekly opt-in:', e);
      Alert.alert('Error', 'Could not update opt-in. Try again.');
    } finally {
      setOptInLoading(false);
    }
  }, [user?.id]);

  const loadMatches = async () => {
    try {
      // Get active match candidates for the user
      // Only show matches where both users score each other above 0.3 threshold
      // Exception: show opted-in matches even if below threshold (user already started the process)
      const { data: matchData, error } = await supabase
        .from('match_candidates')
        .select('*')
        .or(`user_a.eq.${user?.id},user_b.eq.${user?.id}`)
        .in('status', ['active', 'opted_in_a', 'opted_in_b'])
        .gt('expires_at', new Date().toISOString())
        .order('score', { ascending: false }); // Order by score (highest first)

      if (error) throw error;

      // Filter: only show matches with score >= 0.3 OR already opted in (in progress)
      const filteredMatches = matchData?.filter((match: any) => {
        const isOptedIn = match.status === 'opted_in_a' || match.status === 'opted_in_b';
        return match.score >= 0.3 || isOptedIn;
      }) || [];

      // Get all unique user IDs from filtered matches
      const userIds = new Set<string>();
      filteredMatches.forEach(match => {
        userIds.add(match.user_a);
        userIds.add(match.user_b);
      });

      // Fetch all profiles at once
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, avatar_url, birthdate, bio_text, city, relationship_status')
        .in('id', Array.from(userIds));

      if (profilesError) throw profilesError;

      // Fetch intake responses for richer profile information using RPC function
      // This bypasses RLS since users can only call it with matched user IDs
      const { data: intakeData, error: intakeError } = await supabase
        .rpc('get_matched_users_intake', { user_ids: Array.from(userIds) });

      if (intakeError) {
        console.error('Error loading intake data:', intakeError);
      } else {
        console.log('Successfully loaded intake data for', intakeData?.length || 0, 'users');
        if (intakeData && intakeData.length > 0) {
          console.log('User IDs with intake data:', intakeData.map(i => i.user_id?.substring(0, 8) || 'unknown'));
        }
      }

      // Fetch opt-ins to check if user has opted in (fallback if match status wasn't updated)
      const { data: optInsData, error: optInsError } = await supabase
        .from('opt_ins')
        .select('match_id, user_id, decision')
        .eq('user_id', user?.id)
        .eq('decision', 'opt_in');

      if (optInsError) console.error('Error loading opt-ins:', optInsError);
      
      // Create a map of match IDs where user has opted in
      const userOptInMap = new Map<string, boolean>();
      optInsData?.forEach(optIn => {
        userOptInMap.set(optIn.match_id, true);
      });

      // Create maps for quick lookup
      const profilesMap = new Map();
      profilesData?.forEach(profile => {
        profilesMap.set(profile.id, profile);
      });

      const intakeMap = new Map();
      intakeData?.forEach(intake => {
        // Ensure user_id is a string for consistent Map lookups
        const userId = String(intake.user_id);
        intakeMap.set(userId, intake);
      });

      console.log('Intake data loaded:', intakeData?.length || 0, 'users');
      console.log('Intake map size:', intakeMap.size);
      if (intakeData && intakeData.length > 0) {
        console.log('Sample intake user_id:', intakeData[0].user_id, 'type:', typeof intakeData[0].user_id);
      }

      const processedMatches = filteredMatches.map((match: any) => {
        const isUserA = match.user_a === user?.id;
        const otherUserId = isUserA ? match.user_b : match.user_a;
        const otherUserProfile = profilesMap.get(otherUserId);
        // Ensure consistent string comparison
        const otherUserIntake = intakeMap.get(String(otherUserId));
        
        if (!otherUserIntake) {
          console.log(`No intake data found for user ${otherUserId?.substring(0, 8)} (type: ${typeof otherUserId})`);
          console.log('Looking in intake map for:', String(otherUserId));
          console.log('Available keys in intake map:', Array.from(intakeMap.keys()).slice(0, 5).map(k => k.substring(0, 8)));
        } else {
          console.log(`Found intake data for user ${otherUserId?.substring(0, 8)}, responses: ${otherUserIntake.responses?.length || 0}`);
        }
        
        // Fix match status if user has opted in but status wasn't updated
        const hasUserOptedIn = userOptInMap.get(match.id);
        if (hasUserOptedIn && match.status === 'active') {
          // Update status based on which user opted in
          match.status = isUserA ? 'opted_in_a' : 'opted_in_b';
        }

        const matchWithData = {
          ...match,
          other_user: otherUserProfile || null,
          other_user_intake: otherUserIntake || null
        };
        
        // Debug logging
        if (otherUserIntake) {
          console.log(`Match ${match.id.substring(0, 8)}: Intake data found for ${otherUserId.substring(0, 8)}, responses count: ${otherUserIntake.responses?.length || 0}`);
        } else {
          console.log(`Match ${match.id.substring(0, 8)}: No intake data for ${otherUserId.substring(0, 8)}`);
          console.log('Available intake user IDs:', Array.from(intakeMap.keys()).map(id => id.substring(0, 8)));
        }
        
        return matchWithData;
      }) || [];

      // Sort matches: active matches first, waiting matches last, then by score (highest first)
      const sortedMatches = processedMatches.sort((a, b) => {
        const isUserA_a = a.user_a === user?.id;
        const isUserA_b = b.user_a === user?.id;
        
        // Determine if user is waiting for the other person to respond
        const isWaiting_a = (isUserA_a && a.status === 'opted_in_a') || (!isUserA_a && a.status === 'opted_in_b');
        const isWaiting_b = (isUserA_b && b.status === 'opted_in_a') || (!isUserA_b && b.status === 'opted_in_b');
        
        // If one is waiting and the other isn't, put the non-waiting one first
        if (isWaiting_a && !isWaiting_b) return 1;
        if (!isWaiting_a && isWaiting_b) return -1;
        
        // If both are the same type (both waiting or both active), sort by score (highest first)
        const scoreA = parseFloat(a.score) || 0;
        const scoreB = parseFloat(b.score) || 0;
        return scoreB - scoreA;
      });

      setMatches(sortedMatches);
    } catch (error) {
      console.error('Error loading matches:', error);
    }
  };

  const loadConversations = async () => {
    try {
      // Get match conversations where user is either user_a or user_b
      // Only show conversations with activity in the last 30 days to filter out old inactive chats
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          id,
          user_a,
          user_b,
          conversation_type,
          opened_at,
          last_activity_at,
          status,
          user_a_profile:profiles!conversations_user_a_fkey (
            id,
            first_name,
            avatar_url
          ),
          user_b_profile:profiles!conversations_user_b_fkey (
            id,
            first_name,
            avatar_url
          ),
          messages (
            text,
            sender_type,
            created_at
          )
        `)
        .or(`user_a.eq.${user?.id},user_b.eq.${user?.id}`)
        .eq('conversation_type', 'match')
        .eq('status', 'active')
        .order('last_activity_at', { ascending: false });

      if (error) throw error;

      const processedConversations = data?.map((conv: any) => {
        const isUserA = conv.user_a === user?.id;
        const otherUser = isUserA ? conv.user_b_profile : conv.user_a_profile;
        
        // Get last message
        const lastMessage = conv.messages && conv.messages.length > 0 
          ? conv.messages[conv.messages.length - 1] 
          : null;

        return {
          id: conv.id,
          user_a: conv.user_a,
          user_b: conv.user_b,
          conversation_type: conv.conversation_type,
          other_user: {
            id: otherUser.id,
            name: otherUser.first_name || 'Unknown',
            initial: otherUser.first_name ? otherUser.first_name.charAt(0).toUpperCase() : '?',
            avatar_url: otherUser.avatar_url,
          },
          last_message: lastMessage,
          opened_at: conv.opened_at,
          last_activity_at: conv.last_activity_at,
          status: conv.status,
        };
      }) || [];

      setConversations(processedConversations);
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  };

  const loadActiveChatCount = async () => {
    try {
      const { data, error } = await supabase
        .rpc('count_active_match_chats', { user_uuid: user?.id });

      if (error) throw error;
      setActiveChatCount(data || 0);
    } catch (error) {
      console.error('Error loading active chat count:', error);
    }
  };

  const checkQuestionnaireCompletion = async () => {
    try {
      const { data, error } = await supabase
        .from('intake_responses_v5')
        .select('completed_at')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
      
      setIsQuestionnaireComplete(!!(data && data.completed_at));
    } catch (error) {
      console.error('Error checking questionnaire completion:', error);
      setIsQuestionnaireComplete(false);
    }
  };

  const handleMatchUpdate = () => {
    loadData();
    // Replenish runs only on Tuesday cron; do not trigger on every user action to avoid overwriting status
  };

  const formatLastActivity = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 48) return 'Yesterday';
    return date.toLocaleDateString();
  };

  const renderMatch = ({ item }: { item: MatchCandidate }) => {
    const intakeData = (item as any).other_user_intake;
    console.log('Rendering match card for', item.other_user?.first_name, '- intake data:', intakeData ? 'present' : 'null');
    if (intakeData) {
      console.log('Intake responses count:', intakeData.responses?.length || 0);
    }
    
    return (
      <MatchCard
        match={item}
        otherUser={item.other_user}
        otherUserIntake={intakeData}
        onMatchUpdate={handleMatchUpdate}
        activeChatCount={activeChatCount}
        navigation={navigation}
      />
    );
  };

  const renderConversation = ({ item }: { item: Conversation }) => (
    <TouchableOpacity
      style={[styles.conversationItem, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
      onPress={() => navigation.navigate('Conversation', { conversationId: item.id })}
    >
      <View style={styles.avatarContainer}>
        {item.other_user.avatar_url ? (
          <Image
            source={{ uri: item.other_user.avatar_url }}
            style={styles.avatar}
          />
        ) : (
          <View style={[styles.avatarPlaceholder, { backgroundColor: theme.colors.primary }]}>
            <Text style={styles.avatarText}>{item.other_user.initial}</Text>
          </View>
        )}
      </View>
      
      <View style={styles.conversationContent}>
        <View style={styles.conversationHeader}>
          <Text style={[styles.userName, { color: theme.colors.text }]}>
            {item.other_user.name}
          </Text>
          <Text style={[styles.lastActivity, { color: theme.colors.textSecondary }]}>
            {formatLastActivity(item.last_activity_at)}
          </Text>
        </View>
        
        {item.last_message ? (
          <Text style={[styles.lastMessage, { color: theme.colors.textSecondary }]} numberOfLines={2}>
            {item.last_message.text}
          </Text>
        ) : (
          <Text style={[styles.lastMessage, { color: theme.colors.textSecondary }]}>
            New Cove connection started
          </Text>
        )}
      </View>
      
      <Ionicons
        name="chevron-forward"
        size={20}
        color={theme.colors.textSecondary}
      />
    </TouchableOpacity>
  );

  const renderSectionHeader = ({ section }: { section: SectionData }) => (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
        {section.title}
      </Text>
      {section.type === 'matches' && activeChatCount >= 3 && (
        <Text style={[styles.chatLimitWarning, { color: theme.colors.warning }]}>
          Chat limit reached (3/3)
        </Text>
      )}
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons
        name="cafe-outline"
        size={64}
        color={theme.colors.textSecondary}
      />
      <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
        No Cove connections yet
      </Text>
      <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
        Complete your questionnaire to start receiving daily match suggestions for café meetups.
      </Text>
    </View>
  );

  const renderSegmentedControl = () => (
    <View style={[styles.segmentedControl, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
      <TouchableOpacity
        style={[
          styles.segment,
          styles.segmentLeft,
          activeTab === 'matches' && { backgroundColor: theme.colors.primary }
        ]}
        onPress={() => setActiveTab('matches')}
      >
        <Text style={[
          styles.segmentText,
          { 
            color: activeTab === 'matches' ? '#FFFFFF' : theme.colors.text,
            fontWeight: activeTab === 'matches' ? '600' : '400'
          }
        ]}>
          Match Suggestions
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.segment,
          styles.segmentRight,
          activeTab === 'chats' && { backgroundColor: theme.colors.primary }
        ]}
        onPress={() => setActiveTab('chats')}
      >
        <Text style={[
          styles.segmentText,
          { 
            color: activeTab === 'chats' ? '#FFFFFF' : theme.colors.text,
            fontWeight: activeTab === 'chats' ? '600' : '400'
          }
        ]}>
          Active Chats
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderWeeklyOptInHeader = () => (
    <View style={styles.weeklyOptInCardWrapper}>
      <WeeklyMatchOptInCard
        optedIn={optedInForNextWeek}
        loading={optInLoading}
        onToggle={setWeeklyOptIn}
      />
    </View>
  );

  const renderTabContent = () => {
    if (activeTab === 'matches') {
      return (
        <FlatList
          data={matches}
          renderItem={renderMatch}
          keyExtractor={(item) => item.id}
          style={styles.list}
          contentContainerStyle={styles.listContainer}
          ListHeaderComponent={renderWeeklyOptInHeader}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={loadData}
              tintColor={theme.colors.primary}
            />
          }
          ListEmptyComponent={() => renderEmptySection('matches')}
        />
      );
    } else {
      return (
        <FlatList
          data={conversations}
          renderItem={renderConversation}
          keyExtractor={(item) => item.id}
          style={styles.list}
          contentContainerStyle={styles.conversationListContainer}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={loadData}
              tintColor={theme.colors.primary}
            />
          }
          ListEmptyComponent={() => renderEmptySection('conversations')}
        />
      );
    }
  };

  const renderEmptySection = (sectionType: string) => {
    if (sectionType === 'matches') {
      // Next Tuesday 20:00 UTC (matches run via cron: 0 20 * * 2)
      const now = new Date();
      const utcDay = now.getUTCDay();
      let daysToTuesday = (2 - utcDay + 7) % 7; // 2 = Tuesday
      if (daysToTuesday === 0 && now.getUTCHours() >= 20) daysToTuesday = 7;
      const nextRun = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() + daysToTuesday,
        20, 0, 0, 0
      ));

      const nextWeekDate = nextRun.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric'
      });
      const nextWeekTime = nextRun.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });

      const emptyStateContent = isQuestionnaireComplete ? {
        title: "No matches available",
        subtitle: `We'll send you another fresh set of matches next Tuesday at ${nextWeekTime} (${nextWeekDate}).`
      } : {
        title: "No matches yet",
        subtitle: "Complete your questionnaire in Cora to start receiving personalized match suggestions!"
      };

      return (
        <View style={styles.emptySectionState}>
          <Ionicons
            name="cafe-outline"
            size={48}
            color={theme.colors.textSecondary}
          />
          <Text style={[styles.emptySectionTitle, { color: theme.colors.text }]}>
            {emptyStateContent.title}
          </Text>
          <Text style={[styles.emptySectionSubtitle, { color: theme.colors.textSecondary }]}>
            {emptyStateContent.subtitle}
          </Text>
        </View>
      );
    }
    if (sectionType === 'conversations') {
      return (
        <View style={styles.emptySectionState}>
          <Ionicons
            name="chatbubble-outline"
            size={48}
            color={theme.colors.textSecondary}
          />
          <Text style={[styles.emptySectionTitle, { color: theme.colors.text }]}>
            No active chats
          </Text>
          <Text style={[styles.emptySectionSubtitle, { color: theme.colors.textSecondary }]}>
            Opt in to a match to start a new conversation!
          </Text>
        </View>
      );
    }
    return null;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          People
        </Text>
      </View>

      <View style={styles.tabContainer}>
        {renderSegmentedControl()}
      </View>

      {renderTabContent()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1C1C1E',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
    fontStyle: 'italic',
    fontFamily: 'PlayfairDisplay-Italic',
  },
  headerSubtitle: {
    fontSize: 16,
  },
  list: {
    flex: 1,
  },
  listContainer: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  weeklyOptInCardWrapper: {
    marginBottom: 12,
  },
  conversationListContainer: {
    paddingVertical: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  chatLimitWarning: {
    fontSize: 12,
    fontWeight: '500',
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  conversationContent: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
  },
  lastActivity: {
    fontSize: 12,
  },
  lastMessage: {
    fontSize: 14,
    lineHeight: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  emptySectionState: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 24,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  emptySectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 4,
    textAlign: 'center',
  },
  emptySectionSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  tabContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  segmentedControl: {
    flexDirection: 'row',
    borderRadius: 10,
    borderWidth: 1,
    padding: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentLeft: {
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  segmentRight: {
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  segmentText: {
    fontSize: 14,
  },
});