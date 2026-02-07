import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/mcp-supabase';
import MatchCard from '../components/MatchCard';

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
    last_name: string | null;
    avatar_url: string | null;
    age: number | null;
    bio_text: string | null;
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
        checkQuestionnaireCompletion()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadMatches = async () => {
    try {
      // Get active match candidates for the user
      // Only show matches where both users score each other above 0.3 threshold
      // Exception: show opted-in matches even if below threshold (user already started the process)
      const { data: matchData, error } = await supabase
        .from('matcha_match_candidates')
        .select('*')
        .or(`user_a.eq.${user?.id},user_b.eq.${user?.id}`)
        .in('status', ['active', 'opted_in_a', 'opted_in_b'])
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

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
        .select('id, first_name, last_name, avatar_url, age, bio_text, city, gender, relationship_status, has_kids')
        .in('id', Array.from(userIds));

      if (profilesError) throw profilesError;

      // Fetch intake responses for richer profile information
      const { data: intakeData, error: intakeError } = await supabase
        .from('intake_responses_v4')
        .select('user_id, responses, life_stage')
        .in('user_id', Array.from(userIds));

      if (intakeError) console.error('Error loading intake data:', intakeError);

      // Fetch opt-ins to check if user has opted in (fallback if match status wasn't updated)
      const { data: optInsData, error: optInsError } = await supabase
        .from('matcha_opt_ins')
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
        intakeMap.set(intake.user_id, intake);
      });

      const processedMatches = filteredMatches.map((match: any) => {
        const isUserA = match.user_a === user?.id;
        const otherUserId = isUserA ? match.user_b : match.user_a;
        const otherUserProfile = profilesMap.get(otherUserId);
        const otherUserIntake = intakeMap.get(otherUserId);
        
        // Fix match status if user has opted in but status wasn't updated
        const hasUserOptedIn = userOptInMap.get(match.id);
        if (hasUserOptedIn && match.status === 'active') {
          // Update status based on which user opted in
          match.status = isUserA ? 'opted_in_a' : 'opted_in_b';
        }

        return {
          ...match,
          other_user: otherUserProfile || null,
          other_user_intake: otherUserIntake || null
        };
      }) || [];

      // Sort matches: active matches first, waiting matches last
      const sortedMatches = processedMatches.sort((a, b) => {
        const isUserA_a = a.user_a === user?.id;
        const isUserA_b = b.user_a === user?.id;
        
        // Determine if user is waiting for the other person to respond
        const isWaiting_a = (isUserA_a && a.status === 'opted_in_a') || (!isUserA_a && a.status === 'opted_in_b');
        const isWaiting_b = (isUserA_b && b.status === 'opted_in_a') || (!isUserA_b && b.status === 'opted_in_b');
        
        // If one is waiting and the other isn't, put the non-waiting one first
        if (isWaiting_a && !isWaiting_b) return 1;
        if (!isWaiting_a && isWaiting_b) return -1;
        
        // If both are the same type (both waiting or both active), sort by created_at (newest first)
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      setMatches(sortedMatches);
    } catch (error) {
      console.error('Error loading matches:', error);
    }
  };

  const loadConversations = async () => {
    try {
      // Get Matcha conversations where user is either user_a or user_b
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
            last_name,
            avatar_url
          ),
          user_b_profile:profiles!conversations_user_b_fkey (
            id,
            first_name,
            last_name,
            avatar_url
          ),
          messages (
            text,
            sender_type,
            created_at
          )
        `)
        .or(`user_a.eq.${user?.id},user_b.eq.${user?.id}`)
        .eq('conversation_type', 'matcha')
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
            name: `${otherUser.first_name}${otherUser.last_name ? ' ' + otherUser.last_name.charAt(0) + '.' : ''}`,
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
        .rpc('count_active_matcha_chats', { user_uuid: user?.id });

      if (error) throw error;
      setActiveChatCount(data || 0);
    } catch (error) {
      console.error('Error loading active chat count:', error);
    }
  };

  const checkQuestionnaireCompletion = async () => {
    try {
      const { data, error } = await supabase
        .from('intake_responses_v3')
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

  const triggerReplenishment = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      await fetch(`https://hgllvhohhyamsbljekrd.supabase.co/functions/v1/replenish-matches`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id: user?.id }),
      });
    } catch (error) {
      console.error('Error triggering replenishment:', error);
    }
  };

  const handleMatchUpdate = () => {
    loadData();
    triggerReplenishment();
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

  const renderMatch = ({ item }: { item: MatchCandidate }) => (
    <MatchCard
      match={item}
      otherUser={item.other_user}
      otherUserIntake={(item as any).other_user_intake}
      onMatchUpdate={handleMatchUpdate}
      activeChatCount={activeChatCount}
    />
  );

  const renderConversation = ({ item }: { item: Conversation }) => (
    <TouchableOpacity
      style={[styles.conversationItem, { backgroundColor: theme.colors.surface }]}
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
            {item.last_message.sender_type === 'ai' && '🍵 '}
            {item.last_message.text}
          </Text>
        ) : (
          <Text style={[styles.lastMessage, { color: theme.colors.textSecondary }]}>
            New Matcha connection started
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
        No Matcha connections yet
      </Text>
      <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
        Complete your questionnaire to start receiving daily match suggestions for café meetups.
      </Text>
    </View>
  );

  const renderTabButton = (tab: 'matches' | 'chats', title: string) => (
    <TouchableOpacity
      style={[
        styles.tabButton,
        { 
          backgroundColor: activeTab === tab ? theme.colors.primary : 'transparent',
          borderColor: theme.colors.border 
        }
      ]}
      onPress={() => setActiveTab(tab)}
    >
      <Text style={[
        styles.tabButtonText,
        { 
          color: activeTab === tab ? '#FFFFFF' : theme.colors.text,
          fontWeight: activeTab === tab ? '600' : '400'
        }
      ]}>
        {title}
      </Text>
    </TouchableOpacity>
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
      const emptyStateContent = isQuestionnaireComplete ? {
        title: "Looking for your matches...",
        subtitle: "We're working on finding great café connections for you! New matches appear daily, so check back soon."
      } : {
        title: "No matches yet",
        subtitle: "Complete your questionnaire in Mili to start receiving personalized match suggestions!"
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
        {renderTabButton('matches', 'Match Suggestions')}
        {renderTabButton('chats', 'Active Chats')}
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
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
});