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

  // Generate chat responses for Cora AI
  async generateChatResponse(
    userMessage: string, 
    context?: {
      activeMatches?: Array<{ 
        name: string; 
        age?: number; 
        sharedInterests?: string[]; 
        conversationHooks?: string[];
        matchScore?: string;
        matchReasons?: any;
      }>;
      activeConversations?: Array<{ name: string; age?: number; city?: string }>;
      passedMatches?: Array<{ 
        name: string; 
        reason?: string; 
        matchReasons?: any; 
        matchScore?: string;
      }>;
      optedInMatches?: Array<{ 
        name: string; 
        status: string; 
        matchReasons?: any;
      }>;
    }
  ): Promise<string> {
    try {
      let contextText = '';
      
      if (context) {
        const contextParts: string[] = [];
        
        if (context.activeMatches && context.activeMatches.length > 0) {
          contextParts.push(`Active Match Suggestions (${context.activeMatches.length}):\n${context.activeMatches.map((m: any) => {
            let matchInfo = `- ${m.name}${m.age ? ` (${m.age})` : ''}`;
            if (m.matchScore) matchInfo += ` - Match score: ${m.matchScore}`;
            if (m.sharedInterests && m.sharedInterests.length > 0) {
              matchInfo += `\n  Matching reasons: ${m.sharedInterests.join(', ')}`;
            }
            if (m.conversationHooks && m.conversationHooks.length > 0) {
              matchInfo += `\n  Conversation starters: ${m.conversationHooks.join('; ')}`;
            }
            return matchInfo;
          }).join('\n\n')}`);
        }
        
        if (context.activeConversations && context.activeConversations.length > 0) {
          contextParts.push(`Active Conversations (${context.activeConversations.length}):\n${context.activeConversations.map((c: any) => 
            `- ${c.name}${c.age ? ` (${c.age})` : ''}${c.city ? ` from ${c.city}` : ''}`
          ).join('\n')}`);
        }
        
        if (context.optedInMatches && context.optedInMatches.length > 0) {
          contextParts.push(`Matches You've Opted Into (${context.optedInMatches.length}):\n${context.optedInMatches.map((m: any) => {
            let matchInfo = `- ${m.name}${m.status === 'mutual_opt_in' ? ' (mutual match - chat created)' : ' (waiting for them to respond)'}`;
            if (m.matchReasons?.shared_interests && m.matchReasons.shared_interests.length > 0) {
              matchInfo += `\n  Why you matched: ${m.matchReasons.shared_interests.join(', ')}`;
            }
            return matchInfo;
          }).join('\n\n')}`);
        }
        
        if (context.passedMatches && context.passedMatches.length > 0) {
          contextParts.push(`Matches You've Passed On (${context.passedMatches.length}):\n${context.passedMatches.map((m: any) => {
            let matchInfo = `- ${m.name}`;
            if (m.matchReasons?.shared_interests && m.matchReasons.shared_interests.length > 0) {
              matchInfo += `\n  Why they were matched: ${m.matchReasons.shared_interests.join(', ')}`;
            }
            if (m.matchScore) matchInfo += ` (match score: ${m.matchScore})`;
            return matchInfo;
          }).join('\n\n')}`);
        }
        
        if (contextParts.length > 0) {
          contextText = `\n\nUser's Connection Context:\n${contextParts.join('\n\n')}\n\nIMPORTANT: When users ask about why they were matched with someone, be concise and direct. List the specific shared interests from the matching reasons (e.g., "Both are planners, both enjoy outdoor walks"). Keep responses brief - 1-2 sentences max. Don't add fluff like "If you're interested..." or "feel free to reach out" unless directly asked.`;
        }
      }
      
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `You are Cora, a friendly and intelligent AI assistant for Cove, a connection app that helps people make meaningful local friendships. Your role is to:

1. Help users with onboarding and intake questions
2. Provide support and guidance about making friends and connections
3. Be warm, supportive, and platonic in tone
4. Keep responses BRIEF and concise - aim for 1-2 sentences unless more detail is requested
5. Focus on friendship and community building
6. Always maintain a safe, consent-driven approach
7. Use the user's connection context to provide personalized, relevant advice
8. Reference specific connections when relevant (e.g., "I noticed you have a match with [Name]...")
9. Help users understand their match statuses and next steps
10. When explaining matches, be direct and factual - just state the shared interests, no extra fluff

You should be encouraging but not pushy, and always respect boundaries. Keep it short and to the point.${contextText}`
          },
          {
            role: "user",
            content: userMessage
          }
        ],
        max_tokens: 150,
        temperature: 0.7,
      });

      return completion.choices[0]?.message?.content || "I'm here to help! What would you like to know about making new connections?";
    } catch (error) {
      console.error('Error generating chat response:', error);
      throw new Error('Failed to generate chat response');
    }
  },

  // Generate embeddings for questionnaire responses
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw new Error('Failed to generate embedding');
    }
  }
};
