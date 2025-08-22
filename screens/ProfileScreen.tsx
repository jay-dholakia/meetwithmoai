import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/mcp-supabase';

interface Profile {
  id: string;
  name: string;
  initial: string;
  city: string;
  lat: number;
  lng: number;
  radius_km: number;
  avatar_url?: string;
  bio_text?: string;
  is_active: boolean;
  is_paused: boolean;
}

interface Preferences {
  user_id: string;
  languages: string[];
  availability_slots: any;
  reminder_opt_in: boolean;
}

export default function ProfileScreen() {
  const theme = useTheme();
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      
      // Load profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (profileError) throw profileError;

      // Load preferences
      const { data: prefsData, error: prefsError } = await supabase
        .from('preferences')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (prefsError && prefsError.code !== 'PGRST116') throw prefsError;

      setProfile(profileData);
      setPreferences(prefsData || {
        user_id: user?.id,
        languages: ['English'],
        availability_slots: {},
        reminder_opt_in: true,
      });
    } catch (error) {
      console.error('Error loading profile:', error);
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user?.id);

      if (error) throw error;
      setProfile(prev => prev ? { ...prev, ...updates } : null);
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile');
    }
  };

  const updatePreferences = async (updates: Partial<Preferences>) => {
    try {
      const { error } = await supabase
        .from('preferences')
        .upsert({
          user_id: user?.id,
          ...preferences,
          ...updates,
        });

      if (error) throw error;
      setPreferences(prev => prev ? { ...prev, ...updates } : null);
    } catch (error) {
      console.error('Error updating preferences:', error);
      Alert.alert('Error', 'Failed to update preferences');
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        // In a real app, you'd upload to Supabase Storage
        // For now, we'll just update the profile with a placeholder
        updateProfile({ avatar_url: result.assets[0].uri });
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: signOut },
      ]
    );
  };

  const renderProfileSection = () => (
    <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
        Profile
      </Text>
      
      <TouchableOpacity style={styles.avatarSection} onPress={pickImage}>
        {profile?.avatar_url ? (
          <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatarPlaceholder, { backgroundColor: theme.colors.primary }]}>
            <Text style={styles.avatarText}>{profile?.initial || '?'}</Text>
          </View>
        )}
        <View style={styles.avatarOverlay}>
          <Ionicons name="camera" size={20} color="#FFFFFF" />
        </View>
      </TouchableOpacity>

      <View style={styles.profileInfo}>
        <Text style={[styles.profileName, { color: theme.colors.text }]}>
          {profile?.name || 'Set your name'}
        </Text>
        <Text style={[styles.profileLocation, { color: theme.colors.textSecondary }]}>
          📍 {profile?.city || 'Set your location'}
        </Text>
        {profile?.bio_text && (
          <Text style={[styles.profileBio, { color: theme.colors.textSecondary }]}>
            {profile.bio_text}
          </Text>
        )}
      </View>
    </View>
  );

  const renderSettingsSection = () => (
    <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
        Settings
      </Text>

      <TouchableOpacity style={styles.settingItem}>
        <View style={styles.settingLeft}>
          <Ionicons name="notifications-outline" size={24} color={theme.colors.text} />
          <Text style={[styles.settingText, { color: theme.colors.text }]}>
            Weekly reminders
          </Text>
        </View>
        <Switch
          value={preferences?.reminder_opt_in || false}
          onValueChange={(value) => updatePreferences({ reminder_opt_in: value })}
          trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
          thumbColor="#FFFFFF"
        />
      </TouchableOpacity>

      <TouchableOpacity style={styles.settingItem}>
        <View style={styles.settingLeft}>
          <Ionicons name="location-outline" size={24} color={theme.colors.text} />
          <Text style={[styles.settingText, { color: theme.colors.text }]}>
            Travel radius: {profile?.radius_km || 15}km
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
      </TouchableOpacity>

      <TouchableOpacity style={styles.settingItem}>
        <View style={styles.settingLeft}>
          <Ionicons name="time-outline" size={24} color={theme.colors.text} />
          <Text style={[styles.settingText, { color: theme.colors.text }]}>
            Availability
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
      </TouchableOpacity>
    </View>
  );

  const renderAccountSection = () => (
    <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
        Account
      </Text>

      <TouchableOpacity style={styles.settingItem}>
        <View style={styles.settingLeft}>
          <Ionicons name="pause-outline" size={24} color={theme.colors.text} />
          <Text style={[styles.settingText, { color: theme.colors.text }]}>
            Pause account
          </Text>
        </View>
        <Switch
          value={profile?.is_paused || false}
          onValueChange={(value) => updateProfile({ is_paused: value })}
          trackColor={{ false: theme.colors.border, true: theme.colors.warning }}
          thumbColor="#FFFFFF"
        />
      </TouchableOpacity>

      <TouchableOpacity style={styles.settingItem}>
        <View style={styles.settingLeft}>
          <Ionicons name="shield-outline" size={24} color={theme.colors.text} />
          <Text style={[styles.settingText, { color: theme.colors.text }]}>
            Safety & Privacy
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
      </TouchableOpacity>

      <TouchableOpacity style={styles.settingItem}>
        <View style={styles.settingLeft}>
          <Ionicons name="help-circle-outline" size={24} color={theme.colors.text} />
          <Text style={[styles.settingText, { color: theme.colors.text }]}>
            Help & Support
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
      </TouchableOpacity>

      <TouchableOpacity style={[styles.settingItem, styles.signOutItem]} onPress={handleSignOut}>
        <View style={styles.settingLeft}>
          <Ionicons name="log-out-outline" size={24} color={theme.colors.error} />
          <Text style={[styles.settingText, { color: theme.colors.error }]}>
            Sign Out
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: theme.colors.text }]}>
            Loading profile...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            👤 Profile
          </Text>
        </View>

        {renderProfileSection()}
        {renderSettingsSection()}
        {renderAccountSection()}
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
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1C1C1E',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  section: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '600',
  },
  avatarOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#7C6CFF',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#0A0B0D',
  },
  profileInfo: {
    alignItems: 'center',
  },
  profileName: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  profileLocation: {
    fontSize: 16,
    marginBottom: 8,
  },
  profileBio: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    fontSize: 16,
    marginLeft: 12,
  },
  signOutItem: {
    borderBottomWidth: 0,
  },
});



