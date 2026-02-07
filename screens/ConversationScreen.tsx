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
  gender?: string | null;
  relationship_status?: string | null;
  has_kids?: string | null;
}

interface OtherUserIntake {
  user_id: string;
  responses?: any[];
  life_stage?: string;
}

interface MatchReasons {
  shared_interests?: string[];
  conversation_hooks?: string[];
  user_a_hobbies?: string[];
  user_a_talk_topics?: string[];
  user_a_interests?: string[];
  user_b_hobbies?: string[];
  user_b_talk_topics?: string[];
  user_b_interests?: string[];
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
  const [otherUserIntake, setOtherUserIntake] = useState<OtherUserIntake | null>(null);
  const [matchReasons, setMatchReasons] = useState<MatchReasons | null>(null);
  const [matchUserA, setMatchUserA] = useState<string | null>(null);
  const [matchUserB, setMatchUserB] = useState<string | null>(null);
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

  // Reload conversation data when modal opens to ensure we have latest data
  useEffect(() => {
    if (profileModalVisible && otherUser?.id) {
      loadConversation();
    }
  }, [profileModalVisible]);

  const loadConversation = async () => {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          user_a,
          user_b,
          matcha_match_id,
          user_a_profile:profiles!conversations_user_a_fkey (
            id,
            first_name,
            last_name,
            avatar_url,
            age,
            bio_text,
            city,
            gender,
            relationship_status,
            has_kids
          ),
          user_b_profile:profiles!conversations_user_b_fkey (
            id,
            first_name,
            last_name,
            avatar_url,
            age,
            bio_text,
            city,
            gender,
            relationship_status,
            has_kids
          )
        `)
        .eq('id', conversationId)
        .single();

      if (error) throw error;

      const isUserA = data.user_a === user?.id;
      const otherUserProfile = isUserA ? data.user_b_profile : data.user_a_profile;
      setOtherUser(otherUserProfile);

      // Load intake responses for the other user
      if (otherUserProfile?.id) {
        const { data: intakeData, error: intakeError } = await supabase
          .from('intake_responses_v4')
          .select('user_id, responses, life_stage')
          .eq('user_id', otherUserProfile.id)
          .single();

        if (!intakeError && intakeData) {
          console.log('Loaded intake data for user:', otherUserProfile.id);
          setOtherUserIntake(intakeData);
        } else {
          console.log('Error loading intake data:', intakeError);
        }
      }

      // Load match reasons if match_id exists
      if (data.matcha_match_id) {
        const { data: matchData, error: matchError } = await supabase
          .from('matcha_match_candidates')
          .select('reasons, user_a, user_b')
          .eq('id', data.matcha_match_id)
          .single();

        if (!matchError && matchData) {
          console.log('Loaded match data:', matchData);
          setMatchReasons(matchData.reasons);
          setMatchUserA(matchData.user_a);
          setMatchUserB(matchData.user_b);
        } else {
          console.log('Error loading match data:', matchError);
        }
      } else {
        console.log('No matcha_match_id found for conversation');
      }
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

  // Get the correct user's info based on match reasons
  const otherUserIsUserA = otherUser && matchUserA ? otherUser.id === matchUserA : false;
  
  const otherUserHobbies = matchReasons && otherUserIsUserA
    ? (matchReasons.user_a_hobbies || [])
    : (matchReasons?.user_b_hobbies || []);
  const otherUserInterests = matchReasons && otherUserIsUserA
    ? (matchReasons.user_a_interests || [])
    : (matchReasons?.user_b_interests || []);

  // Get the actual response text for "Likes Talking About" and summarize it
  const getTalkAboutSummary = () => {
    if (!otherUserIntake?.responses || !Array.isArray(otherUserIntake.responses)) return null;
    
    const talkResponse = otherUserIntake.responses.find((r: any) => r.question_id === 'q11_talk_about_hours');
    if (!talkResponse?.answer) return null;
    
    const text = talkResponse.answer.trim();
    const sentences = text.split(/[.!?]+/).filter((s: string) => s.trim().length > 0);
    if (sentences.length === 0) return null;
    
    let summary = sentences[0].trim();
    if (sentences.length > 1 && summary.length < 120) {
      summary += '. ' + sentences[1].trim();
    }
    
    if (summary.length > 150) {
      summary = summary.substring(0, 147).trim();
      const lastSpace = summary.lastIndexOf(' ');
      if (lastSpace > 100) {
        summary = summary.substring(0, lastSpace) + '...';
      } else {
        summary += '...';
      }
    } else if (!summary.endsWith('.') && !summary.endsWith('!') && !summary.endsWith('?')) {
      summary += '.';
    }
    
    return summary;
  };
  
  const talkAboutSummary = getTalkAboutSummary();

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
              ✨ Mili
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
      borderRadius: 20,
      padding: 20,
      width: '90%',
      maxHeight: '85%',
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    },
    modalScrollView: {
      flex: 1,
    },
    modalProfileHeader: {
      marginBottom: 20,
    },
    modalHeaderTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    modalHeaderLeft: {
      flexDirection: 'row',
      flex: 1,
    },
    modalProfileAvatar: {
      width: 80,
      height: 80,
      borderRadius: 40,
      marginRight: 16,
    },
    modalProfileAvatarPlaceholder: {
      width: 80,
      height: 80,
      borderRadius: 40,
      marginRight: 16,
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalProfileAvatarText: {
      color: '#FFFFFF',
      fontSize: 32,
      fontWeight: '600',
    },
    modalProfileInfo: {
      flex: 1,
    },
    modalProfileName: {
      fontSize: 24,
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: 4,
    },
    modalProfileLocation: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginBottom: 4,
    },
    modalBasicInfoRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    modalBasicInfo: {
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    modalBasicInfoSeparator: {
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    modalCloseButton: {
      padding: 4,
    },
    modalSection: {
      marginBottom: 24,
    },
    modalSectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    modalSectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
      marginLeft: 8,
    },
    modalBioText: {
      fontSize: 16,
      lineHeight: 24,
      color: theme.colors.text,
    },
    modalInterests: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    modalInterestChip: {
      backgroundColor: theme.colors.primary + '20',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      marginRight: 8,
      marginBottom: 8,
    },
    modalInterestText: {
      fontSize: 14,
      color: theme.colors.primary,
      fontWeight: '500',
    },
    modalTalkText: {
      fontSize: 16,
      lineHeight: 24,
      color: theme.colors.text,
    },
    modalCommonSection: {
      backgroundColor: theme.colors.primary + '15',
      borderRadius: 12,
      padding: 16,
      marginBottom: 24,
    },
    modalCommonHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    modalCommonTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
      marginLeft: 8,
    },
    modalCommonHooks: {
      marginTop: 8,
    },
    modalHooksList: {
      gap: 8,
    },
    modalHookItemContainer: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 8,
    },
    modalHookIcon: {
      marginRight: 8,
      marginTop: 2,
    },
    modalHookItem: {
      fontSize: 14,
      lineHeight: 20,
      color: theme.colors.text,
      flex: 1,
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
          <TouchableOpacity 
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setProfileModalVisible(false)}
          >
            <TouchableOpacity 
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
              style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}
            >
              <ScrollView 
                showsVerticalScrollIndicator={false} 
                style={styles.modalScrollView}
                contentContainerStyle={styles.modalScrollContent}
              >
                {/* Profile Header */}
                <View style={styles.modalProfileHeader}>
                  <View style={styles.modalHeaderTop}>
                    <View style={styles.modalHeaderLeft}>
                      {otherUser.avatar_url ? (
                        <Image 
                          source={{ uri: otherUser.avatar_url }}
                          style={styles.modalProfileAvatar}
                        />
                      ) : (
                        <View style={[styles.modalProfileAvatarPlaceholder, { backgroundColor: theme.colors.primary }]}>
                          <Text style={styles.modalProfileAvatarText}>
                            {otherUser.first_name?.charAt(0).toUpperCase() || '?'}
                          </Text>
                        </View>
                      )}
                      <View style={styles.modalProfileInfo}>
                        <Text style={[styles.modalProfileName, { color: theme.colors.text }]}>
                          {otherUser.first_name} {otherUser.last_name ? otherUser.last_name.charAt(0) + '.' : ''}
                        </Text>
                        {otherUser?.city && (
                          <Text style={[styles.modalProfileLocation, { color: theme.colors.textSecondary }]}>📍 {otherUser.city}</Text>
                        )}
                        {(otherUser?.age || otherUser?.gender) && (
                          <View style={styles.modalBasicInfoRow}>
                            {otherUser?.age && (
                              <Text style={[styles.modalBasicInfo, { color: theme.colors.textSecondary }]}>
                                {otherUser.age} years old
                              </Text>
                            )}
                            {otherUser?.age && otherUser?.gender && (
                              <Text style={[styles.modalBasicInfoSeparator, { color: theme.colors.textSecondary }]}> • </Text>
                            )}
                            {otherUser?.gender && (
                              <Text style={[styles.modalBasicInfo, { color: theme.colors.textSecondary }]}>
                                {otherUser.gender}
                              </Text>
                            )}
                          </View>
                        )}
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.modalCloseButton}
                      onPress={() => setProfileModalVisible(false)}
                    >
                      <Ionicons name="close" size={24} color={theme.colors.text} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* About */}
                {otherUser?.bio_text && (
                  <View style={styles.modalSection}>
                    <View style={styles.modalSectionHeader}>
                      <Ionicons name="person" size={18} color={theme.colors.primary} />
                      <Text style={styles.modalSectionTitle}>About</Text>
                    </View>
                    <Text style={styles.modalBioText}>{otherUser.bio_text}</Text>
                  </View>
                )}

                {/* Hobbies & Interests */}
                {((otherUserHobbies && otherUserHobbies.length > 0) || (otherUserInterests && otherUserInterests.length > 0)) && (
                  <View style={styles.modalSection}>
                    <View style={styles.modalSectionHeader}>
                      <Ionicons name="star" size={18} color={theme.colors.primary} />
                      <Text style={styles.modalSectionTitle}>Hobbies & Interests</Text>
                    </View>
                    <View style={styles.modalInterests}>
                      {(() => {
                        const combined = [...(otherUserHobbies || []), ...(otherUserInterests || [])];
                        const unique = Array.from(new Set(combined.map(item => item.toLowerCase())))
                          .map(lower => combined.find(item => item.toLowerCase() === lower))
                          .filter(Boolean) as string[];
                        
                        return unique.map((item, index) => (
                          <View key={`item-${index}`} style={styles.modalInterestChip}>
                            <Text style={styles.modalInterestText}>{item}</Text>
                          </View>
                        ));
                      })()}
                    </View>
                  </View>
                )}

                {/* Likes Talking About */}
                {talkAboutSummary && (
                  <View style={styles.modalSection}>
                    <View style={styles.modalSectionHeader}>
                      <Ionicons name="chatbubbles" size={18} color={theme.colors.primary} />
                      <Text style={styles.modalSectionTitle}>Likes Talking About</Text>
                    </View>
                    <Text style={styles.modalTalkText}>{talkAboutSummary}</Text>
                  </View>
                )}

                {/* Passionate About */}
                {(() => {
                  if (!otherUserIntake?.responses || !Array.isArray(otherUserIntake.responses)) return null;
                  const response = otherUserIntake.responses.find((r: any) => r.question_id === 'q1_passionate_about');
                  if (!response?.answer) return null;
                  const text = response.answer.trim();
                  if (text.length === 0) return null;
                  
                  const sentences = text.split(/[.!?]+/).filter((s: string) => s.trim().length > 0);
                  let summary = sentences[0].trim();
                  if (sentences.length > 1 && summary.length < 120) {
                    summary += '. ' + sentences[1].trim();
                  }
                  if (summary.length > 150) {
                    summary = summary.substring(0, 147).trim();
                    const lastSpace = summary.lastIndexOf(' ');
                    if (lastSpace > 100) {
                      summary = summary.substring(0, lastSpace) + '...';
                    } else {
                      summary += '...';
                    }
                  } else if (!summary.endsWith('.') && !summary.endsWith('!') && !summary.endsWith('?')) {
                    summary += '.';
                  }
                  
                  return (
                    <View style={styles.modalSection}>
                      <View style={styles.modalSectionHeader}>
                        <Ionicons name="flame" size={18} color={theme.colors.primary} />
                        <Text style={styles.modalSectionTitle}>Passionate About</Text>
                      </View>
                      <Text style={styles.modalTalkText}>{summary}</Text>
                    </View>
                  );
                })()}

                {/* Something New to Try */}
                {(() => {
                  if (!otherUserIntake?.responses || !Array.isArray(otherUserIntake.responses)) return null;
                  const response = otherUserIntake.responses.find((r: any) => r.question_id === 'q12_new_to_try');
                  if (!response?.answer) return null;
                  const text = response.answer.trim();
                  if (text.length === 0) return null;
                  
                  const sentences = text.split(/[.!?]+/).filter((s: string) => s.trim().length > 0);
                  let summary = sentences[0].trim();
                  if (sentences.length > 1 && summary.length < 120) {
                    summary += '. ' + sentences[1].trim();
                  }
                  if (summary.length > 150) {
                    summary = summary.substring(0, 147).trim();
                    const lastSpace = summary.lastIndexOf(' ');
                    if (lastSpace > 100) {
                      summary = summary.substring(0, lastSpace) + '...';
                    } else {
                      summary += '...';
                    }
                  } else if (!summary.endsWith('.') && !summary.endsWith('!') && !summary.endsWith('?')) {
                    summary += '.';
                  }
                  
                  return (
                    <View style={styles.modalSection}>
                      <View style={styles.modalSectionHeader}>
                        <Ionicons name="bulb" size={18} color={theme.colors.primary} />
                        <Text style={styles.modalSectionTitle}>Wanting to Try</Text>
                      </View>
                      <Text style={styles.modalTalkText}>{summary}</Text>
                    </View>
                  );
                })()}

                {/* Things in Common - Prominent Section */}
                {matchReasons && ((matchReasons.shared_interests && matchReasons.shared_interests.length > 0) || 
                  (matchReasons.conversation_hooks && Array.isArray(matchReasons.conversation_hooks) && matchReasons.conversation_hooks.length > 0)) && (
                  <View style={styles.modalCommonSection}>
                    <View style={styles.modalCommonHeader}>
                      <Ionicons name="heart" size={20} color={theme.colors.primary} />
                      <Text style={styles.modalCommonTitle}>Things you have in common</Text>
                    </View>
                    
                    {matchReasons.conversation_hooks && Array.isArray(matchReasons.conversation_hooks) && matchReasons.conversation_hooks.length > 0 && (
                      <View style={styles.modalCommonHooks}>
                        <View style={styles.modalHooksList}>
                          {matchReasons.conversation_hooks
                            .filter((hook: string) => hook && !hook.toLowerCase().includes('available'))
                            .map((hook: string, index: number) => {
                              const formattedHook = hook.startsWith('Both ') 
                                ? 'You ' + hook.toLowerCase()
                                : hook.startsWith('You both')
                                ? hook
                                : 'You both ' + hook.toLowerCase();
                              return (
                                <View key={index} style={styles.modalHookItemContainer}>
                                  <Ionicons name="checkmark-circle" size={16} color={theme.colors.primary} style={styles.modalHookIcon} />
                                  <Text style={styles.modalHookItem}>{formattedHook}</Text>
                                </View>
                              );
                            })}
                        </View>
                      </View>
                    )}
                  </View>
                )}
              </ScrollView>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      )}
    </SafeAreaView>
  );
}