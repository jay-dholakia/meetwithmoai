import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { openAIService, isOpenAIConfigured, getOpenAIStatus } from '../lib/openai';

interface AIAssistantProps {
  onMeetingTitleGenerated?: (title: string) => void;
  onMeetingSummaryGenerated?: (summary: string) => void;
  onSuggestionsGenerated?: (suggestions: string[]) => void;
}

export default function AIAssistant({ 
  onMeetingTitleGenerated, 
  onMeetingSummaryGenerated, 
  onSuggestionsGenerated 
}: AIAssistantProps) {
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [activeFeature, setActiveFeature] = useState<string>('');

  // Check if OpenAI is configured
  const openAIStatus = getOpenAIStatus();

  const handleAIAction = async (action: string) => {
    if (!isOpenAIConfigured()) {
      Alert.alert(
        'OpenAI Not Configured',
        'Please add your OpenAI API key to the environment variables. See env.example for instructions.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (!input.trim()) {
      Alert.alert('Input Required', 'Please enter some text to process.');
      return;
    }

    setLoading(true);
    setActiveFeature(action);

    try {
      let result: string | string[] = '';

      switch (action) {
        case 'title':
          result = await openAIService.generateMeetingTitle(input);
          if (onMeetingTitleGenerated) {
            onMeetingTitleGenerated(result);
          }
          break;

        case 'summary':
          result = await openAIService.generateMeetingSummary(input);
          if (onMeetingSummaryGenerated) {
            onMeetingSummaryGenerated(result);
          }
          break;

        case 'suggestions':
          result = await openAIService.generateMeetingSuggestions(input);
          if (onSuggestionsGenerated) {
            onSuggestionsGenerated(result);
          }
          break;

        case 'insights':
          result = await openAIService.generateMeetingInsights({
            title: 'Sample Meeting',
            description: input,
            participants: ['User 1', 'User 2'],
            duration: 30,
          });
          break;

        case 'reminder':
          result = await openAIService.generateMeetingReminder({
            title: 'Sample Meeting',
            time: '2:00 PM',
            participants: ['User 1', 'User 2'],
          });
          break;

        default:
          throw new Error('Unknown action');
      }

      setOutput(Array.isArray(result) ? result.join('\n') : result);
    } catch (error) {
      console.error('AI Action Error:', error);
      Alert.alert(
        'AI Service Error',
        'There was an error processing your request. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
      setActiveFeature('');
    }
  };

  const features = [
    {
      id: 'title',
      title: 'Generate Meeting Title',
      description: 'Create a professional title for your meeting',
      icon: '📝',
    },
    {
      id: 'summary',
      title: 'Generate Meeting Summary',
      description: 'Summarize meeting content and key points',
      icon: '📋',
    },
    {
      id: 'suggestions',
      title: 'Generate Meeting Suggestions',
      description: 'Get topic suggestions for your meeting',
      icon: '💡',
    },
    {
      id: 'insights',
      title: 'Generate Meeting Insights',
      description: 'Get insights and improvement recommendations',
      icon: '🔍',
    },
    {
      id: 'reminder',
      title: 'Generate Meeting Reminder',
      description: 'Create friendly meeting reminders',
      icon: '⏰',
    },
  ];

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>🤖 AI Assistant</Text>

      {/* OpenAI Status */}
      <View style={styles.statusContainer}>
        <Text style={styles.statusTitle}>OpenAI Status:</Text>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Configured:</Text>
          <Text style={[
            styles.statusValue, 
            { color: openAIStatus.configured ? '#4CAF50' : '#F44336' }
          ]}>
            {openAIStatus.configured ? '✅ Yes' : '❌ No'}
          </Text>
        </View>
        {openAIStatus.configured && (
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>API Key:</Text>
            <Text style={styles.statusValue}>
              {'•'.repeat(Math.min(openAIStatus.keyLength, 10))}
            </Text>
          </View>
        )}
      </View>

      {!openAIStatus.configured && (
        <View style={styles.warningContainer}>
          <Text style={styles.warningTitle}>⚠️ OpenAI Not Configured</Text>
          <Text style={styles.warningText}>
            To use AI features, please add your OpenAI API key to the environment variables.
          </Text>
          <Text style={styles.warningText}>
            See env.example for instructions.
          </Text>
        </View>
      )}

      {/* Input Section */}
      <View style={styles.inputContainer}>
        <Text style={styles.sectionTitle}>Input</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Enter meeting description, content, or context..."
          value={input}
          onChangeText={setInput}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>

      {/* AI Features */}
      <View style={styles.featuresContainer}>
        <Text style={styles.sectionTitle}>AI Features</Text>
        {features.map((feature) => (
          <TouchableOpacity
            key={feature.id}
            style={[
              styles.featureButton,
              loading && activeFeature === feature.id && styles.featureButtonLoading
            ]}
            onPress={() => handleAIAction(feature.id)}
            disabled={loading || !openAIStatus.configured}
          >
            <Text style={styles.featureIcon}>{feature.icon}</Text>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>{feature.title}</Text>
              <Text style={styles.featureDescription}>{feature.description}</Text>
            </View>
            {loading && activeFeature === feature.id && (
              <ActivityIndicator size="small" color="#007AFF" />
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Output Section */}
      {output && (
        <View style={styles.outputContainer}>
          <Text style={styles.sectionTitle}>AI Output</Text>
          <View style={styles.outputBox}>
            <Text style={styles.outputText}>{output}</Text>
          </View>
          <TouchableOpacity
            style={styles.copyButton}
            onPress={() => {
              // In a real app, you'd copy to clipboard
              Alert.alert('Copied!', 'Output copied to clipboard');
            }}
          >
            <Text style={styles.copyButtonText}>Copy to Clipboard</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Loading Overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>AI is thinking...</Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  statusContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  statusLabel: {
    fontSize: 14,
    color: '#666',
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  warningContainer: {
    backgroundColor: '#FFF3CD',
    borderColor: '#FFEAA7',
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 8,
  },
  warningText: {
    fontSize: 14,
    color: '#856404',
    marginBottom: 4,
  },
  inputContainer: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  textInput: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    minHeight: 100,
  },
  featuresContainer: {
    marginBottom: 16,
  },
  featureButton: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  featureButtonLoading: {
    opacity: 0.7,
  },
  featureIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: '#666',
  },
  outputContainer: {
    marginBottom: 16,
  },
  outputBox: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  outputText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  copyButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  copyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingBox: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#333',
  },
});





