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

export default function EditQuestionnaireScreen({ navigation }: any) {
  const theme = useTheme();
  const { user } = useAuth();
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadQuestionnaire();
  }, []);

  const loadQuestionnaire = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('intake_responses_v5')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data?.responses) {
        // Convert responses array to a map for easier editing
        const responsesMap: Record<string, any> = {};
        data.responses.forEach((r: any) => {
          responsesMap[r.question_id] = r.answer;
        });
        setResponses(responsesMap);
      }
    } catch (error) {
      console.error('Error loading questionnaire:', error);
      Alert.alert('Error', 'Failed to load questionnaire');
    } finally {
      setLoading(false);
    }
  };

  const updateResponse = (questionId: string, value: any) => {
    setResponses(prev => ({ ...prev, [questionId]: value }));
  };

  const saveQuestionnaire = async () => {
    try {
      setSaving(true);

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

      // Handle age_range_preference separately - sync to profiles table (not a filtered column in intake_responses_v5)
      let ageRangePreference: number | undefined;
      if (responses['q12_age_range_preference'] !== undefined) {
        const answer = responses['q12_age_range_preference'];
        if (typeof answer === 'number' || typeof answer === 'string') {
          ageRangePreference = typeof answer === 'string' ? parseInt(answer) : answer;
        }
      }

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

      // Sync age_range_preference to profiles table if it was updated
      if (ageRangePreference !== undefined && user?.id) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ age_range_preference: ageRangePreference })
          .eq('id', user.id);
        
        if (profileError) {
          console.error('Error syncing age_range_preference to profiles:', profileError);
          // Don't throw - intake was saved successfully
        } else {
          console.log('Synced age_range_preference to profiles:', ageRangePreference);
        }
      }

      Alert.alert('Success', 'Questionnaire updated successfully', [
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
          {question.options?.map((option: string) => (
            <TouchableOpacity
              key={option}
              style={[
                styles.optionButton,
                {
                  backgroundColor: currentValue === option ? theme.colors.primary : theme.colors.background,
                  borderColor: theme.colors.border,
                }
              ]}
              onPress={() => updateResponse(question.id, option)}
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
    }

    if (question.type === 'multi_select') {
      const selectedValues = Array.isArray(currentValue) ? currentValue : [];
      
      return (
        <View key={question.id} style={[styles.questionContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Text style={[styles.questionText, { color: theme.colors.text }]}>
            {index + 1}. {question.text}
          </Text>
          {question.options?.map((option: string) => {
            const isSelected = selectedValues.includes(option);
            return (
              <TouchableOpacity
                key={option}
                style={[
                  styles.optionButton,
                  {
                    backgroundColor: isSelected ? theme.colors.primary : theme.colors.background,
                    borderColor: theme.colors.border,
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
                  styles.optionText,
                  { color: isSelected ? '#FFFFFF' : theme.colors.text }
                ]}>
                  {option}
                </Text>
                {isSelected && (
                  <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            );
          })}
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
          Edit Questionnaire
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {intakeQuestions.map((question, index) => renderQuestion(question, index))}
        
        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: theme.colors.primary }]}
          onPress={saveQuestionnaire}
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
  questionContainer: {
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  questionText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
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
