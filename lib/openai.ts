import OpenAI from 'openai';

// Initialize OpenAI client
// The API key should be stored in environment variables for security
const openai = new OpenAI({
  apiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
  dangerouslyAllowBrowser: true, // Only for client-side usage in React Native
});

export default openai;

// Helper function to check if OpenAI is configured
export const isOpenAIConfigured = (): boolean => {
  return !!(process.env.EXPO_PUBLIC_OPENAI_API_KEY || process.env.OPENAI_API_KEY);
};

// Helper function to get API key status (for debugging, don't expose the actual key)
export const getOpenAIStatus = (): { configured: boolean; keyLength: number } => {
  const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
  return {
    configured: !!apiKey,
    keyLength: apiKey ? apiKey.length : 0,
  };
};

// Common OpenAI functions for your meeting app
export const openAIService = {
  // Generate meeting summaries
  async generateMeetingSummary(meetingContent: string): Promise<string> {
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant that creates concise meeting summaries. Focus on key points, action items, and decisions made."
          },
          {
            role: "user",
            content: `Please create a summary of this meeting: ${meetingContent}`
          }
        ],
        max_tokens: 500,
        temperature: 0.7,
      });

      return completion.choices[0]?.message?.content || "Unable to generate summary";
    } catch (error) {
      console.error('Error generating meeting summary:', error);
      throw new Error('Failed to generate meeting summary');
    }
  },

  // Generate meeting titles
  async generateMeetingTitle(description: string): Promise<string> {
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant that creates concise, professional meeting titles based on descriptions."
          },
          {
            role: "user",
            content: `Create a short, professional title for this meeting: ${description}`
          }
        ],
        max_tokens: 50,
        temperature: 0.5,
      });

      return completion.choices[0]?.message?.content || "Untitled Meeting";
    } catch (error) {
      console.error('Error generating meeting title:', error);
      throw new Error('Failed to generate meeting title');
    }
  },

  // Generate meeting suggestions
  async generateMeetingSuggestions(context: string): Promise<string[]> {
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant that suggests relevant meeting topics and agenda items. Return suggestions as a simple list."
          },
          {
            role: "user",
            content: `Based on this context, suggest 3-5 relevant meeting topics: ${context}`
          }
        ],
        max_tokens: 300,
        temperature: 0.7,
      });

      const content = completion.choices[0]?.message?.content || "";
      // Parse the response into an array of suggestions
      return content.split('\n').filter(line => line.trim().length > 0);
    } catch (error) {
      console.error('Error generating meeting suggestions:', error);
      throw new Error('Failed to generate meeting suggestions');
    }
  },

  // Generate meeting insights
  async generateMeetingInsights(meetingData: {
    title: string;
    description: string;
    participants: string[];
    duration: number;
  }): Promise<string> {
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant that provides insights and recommendations for meeting optimization."
          },
          {
            role: "user",
            content: `Analyze this meeting and provide insights for improvement:
              Title: ${meetingData.title}
              Description: ${meetingData.description}
              Participants: ${meetingData.participants.join(', ')}
              Duration: ${meetingData.duration} minutes`
          }
        ],
        max_tokens: 400,
        temperature: 0.6,
      });

      return completion.choices[0]?.message?.content || "Unable to generate insights";
    } catch (error) {
      console.error('Error generating meeting insights:', error);
      throw new Error('Failed to generate meeting insights');
    }
  },

  // Generate meeting reminders
  async generateMeetingReminder(meetingInfo: {
    title: string;
    time: string;
    participants: string[];
  }): Promise<string> {
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant that creates friendly, professional meeting reminders."
          },
          {
            role: "user",
            content: `Create a friendly reminder for this meeting:
              Title: ${meetingInfo.title}
              Time: ${meetingInfo.time}
              Participants: ${meetingInfo.participants.join(', ')}`
          }
        ],
        max_tokens: 200,
        temperature: 0.7,
      });

      return completion.choices[0]?.message?.content || "Meeting reminder";
    } catch (error) {
      console.error('Error generating meeting reminder:', error);
      throw new Error('Failed to generate meeting reminder');
    }
  },

  // Generate chat responses for Moai AI
  async generateChatResponse(userMessage: string): Promise<string> {
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `You are Moai, a friendly AI assistant for a friend-matching app. Your role is to:

1. Help users with onboarding and intake questions
2. Provide support and guidance about making friends
3. Be warm, supportive, and platonic in tone
4. Keep responses concise and helpful
5. Focus on friendship and community building
6. Always maintain a safe, consent-driven approach

You should be encouraging but not pushy, and always respect boundaries.`
          },
          {
            role: "user",
            content: userMessage
          }
        ],
        max_tokens: 300,
        temperature: 0.7,
      });

      return completion.choices[0]?.message?.content || "I'm here to help! What would you like to know about making new friends?";
    } catch (error) {
      console.error('Error generating chat response:', error);
      throw new Error('Failed to generate chat response');
    }
  }
};
