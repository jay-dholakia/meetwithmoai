import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/mcp-supabase';

interface Conversation {
  id: string;
  user_a: string;
  user_b: string;
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
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadConversations();
    }
  }, [user]);

  const loadConversations = async () => {
    try {
      setLoading(true);
      
      // Get conversations where user is either user_a or user_b
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          id,
          user_a,
          user_b,
          opened_at,
          last_activity_at,
          status,
          profiles!conversations_user_a_fkey (
            id,
            name,
            initial,
            avatar_url
          ),
          profiles!conversations_user_b_fkey (
            id,
            name,
            initial,
            avatar_url
          ),
          messages (
            text,
            sender_type,
            created_at
          )
        `)
        .or(`user_a.eq.${user?.id},user_b.eq.${user?.id}`)
        .eq('status', 'active')
        .order('last_activity_at', { ascending: false });

      if (error) throw error;

      const processedConversations = data?.map((conv: any) => {
        const isUserA = conv.user_a === user?.id;
        const otherUser = isUserA ? conv.profiles_conversations_user_b_fkey : conv.profiles_conversations_user_a_fkey;
        
        // Get last message
        const lastMessage = conv.messages && conv.messages.length > 0 
          ? conv.messages[conv.messages.length - 1] 
          : null;

        return {
          id: conv.id,
          user_a: conv.user_a,
          user_b: conv.user_b,
          other_user: {
            id: otherUser.id,
            name: otherUser.name,
            initial: otherUser.initial,
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
      Alert.alert('Error', 'Failed to load conversations');
    } finally {
      setLoading(false);
    }
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
            {item.last_message.sender_type === 'ai' && '🤖 '}
            {item.last_message.text}
          </Text>
        ) : (
          <Text style={[styles.lastMessage, { color: theme.colors.textSecondary }]}>
            New conversation started
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

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons
        name="people-outline"
        size={64}
        color={theme.colors.textSecondary}
      />
      <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
        No conversations yet
      </Text>
      <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
        Your weekly friend introductions will appear here once you both say "Yes" to a match.
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          💬 Moai Matches
        </Text>
        <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
          Your ongoing conversations
        </Text>
      </View>

      <FlatList
        data={conversations}
        renderItem={renderConversation}
        keyExtractor={(item) => item.id}
        style={styles.conversationsList}
        contentContainerStyle={conversations.length === 0 ? styles.emptyContainer : styles.listContainer}
        ListEmptyComponent={renderEmptyState}
        refreshing={loading}
        onRefresh={loadConversations}
      />
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
  conversationsList: {
    flex: 1,
  },
  listContainer: {
    paddingVertical: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
});





