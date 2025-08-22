# OpenAI Integration Guide

This guide explains how to integrate OpenAI into your meetwithmoai project for AI-powered meeting features.

## 🎯 What You Have Now

### ✅ **Complete AI-Powered Stack**
- **MCP Tools**: AI-assisted database management
- **Supabase CLI**: Local development workflows
- **Deno**: Modern TypeScript runtime for Edge Functions
- **OpenAI**: AI-powered meeting features
- **React Native**: Mobile app development

## 🔑 Getting Your OpenAI API Key

### **Step 1: Create OpenAI Account**
1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up for an account
3. Verify your email address

### **Step 2: Get API Key**
1. Navigate to [API Keys](https://platform.openai.com/api-keys)
2. Click "Create new secret key"
3. Give it a name (e.g., "meetwithmoai-app")
4. Copy the generated key (starts with `sk-`)

### **Step 3: Add to Environment**
1. Create a `.env` file in your project root
2. Add your API key:
   ```bash
   EXPO_PUBLIC_OPENAI_API_KEY=sk-your_actual_api_key_here
   ```

## 🚀 Quick Start

### **1. Set Up Environment Variables**
```bash
# Copy the example file
cp env.example .env

# Edit .env and add your OpenAI API key
EXPO_PUBLIC_OPENAI_API_KEY=sk-your_actual_api_key_here
```

### **2. Test the Integration**
```bash
# Start your app
npm start

# Navigate to AI Assistant in your app
# Check if OpenAI is configured
```

### **3. Use AI Features**
- Generate meeting titles
- Create meeting summaries
- Get meeting suggestions
- Generate insights
- Create reminders

## 📁 Project Structure with OpenAI

```
meetwithmoai/
├── lib/
│   ├── openai.ts              # OpenAI configuration and services
│   ├── supabase.ts            # Supabase client
│   └── database.types.ts      # Generated types
├── components/
│   ├── AIAssistant.tsx        # AI Assistant component
│   ├── MCPDashboard.tsx       # MCP dashboard
│   └── HomeScreen.tsx         # Updated with AI button
├── env.example               # Environment variables example
└── .env                      # Your actual environment file (not in git)
```

## 🔧 Available AI Features

### **1. Meeting Title Generation**
```typescript
const title = await openAIService.generateMeetingTitle(
  "Weekly team sync to discuss project progress and upcoming deadlines"
);
// Returns: "Weekly Team Progress Review"
```

### **2. Meeting Summary Generation**
```typescript
const summary = await openAIService.generateMeetingSummary(
  "Discussed Q4 goals, assigned tasks to team members, set deadlines for deliverables"
);
// Returns: "Key points: Q4 goals reviewed, tasks assigned, deadlines set"
```

### **3. Meeting Suggestions**
```typescript
const suggestions = await openAIService.generateMeetingSuggestions(
  "Team planning session for new product launch"
);
// Returns: ["Product roadmap review", "Marketing strategy discussion", "Timeline planning"]
```

### **4. Meeting Insights**
```typescript
const insights = await openAIService.generateMeetingInsights({
  title: "Weekly Standup",
  description: "Daily team updates",
  participants: ["John", "Jane", "Bob"],
  duration: 30
});
// Returns: "Consider reducing meeting duration, add action item tracking"
```

### **5. Meeting Reminders**
```typescript
const reminder = await openAIService.generateMeetingReminder({
  title: "Project Review",
  time: "2:00 PM",
  participants: ["John", "Jane"]
});
// Returns: "Friendly reminder: Project Review at 2:00 PM with John and Jane"
```

## 🎮 Using the AI Assistant

### **In Your App**
1. Open the meetwithmoai app
2. Sign in with your Supabase account
3. Click "🤖 Open AI Assistant"
4. Enter your meeting content
5. Choose an AI feature
6. Get AI-generated results

### **AI Features Available**
- 📝 **Generate Meeting Title**: Create professional titles
- 📋 **Generate Meeting Summary**: Summarize meeting content
- 💡 **Generate Meeting Suggestions**: Get topic suggestions
- 🔍 **Generate Meeting Insights**: Get improvement recommendations
- ⏰ **Generate Meeting Reminder**: Create friendly reminders

## 🔒 Security Best Practices

### **API Key Security**
- ✅ Store API key in environment variables
- ✅ Never commit API key to version control
- ✅ Use `.env` file (already in `.gitignore`)
- ✅ Use `EXPO_PUBLIC_` prefix for client-side access

### **Rate Limiting**
- OpenAI has rate limits based on your plan
- Free tier: 3 requests per minute
- Paid tiers: Higher limits
- Monitor usage in OpenAI dashboard

### **Error Handling**
- All AI functions include error handling
- Graceful fallbacks for API failures
- User-friendly error messages

## 💰 Cost Management

### **OpenAI Pricing**
- **GPT-3.5-turbo**: ~$0.002 per 1K tokens
- **Typical meeting summary**: ~100-200 tokens
- **Cost per summary**: ~$0.0002-0.0004

### **Cost Optimization**
- Use appropriate token limits
- Cache results when possible
- Monitor usage in OpenAI dashboard
- Set up billing alerts

## 🛠️ Configuration Options

### **Environment Variables**
```bash
# Required
EXPO_PUBLIC_OPENAI_API_KEY=your_api_key_here

# Optional (with defaults)
EXPO_PUBLIC_OPENAI_MODEL=gpt-3.5-turbo
EXPO_PUBLIC_OPENAI_MAX_TOKENS=500
EXPO_PUBLIC_OPENAI_TEMPERATURE=0.7
```

### **Customizing AI Behavior**
You can modify the AI prompts in `lib/openai.ts`:

```typescript
// Example: Custom meeting summary prompt
async generateMeetingSummary(meetingContent: string): Promise<string> {
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
}
```

## 🔍 Monitoring and Debugging

### **OpenAI Status Check**
The AI Assistant shows:
- ✅ Configuration status
- 🔑 API key status (masked)
- ⚠️ Warning if not configured

### **Error Handling**
- Network errors
- API rate limits
- Invalid API keys
- Model availability issues

### **Logging**
- All AI requests are logged
- Error details in console
- User-friendly error messages

## 🚀 Advanced Features

### **Custom AI Prompts**
You can create custom AI functions:

```typescript
// Add to openAIService in lib/openai.ts
async generateCustomResponse(prompt: string): Promise<string> {
  const completion = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "user",
        content: prompt
      }
    ],
    max_tokens: 300,
    temperature: 0.7,
  });
  return completion.choices[0]?.message?.content || "No response";
}
```

### **Integration with Supabase**
Store AI-generated content in your database:

```typescript
// Example: Save AI-generated summary to database
const summary = await openAIService.generateMeetingSummary(meetingContent);
await supabase
  .from('meetings')
  .update({ ai_summary: summary })
  .eq('id', meetingId);
```

## 🛠️ Troubleshooting

### **Common Issues**

1. **"OpenAI Not Configured" Error**
   ```bash
   # Check if .env file exists
   ls -la .env
   
   # Verify API key format
   EXPO_PUBLIC_OPENAI_API_KEY=sk-your_key_here
   ```

2. **"API Key Invalid" Error**
   - Verify your API key is correct
   - Check if you have credits in your OpenAI account
   - Ensure the key starts with `sk-`

3. **"Rate Limit Exceeded" Error**
   - Wait a minute before trying again
   - Upgrade your OpenAI plan for higher limits
   - Implement request caching

4. **"Network Error"**
   - Check your internet connection
   - Verify OpenAI API is accessible
   - Try again later

### **Debugging Steps**
1. Check OpenAI status in the app
2. Verify environment variables
3. Check console logs for errors
4. Test with a simple prompt
5. Verify API key in OpenAI dashboard

## 📚 Next Steps

1. **Set Up API Key**: Add your OpenAI API key to `.env`
2. **Test AI Features**: Try all AI features in the app
3. **Customize Prompts**: Modify AI behavior for your needs
4. **Integrate with Database**: Save AI results to Supabase
5. **Monitor Usage**: Track costs and usage in OpenAI dashboard

## 🔗 Useful Links

- [OpenAI Platform](https://platform.openai.com/)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [OpenAI Pricing](https://openai.com/pricing)
- [Environment Variables Guide](./SUPABASE_CLI_GUIDE.md)
- [MCP Tools Guide](./MCP_SUPABASE_GUIDE.md)

## 🎉 Complete AI Integration Summary

You now have a **complete AI-powered meeting app** with:

- ✅ **OpenAI Integration**: AI-powered meeting features
- ✅ **MCP Tools**: AI-assisted database management
- ✅ **Supabase CLI**: Local development workflows
- ✅ **Deno**: Modern TypeScript runtime
- ✅ **React Native**: Mobile app development
- ✅ **TypeScript**: Full type safety
- ✅ **Security**: Proper API key management

This gives you **intelligent meeting management** with AI assistance! 🚀

---

**Ready to create intelligent meeting experiences with AI!** 🎉



