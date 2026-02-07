import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/mcp-supabase';

interface Statistics {
  activeMatches: number;
  activeChats: number;
  totalMatches: number;
  totalOptIns: number;
  totalPasses: number;
  totalExpired: number;
}

export default function MatchStatisticsScreen({ navigation }: any) {
  const theme = useTheme();
  const { user } = useAuth();
  const [stats, setStats] = useState<Statistics>({
    activeMatches: 0,
    activeChats: 0,
    totalMatches: 0,
    totalOptIns: 0,
    totalPasses: 0,
    totalExpired: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async () => {
    try {
      setLoading(true);

      // Active matches
      const { data: activeMatches, error: activeMatchesError } = await supabase
        .from('matcha_match_candidates')
        .select('id', { count: 'exact' })
        .or(`user_a.eq.${user?.id},user_b.eq.${user?.id}`)
        .eq('status', 'active')
        .gt('expires_at', new Date().toISOString());

      // Active chats
      const { data: activeChats, error: activeChatsError } = await supabase
        .from('conversations')
        .select('id', { count: 'exact' })
        .or(`user_a.eq.${user?.id},user_b.eq.${user?.id}`)
        .eq('conversation_type', 'matcha')
        .eq('status', 'active');

      // Total matches (all time)
      const { data: totalMatches, error: totalMatchesError } = await supabase
        .from('matcha_match_candidates')
        .select('id', { count: 'exact' })
        .or(`user_a.eq.${user?.id},user_b.eq.${user?.id}`);

      // Total opt-ins
      const { data: totalOptIns, error: totalOptInsError } = await supabase
        .from('matcha_opt_ins')
        .select('id', { count: 'exact' })
        .eq('user_id', user?.id);

      // Total passes
      const { data: totalPasses, error: totalPassesError } = await supabase
        .from('matcha_opt_ins')
        .select('id', { count: 'exact' })
        .eq('user_id', user?.id)
        .eq('decision', 'pass');

      // Total expired
      const { data: totalExpired, error: totalExpiredError } = await supabase
        .from('matcha_match_candidates')
        .select('id', { count: 'exact' })
        .or(`user_a.eq.${user?.id},user_b.eq.${user?.id}`)
        .eq('status', 'expired');

      setStats({
        activeMatches: activeMatches?.length || 0,
        activeChats: activeChats?.length || 0,
        totalMatches: totalMatches?.length || 0,
        totalOptIns: totalOptIns?.length || 0,
        totalPasses: totalPasses?.length || 0,
        totalExpired: totalExpired?.length || 0,
      });
    } catch (error) {
      console.error('Error loading statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ icon, label, value, color }: { icon: string; label: string; value: number; color: string }) => (
    <View style={[styles.statCard, { backgroundColor: color + '20', borderColor: color }]}>
      <Ionicons name={icon as any} size={32} color={color} />
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: '#666' }]}>{label}</Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top', 'left', 'right']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.text }]}>
            Loading statistics...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top', 'left', 'right']}>
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Match Statistics
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Current Activity
          </Text>
          <View style={styles.statsGrid}>
            <StatCard icon="people" label="Active Matches" value={stats.activeMatches} color={theme.colors.primary} />
            <StatCard icon="chatbubbles" label="Active Chats" value={stats.activeChats} color={theme.colors.success} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            All Time
          </Text>
          <View style={styles.statsGrid}>
            <StatCard icon="heart" label="Total Matches" value={stats.totalMatches} color="#FF6B6B" />
            <StatCard icon="checkmark-circle" label="Opted In" value={stats.totalOptIns} color={theme.colors.success} />
            <StatCard icon="close-circle" label="Passed" value={stats.totalPasses} color="#FFA500" />
            <StatCard icon="time-outline" label="Expired" value={stats.totalExpired} color={theme.colors.textSecondary} />
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
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
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    textAlign: 'center',
  },
});
