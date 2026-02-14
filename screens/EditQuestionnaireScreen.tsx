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
import { intakeQuestions, questionToColumnMap } from '../data/AIAgentScreen';
import { openAIService } from '../lib/openai';

const pronounOptions = ['He/Him', 'She/Her', 'They/Them', 'Other', 'Prefer not to say'];
const relationshipStatusOptions = ['Single', 'In a relationship', 'Married', 'Divorced', 'Widowed', 'Prefer not to say'];

export default function EditQuestionnaireScreen({ navigation }: any) {
  const theme = useTheme();
  const { user } = useAuth();
  const [profile, setProfile] = useState<{ pronouns: string; relationship_status: string }>({ pronouns: '', relationship_status: '' });
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [profileRes, intakeRes] = await Promise.all([
        supabase.from('profiles').select('pronouns, relationship_status').eq('id', user?.id).single(),
        supabase.from('intake_responses_v5').select('*').eq('user_id', user?.id).single(),
      ]);

      if (profileRes.data) {
        setProfile({
          pronouns: profileRes.data.pronouns || '',
          relationship_status: profileRes.data.relationship_status || '',
        });
      }
      if (intakeRes.error && intakeRes.error.code !== 'PGRST116') throw intakeRes.error;
      if (intakeRes.data?.responses) {
        const responsesMap: Record<string, any> = {};
        intakeRes.data.responses.forEach((r: any) => {
          responsesMap[r.question_id] = r.answer;
        });
        setResponses(responsesMap);
      }
    } catch (error) {
      console.error('Error loading:', error);
      Alert.alert('Error', 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  const updateResponse = (questionId: string, value: any) => {
    setResponses(prev => ({ ...prev, [questionId]: value }));
  };

  const saveAll = async () => {
    try {
      setSaving(true);

      // Update profile (pronouns, relationship_status)
      await supabase
        .from('profiles')
        .update({
          pronouns: profile.pronouns || null,
          relationship_status: profile.relationship_status || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user?.id);

      // Get current intake data
      const { data: existingIntake } = await supabase
        .from('intake_responses_v5')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      // Build responses array
      const updatedResponses = intakeQuestions.map(question => {
        const existingResponse = existingIntake?.responses?.find(
          (r: any) => r.question_id === question.id
        );
        
        return {
          question_id: question.id,
          question_text: question.text,
          answer: responses[question.id] || existingResponse?.answer || '',
          type: question.type === 'open_ended' ? 'open_ended' : 'structured',
          answered_at: responses[question.id] ? new Date().toISOString() : existingResponse?.answered_at || new Date().toISOString(),
        };
      });

      // Build update object
      const intakeToUpdate: any = {
        user_id: user?.id,
        responses: updatedResponses,
        updated_at: new Date().toISOString(),
      };

      // Extract and update filtered columns
      Object.entries(questionToColumnMap).forEach(([questionId, columnName]) => {
        const answer = responses[questionId];
        if (answer !== undefined) {
          if (columnName === 'availability_times' && Array.isArray(answer)) {
            intakeToUpdate[columnName] = answer;
          } else if (typeof answer === 'string') {
            intakeToUpdate[columnName] = answer;
          }
        }
      });

      // Age range lives in intake only (no longer synced to profile)

      // Regenerate embedding if open-ended responses changed
      const openEndedText = updatedResponses
        .filter(r => r.type === 'open_ended')
        .map(r => `${r.question_text}: ${r.answer}`)
        .join('\n\n');

      try {
        const embedding = await openAIService.generateEmbedding(openEndedText);
        intakeToUpdate.embed_vector = `[${embedding.join(',')}]`;
      } catch (embedError) {
        console.error('Error generating embedding:', embedError);
        // Continue without embedding update
      }

      // Preserve existing fields
      if (existingIntake) {
        if (!intakeToUpdate.embed_vector && existingIntake.embed_vector) {
          intakeToUpdate.embed_vector = existingIntake.embed_vector;
        }
        if (!intakeToUpdate.completed_at && existingIntake.completed_at) {
          intakeToUpdate.completed_at = existingIntake.completed_at;
        }
      } else {
        intakeToUpdate.completed_at = new Date().toISOString();
      }

      // Save to database
      const { error: saveError } = await supabase
        .from('intake_responses_v5')
        .upsert(intakeToUpdate);

      if (saveError) throw saveError;

      Alert.alert('Success', 'Profile and questionnaire updated', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error('Error saving questionnaire:', error);
      Alert.alert('Error', 'Failed to save questionnaire');
    } finally {
      setSaving(false);
    }
  };

  const renderQuestion = (question: any, index: number) => {
    const currentValue = responses[question.id] || '';

    if (question.type === 'open_ended') {
      return (
        <View key={question.id} style={[styles.questionContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Text style={[styles.questionText, { color: theme.colors.text }]}>
            {index + 1}. {question.text}
          </Text>
          <TextInput
            style={[styles.textInput, { 
              backgroundColor: theme.colors.background,
              borderColor: theme.colors.border,
              color: theme.colors.text 
            }]}
            value={typeof currentValue === 'string' ? currentValue : ''}
            onChangeText={(text) => updateResponse(question.id, text)}
            multiline
            numberOfLines={4}
            placeholder="Your answer..."
            placeholderTextColor={theme.colors.textSecondary}
          />
        </View>
      );
    }

    if (question.type === 'single_select') {
      return (
        <View key={question.id} style={[styles.questionContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Text style={[styles.questionText, { color: theme.colors.text }]}>
            {index + 1}. {question.text}
          </Text>
          <View style={styles.optionsWrap}>
            {question.options?.map((option: string) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.optionChip,
                  {
                    backgroundColor: currentValue === option ? theme.colors.primary : theme.colors.background,
                    borderColor: currentValue === option ? theme.colors.primary : theme.colors.border,
                  }
                ]}
                onPress={() => updateResponse(question.id, option)}
              >
                <Text style={[
                  styles.optionChipText,
                  { color: currentValue === option ? '#FFFFFF' : theme.colors.text }
                ]}>
                  {option}
                </Text>
                {currentValue === option && (
                  <Ionicons name="checkmark" size={16} color="#FFFFFF" style={styles.chipCheck} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      );
    }

    if (question.type === 'multi_select') {
      const selectedValues = Array.isArray(currentValue) ? currentValue : [];
      
      return (
        <View key={question.id} style={[styles.questionContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Text style={[styles.questionText, { color: theme.colors.text }]}>
            {index + 1}. {question.text}
          </Text>
          <View style={styles.optionsWrap}>
            {question.options?.map((option: string) => {
              const isSelected = selectedValues.includes(option);
              return (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.optionChip,
                    {
                      backgroundColor: isSelected ? theme.colors.primary : theme.colors.background,
                      borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                    }
                  ]}
                  onPress={() => {
                    const newValues = isSelected
                      ? selectedValues.filter(v => v !== option)
                      : [...selectedValues, option];
                    updateResponse(question.id, newValues);
                  }}
                >
                  <Text style={[
                    styles.optionChipText,
                    { color: isSelected ? '#FFFFFF' : theme.colors.text }
                  ]}>
                    {option}
                  </Text>
                  {isSelected && (
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" style={styles.chipCheck} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      );
    }

    return null;
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top', 'left', 'right']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.text }]}>
            Loading questionnaire...
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
          Edit Profile + Intro Preferences
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Profile section */}
        <View style={[styles.sectionHeader, { borderBottomColor: theme.colors.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Profile</Text>
        </View>
        <View style={[styles.questionContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Text style={[styles.questionText, { color: theme.colors.text }]}>Pronouns</Text>
          <View style={styles.optionsWrap}>
            {pronounOptions.map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.optionChip,
                  {
                    backgroundColor: profile.pronouns === option ? theme.colors.primary : theme.colors.background,
                    borderColor: profile.pronouns === option ? theme.colors.primary : theme.colors.border,
                  }
                ]}
                onPress={() => setProfile((p) => ({ ...p, pronouns: option }))}
              >
                <Text style={[styles.optionChipText, { color: profile.pronouns === option ? '#FFFFFF' : theme.colors.text }]}>
                  {option}
                </Text>
                {profile.pronouns === option && (
                  <Ionicons name="checkmark" size={16} color="#FFFFFF" style={styles.chipCheck} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <View style={[styles.questionContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Text style={[styles.questionText, { color: theme.colors.text }]}>Relationship status</Text>
          <View style={styles.optionsWrap}>
            {relationshipStatusOptions.map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.optionChip,
                  {
                    backgroundColor: profile.relationship_status === option ? theme.colors.primary : theme.colors.background,
                    borderColor: profile.relationship_status === option ? theme.colors.primary : theme.colors.border,
                  }
                ]}
                onPress={() => setProfile((p) => ({ ...p, relationship_status: option }))}
              >
                <Text style={[styles.optionChipText, { color: profile.relationship_status === option ? '#FFFFFF' : theme.colors.text }]}>
                  {option}
                </Text>
                {profile.relationship_status === option && (
                  <Ionicons name="checkmark" size={16} color="#FFFFFF" style={styles.chipCheck} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={[styles.sectionHeader, { borderBottomColor: theme.colors.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Questionnaire</Text>
        </View>
        {intakeQuestions.map((question, index) => renderQuestion(question, index))}
        
        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: theme.colors.primary }]}
          onPress={saveAll}
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
  sectionHeader: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  questionContainer: {
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  questionText: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 10,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: 15,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  optionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  optionChipText: {
    fontSize: 14,
  },
  chipCheck: {
    marginLeft: 4,
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
