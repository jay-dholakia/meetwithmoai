import React from 'react';
import { View, Text, Switch, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

type Props = {
  optedIn: boolean | null;
  loading: boolean;
  onToggle: (value: boolean) => void;
};

export default function WeeklyMatchOptInCard({ optedIn, loading, onToggle }: Props) {
  const theme = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <View style={styles.row}>
        <View style={styles.left}>
          <Ionicons name="calendar-outline" size={22} color={theme.colors.primary} />
          <View style={styles.textBlock}>
            <Text style={[styles.title, { color: theme.colors.text }]}>
              {optedIn ? "You're in for next week's run" : "Next week's match run"}
            </Text>
            <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
              Opt in by Sunday 11:59pm to be in Tuesday's batch.
            </Text>
          </View>
        </View>
        {loading ? (
          <ActivityIndicator size="small" color={theme.colors.primary} />
        ) : (
          <Switch
            value={optedIn ?? false}
            onValueChange={onToggle}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            thumbColor="#FFFFFF"
            disabled={loading}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
    gap: 10,
  },
  textBlock: {
    flex: 1,
    minWidth: 0,
    marginRight: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
  },
});
