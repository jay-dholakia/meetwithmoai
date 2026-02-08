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
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/mcp-supabase';
import EditProfileScreen from './EditProfileScreen';
import EditQuestionnaireScreen from './EditQuestionnaireScreen';
import BlockedUsersScreen from './BlockedUsersScreen';
import NotificationPreferencesScreen from './NotificationPreferencesScreen';
import MatchStatisticsScreen from './MatchStatisticsScreen';

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
  in_matcha_bowl: boolean | null;
}

interface Preferences {
  user_id: string;
  languages: string[];
  availability_slots: any;
  reminder_opt_in: boolean;
}

export default function ProfileScreen({ navigation }: any) {
  const theme = useTheme();
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

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

        // Read file as blob for React Native
        const response = await fetch(imageUri);
        const blob = await response.blob();

        // Upload new avatar
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, blob, {
            contentType,
            upsert: true,
          });

        if (uploadError) {
          console.error('Error uploading image:', uploadError);
          Alert.alert('Error', 'Failed to upload image. Please try again.');
          return;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);

        // Update profile with new avatar URL
        await updateProfile({ avatar_url: urlData.publicUrl });
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

              const city = address.city && address.region 
                ? `${address.city}, ${address.region}` 
                : address.city || address.region || 'Unknown Location';

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
              'Enter City',
              'Please enter your city:',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Save',
                  onPress: async (city) => {
                    if (city && city.trim()) {
                      await updateProfile({ city: city.trim() });
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
          <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
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
            📍 {profile?.city || 'Set your location'}
          </Text>
          <TouchableOpacity 
            style={styles.editLocationButton}
            onPress={handleEditLocation}
          >
            <Ionicons name="create-outline" size={16} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
        {profile?.bio_text && (
          <Text style={[styles.profileBio, { color: theme.colors.textSecondary }]}>
            {profile.bio_text}
          </Text>
        )}
      </View>

      <View style={styles.editButtonsRow}>
        <TouchableOpacity 
          style={[styles.editButton, { borderColor: theme.colors.border }]}
          onPress={() => navigation.navigate('EditProfile')}
        >
          <Ionicons name="person-outline" size={18} color={theme.colors.primary} />
          <Text style={[styles.editButtonText, { color: theme.colors.primary }]}>
            Edit Profile
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.editButton, { borderColor: theme.colors.border }]}
          onPress={() => navigation.navigate('EditQuestionnaire')}
        >
          <Ionicons name="document-text-outline" size={18} color={theme.colors.primary} />
          <Text style={[styles.editButtonText, { color: theme.colors.primary }]}>
            Edit Questionnaire
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

      <TouchableOpacity style={[styles.settingItem, { borderBottomColor: theme.colors.border }]}>
        <View style={styles.settingLeft}>
          <Ionicons name="people-outline" size={24} color={theme.colors.text} />
          <Text style={[styles.settingText, { color: theme.colors.text }]}>
            Matching enabled
          </Text>
        </View>
        <Switch
          value={profile?.in_matcha_bowl || false}
          onValueChange={(value) => updateProfile({ in_matcha_bowl: value })}
          trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
          thumbColor="#FFFFFF"
        />
      </TouchableOpacity>

      <TouchableOpacity style={[styles.settingItem, { borderBottomColor: theme.colors.border }]}>
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

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top', 'left', 'right']}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: theme.colors.text }]}>
            Loading profile...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

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
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
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
  signOutItem: {
    borderBottomWidth: 0,
  },
});





