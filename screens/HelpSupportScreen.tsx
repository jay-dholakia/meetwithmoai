import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

interface FAQItem {
  question: string;
  answer: string;
}

export default function HelpSupportScreen({ navigation }: any) {
  const theme = useTheme();
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());

  const faqItems: FAQItem[] = [
    {
      question: 'How does matching work?',
      answer: 'We use a combination of semantic similarity (analyzing your open-ended responses) and structured preferences (location, age, interests) to find compatible connections. New matches appear weekly.',
    },
    {
      question: 'How do I start a conversation?',
      answer: 'When you see a match you\'re interested in, tap "Continue" to opt in. If they also opt in, a chat will be created automatically with an AI-generated introduction message.',
    },
    {
      question: 'Can I change my questionnaire responses?',
      answer: 'Yes! Go to Profile > Settings > Edit Questionnaire to update any of your responses. This will help improve your future matches.',
    },
    {
      question: 'What happens if I pass on a match?',
      answer: 'Passing on a match means you\'re not interested. The match will be removed and won\'t appear again. You can always get new matches weekly.',
    },
    {
      question: 'How many active chats can I have?',
      answer: 'You can have up to 3 active chats at once. Once you reach this limit, you won\'t receive new matches until you archive or end a conversation.',
    },
    {
      question: 'How do I block or report someone?',
      answer: 'Go to Profile > Settings > Blocked Users to manage blocked users. You can also report users from their profile or during a conversation.',
    },
    {
      question: 'Can I pause my account?',
      answer: 'Yes! Go to Profile > Account and toggle "Pause account". This will temporarily stop matching and hide your profile.',
    },
    {
      question: 'How do I delete my account?',
      answer: 'Contact support to delete your account. This will permanently remove all your data from our systems.',
    },
  ];

  const toggleItem = (index: number) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedItems(newExpanded);
  };

  const handleTextFounder = () => {
    const phoneNumber = '+19496789729';
    const smsUrl = `sms:${phoneNumber}`;
    
    Linking.canOpenURL(smsUrl)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(smsUrl);
        } else {
          Alert.alert('Error', 'Unable to open messaging app');
        }
      })
      .catch((err) => {
        console.error('Error opening SMS:', err);
        Alert.alert('Error', 'Unable to open messaging app');
      });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top', 'left', 'right']}>
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Help & Support
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Text style={[styles.sectionHeader, { color: theme.colors.text }]}>
            Frequently Asked Questions
          </Text>

          {faqItems.map((item, index) => {
            const isExpanded = expandedItems.has(index);
            return (
              <TouchableOpacity
                key={index}
                style={[styles.faqItem, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                onPress={() => toggleItem(index)}
                activeOpacity={0.7}
              >
                <View style={styles.faqHeader}>
                  <Text style={[styles.faqQuestion, { color: theme.colors.text }]}>
                    {item.question}
                  </Text>
                  <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={theme.colors.textSecondary}
                  />
                </View>
                {isExpanded && (
                  <Text style={[styles.faqAnswer, { color: theme.colors.textSecondary }]}>
                    {item.answer}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}

          <View style={styles.feedbackSection}>
            <TouchableOpacity
              style={[styles.feedbackButton, { backgroundColor: theme.colors.primary }]}
              onPress={handleTextFounder}
            >
              <Ionicons name="chatbubble-ellipses" size={20} color="#FFFFFF" />
              <Text style={styles.feedbackButtonText}>
                Have any feedback? Text the founder!
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  sectionHeader: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 16,
  },
  faqItem: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 12,
  },
  faqAnswer: {
    fontSize: 15,
    lineHeight: 22,
    marginTop: 12,
  },
  feedbackSection: {
    marginTop: 24,
    marginBottom: 32,
  },
  feedbackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  feedbackButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
