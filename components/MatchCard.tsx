import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { MatchCandidate } from '../lib/matching-service';

interface MatchCardProps {
  match: MatchCandidate;
  otherUser: {
    name: string;
    initial: string;
    avatar_url?: string;
    bio_text?: string;
  };
  onAccept: () => void;
  onDecline: () => void;
}

export default function MatchCard({ match, otherUser, onAccept, onDecline }: MatchCardProps) {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          {otherUser.avatar_url ? (
            <Image source={{ uri: otherUser.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: theme.colors.primary }]}>
              <Text style={styles.avatarText}>{otherUser.initial}</Text>
            </View>
          )}
        </View>
        <View style={styles.headerInfo}>
          <Text style={[styles.name, { color: theme.colors.text }]}>
            {otherUser.name}
          </Text>
          <Text style={[styles.score, { color: theme.colors.primary }]}>
            {Math.round(match.score * 100)}% match
          </Text>
        </View>
      </View>

      {/* Bio */}
      {otherUser.bio_text && (
        <Text style={[styles.bio, { color: theme.colors.textSecondary }]}>
          {otherUser.bio_text}
        </Text>
      )}

      {/* Overlaps */}
      {match.reasons.overlaps.length > 0 && (
        <View style={styles.overlapsContainer}>
          <Text style={[styles.overlapsTitle, { color: theme.colors.text }]}>
            You both:
          </Text>
          <View style={styles.overlapsList}>
            {match.reasons.overlaps.map((overlap, index) => (
              <View key={index} style={[styles.overlapChip, { backgroundColor: theme.colors.primary + '20' }]}>
                <Ionicons name="checkmark-circle" size={16} color={theme.colors.primary} />
                <Text style={[styles.overlapText, { color: theme.colors.primary }]}>
                  {overlap}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Complement */}
      {match.reasons.complement && (
        <View style={styles.complementContainer}>
          <Text style={[styles.complementTitle, { color: theme.colors.text }]}>
            Why you might connect:
          </Text>
          <Text style={[styles.complementText, { color: theme.colors.textSecondary }]}>
            {match.reasons.complement}
          </Text>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.declineButton, { borderColor: theme.colors.border }]}
          onPress={onDecline}
        >
          <Ionicons name="close" size={20} color={theme.colors.textSecondary} />
          <Text style={[styles.declineText, { color: theme.colors.textSecondary }]}>
            Not now
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.acceptButton, { backgroundColor: theme.colors.primary }]}
          onPress={onAccept}
        >
          <Ionicons name="heart" size={20} color="#FFFFFF" />
          <Text style={styles.acceptText}>
            Yes, introduce us
          </Text>
        </TouchableOpacity>
      </View>

      {/* Expiry Info */}
      <Text style={[styles.expiryText, { color: theme.colors.textSecondary }]}>
        Expires {new Date(match.expires_at).toLocaleDateString()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
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
  headerInfo: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 2,
  },
  score: {
    fontSize: 14,
    fontWeight: '500',
  },
  bio: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  overlapsContainer: {
    marginBottom: 12,
  },
  overlapsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  overlapsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  overlapChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  overlapText: {
    fontSize: 12,
    fontWeight: '500',
  },
  complementContainer: {
    marginBottom: 16,
  },
  complementTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  complementText: {
    fontSize: 14,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  declineButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  declineText: {
    fontSize: 14,
    fontWeight: '500',
  },
  acceptButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  acceptText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  expiryText: {
    fontSize: 12,
    textAlign: 'center',
  },
});





