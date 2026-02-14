import React, { useState, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Image,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import * as FileSystem from 'expo-file-system';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/mcp-supabase';
import { getNextBatchWeekMonday } from '../lib/weeklyMatchOptIn';
import EditQuestionnaireScreen from './EditQuestionnaireScreen';
import BlockedUsersScreen from './BlockedUsersScreen';
import NotificationPreferencesScreen from './NotificationPreferencesScreen';
import MatchStatisticsScreen from './MatchStatisticsScreen';
import WeeklyMatchOptInCard from '../components/WeeklyMatchOptInCard';

interface Profile {
  id: string;
  first_name: string;
  city: string | null;
  lat: number | null;
  lng: number | null;
  radius_km: number | null;
  avatar_url?: string | null;
  bio_text?: string | null;
  is_active: boolean | null;
  is_paused: boolean | null;
  in_match_bowl: boolean | null;
}


export default function ProfileScreen({ navigation }: any) {
  const theme = useTheme();
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [optedInForNextWeek, setOptedInForNextWeek] = useState<boolean | null>(null);
  const [optInLoading, setOptInLoading] = useState(false);

  // Format location to ensure state abbreviation is included
  const formatLocation = (city: string | null): string => {
    if (!city) return 'Set your location';
    // If city already contains a comma, assume it's already formatted (e.g., "San Francisco, CA")
    if (city.includes(',')) {
      return city;
    }
    // If no comma, return as-is (manual entries might not have state)
    // The location service should already include state when using "Use My Location"
    return city;
  };

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  // Reload profile when screen comes into focus (e.g., after editing)
  useFocusEffect(
    React.useCallback(() => {
      if (user) {
        loadProfile();
      }
    }, [user])
  );

  const loadProfile = async () => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();
      if (profileError) throw profileError;
      setProfile(profileData);

      if (user?.id) {
        const batchWeek = getNextBatchWeekMonday();
        const { data: optInData } = await supabase
          .from('weekly_match_opt_ins')
          .select('user_id')
          .eq('user_id', user.id)
          .eq('batch_week', batchWeek)
          .maybeSingle();
        setOptedInForNextWeek(!!optInData);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      Alert.alert('Error', 'Failed to load profile');
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

  const setWeeklyOptIn = async (value: boolean) => {
    if (!user?.id) return;
    setOptInLoading(true);
    const batchWeek = getNextBatchWeekMonday();
    try {
      if (value) {
        const { error: optInError } = await supabase
          .from('weekly_match_opt_ins')
          .upsert(
            { user_id: user.id, batch_week: batchWeek, opted_in_at: new Date().toISOString() },
            { onConflict: 'user_id,batch_week' }
          );
        if (optInError) throw optInError;
        await supabase.from('profiles').update({ in_match_bowl: true }).eq('id', user.id);
        setProfile(prev => prev ? { ...prev, in_match_bowl: true } : null);
        setOptedInForNextWeek(true);
      } else {
        const { error: optInError } = await supabase
          .from('weekly_match_opt_ins')
          .delete()
          .eq('user_id', user.id)
          .eq('batch_week', batchWeek);
        if (optInError) throw optInError;
        await supabase.from('profiles').update({ in_match_bowl: false }).eq('id', user.id);
        setProfile(prev => prev ? { ...prev, in_match_bowl: false } : null);
        setOptedInForNextWeek(false);
      }
    } catch (e) {
      console.error('Error updating weekly opt-in:', e);
      Alert.alert('Error', 'Could not update opt-in. Try again.');
    } finally {
      setOptInLoading(false);
    }
  };


  const pickImage = async () => {
    try {
      setUploadingAvatar(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images' as any,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0] && user) {
        const imageUri = result.assets[0].uri;
        
        // Get file extension
        const fileExt = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
        const filePath = `${user.id}/avatar.${fileExt}`;
        const contentType = `image/${fileExt === 'png' ? 'png' : fileExt === 'webp' ? 'webp' : 'jpeg'}`;

        // Delete old avatar if it exists
        const { data: oldFiles } = await supabase.storage
          .from('avatars')
          .list(user.id);
        
        if (oldFiles && oldFiles.length > 0) {
          const oldFileNames = oldFiles.map(f => `${user.id}/${f.name}`);
          await supabase.storage
            .from('avatars')
            .remove(oldFileNames);
        }

        // Use FormData for React Native file upload (React Native compatible)
        const formData = new FormData();
        formData.append('file', {
          uri: imageUri,
          type: contentType,
          name: `avatar.${fileExt}`,
        } as any);

        // Get session for authentication
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          Alert.alert('Error', 'You must be logged in to upload images');
          return;
        }

        // Upload using Supabase storage API with FormData
        // Note: React Native FormData requires special handling
        const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://hgllvhohhyamsbljekrd.supabase.co';
        const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
        const uploadUrl = `${supabaseUrl}/storage/v1/object/avatars/${filePath}`;
        
        const uploadResponse = await fetch(uploadUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': supabaseAnonKey,
            'x-upsert': 'true',
          },
          body: formData,
        });

        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text();
          console.error('Upload error:', errorText);
          Alert.alert('Error', 'Failed to upload image. Please try again.');
          return;
        }

        const uploadData = await uploadResponse.json();

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);

        // Update profile with new avatar URL
        await updateProfile({ avatar_url: urlData.publicUrl });
        
        // Reload profile to ensure state is updated
        await loadProfile();
        
        Alert.alert('Success', 'Profile picture updated!');
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    } finally {
      setUploadingAvatar(false);
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

  const handleEditLocation = async () => {
    Alert.alert(
      'Update Location',
      'How would you like to set your location?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Use My Location',
          onPress: async () => {
            try {
              const { status } = await Location.requestForegroundPermissionsAsync();
              if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Location access was denied. Please enter your city manually.');
                return;
              }

              const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
              });

              const [address] = await Location.reverseGeocodeAsync({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
              });

              // Format as "City, State" - always include state abbreviation if available
              let city = address.city || '';
              if (address.region) {
                // address.region is typically the state abbreviation (e.g., "CA")
                city = city ? `${city}, ${address.region}` : address.region;
              }
              if (!city) {
                city = address.subregion || address.country || 'Unknown Location';
              }

              await updateProfile({
                city,
                lat: location.coords.latitude,
                lng: location.coords.longitude,
              });
            } catch (error) {
              console.error('Error getting location:', error);
              Alert.alert('Error', 'Failed to get your location');
            }
          },
        },
        {
          text: 'Enter Manually',
          onPress: () => {
            Alert.prompt(
              'Enter Location',
              'Please enter your city and state (e.g., "San Francisco, CA"):',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Save',
                  onPress: async (location) => {
                    if (location && location.trim()) {
                      await updateProfile({ city: location.trim() });
                    }
                  },
                },
              ],
              'plain-text',
              profile?.city || ''
            );
          },
        },
      ]
    );
  };

  const renderProfileSection = () => (
    <View style={[styles.section, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
        Profile
      </Text>
      
      <View style={styles.avatarSection}>
        <TouchableOpacity 
          style={styles.avatarContainer}
          onPress={pickImage}
          disabled={uploadingAvatar}
        >
        {profile?.avatar_url ? (
          <Image 
            source={{ uri: profile.avatar_url + (profile.avatar_url.includes('?') ? '&' : '?') + 't=' + Date.now() }} 
            style={styles.avatar}
            onError={(e) => {
              console.error('Error loading avatar image:', e.nativeEvent.error);
              console.error('Avatar URL:', profile.avatar_url);
            }}
          />
        ) : (
          <View style={[styles.avatarPlaceholder, { backgroundColor: theme.colors.primary }]}>
            <Text style={styles.avatarText}>{profile?.first_name?.charAt(0).toUpperCase() || '?'}</Text>
          </View>
        )}
          <View style={[styles.avatarOverlay, { backgroundColor: theme.colors.primary, borderColor: theme.colors.background }]}>
            {uploadingAvatar ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="camera" size={18} color="#FFFFFF" />
            )}
        </View>
      </TouchableOpacity>
      </View>

      <View style={styles.profileInfo}>
        <Text style={[styles.profileName, { color: theme.colors.text }]}>
          {profile?.first_name || 'Set your name'}
        </Text>
        <View style={styles.locationRow}>
        <Text style={[styles.profileLocation, { color: theme.colors.textSecondary }]}>
            📍 {profile?.city ? formatLocation(profile.city) : 'Set your location'}
        </Text>
          <TouchableOpacity 
            style={styles.editLocationButton}
            onPress={handleEditLocation}
          >
            <Ionicons name="create-outline" size={16} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.editButtonsRow}>
        <TouchableOpacity 
          style={[styles.editButton, { borderColor: theme.colors.border }]}
          onPress={() => navigation.navigate('EditQuestionnaire')}
        >
          <Ionicons name="person-outline" size={18} color={theme.colors.primary} />
          <Text style={[styles.editButtonText, { color: theme.colors.primary }]}>
            Edit Profile + Intro Preferences
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );


  const renderAccountSection = () => (
    <View style={[styles.section, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
        Account
      </Text>

      <View style={styles.weeklyOptInWrapper}>
        <WeeklyMatchOptInCard
          optedIn={optedInForNextWeek}
          loading={optInLoading}
          onToggle={setWeeklyOptIn}
        />
      </View>

      <TouchableOpacity style={[styles.settingItem, { borderBottomColor: theme.colors.border }]}>
        <View style={[styles.settingLeft, { flexShrink: 1, minWidth: 0 }]}>
          <Ionicons name="pause-outline" size={24} color={theme.colors.text} />
          <View style={{ marginLeft: 12, flex: 1, minWidth: 0 }}>
            <Text style={[styles.settingText, { color: theme.colors.text, marginLeft: 0 }]}>
              Pause account
            </Text>
            <Text style={[styles.settingSubtext, { color: theme.colors.textSecondary, marginLeft: 0 }]}>
              No opt-in reminders; you're opted out until you unpause.
            </Text>
          </View>
        </View>
        <View style={{ flexShrink: 0 }}>
          <Switch
          value={profile?.is_paused || false}
          onValueChange={async (value) => {
            await updateProfile({ is_paused: value });
            if (value) {
              await setWeeklyOptIn(false);
            }
          }}
          trackColor={{ false: theme.colors.border, true: theme.colors.warning }}
          thumbColor="#FFFFFF"
        />
        </View>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.settingItem, { borderBottomColor: theme.colors.border }]}
        onPress={() => navigation.navigate('SafetyPrivacy')}
      >
        <View style={styles.settingLeft}>
          <Ionicons name="shield-outline" size={24} color={theme.colors.text} />
          <Text style={[styles.settingText, { color: theme.colors.text }]}>
            Safety & Privacy
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.settingItem, { borderBottomColor: theme.colors.border }]}
        onPress={() => navigation.navigate('HelpSupport')}
      >
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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top', 'left', 'right']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            Profile
          </Text>
        </View>

        {renderProfileSection()}
        {renderAccountSection()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    fontStyle: 'italic',
    fontFamily: 'PlayfairDisplay-Italic',
  },
  section: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  weeklyOptInWrapper: {
    marginBottom: 12,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarContainer: {
    width: 80,
    height: 80,
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
    top: -4,
    right: -4,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  profileInfo: {
    alignItems: 'center',
  },
  profileName: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  profileLocation: {
    fontSize: 16,
    marginRight: 8,
  },
  editLocationButton: {
    padding: 4,
  },
  profileBio: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  editButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
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
  settingSubtext: {
    fontSize: 12,
    marginLeft: 12,
    marginTop: 2,
  },
  signOutItem: {
    borderBottomWidth: 0,
  },
});





