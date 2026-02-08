import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Modal,
  ScrollView,
  Alert,
  Dimensions,
  Animated,
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
      candidateHobbies?: string[];
      candidateTalkTopics?: string[];
      candidateInterests?: string[];
      user_a_hobbies?: string[];
      user_a_talk_topics?: string[];
      user_a_interests?: string[];
      user_b_hobbies?: string[];
      user_b_talk_topics?: string[];
      user_b_interests?: string[];
      conversationHooks?: string[];
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
    city?: string | null;
    gender?: string | null;
    relationship_status?: string | null;
    has_kids?: string | null;
  } | null;
  otherUserIntake?: {
    user_id: string;
    responses?: any[];
    life_stage?: string;
  } | null;
  onMatchUpdate: () => void;
  activeChatCount: number;
}

export default function MatchCard({ match, otherUser, otherUserIntake, onMatchUpdate, activeChatCount }: MatchCardProps) {
  const theme = useTheme();
  const { user } = useAuth();
  const [optInModalVisible, setOptInModalVisible] = useState(false);
  const [modalView, setModalView] = useState<'profile' | 'confirm' | 'success'>('profile');
  const [loading, setLoading] = useState(false);
  const scaleAnim = useRef(new Animated.Value(0)).current;

  // Create styles object with theme
const styles = StyleSheet.create({
  container: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 1,
      },
      shadowOpacity: 0.05,
      shadowRadius: 3,
      elevation: 2,
  },
    errorText: {
      fontSize: 16,
      textAlign: 'center',
      padding: 20,
    },
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 1,
      },
      shadowOpacity: 0.05,
      shadowRadius: 3,
      elevation: 2,
  },
    cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
      marginBottom: 12,
  },
  avatar: {
      width: 50,
      height: 50,
      borderRadius: 25,
      marginRight: 10,
  },
  avatarPlaceholder: {
      width: 50,
      height: 50,
      borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
      marginRight: 10,
  },
  avatarText: {
    color: '#FFFFFF',
      fontSize: 20,
    fontWeight: '600',
  },
    userInfo: {
    flex: 1,
  },
    userName: {
      fontSize: 17,
    fontWeight: '600',
      color: theme.colors.text,
    marginBottom: 4,
      letterSpacing: -0.2,
  },
    userAge: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      lineHeight: 20,
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
      marginRight: 16,
    },
    modalAvatarPlaceholder: {
      width: 80,
      height: 80,
      borderRadius: 40,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 16,
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
    previewSection: {
      marginBottom: 12,
      paddingTop: 8,
    },
    previewLabel: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginBottom: 6,
      fontWeight: '500',
      letterSpacing: 0.2,
      textTransform: 'uppercase',
    },
    previewText: {
      fontSize: 14,
      color: theme.colors.text,
      lineHeight: 20,
    },
    pageSheetContainer: {
    flex: 1,
      backgroundColor: theme.colors.surface,
    },
    pageSheetHeader: {
    flexDirection: 'row',
      justifyContent: 'flex-start',
    alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 8,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    pageSheetCloseButton: {
      padding: 8,
    },
    pageSheetContent: {
      flex: 1,
      padding: 20,
    },
    pageSheetTitle: {
      fontSize: 28,
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: 12,
      textAlign: 'center',
    },
    pageSheetDescription: {
      fontSize: 17,
      color: theme.colors.textSecondary,
      lineHeight: 24,
      marginBottom: 32,
      textAlign: 'center',
    },
    pageSheetProfileSection: {
      marginBottom: 32,
    },
    pageSheetProfileHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    pageSheetBasicInfoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 4,
    },
    pageSheetBasicInfo: {
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    pageSheetBasicInfoSeparator: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      marginHorizontal: 4,
    },
    pageSheetSection: {
      marginBottom: 24,
    },
    pageSheetBioText: {
      fontSize: 14,
      color: theme.colors.text,
      lineHeight: 20,
    },
    pageSheetWaitingSection: {
      backgroundColor: theme.colors.surface + '40',
      padding: 16,
      borderRadius: 12,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    pageSheetWaitingText: {
      fontSize: 15,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      fontStyle: 'italic',
    },
    pageSheetWarningSection: {
      backgroundColor: theme.colors.warning + '20',
      padding: 16,
      borderRadius: 12,
      marginBottom: 16,
    },
    pageSheetWarningText: {
      fontSize: 15,
      color: theme.colors.warning,
      textAlign: 'center',
    },
    pageSheetTimeText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginBottom: 24,
      fontStyle: 'italic',
    },
    pageSheetAvatar: {
      width: 80,
      height: 80,
      borderRadius: 40,
      marginRight: 16,
    },
    pageSheetAvatarPlaceholder: {
      width: 80,
      height: 80,
      borderRadius: 40,
    justifyContent: 'center',
      alignItems: 'center',
      marginRight: 16,
    },
    pageSheetAvatarText: {
      color: '#FFFFFF',
      fontSize: 32,
      fontWeight: '600',
    },
    pageSheetProfileInfo: {
      flex: 1,
    },
    pageSheetProfileName: {
      fontSize: 24,
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: 4,
    },
    pageSheetProfileAge: {
      fontSize: 17,
      color: theme.colors.textSecondary,
      marginBottom: 4,
    },
    pageSheetProfileLocation: {
      fontSize: 15,
      color: theme.colors.textSecondary,
    },
    pageSheetInterestsSection: {
      marginBottom: 24,
    },
    pageSheetTalkSection: {
      marginBottom: 24,
    },
    pageSheetCommonSection: {
      backgroundColor: theme.colors.primary + '15',
    borderRadius: 12,
      padding: 16,
      marginBottom: 24,
    borderWidth: 1,
      borderColor: theme.colors.primary + '30',
    },
    pageSheetCommonHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    pageSheetCommonTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.text,
      marginLeft: 8,
    },
    pageSheetCommonSubtitle: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 10,
      marginTop: 4,
    },
    pageSheetCommonInterests: {
      marginBottom: 16,
    },
    pageSheetCommonChip: {
      backgroundColor: theme.colors.primary + '25',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      marginRight: 8,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: theme.colors.primary + '40',
    },
    pageSheetCommonChipText: {
    fontSize: 14,
      fontWeight: '600',
      color: theme.colors.primary,
    },
    pageSheetCommonHooks: {
      marginTop: 4,
    },
    pageSheetHookItemContainer: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 10,
    },
    pageSheetHookIcon: {
      marginRight: 8,
      marginTop: 2,
    },
    pageSheetSectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 10,
    },
    pageSheetSectionTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: theme.colors.text,
      marginLeft: 8,
    },
    pageSheetInterests: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginBottom: 12,
    },
    pageSheetInterestChip: {
      backgroundColor: theme.colors.primary + '20',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      marginRight: 8,
      marginBottom: 8,
    },
    pageSheetInterestText: {
      fontSize: 14,
      color: theme.colors.primary,
    fontWeight: '500',
  },
    pageSheetTalkText: {
      fontSize: 14,
      color: theme.colors.text,
      lineHeight: 20,
    },
    pageSheetHooksList: {
      marginTop: 8,
    },
    pageSheetHookItem: {
      fontSize: 14,
      color: theme.colors.text,
      lineHeight: 20,
      flex: 1,
    },
    pageSheetActions: {
    flexDirection: 'row',
      gap: 12,
      marginTop: 20,
      marginBottom: 20,
    },
    pageSheetPassButton: {
      flex: 1,
      backgroundColor: theme.colors.surface,
      borderWidth: 1.5,
      borderColor: theme.colors.textSecondary + '40',
      paddingVertical: 16,
      borderRadius: 12,
    alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 1,
      },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2, // For Android
    },
    pageSheetConfirmButton: {
      flex: 1,
      backgroundColor: theme.colors.primary,
      paddingVertical: 16,
    borderRadius: 12,
      alignItems: 'center',
    },
    pageSheetButtonDisabled: {
      opacity: 0.6,
    },
    pageSheetPassText: {
      fontSize: 17,
      fontWeight: '600',
      color: theme.colors.text,
    },
    pageSheetConfirmText: {
      fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
    successContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 40,
    },
    successCheckmark: {
      marginBottom: 24,
    },
    successTitle: {
      fontSize: 28,
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: 16,
    textAlign: 'center',
  },
    successMessage: {
      fontSize: 17,
      color: theme.colors.textSecondary,
      lineHeight: 24,
      textAlign: 'center',
      paddingHorizontal: 20,
    },
    pageSheetWaitingButtonContainer: {
      marginTop: 20,
      marginBottom: 20,
    },
    pageSheetWaitingButton: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: 'center',
      width: '100%',
      opacity: 0.6,
    },
    pageSheetWaitingButtonText: {
      fontSize: 17,
      fontWeight: '600',
      color: theme.colors.textSecondary,
    },
    confirmProfilePreview: {
      backgroundColor: theme.colors.surface + '80',
      borderRadius: 12,
      padding: 16,
      marginBottom: 24,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    confirmProfileHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    confirmProfileAvatar: {
      width: 60,
      height: 60,
      borderRadius: 30,
      marginRight: 12,
    },
    confirmProfileAvatarPlaceholder: {
      width: 60,
      height: 60,
      borderRadius: 30,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    confirmProfileAvatarText: {
      color: '#FFFFFF',
      fontSize: 24,
      fontWeight: '600',
    },
    confirmProfileInfo: {
      flex: 1,
    },
    confirmProfileName: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: 4,
    },
    confirmProfileDetail: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginBottom: 2,
    },
    confirmSharedInterests: {
      marginTop: 8,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    confirmSharedInterestsLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.textSecondary,
      marginBottom: 8,
    },
    confirmInterestsChips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    confirmInterestChip: {
      backgroundColor: theme.colors.primary + '20',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
      marginRight: 8,
      marginBottom: 6,
    },
    confirmInterestText: {
      fontSize: 13,
      color: theme.colors.primary,
      fontWeight: '500',
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
    
    // Calculate progress (0 to 1, where 1 is full time remaining)
    const progress = Math.min(hours / totalHours, 1);
    
    // Show only hours
    const text = `${hours} hours`;
    
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

      setOptInModalVisible(false);
      onMatchUpdate();
    } catch (error) {
      console.error('Error passing match:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to pass match');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToProfile = () => {
    // Switch back to profile view
    setModalView('profile');
  };

  const handleOptIn = () => {
    if (activeChatCount >= 3) {
      Alert.alert(
        'Chat Limit Reached',
        'You can only have 3 active Flock chats at a time. Please wrap up an existing conversation before starting a new one.'
      );
      return;
    }

    // Switch to confirmation view
    setModalView('confirm');
  };

  const confirmOptIn = async () => {
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
      if (!response.ok) {
        // If already opted in, refresh the match data and show appropriate state
        if (result.error && result.error.includes('Already opted in')) {
          onMatchUpdate(); // Refresh match data
          setOptInModalVisible(false);
          setModalView('profile');
          setLoading(false);
          return;
        }
        throw new Error(result.error);
      }

      // Immediately refresh match data to get updated status
      onMatchUpdate();
      
      // Show success state with animation
      setModalView('success');
      setLoading(false);
      
      // Animate checkmark
      scaleAnim.setValue(0);
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 3,
        tension: 40,
        useNativeDriver: true,
      }).start();

      if (result.chat_created) {
        // If chat was created, close modal and show alert
        setTimeout(() => {
          setOptInModalVisible(false);
          setModalView('profile');
          scaleAnim.setValue(0);
          Alert.alert(
            'Chat Created! 🎉',
            'Both of you opted in! Your Flock chat is ready in the Connections tab.',
            [{ text: 'Great!' }]
          );
          onMatchUpdate();
        }, 2000);
      } else {
        // If waiting, close after showing success message
        setTimeout(() => {
          setOptInModalVisible(false);
          setModalView('profile');
          scaleAnim.setValue(0);
          onMatchUpdate();
        }, 2000);
      }
    } catch (error) {
      console.error('Error opting in to match:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to opt in to match');
      setModalView('profile');
      scaleAnim.setValue(0);
      setLoading(false);
    }
  };

  const statusPill = getStatusPill();
  const timeData = getTimeRemaining();
  const isUserA = match.user_a === user?.id;
  // Check if user has already opted in by checking match status
  const hasUserOptedIn = (isUserA && match.status === 'opted_in_a') || 
                         (!isUserA && match.status === 'opted_in_b');
  const canOptIn = match.status === 'active' && activeChatCount < 3 && !hasUserOptedIn;
  const isWaitingState = match.status === 'opted_in_a' || match.status === 'opted_in_b';
  const isUserWaiting = (match.status === 'opted_in_a' && isUserA) || (match.status === 'opted_in_b' && !isUserA);

  // Get the correct user's info based on who is viewing
  // user_a is the alphabetically first ID, user_b is the second
  const otherUserIsUserA = otherUser && match.user_a === otherUser.id;
  const otherUserHobbies = otherUserIsUserA 
    ? (match.reasons?.user_a_hobbies || match.reasons?.candidateHobbies || [])
    : (match.reasons?.user_b_hobbies || match.reasons?.candidateHobbies || []);
  const otherUserInterests = otherUserIsUserA
    ? (match.reasons?.user_a_interests || match.reasons?.candidateInterests || [])
    : (match.reasons?.user_b_interests || match.reasons?.candidateInterests || []);
  
  // Get conversation preview - prioritize shared interests/hooks, fallback to their talk-about response
  const getConversationPreview = () => {
    // Strategy 1: If we have conversation hooks, use the first one (these are about what they have in common)
    if (match.reasons?.conversationHooks && Array.isArray(match.reasons.conversationHooks) && match.reasons.conversationHooks.length > 0) {
      const firstHook = match.reasons.conversationHooks[0];
      // Format the hook to be more natural
      let formattedHook = firstHook;
      if (firstHook.startsWith('Both ')) {
        formattedHook = 'You both ' + firstHook.substring(5).toLowerCase();
      } else if (firstHook.startsWith('You both')) {
        formattedHook = firstHook;
      } else {
        formattedHook = 'You both ' + firstHook.toLowerCase();
      }
      
      // Limit length
      if (formattedHook.length > 150) {
        formattedHook = formattedHook.substring(0, 147).trim();
        const lastSpace = formattedHook.lastIndexOf(' ');
        if (lastSpace > 100) {
          formattedHook = formattedHook.substring(0, lastSpace) + '...';
        } else {
          formattedHook += '...';
        }
      }
      
      return { text: formattedHook, label: 'You might discuss' };
    }
    
    // Strategy 2: If we have shared interests, create a natural sentence
    if (match.reasons?.shared_interests && match.reasons.shared_interests.length > 0) {
      const interests = match.reasons.shared_interests.slice(0, 2);
      let previewText = '';
      if (interests.length === 1) {
        previewText = `You both enjoy ${interests[0].toLowerCase()}`;
      } else {
        previewText = `You both enjoy ${interests[0].toLowerCase()} and ${interests[1].toLowerCase()}`;
      }
      
      return { text: previewText, label: 'You have in common' };
    }
    
    // Strategy 3: Fallback to their "likes talking about" response
    if (!otherUserIntake?.responses || !Array.isArray(otherUserIntake.responses)) return null;
    
    const talkResponse = otherUserIntake.responses.find((r: any) => r.question_id === 'q11_talk_about_hours');
    if (!talkResponse?.answer) return null;
    
    const text = talkResponse.answer.trim();
    // Split by sentences and take first 1-2 sentences
    const sentences = text.split(/[.!?]+/).filter((s: string) => s.trim().length > 0);
    if (sentences.length === 0) return null;
    
    // Take first 1-2 sentences, but limit to ~150 characters
    let summary = sentences[0].trim();
    if (sentences.length > 1 && summary.length < 120) {
      summary += '. ' + sentences[1].trim();
    }
    
    // If still too long, truncate at word boundary
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
    
    return { text: summary, label: 'They enjoy discussing' };
  };
  
  const conversationPreview = getConversationPreview();

  return (
    <>
      <TouchableOpacity style={styles.card} onPress={() => {
        setOptInModalVisible(true);
        setModalView('profile');
      }}>
        <View style={styles.cardHeader}>
          {otherUser?.avatar_url ? (
            <Image 
              source={{ uri: otherUser.avatar_url }}
              style={styles.avatar}
            />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: theme.colors.primary }]}>
              <Text style={styles.avatarText}>
                {otherUser?.first_name?.charAt(0).toUpperCase() || '?'}
              </Text>
            </View>
          )}
          <View style={styles.userInfo}>
            <Text style={styles.userName}>
              {otherUser?.first_name} {otherUser?.last_name ? otherUser.last_name.charAt(0) + '.' : ''}
            </Text>
            {otherUser?.age && (
              <Text style={styles.userAge}>{otherUser.age} years old</Text>
            )}
          </View>
          <CircularTimer timeData={timeData} />
        </View>

        {/* Show conversation preview - prioritized by what they have in common */}
        {conversationPreview && (
          <View style={styles.previewSection}>
            <Text style={styles.previewLabel}>{conversationPreview.label}</Text>
            <Text style={styles.previewText}>
              {conversationPreview.text}
            </Text>
          </View>
        )}

        {isUserWaiting && (
          <View style={styles.waitingContainer}>
            <Text style={styles.waitingText}>
              Waiting for {otherUser?.first_name} to respond
            </Text>
          </View>
        )}
        {isWaitingState && !isUserWaiting && (
          <View style={styles.waitingContainer}>
            <Text style={styles.waitingText}>
              {otherUser?.first_name} is interested! Respond to start chatting.
            </Text>
          </View>
        )}
      </TouchableOpacity>


      {/* iOS Page Sheet Modal */}
      <Modal
        visible={optInModalVisible}
        transparent={false}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setOptInModalVisible(false)}
      >
        <View style={styles.pageSheetContainer}>
          <View style={styles.pageSheetHeader}>
            {modalView === 'confirm' ? (
              <TouchableOpacity
                onPress={handleBackToProfile}
                disabled={loading}
                style={styles.pageSheetCloseButton}
              >
                <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={() => {
                  setOptInModalVisible(false);
                  setModalView('profile');
                }}
                disabled={loading || modalView === 'success'}
                style={styles.pageSheetCloseButton}
              >
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            )}
          </View>
          
          <ScrollView style={styles.pageSheetContent} showsVerticalScrollIndicator={false}>
            {modalView === 'profile' && (
              <>
            {/* Profile Header */}
            {otherUser && (
              <View style={styles.pageSheetProfileHeader}>
                {otherUser.avatar_url ? (
                  <Image 
                    source={{ uri: otherUser.avatar_url }}
                    style={styles.pageSheetAvatar}
                  />
                ) : (
                  <View style={[styles.pageSheetAvatarPlaceholder, { backgroundColor: theme.colors.primary }]}>
                    <Text style={styles.pageSheetAvatarText}>
                      {otherUser.first_name?.charAt(0).toUpperCase() || '?'}
                    </Text>
                  </View>
                )}
                <View style={styles.pageSheetProfileInfo}>
                  <Text style={styles.pageSheetProfileName}>
                    {otherUser.first_name} {otherUser.last_name ? otherUser.last_name.charAt(0) + '.' : ''}
                  </Text>
                  {otherUser?.city && (
                    <Text style={styles.pageSheetProfileAge}>📍 {otherUser.city}</Text>
                  )}
                  {(otherUser?.age || otherUser?.gender) && (
                    <View style={styles.pageSheetBasicInfoRow}>
                      {otherUser?.age && (
                        <Text style={styles.pageSheetBasicInfo}>
                          {otherUser.age} years old
                        </Text>
                      )}
                      {otherUser?.age && otherUser?.gender && (
                        <Text style={styles.pageSheetBasicInfoSeparator}> • </Text>
                      )}
                      {otherUser?.gender && (
                        <Text style={styles.pageSheetBasicInfo}>
                          {otherUser.gender}
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* About */}
            {otherUser?.bio_text && (
              <View style={styles.pageSheetSection}>
                <View style={styles.pageSheetSectionHeader}>
                  <Ionicons name="person" size={18} color={theme.colors.primary} />
                  <Text style={styles.pageSheetSectionTitle}>About</Text>
                </View>
                <Text style={styles.pageSheetBioText}>{otherUser.bio_text}</Text>
              </View>
            )}

            {/* Hobbies & Interests */}
            {((otherUserHobbies && otherUserHobbies.length > 0) || (otherUserInterests && otherUserInterests.length > 0)) && (
              <View style={styles.pageSheetSection}>
                <View style={styles.pageSheetSectionHeader}>
                  <Ionicons name="star" size={18} color={theme.colors.primary} />
                  <Text style={styles.pageSheetSectionTitle}>Hobbies & Interests</Text>
                </View>
                <View style={styles.pageSheetInterests}>
                  {(() => {
                    const combined = [...(otherUserHobbies || []), ...(otherUserInterests || [])];
                    const unique = Array.from(new Set(combined.map(item => item.toLowerCase())))
                      .map(lower => combined.find(item => item.toLowerCase() === lower))
                      .filter(Boolean) as string[];
                    
                    return unique.map((item, index) => (
                      <View key={`item-${index}`} style={styles.pageSheetInterestChip}>
                        <Text style={styles.pageSheetInterestText}>{item}</Text>
                      </View>
                    ));
                  })()}
                </View>
              </View>
            )}

            {/* You Might Discuss - Full Conversation Hooks */}
            {(() => {
              // Show all conversation hooks in full (not truncated like on the card)
              if (match.reasons?.conversationHooks && Array.isArray(match.reasons.conversationHooks) && match.reasons.conversationHooks.length > 0) {
                return (
                  <View style={styles.pageSheetSection}>
                    <View style={styles.pageSheetSectionHeader}>
                      <Ionicons name="chatbubbles" size={18} color={theme.colors.primary} />
                      <Text style={styles.pageSheetSectionTitle}>You might discuss</Text>
                    </View>
                    <View style={styles.pageSheetHooksList}>
                      {match.reasons.conversationHooks
                        .filter((hook: string) => hook && !hook.toLowerCase().includes('available'))
                        .map((hook: string, index: number) => {
                          // Format the hook to be more natural
                          let formattedHook = hook;
                          if (hook.startsWith('Both ')) {
                            formattedHook = 'You both ' + hook.substring(5).toLowerCase();
                          } else if (hook.startsWith('You both')) {
                            formattedHook = hook;
                          } else {
                            formattedHook = 'You both ' + hook.toLowerCase();
                          }
                          
                          return (
                            <View key={index} style={styles.pageSheetHookItemContainer}>
                              <Ionicons name="checkmark-circle" size={16} color={theme.colors.primary} style={styles.pageSheetHookIcon} />
                              <Text style={styles.pageSheetHookItem}>{formattedHook}</Text>
                            </View>
                          );
                        })}
                    </View>
                  </View>
                );
              }
              
              // Fallback: If no conversation hooks, show shared interests
              if (match.reasons?.shared_interests && match.reasons.shared_interests.length > 0) {
                const interests = match.reasons.shared_interests;
                let previewText = '';
                if (interests.length === 1) {
                  previewText = `You both enjoy ${interests[0].toLowerCase()}.`;
                } else if (interests.length === 2) {
                  previewText = `You both enjoy ${interests[0].toLowerCase()} and ${interests[1].toLowerCase()}.`;
                } else {
                  previewText = `You both enjoy ${interests.slice(0, -1).map(i => i.toLowerCase()).join(', ')}, and ${interests[interests.length - 1].toLowerCase()}.`;
                }
                
                return (
                  <View style={styles.pageSheetSection}>
                    <View style={styles.pageSheetSectionHeader}>
                      <Ionicons name="chatbubbles" size={18} color={theme.colors.primary} />
                      <Text style={styles.pageSheetSectionTitle}>You have in common</Text>
                    </View>
                    <Text style={styles.pageSheetTalkText}>{previewText}</Text>
                  </View>
                );
              }
              
              return null;
            })()}

            {/* Passionate About */}
            {(() => {
              if (!otherUserIntake?.responses || !Array.isArray(otherUserIntake.responses)) return null;
              const response = otherUserIntake.responses.find((r: any) => r.question_id === 'q1_passionate_about');
              if (!response?.answer) return null;
              const text = response.answer.trim();
              if (text.length === 0) return null;
              
              // Summarize to 1-2 sentences
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
                <View style={styles.pageSheetSection}>
                  <View style={styles.pageSheetSectionHeader}>
                    <Ionicons name="flame" size={18} color={theme.colors.primary} />
                    <Text style={styles.pageSheetSectionTitle}>Passionate About</Text>
                  </View>
                  <Text style={styles.pageSheetTalkText}>{summary}</Text>
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
              
              // Summarize to 1-2 sentences
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
                <View style={styles.pageSheetSection}>
                  <View style={styles.pageSheetSectionHeader}>
                    <Ionicons name="bulb" size={18} color={theme.colors.primary} />
                    <Text style={styles.pageSheetSectionTitle}>Wanting to Try</Text>
                  </View>
                  <Text style={styles.pageSheetTalkText}>{summary}</Text>
                </View>
              );
            })()}


            {/* Waiting State Message */}
            {isWaitingState && (
              <View style={styles.pageSheetWaitingSection}>
                <Text style={styles.pageSheetWaitingText}>
                  {isUserWaiting 
                    ? `Waiting for ${otherUser?.first_name} to respond...` 
                    : `${otherUser?.first_name} is interested! Respond to start chatting.`
                  }
                </Text>
              </View>
            )}

            {/* Chat Limit Warning */}
            {!canOptIn && activeChatCount >= 3 && (
              <View style={styles.pageSheetWarningSection}>
                <Text style={styles.pageSheetWarningText}>
                  You have 3 active chats. Complete one to unlock new matches.
                </Text>
              </View>
            )}

            {/* Action Buttons - Show Pass/Continue if user hasn't opted in */}
            {!isUserWaiting && (
              <View style={styles.pageSheetActions}>
                <TouchableOpacity
                  style={[styles.pageSheetPassButton, loading && styles.pageSheetButtonDisabled]}
                  onPress={async () => {
                    setOptInModalVisible(false);
                    await handlePass();
                  }}
                  disabled={loading}
                >
                  <Text style={styles.pageSheetPassText}>Pass</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.pageSheetConfirmButton, loading && styles.pageSheetButtonDisabled, !canOptIn && styles.pageSheetButtonDisabled]}
                  onPress={handleOptIn}
                  disabled={loading || !canOptIn}
                >
                  <Text style={styles.pageSheetConfirmText}>
                    {loading ? 'Processing...' : 'Continue'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Time Remaining - Below buttons */}
            {!isWaitingState && (
              <Text style={styles.pageSheetTimeText}>
                You both need to opt in within {timeData.text.toLowerCase()} to start chatting.
              </Text>
            )}
              </>
            )}

            {modalView === 'confirm' && (
              <>
                <Text style={styles.pageSheetTitle}>
                  Opt into match for $6
                </Text>
                
                <Text style={styles.pageSheetDescription}>
                  You'll only be charged if {otherUser?.first_name} is also down to meet up within 72 hours.
                </Text>

                {/* Condensed Profile Preview */}
                {otherUser && (
                  <View style={styles.confirmProfilePreview}>
                    <View style={styles.confirmProfileHeader}>
                      {otherUser.avatar_url ? (
                        <Image 
                          source={{ uri: otherUser.avatar_url }}
                          style={styles.confirmProfileAvatar}
                        />
                      ) : (
                        <View style={[styles.confirmProfileAvatarPlaceholder, { backgroundColor: theme.colors.primary }]}>
                          <Text style={styles.confirmProfileAvatarText}>
                            {otherUser.first_name?.charAt(0).toUpperCase() || '?'}
                          </Text>
                        </View>
                      )}
                      <View style={styles.confirmProfileInfo}>
                        <Text style={styles.confirmProfileName}>
                          {otherUser.first_name} {otherUser.last_name ? otherUser.last_name.charAt(0) + '.' : ''}
                        </Text>
                        {otherUser.age && (
                          <Text style={styles.confirmProfileDetail}>{otherUser.age} years old</Text>
                        )}
                        {otherUser.city && (
                          <Text style={styles.confirmProfileDetail}>📍 {otherUser.city}</Text>
                        )}
                      </View>
                    </View>
                    
                    {/* Show 1-2 key shared interests if available */}
                    {match.reasons?.shared_interests && match.reasons.shared_interests.length > 0 && (
                      <View style={styles.confirmSharedInterests}>
                        <Text style={styles.confirmSharedInterestsLabel}>You both enjoy:</Text>
                        <View style={styles.confirmInterestsChips}>
                          {match.reasons.shared_interests.slice(0, 2).map((interest: string, index: number) => (
                            <View key={index} style={styles.confirmInterestChip}>
                              <Text style={styles.confirmInterestText}>{interest}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.pageSheetConfirmButton, loading && styles.pageSheetButtonDisabled]}
                  onPress={confirmOptIn}
                  disabled={loading}
                >
                  <Text style={styles.pageSheetConfirmText}>
                    {loading ? 'Processing...' : 'Confirm'}
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {modalView === 'success' && (
              <>
                <View style={styles.successContainer}>
                  <Animated.View 
                    style={[
                      styles.successCheckmark,
                      {
                        transform: [{ scale: scaleAnim }],
                      }
                    ]}
                  >
                    <Ionicons name="checkmark-circle" size={80} color={theme.colors.success} />
                  </Animated.View>
                  <Text style={styles.successTitle}>You're in! ✅</Text>
                  <Text style={styles.successMessage}>
                    We'll let you know as soon as {otherUser?.first_name} responds to the match.
                  </Text>
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </Modal>

    </>
  );
}