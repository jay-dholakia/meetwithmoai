import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/mcp-supabase';

const genderOptions = ['Male', 'Female', 'Non-binary', 'Prefer not to say'];
const pronounOptions = ['He/Him', 'She/Her', 'They/Them', 'Other', 'Prefer not to say'];
const relationshipStatusOptions = ['Single', 'In a relationship', 'Married', 'Divorced', 'Widowed', 'Prefer not to say'];
const hasKidsOptions = ['Yes', 'No', 'Prefer not to say'];

export default function EditProfileScreen({ navigation }: any) {
  const theme = useTheme();
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    age: '',
    gender: '',
    pronouns: '',
    relationship_status: '',
    has_kids: '',
    bio_text: '',
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (error) throw error;

      setProfile(data);
      setFormData({
        age: data.age?.toString() || '',
        gender: data.gender || '',
        pronouns: data.pronouns || '',
        relationship_status: data.relationship_status || '',
        has_kids: data.has_kids || '',
        bio_text: data.bio_text || '',
      });
    } catch (error) {
      console.error('Error loading profile:', error);
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const saveProfile = async () => {
    try {
      setSaving(true);

      const updates: any = {};
      if (formData.age) {
        const ageNum = parseInt(formData.age);
        if (isNaN(ageNum) || ageNum < 13 || ageNum > 120) {
          Alert.alert('Error', 'Please enter a valid age');
          return;
        }
        updates.age = ageNum;
      }
      if (formData.gender) updates.gender = formData.gender;
      if (formData.pronouns) updates.pronouns = formData.pronouns;
      if (formData.relationship_status) updates.relationship_status = formData.relationship_status;
      if (formData.has_kids) updates.has_kids = formData.has_kids;
      if (formData.bio_text !== undefined) updates.bio_text = formData.bio_text;

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user?.id);

      if (error) throw error;

      Alert.alert('Success', 'Profile updated successfully', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const renderSelectField = (
    label: string,
    field: string,
    options: string[],
    currentValue: string
  ) => (
    <View style={[styles.fieldContainer, { backgroundColor: theme.colors.surface }]}>
      <Text style={[styles.label, { color: theme.colors.text }]}>{label}</Text>
      {options.map((option) => (
        <TouchableOpacity
          key={option}
          style={[
            styles.optionButton,
            {
              backgroundColor: currentValue === option ? theme.colors.primary : theme.colors.background,
              borderColor: theme.colors.border,
            }
          ]}
          onPress={() => updateField(field, option)}
        >
          <Text style={[
            styles.optionText,
            { color: currentValue === option ? '#FFFFFF' : theme.colors.text }
          ]}>
            {option}
          </Text>
          {currentValue === option && (
            <Ionicons name="checkmark" size={20} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      ))}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top', 'left', 'right']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.text }]}>
            Loading profile...
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
          Edit Profile
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={[styles.fieldContainer, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.label, { color: theme.colors.text }]}>Age</Text>
          <TextInput
            style={[styles.textInput, {
              backgroundColor: theme.colors.background,
              borderColor: theme.colors.border,
              color: theme.colors.text,
            }]}
            value={formData.age}
            onChangeText={(text) => updateField('age', text)}
            keyboardType="numeric"
            placeholder="Enter your age"
            placeholderTextColor={theme.colors.textSecondary}
          />
        </View>

        {renderSelectField('Gender', 'gender', genderOptions, formData.gender)}
        {renderSelectField('Pronouns', 'pronouns', pronounOptions, formData.pronouns)}
        {renderSelectField('Relationship Status', 'relationship_status', relationshipStatusOptions, formData.relationship_status)}
        {renderSelectField('Has Kids', 'has_kids', hasKidsOptions, formData.has_kids)}

        <View style={[styles.fieldContainer, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.label, { color: theme.colors.text }]}>Bio</Text>
          <TextInput
            style={[styles.textArea, {
              backgroundColor: theme.colors.background,
              borderColor: theme.colors.border,
              color: theme.colors.text,
            }]}
            value={formData.bio_text}
            onChangeText={(text) => updateField('bio_text', text)}
            multiline
            numberOfLines={6}
            placeholder="Tell us about yourself..."
            placeholderTextColor={theme.colors.textSecondary}
          />
        </View>

        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: theme.colors.primary }]}
          onPress={saveProfile}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>Save Changes</Text>
          )}
        </TouchableOpacity>
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
  fieldContainer: {
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  optionText: {
    fontSize: 16,
    flex: 1,
  },
  saveButton: {
    marginHorizontal: 16,
    marginVertical: 24,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
