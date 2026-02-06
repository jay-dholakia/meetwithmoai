import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../lib/mcp-supabase';
import { useAuth } from '../contexts/AuthContext';

interface MatchCardProps {
  match: {
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
  };
  otherUser: {
    id: string;
    first_name: string;
    last_name: string | null;
    avatar_url: string | null;
    age: number | null;
    bio_text: string | null;
  };
  onMatchUpdate: () => void;
  activeChatCount: number;
}

export default function MatchCard({ match, otherUser, onMatchUpdate, activeChatCount }: MatchCardProps) {
  const theme = useTheme();
  const { user } = useAuth();
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  // Create styles object first
  const styles = StyleSheet.create({
    container: {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: 12,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: '#2C2C2E',
    },
    errorText: {
      fontSize: 16,
      textAlign: 'center',
      padding: 20,
    },
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: 12,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: '#2C2C2E',
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    avatar: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: theme.colors.border,
      marginRight: 10,
    },
    userInfo: {
      flex: 1,
    },
    userName: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 2,
    },
    userAge: {
      fontSize: 13,
      color: theme.colors.textSecondary,
    },
    statusContainer: {
      alignItems: 'flex-end',
    },
    statusPill: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      marginBottom: 4,
    },
    statusText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    timeText: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    sharedInterests: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginBottom: 8,
    },
    interestChip: {
      backgroundColor: theme.colors.primary + '20',
      paddingHorizontal: 6,
      paddingVertical: 3,
      borderRadius: 10,
      marginRight: 6,
      marginBottom: 3,
    },
    interestText: {
      fontSize: 11,
      color: theme.colors.primary,
      fontWeight: '500',
    },
    actions: {
      flexDirection: 'row',
      gap: 8,
    },
    actionButton: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 8,
      alignItems: 'center',
    },
    acceptButton: {
      backgroundColor: theme.colors.primary,
    },
    passButton: {
      backgroundColor: theme.colors.textSecondary + '20',
    },
    actionText: {
      fontSize: 13,
      fontWeight: '600',
    },
    optInText: {
      color: '#FFFFFF',
    },
    passText: {
      color: theme.colors.textSecondary,
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
      backgroundColor: theme.colors.border,
      marginRight: 16,
    },
    modalUserInfo: {
      flex: 1,
    },
    modalUserName: {
      fontSize: 24,
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: 4,
    },
    modalUserAge: {
      fontSize: 16,
      color: theme.colors.textSecondary,
    },
    closeButton: {
      padding: 8,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 12,
      marginTop: 8,
    },
    bioText: {
      fontSize: 16,
      color: theme.colors.text,
      lineHeight: 24,
      marginBottom: 16,
    },
    hooksList: {
      marginBottom: 16,
    },
    hookItem: {
      fontSize: 16,
      color: theme.colors.text,
      lineHeight: 24,
      marginBottom: 8,
    },
    modalActions: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 20,
    },
    modalActionButton: {
      flex: 1,
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: 'center',
    },
    modalActionText: {
      fontSize: 16,
      fontWeight: '600',
    },
    chatLimitText: {
      fontSize: 14,
      color: theme.colors.warning,
      textAlign: 'center',
      marginTop: 8,
      fontStyle: 'italic',
    },
    waitingContainer: {
      paddingVertical: 12,
      paddingHorizontal: 10,
      backgroundColor: theme.colors.surface + '40',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    waitingText: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      fontStyle: 'italic',
      marginBottom: 8,
    },
    timerContainer: {
      position: 'relative',
      width: 50,
      height: 50,
      justifyContent: 'center',
      alignItems: 'center',
    },
    timerSvg: {
      position: 'absolute',
    },
    timerText: {
      position: 'absolute',
      justifyContent: 'center',
      alignItems: 'center',
    },
    hoursText: {
      fontSize: 14,
      fontWeight: '700',
      textAlign: 'center',
    },
    hoursLabel: {
      fontSize: 10,
      textAlign: 'center',
      marginTop: -2,
    },
  });

  // Handle null otherUser gracefully
  if (!otherUser) {
    return (
      <View style={[styles.container, { borderColor: theme.colors.border }]}>
        <Text style={[styles.errorText, { color: theme.colors.textSecondary }]}>
          Unable to load match details
        </Text>
      </View>
    );
  }

  const getTimeRemaining = () => {
    const now = new Date();
    const expires = new Date(match.expires_at);
    const diff = expires.getTime() - now.getTime();
    
    if (diff <= 0) return { text: 'Expired', hours: 0, totalHours: 72, progress: 0 };
    
    const totalHours = 72; // 72 hour window
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    // Calculate progress (0 to 1, where 1 is full time remaining)
    const progress = Math.min(hours / totalHours, 1);
    
    let text;
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      text = `${days}d ${hours % 24}h`;
    } else {
      text = `${hours}h`;
    }
    
    return { text, hours, totalHours, progress };
  };

  const CircularTimer = ({ timeData }: { timeData: { hours: number; progress: number } }) => {
    const size = 50;
    const strokeWidth = 4;
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const strokeDasharray = circumference;
    const strokeDashoffset = circumference - (timeData.progress * circumference);

    return (
      <View style={styles.timerContainer}>
        <Svg width={size} height={size} style={styles.timerSvg}>
          {/* Background circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={theme.colors.border}
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Progress circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={theme.colors.primary}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>
        <View style={styles.timerText}>
          <Text style={[styles.hoursText, { color: theme.colors.text }]}>
            {timeData.hours}
          </Text>
          <Text style={[styles.hoursLabel, { color: theme.colors.textSecondary }]}>
            hrs
          </Text>
        </View>
      </View>
    );
  };

  const getStatusPill = () => {
    const isUserA = match.user_a === user?.id;
    
    switch (match.status) {
      case 'active':
        return { text: 'New', color: theme.colors.primary };
      case 'opted_in_a':
        return isUserA 
          ? { text: 'Waiting on them', color: theme.colors.warning }
          : { text: 'They opted in!', color: theme.colors.success };
      case 'opted_in_b':
        return isUserA 
          ? { text: 'They opted in!', color: theme.colors.success }
          : { text: 'Waiting on them', color: theme.colors.warning };
      case 'mutual_opt_in':
        return { text: 'Processing...', color: theme.colors.primary };
      case 'converted':
        return { text: 'Chat created', color: theme.colors.success };
      case 'expired':
        return { text: 'Expired', color: theme.colors.textSecondary };
      default:
        return { text: match.status, color: theme.colors.textSecondary };
    }
  };

  const handlePass = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(`https://hgllvhohhyamsbljekrd.supabase.co/functions/v1/pass-match`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ match_id: match.id }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);

      setModalVisible(false);
      onMatchUpdate();
    } catch (error) {
      console.error('Error passing match:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to pass match');
    } finally {
      setLoading(false);
    }
  };

  const handleOptIn = async () => {
    if (activeChatCount >= 3) {
      Alert.alert(
        'Chat Limit Reached',
        'You can only have 3 active Matcha chats at a time. Please wrap up an existing conversation before starting a new one.'
      );
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(`https://hgllvhohhyamsbljekrd.supabase.co/functions/v1/opt-in-match`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ match_id: match.id }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);

      if (result.chat_created) {
        Alert.alert(
          'Chat Created! 🎉',
          'Both of you opted in! Your Matcha chat is ready in the Connections tab.',
          [{ text: 'Great!', onPress: () => setModalVisible(false) }]
        );
      } else {
        Alert.alert(
          'Opted In! ✅',
          "Great! We'll notify you when they respond. If you both opt in, we'll create your chat!",
          [{ text: 'Got it!', onPress: () => setModalVisible(false) }]
        );
      }

      onMatchUpdate();
    } catch (error) {
      console.error('Error opting in to match:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to opt in to match');
    } finally {
      setLoading(false);
    }
  };

  const statusPill = getStatusPill();
  const timeData = getTimeRemaining();
  const canOptIn = match.status === 'active' && activeChatCount < 3;
  const isUserA = match.user_a === user?.id;
  const isWaitingState = match.status === 'opted_in_a' || match.status === 'opted_in_b';
  const isUserWaiting = (match.status === 'opted_in_a' && isUserA) || (match.status === 'opted_in_b' && !isUserA);

  return (
    <>
      <TouchableOpacity style={styles.card} onPress={() => setModalVisible(true)}>
        <View style={styles.cardHeader}>
          <Image 
            source={otherUser.avatar_url ? { uri: otherUser.avatar_url } : undefined}
            style={styles.avatar}
          />
          <View style={styles.userInfo}>
            <Text style={styles.userName}>
              {otherUser.first_name} {otherUser.last_name ? otherUser.last_name.charAt(0) + '.' : ''}
            </Text>
            {otherUser.age && (
              <Text style={styles.userAge}>{otherUser.age} years old</Text>
            )}
          </View>
          <CircularTimer timeData={timeData} />
        </View>

        {match.reasons?.shared_interests && match.reasons.shared_interests.length > 0 && (
          <View style={styles.sharedInterests}>
            {match.reasons.shared_interests.slice(0, 2).map((interest, index) => (
              <View key={index} style={styles.interestChip}>
                <Text style={styles.interestText}>{interest}</Text>
              </View>
            ))}
          </View>
        )}

        {isWaitingState ? (
          <View style={styles.waitingContainer}>
            <Text style={styles.waitingText}>
              {isUserWaiting 
                ? `Waiting for ${otherUser.first_name} to respond...` 
                : `${otherUser.first_name} is interested! Respond to start chatting.`
              }
            </Text>
            {!isUserWaiting && (
              <View style={styles.actions}>
                <TouchableOpacity 
                  style={[styles.actionButton, styles.passButton]}
                  onPress={handlePass}
                  disabled={loading}
                >
                  <Text style={[styles.actionText, styles.passText]}>Pass</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.actionButton, styles.acceptButton]}
                  onPress={handleOptIn}
                  disabled={loading}
                >
                  <Text style={[styles.actionText, styles.optInText]}>
                    Down to Chat
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.actions}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.passButton]}
              onPress={handlePass}
              disabled={loading}
            >
              <Text style={[styles.actionText, styles.passText]}>Pass</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.actionButton, 
                styles.acceptButton,
                !canOptIn && { opacity: 0.5 }
              ]}
              onPress={handleOptIn}
              disabled={loading || !canOptIn}
            >
              <Text style={[styles.actionText, styles.optInText]}>
                Down to Chat
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Image 
                  source={otherUser.avatar_url ? { uri: otherUser.avatar_url } : undefined}
                  style={styles.modalAvatar}
                />
                <View style={styles.modalUserInfo}>
                <Text style={styles.modalUserName}>
                  {otherUser.first_name} {otherUser.last_name ? otherUser.last_name.charAt(0) + '.' : ''}
                </Text>
                  {otherUser.age && (
                    <Text style={styles.modalUserAge}>{otherUser.age} years old</Text>
                  )}
                </View>
                <TouchableOpacity 
                  style={styles.closeButton}
                  onPress={() => setModalVisible(false)}
                >
                  <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {otherUser.bio_text && (
                <>
                  <Text style={styles.sectionTitle}>About</Text>
                  <Text style={styles.bioText}>{otherUser.bio_text}</Text>
                </>
              )}

              {match.reasons?.shared_interests && match.reasons.shared_interests.length > 0 && (
                <>
                  <Text style={styles.sectionTitle}>Why you'd enjoy a café chat</Text>
                  <View style={styles.sharedInterests}>
                    {match.reasons.shared_interests.map((interest, index) => (
                      <View key={index} style={styles.interestChip}>
                        <Text style={styles.interestText}>{interest}</Text>
                      </View>
                    ))}
                  </View>
                </>
              )}

              {match.reasons?.conversation_hooks && match.reasons.conversation_hooks.length > 0 && (
                <>
                  <Text style={styles.sectionTitle}>Conversation Starters</Text>
                  <View style={styles.hooksList}>
                    {match.reasons.conversation_hooks.map((hook, index) => (
                      <Text key={index} style={styles.hookItem}>
                        • {hook}
                      </Text>
                    ))}
                  </View>
                </>
              )}

              {isWaitingState ? (
                <View style={styles.waitingContainer}>
                  <Text style={styles.waitingText}>
                    {isUserWaiting 
                      ? `Waiting for ${otherUser.first_name} to respond...` 
                      : `${otherUser.first_name} is interested! Respond to start chatting.`
                    }
                  </Text>
                  {!isUserWaiting && (
                    <View style={styles.modalActions}>
                      <TouchableOpacity 
                        style={[styles.modalActionButton, styles.passButton]}
                        onPress={handlePass}
                        disabled={loading}
                      >
                        <Text style={[styles.modalActionText, styles.passText]}>Pass</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                        style={[styles.modalActionButton, styles.acceptButton]}
                        onPress={handleOptIn}
                        disabled={loading}
                      >
                        <Text style={[styles.modalActionText, styles.optInText]}>
                          Down to Chat
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ) : (
                <>
                  <View style={styles.modalActions}>
                    <TouchableOpacity 
                      style={[styles.modalActionButton, styles.passButton]}
                      onPress={handlePass}
                      disabled={loading}
                    >
                      <Text style={[styles.modalActionText, styles.passText]}>Pass</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[
                        styles.modalActionButton, 
                        styles.acceptButton,
                        !canOptIn && { opacity: 0.5 }
                      ]}
                      onPress={handleOptIn}
                      disabled={loading || !canOptIn}
                    >
                      <Text style={[styles.modalActionText, styles.optInText]}>
                        Down to Chat
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {!canOptIn && activeChatCount >= 3 && (
                    <Text style={styles.chatLimitText}>
                      You have 3 active chats. Complete one to unlock new matches.
                    </Text>
                  )}

                  <Text style={styles.chatLimitText}>
                    You both need to opt in within {timeData.text.toLowerCase()} to start chatting.
                  </Text>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}