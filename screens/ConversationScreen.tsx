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
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/mcp-supabase';
import MatchCard from '../components/MatchCard';

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
  avatar_url: string | null;
  birthdate: string | null;
  bio_text: string | null;
  city: string | null;
  relationship_status?: string | null;
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
  const [matchData, setMatchData] = useState<any>(null);
  const [activeChatCount, setActiveChatCount] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    loadConversation();
    loadMessages();
    loadActiveChatCount();
    
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

  const loadActiveChatCount = async () => {
    try {
      if (!user?.id) return;
      
      const { data, error } = await supabase
        .rpc('count_active_match_chats', { user_uuid: user.id });
      
      if (!error && data !== null) {
        setActiveChatCount(data);
      }
    } catch (error) {
      console.error('Error loading active chat count:', error);
    }
  };

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
          match_id,
          user_a_profile:profiles!conversations_user_a_fkey (
            id,
            first_name,
            avatar_url,
            birthdate,
            bio_text,
            city,
            relationship_status
          ),
          user_b_profile:profiles!conversations_user_b_fkey (
            id,
            first_name,
            avatar_url,
            birthdate,
            bio_text,
            city,
            relationship_status
          )
        `)
        .eq('id', conversationId)
        .single();

      if (error) throw error;

      const isUserA = data.user_a === user?.id;
      const otherUserProfile = isUserA ? data.user_b_profile : data.user_a_profile;
      // Ensure otherUserProfile is a single object, not an array
      const otherUserObj = Array.isArray(otherUserProfile) ? otherUserProfile[0] : otherUserProfile;
      setOtherUser(otherUserObj);

      // Load intake responses for the other user using RPC function
      if (otherUserObj?.id) {
        const { data: intakeData, error: intakeError } = await supabase
          .rpc('get_matched_users_intake', { user_ids: [otherUserObj.id] });

        if (!intakeError && intakeData && intakeData.length > 0) {
          console.log('Loaded intake data for user:', otherUserObj.id);
          setOtherUserIntake(intakeData[0]);
        } else {
          console.log('Error loading intake data:', intakeError);
        }
      }

      // Load full match data if match_id exists
      if (data.match_id) {
        const { data: matchData, error: matchError } = await supabase
          .from('match_candidates')
          .select('*')
          .eq('id', data.match_id)
          .single();

        if (!matchError && matchData) {
          console.log('Loaded match data:', matchData);
          setMatchReasons(matchData.reasons);
          setMatchUserA(matchData.user_a);
          setMatchUserB(matchData.user_b);
          setMatchData(matchData);
        } else {
          console.log('Error loading match data:', matchError);
        }
      } else {
        console.log('No match_id found for conversation');
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
      // Send the user's message first
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

      // Check if message contains @Liv mention
      const livMentionRegex = /@[Ll]iv\s+(.+)/i;
      const match = messageText.match(livMentionRegex);
      
      if (match) {
        const question = match[1].trim();
        
        if (question) {
          // Wait a moment for the user's message to be picked up by real-time subscription
          // and appear in the messages list before showing typing indicator
          await new Promise(resolve => setTimeout(resolve, 300));

          // Show typing indicator for Liv with a timestamp that's definitely after the user message
          const typingMessage: Message = {
            id: `typing-${Date.now()}`,
            conversation_id: conversationId,
            sender_type: 'ai',
            sender_id: null,
            text: 'Liv is thinking...',
            created_at: new Date(Date.now() + 2000).toISOString(), // Ensure it's after user message
            metadata: { type: 'typing_indicator' }
          };
          setMessages(prev => [...prev, typingMessage]);
          scrollToBottom();

          try {
            // Get session for auth
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
              throw new Error('No session found');
            }

            // Call ask-liv Edge Function
            const { data, error: livError } = await supabase.functions.invoke('ask-liv', {
              body: {
                conversationId,
                question
              },
              headers: {
                Authorization: `Bearer ${session.access_token}`
              }
            });

            // Remove typing indicator
            setMessages(prev => prev.filter(m => m.id !== typingMessage.id));

            if (livError) {
              console.error('Error calling ask-liv:', livError);
              // Insert error message from Liv
              const errorMessage: Message = {
                id: `liv-error-${Date.now()}`,
                conversation_id: conversationId,
                sender_type: 'ai',
                sender_id: null,
                text: "I'm sorry, I'm having trouble processing that right now. Please try again later.",
                created_at: new Date().toISOString(),
                metadata: { type: 'liv_response' }
              };
              setMessages(prev => [...prev, errorMessage]);
            } else if (data && data.response) {
              // Liv's response will be inserted by the Edge Function
              // But we can also add it locally for immediate feedback
              // The Edge Function already inserts it, so we just need to reload messages
              // or wait for the real-time subscription to pick it up
              setTimeout(() => {
                loadMessages();
              }, 500);
            }
          } catch (error) {
            console.error('Error processing @Liv request:', error);
            // Remove typing indicator
            setMessages(prev => prev.filter(m => m.id !== typingMessage.id));
            
            // Insert error message from Liv
            const errorMessage: Message = {
              id: `liv-error-${Date.now()}`,
              conversation_id: conversationId,
              sender_type: 'ai',
              sender_id: null,
              text: "I'm sorry, I'm having trouble processing that right now. Please try again later.",
              created_at: new Date().toISOString(),
              metadata: { type: 'liv_response' }
            };
            setMessages(prev => [...prev, errorMessage]);
          }
        }
      }
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

  // Component to render message text with clickable place names
  const MessageText = ({ text, metadata, textColor }: { text: string; metadata?: any; textColor: string }) => {
    const places = metadata?.places || [];
    
    // If we have places in metadata, make place names clickable
    if (places.length > 0) {
      // Create a map of all place occurrences with their positions
      const placeMatches: Array<{ start: number; end: number; name: string; mapsUrl: string }> = [];
      
      places.forEach((place: any) => {
        const placeName = place.name;
        let searchIndex = 0;
        
        // Find all occurrences of this place name in the text
        while (true) {
          const index = text.indexOf(placeName, searchIndex);
          if (index === -1) break;
          
          placeMatches.push({
            start: index,
            end: index + placeName.length,
            name: placeName,
            mapsUrl: place.mapsUrl
          });
          
          searchIndex = index + 1; // Continue searching after this match
        }
      });
      
      // Sort matches by position
      placeMatches.sort((a, b) => a.start - b.start);
      
      // Remove overlapping matches (keep the first one)
      const nonOverlappingMatches: Array<{ start: number; end: number; name: string; mapsUrl: string }> = [];
      placeMatches.forEach((match) => {
        const overlaps = nonOverlappingMatches.some(
          existing => !(match.end <= existing.start || match.start >= existing.end)
        );
        if (!overlaps) {
          nonOverlappingMatches.push(match);
        }
      });
      
      // Build text parts with clickable place names
      const textParts: Array<{ text: string; isPlace: boolean; mapsUrl?: string }> = [];
      let currentIndex = 0;
      
      nonOverlappingMatches.forEach((match) => {
        // Add text before place name
        if (match.start > currentIndex) {
          textParts.push({ 
            text: text.substring(currentIndex, match.start), 
            isPlace: false 
          });
        }
        
        // Add clickable place name
        textParts.push({ 
          text: match.name, 
          isPlace: true, 
          mapsUrl: match.mapsUrl 
        });
        
        currentIndex = match.end;
      });
      
      // Add remaining text
      if (currentIndex < text.length) {
        textParts.push({ 
          text: text.substring(currentIndex), 
          isPlace: false 
        });
      }
      
      // If no place names found, just return the text
      if (textParts.length === 0) {
        textParts.push({ text, isPlace: false });
      }
      
      return (
        <Text style={[styles.messageText, { color: textColor }]}>
          {textParts.map((part, index) => {
            if (part.isPlace && part.mapsUrl) {
              return (
                <Text
                  key={index}
                  style={{ 
                    color: '#3B82F6', // Darker blue for links
                    textDecorationLine: 'underline',
                    fontWeight: '600'
                  }}
                  onPress={() => Linking.openURL(part.mapsUrl!)}
                >
                  {part.text}
                </Text>
              );
            }
            return <Text key={index}>{part.text}</Text>;
          })}
        </Text>
      );
    }
    
    // No places metadata, just render text normally
    return (
      <Text style={[styles.messageText, { color: textColor }]}>
        {text}
      </Text>
    );
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
            ? { backgroundColor: '#A78BFA' } // Soft purple for Liv
            : { backgroundColor: '#F3F4F6' } // Light gray for other users
        ]}>
          {isAI && (
            <Text style={[styles.senderName, { color: '#FFFFFF' }]}>
              ✨ Liv
            </Text>
          )}
          <MessageText 
            text={item.text}
            metadata={item.metadata}
            textColor={isCurrentUser ? '#FFFFFF' : (isAI ? '#FFFFFF' : theme.colors.text)}
          />
          <Text style={[
            styles.timestamp,
            { color: isCurrentUser ? '#FFFFFF80' : (isAI ? '#FFFFFF80' : theme.colors.textSecondary) }
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
      justifyContent: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      position: 'relative',
    },
    backButton: {
      position: 'absolute',
      left: 16,
      zIndex: 1,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: theme.colors.text,
      textAlign: 'center',
    },
    headerAvatarContainer: {
      position: 'absolute',
      right: 16,
      zIndex: 1,
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
          <Text style={styles.headerTitle}>Fika Chat</Text>
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
        <Text style={styles.headerTitle}>Fika Chat</Text>
        {otherUser && (
          <TouchableOpacity
            style={[styles.headerAvatarContainer, styles.headerAvatar]}
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
              placeholder="Type a message... (Try @Liv for meetup suggestions)"
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

      {/* Profile Modal - Using MatchCard's modal */}
      {otherUser && matchData && (
        <View style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 0, height: 0 }}>
          <MatchCard
            match={matchData}
            otherUser={otherUser}
            otherUserIntake={otherUserIntake}
            onMatchUpdate={() => {
              loadConversation();
              loadActiveChatCount();
            }}
            activeChatCount={activeChatCount}
            navigation={navigation}
            externalModalVisible={profileModalVisible}
            onModalClose={() => setProfileModalVisible(false)}
            hideActions={true}
          />
        </View>
      )}
    </SafeAreaView>
  );
}