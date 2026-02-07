import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

export default function SafetyPrivacyScreen({ navigation }: any) {
  const theme = useTheme();

  const safetySections = [
    {
      title: 'Blocking & Reporting',
      content: 'You can block or report any user at any time. Blocked users won\'t be able to see your profile or message you. Reports are reviewed by our team.',
    },
    {
      title: 'Privacy Controls',
      content: 'Your profile information is only visible to matched users and active connections. You control what information is shared.',
    },
    {
      title: 'Data Security',
      content: 'We use industry-standard encryption to protect your data. Your personal information is never shared with third parties without your consent.',
    },
    {
      title: 'Location Privacy',
      content: 'Your exact location is never shared. We only use your city and approximate distance preferences for matching.',
    },
    {
      title: 'Account Deletion',
      content: 'You can delete your account at any time from your profile settings. This will permanently remove all your data from our systems.',
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top', 'left', 'right']}>
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Safety & Privacy
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {safetySections.map((section, index) => (
            <View key={index} style={[styles.section, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                {section.title}
              </Text>
              <Text style={[styles.sectionContent, { color: theme.colors.textSecondary }]}>
                {section.content}
              </Text>
            </View>
          ))}

          <View style={[styles.section, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Need Help?
            </Text>
            <Text style={[styles.sectionContent, { color: theme.colors.textSecondary }]}>
              If you have concerns about your safety or privacy, please contact us immediately. We take all reports seriously and respond promptly.
            </Text>
            <TouchableOpacity
              style={[styles.contactButton, { backgroundColor: theme.colors.primary }]}
              onPress={() => navigation.navigate('HelpSupport')}
            >
              <Text style={styles.contactButtonText}>Contact Support</Text>
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
  section: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  sectionContent: {
    fontSize: 15,
    lineHeight: 22,
  },
  contactButton: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  contactButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
