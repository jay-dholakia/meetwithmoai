import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/mcp-supabase';

interface Message {
  id: string;
  conversation_id: string;
  sender_type: 'user' | 'ai';
  sender_id: string | null;
  text: string;
  created_at: string;
  metadata?: any;
}

interface ConversationScreenProps {
  route: {
    params: {
      conversationId: string;
    };
  };
  navigation: any;
}

interface OtherUser {
  id: string;
  first_name: string;
  last_name: string | null;
  avatar_url: string | null;
  age: number | null;
  bio_text: string | null;
  city: string | null;
}

export default function ConversationScreen({ route, navigation }: ConversationScreenProps) {
  const theme = useTheme();
  const { user } = useAuth();
  const { conversationId } = route.params;
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [otherUser, setOtherUser] = useState<OtherUser | null>(null);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    loadConversation();
    loadMessages();
    
    // Set up real-time subscription for new messages
    const subscription = supabase
      .channel(`conversation:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMessage = payload.new as Message;
          setMessages(prev => [...prev, newMessage]);
          scrollToBottom();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [conversationId]);

  const loadConversation = async () => {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          user_a,
          user_b,
          user_a_profile:profiles!conversations_user_a_fkey (
            id,
            first_name,
            last_name,
            avatar_url,
            age,
            bio_text,
            city
          ),
          user_b_profile:profiles!conversations_user_b_fkey (
            id,
            first_name,
            last_name,
            avatar_url,
            age,
            bio_text,
            city
          )
        `)
        .eq('id', conversationId)
        .single();

      if (error) throw error;

      const isUserA = data.user_a === user?.id;
      const otherUserProfile = isUserA ? data.user_b_profile : data.user_a_profile;
      setOtherUser(otherUserProfile);
    } catch (error) {
      console.error('Error loading conversation:', error);
    }
  };

  const loadMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setMessages(data || []);
      setTimeout(scrollToBottom, 100);
    } catch (error) {
      console.error('Error loading messages:', error);
      Alert.alert('Error', 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || sending) return;

    setSending(true);
    const messageText = inputText.trim();
    setInputText('');

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_type: 'user',
          sender_id: user?.id,
          text: messageText,
        });

      if (error) throw error;

      scrollToBottom();
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
      setInputText(messageText); // Restore the message
    } finally {
      setSending(false);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isCurrentUser = item.sender_type === 'user' && item.sender_id === user?.id;
    const isAI = item.sender_type === 'ai';

    return (
      <View style={[
        styles.messageContainer,
        isCurrentUser ? styles.currentUserMessage : styles.otherUserMessage
      ]}>
        <View style={[
          styles.messageBubble,
          isCurrentUser 
            ? { backgroundColor: theme.colors.primary }
            : isAI
            ? { backgroundColor: theme.colors.secondary }
            : { backgroundColor: theme.colors.surface }
        ]}>
          {isAI && (
            <Text style={[styles.senderName, { color: theme.colors.text }]}>
              🍵 Matcha AI
            </Text>
          )}
          <Text style={[
            styles.messageText,
            { color: isCurrentUser ? '#FFFFFF' : theme.colors.text }
          ]}>
            {item.text}
          </Text>
          <Text style={[
            styles.timestamp,
            { color: isCurrentUser ? '#FFFFFF80' : theme.colors.textSecondary }
          ]}>
            {new Date(item.created_at).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </Text>
        </View>
      </View>
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    backButton: {
      marginRight: 16,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
      flex: 1,
    },
    headerAvatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      overflow: 'hidden',
    },
    headerAvatarImage: {
      width: '100%',
      height: '100%',
    },
    headerAvatarPlaceholder: {
      width: '100%',
      height: '100%',
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerAvatarText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
    messagesContainer: {
      flex: 1,
      padding: 16,
    },
    messageContainer: {
      marginBottom: 12,
    },
    currentUserMessage: {
      alignItems: 'flex-end',
    },
    otherUserMessage: {
      alignItems: 'flex-start',
    },
    messageBubble: {
      maxWidth: '80%',
      padding: 12,
      borderRadius: 16,
    },
    senderName: {
      fontSize: 12,
      fontWeight: '600',
      marginBottom: 4,
    },
    messageText: {
      fontSize: 16,
      lineHeight: 20,
    },
    timestamp: {
      fontSize: 11,
      marginTop: 4,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 4,
      backgroundColor: theme.colors.surface,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 20,
      width: '90%',
      maxHeight: '80%',
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 20,
    },
    modalAvatar: {
      width: 80,
      height: 80,
      borderRadius: 40,
      marginRight: 16,
    },
    modalAvatarPlaceholder: {
      width: 80,
      height: 80,
      borderRadius: 40,
      marginRight: 16,
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalAvatarText: {
      color: '#FFFFFF',
      fontSize: 32,
      fontWeight: '600',
    },
    modalUserInfo: {
      flex: 1,
    },
    modalUserName: {
      fontSize: 24,
      fontWeight: '700',
      marginBottom: 4,
    },
    modalUserAge: {
      fontSize: 16,
      marginTop: 2,
    },
    modalUserLocation: {
      fontSize: 14,
      marginTop: 4,
    },
    closeButton: {
      padding: 4,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      marginBottom: 12,
      marginTop: 20,
    },
    bioText: {
      fontSize: 16,
      lineHeight: 24,
      marginBottom: 16,
    },
    emptyBioContainer: {
      paddingVertical: 20,
      alignItems: 'center',
    },
    emptyBioText: {
      fontSize: 14,
      fontStyle: 'italic',
    },
    textInput: {
      flex: 1,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 8,
      marginRight: 12,
      backgroundColor: theme.colors.background,
      color: theme.colors.text,
      fontSize: 16,
    },
    sendButton: {
      backgroundColor: theme.colors.primary,
      borderRadius: 20,
      padding: 10,
    },
    sendButtonDisabled: {
      opacity: 0.5,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      color: theme.colors.textSecondary,
      fontSize: 16,
    },
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Matcha Chat</Text>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading conversation...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Matcha Chat</Text>
        {otherUser && (
          <TouchableOpacity
            style={styles.headerAvatar}
            onPress={() => setProfileModalVisible(true)}
          >
            {otherUser.avatar_url ? (
              <Image
                source={{ uri: otherUser.avatar_url }}
                style={styles.headerAvatarImage}
              />
            ) : (
              <View style={[styles.headerAvatarPlaceholder, { backgroundColor: theme.colors.primary }]}>
                <Text style={styles.headerAvatarText}>
                  {otherUser.first_name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.container}>
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          style={styles.messagesContainer}
          contentContainerStyle={{ paddingBottom: 16 }}
          onContentSizeChange={scrollToBottom}
          showsVerticalScrollIndicator={false}
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Type a message..."
              placeholderTextColor={theme.colors.textSecondary}
              multiline
              maxLength={1000}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!inputText.trim() || sending) && styles.sendButtonDisabled
              ]}
              onPress={sendMessage}
              disabled={!inputText.trim() || sending}
            >
              <Ionicons 
                name="send" 
                size={20} 
                color="#FFFFFF" 
              />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>

      {/* Profile Modal */}
      {otherUser && (
        <Modal
          visible={profileModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setProfileModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.modalHeader}>
                  {otherUser.avatar_url ? (
                    <Image
                      source={{ uri: otherUser.avatar_url }}
                      style={styles.modalAvatar}
                    />
                  ) : (
                    <View style={[styles.modalAvatarPlaceholder, { backgroundColor: theme.colors.primary }]}>
                      <Text style={styles.modalAvatarText}>
                        {otherUser.first_name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View style={styles.modalUserInfo}>
                    <Text style={[styles.modalUserName, { color: theme.colors.text }]}>
                      {otherUser.first_name} {otherUser.last_name ? otherUser.last_name.charAt(0) + '.' : ''}
                    </Text>
                    {otherUser.age && (
                      <Text style={[styles.modalUserAge, { color: theme.colors.textSecondary }]}>
                        {otherUser.age} years old
                      </Text>
                    )}
                    {otherUser.city && (
                      <Text style={[styles.modalUserLocation, { color: theme.colors.textSecondary }]}>
                        📍 {otherUser.city}
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => setProfileModalVisible(false)}
                  >
                    <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                {otherUser.bio_text ? (
                  <>
                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>About</Text>
                    <Text style={[styles.bioText, { color: theme.colors.text }]}>
                      {otherUser.bio_text}
                    </Text>
                  </>
                ) : (
                  <View style={styles.emptyBioContainer}>
                    <Text style={[styles.emptyBioText, { color: theme.colors.textSecondary }]}>
                      No bio available
                    </Text>
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}