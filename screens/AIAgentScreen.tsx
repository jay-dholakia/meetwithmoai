import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/mcp-supabase';
import { openAIService } from '../lib/openai';
import { MatchingService } from '../lib/matching-service';
import MatchCard from '../components/MatchCard';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  type?: 'text' | 'match-card' | 'question' | 'profile-question';
  data?: any;
}

interface MatchData {
  match: any;
  otherUser: any;
}

export default function AIAgentScreen() {
  const theme = useTheme();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [intakeAnswers, setIntakeAnswers] = useState<Record<string, any>>({});
  const [weeklyMatches, setWeeklyMatches] = useState<any[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [profileData, setProfileData] = useState<Record<string, any>>({});
  const [currentProfileStep, setCurrentProfileStep] = useState(0);
  const [isProfileComplete, setIsProfileComplete] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const isInitializedRef = useRef(false);

  // Intro and outro messages for the new questionnaire
  const intakeIntro = {
    text: "👋 Hi! I'll ask you some quick questions to help match you with new friends. It'll take about 5–7 minutes. Most are quick taps, a few are write-ins. You can skip anything. Ready?",
    type: 'intro',
    options: ['Let\'s go', 'Not now']
  };

  const intakeOutro = {
    text: "🎉 All set! Thanks for sharing. I'll use this to curate your weekly friend intros. They'll show up here every Sunday. Want a Friday reminder?",
    type: 'outro',
    options: ['Yes', 'No']
  };

  const profileQuestions = [
    {
      id: 'name',
      text: "What's your first name?",
      type: 'text',
      placeholder: 'Enter your first name'
    },
    {
      id: 'lastName',
      text: "What's your last name?",
      type: 'text',
      placeholder: 'Enter your last name'
    },
    {
      id: 'birthdate',
      text: "When's your birthday?",
      type: 'date',
      placeholder: 'MM/DD/YYYY'
    },
    {
      id: 'gender',
      text: "What's your gender?",
      type: 'chips',
      options: ['Woman', 'Man', 'Non-binary', 'Prefer not to say']
    },
    {
      id: 'sexualOrientation',
      text: "What's your sexual orientation?",
      type: 'chips',
      options: ['Straight', 'Gay', 'Lesbian', 'Bisexual', 'Pansexual', 'Asexual', 'Prefer not to say']
    },
    {
      id: 'location',
      text: "Let me get your location to find friends nearby. Can I access your location?",
      type: 'location',
      options: ['Yes, use my location', 'No, I will enter manually']
    }
  ];

  const intakeQuestions = [
    // Part A — Interests & Activities (10)
    {
      id: 'activities_enjoyed',
      text: "What kinds of activities do you enjoy with friends?",
      type: 'chips',
      options: ['Hiking', 'Gym', 'Sports', 'Cooking', 'Board games', 'Concerts', 'Coffee shops', 'Volunteering', 'Movies', 'Dining', 'Gaming', 'Art', 'Music', 'Travel', 'Reading', 'Dancing', 'Photography', 'Yoga', 'Running', 'Cycling']
    },
    {
      id: 'top_3_activities',
      text: "Which 3 are your top favorites?",
      type: 'drag_rank',
      options: ['Hiking', 'Gym', 'Sports', 'Cooking', 'Board games', 'Concerts', 'Coffee shops', 'Volunteering', 'Movies', 'Dining', 'Gaming', 'Art', 'Music', 'Travel', 'Reading', 'Dancing', 'Photography', 'Yoga', 'Running', 'Cycling']
    },
    {
      id: 'active_outdoor_frequency',
      text: "How often do you want active/outdoor hangs?",
      type: 'likert',
      options: ['Rarely', 'Sometimes', 'Often', 'Very often', 'All the time']
    },
    {
      id: 'indoor_hangs_frequency',
      text: "How often do you want low-key indoor hangs?",
      type: 'likert',
      options: ['Rarely', 'Sometimes', 'Often', 'Very often', 'All the time']
    },
    {
      id: 'try_new_activities',
      text: "Do you enjoy trying new activities?",
      type: 'likert',
      options: ['Strongly disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly agree']
    },
    {
      id: 'competitive_activities',
      text: "Do you enjoy light competitive stuff (ping-pong, trivia, bowling)?",
      type: 'likert',
      options: ['Strongly disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly agree']
    },
    {
      id: 'sports_teams',
      text: "Do you follow any sports teams or leagues?",
      type: 'text',
      placeholder: 'Tell us about your teams or leave blank if none'
    },
    {
      id: 'music_preferences',
      text: "What kind of music are you into?",
      type: 'multi_select',
      options: ['Pop', 'Rap', 'Rock', 'Indie', 'EDM', 'Jazz', 'Classical', 'Country', 'Hip-hop', 'Alternative', 'Folk', 'R&B', 'Electronic', 'Other']
    },
    {
      id: 'alcohol_preference',
      text: "Alcohol at hangouts?",
      type: 'single_select',
      options: ['None', 'Fine if others drink', 'I drink socially']
    },
    {
      id: 'kid_friendly_preference',
      text: "Would you like kid-friendly meetups?",
      type: 'single_select',
      options: ['Not needed', 'Sometimes', 'Prefer kid-friendly']
    },

    // Part B — Social Style & Reliability (10)
    {
      id: 'energy_from_people',
      text: "I usually get energy from being around people.",
      type: 'likert',
      options: ['Strongly disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly agree']
    },
    {
      id: 'prefer_one_on_one',
      text: "I'd rather hang out 1:1 than in a group.",
      type: 'likert',
      options: ['Strongly disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly agree']
    },
    {
      id: 'comfortable_joining_solo',
      text: "I'm fine joining a hang where I only know one person.",
      type: 'likert',
      options: ['Strongly disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly agree']
    },
    {
      id: 'like_structured_plans',
      text: "I like structured plans (set time/place).",
      type: 'likert',
      options: ['Strongly disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly agree']
    },
    {
      id: 'enjoy_spontaneous',
      text: "I enjoy spontaneous last-minute plans.",
      type: 'likert',
      options: ['Strongly disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly agree']
    },
    {
      id: 'conversation_flow',
      text: "In conversations, I tend to ask questions and keep things flowing.",
      type: 'likert',
      options: ['Strongly disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly agree']
    },
    {
      id: 'playful_banter',
      text: "I'm good with playful banter or light trash talk.",
      type: 'likert',
      options: ['Strongly disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly agree']
    },
    {
      id: 'reliable_plans',
      text: "I show up reliably when I make a plan.",
      type: 'likert',
      options: ['Strongly disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly agree']
    },
    {
      id: 'value_balance_talking',
      text: "I value friends who balance talking and listening.",
      type: 'likert',
      options: ['Strongly disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly agree']
    },
    {
      id: 'prefer_deep_friendships',
      text: "I prefer friendships where we can go deeper than surface-level.",
      type: 'likert',
      options: ['Strongly disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly agree']
    },

    // Part C — Work, Life & Anchors (5)
    {
      id: 'work_study',
      text: "What do you do for work or study?",
      type: 'text',
      placeholder: 'Tell us about your work or studies'
    },
    {
      id: 'industry',
      text: "Which industry best describes you?",
      type: 'single_select',
      options: ['Tech', 'Healthcare', 'Education', 'Arts', 'Business', 'Trades', 'Student', 'Other']
    },
    {
      id: 'life_stage',
      text: "What's your current life stage?",
      type: 'single_select',
      options: ['Student', 'Early career', 'Parent', 'Mid-career', 'Retired', 'Other']
    },
    {
      id: 'local_status',
      text: "Did you grow up here or move later?",
      type: 'single_select',
      options: ['Local', 'Newcomer', 'Relocated']
    },
    {
      id: 'hometown',
      text: "Where's your hometown or region?",
      type: 'text',
      placeholder: 'Tell us about where you grew up'
    },

    // Part D — Communication & Boundaries (5)
    {
      id: 'favorite_planning_method',
      text: "Favorite way to make plans?",
      type: 'single_select',
      options: ['In-app chat', 'Text', 'WhatsApp', 'Discord', 'Email']
    },
    {
      id: 'reply_speed',
      text: "How quickly do you usually reply?",
      type: 'single_select',
      options: ['Within hour', 'Same day', '1-2 days', 'Longer']
    },
    {
      id: 'preferred_meeting_times',
      text: "When do you usually prefer to meet up? Pick all that apply.",
      type: 'multi_select',
      options: ['Weekday day', 'Weekday evening', 'Weekend day', 'Weekend evening']
    },
    {
      id: 'travel_distance',
      text: "How far are you willing to travel for meetups?",
      type: 'single_select',
      options: ['<2 km', '5 km', '10 km', '20 km']
    },
    {
      id: 'avoid_topics',
      text: "Topics you'd rather avoid early on?",
      type: 'multi_select',
      options: ['Work drama', 'Politics', 'Religion', 'Dating', 'Heavy personal', 'None']
    },

    // Part E — Creative Open-Ended (5)
    {
      id: 'current_media',
      text: "What's a song, show, or podcast you've been into lately?",
      type: 'text',
      placeholder: 'Share what you\'ve been enjoying'
    },
    {
      id: 'free_saturday',
      text: "If you had a free Saturday, how would you spend it?",
      type: 'text',
      placeholder: 'Describe your ideal Saturday'
    },
    {
      id: 'day_brightener',
      text: "What's something small that always makes your day better?",
      type: 'text',
      placeholder: 'Share a little joy'
    },
    {
      id: 'three_words_description',
      text: "If friends described you in 3 words, what might they say?",
      type: 'text',
      placeholder: 'Three words that capture you'
    },
    {
      id: 'new_to_try',
      text: "What's something new you'd like to try with friends this year?",
      type: 'text',
      placeholder: 'Share something you want to explore'
    }
  ];

  useEffect(() => {
    if (user) {
      initializeChat();
    }
  }, [user]);

  const initializeChat = async () => {
    if (isInitializedRef.current) {
      console.log('Chat already initialized, skipping');
      return;
    }
    
    console.log('Initializing chat...');
    isInitializedRef.current = true;
    
    const welcomeMessage: Message = {
      id: 'welcome',
      text: "👋 Hi! I'm Moai, your AI friend-finding assistant. I'll help you meet new people nearby through thoughtful matching.\n\nFirst, let me get to know you a bit better with some basic information, then we'll dive into what you're looking for in friendships.\n\nReady to begin?",
      sender: 'ai',
      timestamp: new Date(),
      type: 'text'
    };

    setMessages([welcomeMessage]);

    // Check if user has completed profile and intake
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user?.id)
      .single();

    const { data: intakeData } = await supabase
      .from('intake_responses')
      .select('*')
      .eq('user_id', user?.id)
      .single();

    if (!profileData) {
      // Start profile collection process
      console.log('Starting profile collection...');
      // Clear any existing messages and start fresh
      setMessages([welcomeMessage]);
      setCurrentProfileStep(0);
      setTimeout(() => {
        askNextProfileQuestion();
      }, 1000);
    } else if (!intakeData) {
      // Profile complete, start intake process
      console.log('Profile complete, starting intake...');
      setIsProfileComplete(true);
      setTimeout(() => {
        askNextQuestion();
      }, 1000);
    } else {
      // Both profile and intake complete, check for weekly matches
      console.log('Both profile and intake complete, checking for matches...');
      setIsProfileComplete(true);
      await checkForWeeklyMatches();
    }
  };

  const askNextProfileQuestion = () => {
    console.log('askNextProfileQuestion called, currentProfileStep:', currentProfileStep, 'total questions:', profileQuestions.length);
    
    // Check if we already have this specific question in the messages
    const currentQuestionId = profileQuestions[currentProfileStep]?.id;
    const hasThisQuestion = messages.some(msg => 
      msg.type === 'profile-question' && 
      msg.data?.id === currentQuestionId
    );
    
    if (hasThisQuestion) {
      console.log('Question already asked, skipping:', currentQuestionId);
      return;
    }
    
    if (currentProfileStep < profileQuestions.length) {
      const question = profileQuestions[currentProfileStep];
      console.log('Asking profile question:', question.id, question.text);
      
      const questionMessage: Message = {
        id: `profile-${question.id}-${currentProfileStep}-${Date.now()}`,
        text: question.text,
        sender: 'ai',
        timestamp: new Date(),
        type: 'profile-question',
        data: question
      };
      setMessages(prev => [...prev, questionMessage]);
    } else {
      console.log('Profile questions complete, calling completeProfile');
      // Profile complete
      completeProfile();
    }
  };

  const askNextQuestion = () => {
    if (currentQuestion < intakeQuestions.length) {
      const question = intakeQuestions[currentQuestion];
      const questionMessage: Message = {
        id: `question-${question.id}-${Date.now()}`,
        text: question.text,
        sender: 'ai',
        timestamp: new Date(),
        type: 'question',
        data: question
      };
      setMessages(prev => [...prev, questionMessage]);
    } else {
      // Intake complete
      completeIntake();
    }
  };

  const saveProfileAnswerToRemote = async (questionId: string, answer: string) => {
    if (!user) {
      console.error('No user found when saving profile answer');
      return;
    }

    try {
      // Get current profile data from database
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      let profileToUpdate: any = {
        id: user.id,
        updated_at: new Date().toISOString()
      };

      // Update based on the question type
      switch (questionId) {
        case 'name':
          profileToUpdate.name = answer;
          profileToUpdate.initial = answer.charAt(0).toUpperCase();
          break;
        case 'lastName':
          // Store lastName in bio_text for now (since we don't have a separate column)
          const currentBio = existingProfile?.bio_text || '';
          profileToUpdate.bio_text = `${existingProfile?.name || ''} ${answer} • ${currentBio.split('•').slice(2).join('•').trim()}`;
          break;
        case 'birthdate':
          // Calculate age and store in dedicated column
          const age = Math.floor((new Date().getTime() - new Date(answer).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
          profileToUpdate.age = age;
          break;
        case 'gender':
          // Store in dedicated gender column
          profileToUpdate.gender = answer;
          break;
        case 'sexualOrientation':
          // Store in dedicated sexual_orientation column
          profileToUpdate.sexual_orientation = answer;
          break;
        case 'location':
          if (answer === 'Yes, use my location') {
            profileToUpdate.city = 'San Francisco'; // Default for now
            profileToUpdate.lat = 37.7749;
            profileToUpdate.lng = -122.4194;
          }
          break;
      }

      console.log('Updating profile in database:', profileToUpdate);

      const { data, error } = await supabase
        .from('profiles')
        .upsert(profileToUpdate);

      if (error) {
        console.error('Error saving profile answer:', error);
      } else {
        console.log('Profile answer saved successfully:', data);
      }
    } catch (error) {
      console.error('Error in saveProfileAnswerToRemote:', error);
    }
  };

  const completeProfile = async () => {
    console.log('completeProfile called, user:', user?.id);
    
    // Update bio_text with clean format using dedicated columns
    if (user) {
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('name, gender, age, sexual_orientation')
        .eq('id', user.id)
        .single();

      if (existingProfile) {
        const bioParts = [];
        if (existingProfile.name) bioParts.push(existingProfile.name);
        if (existingProfile.gender) bioParts.push(existingProfile.gender);
        if (existingProfile.age) bioParts.push(`${existingProfile.age} years old`);
        if (existingProfile.sexual_orientation) bioParts.push(existingProfile.sexual_orientation);

        const cleanBioText = bioParts.join(' • ');

        await supabase
          .from('profiles')
          .update({ 
            bio_text: cleanBioText,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);
      }
    }
    
    const completionMessage: Message = {
      id: 'profile-completion',
      text: "Great! Now let's dive into what you're looking for in friendships. I'll ask you 50 questions to understand your preferences, communication style, and what makes a great friend for you.\n\nThis will take about 15-20 minutes. Ready to continue?",
      sender: 'ai',
      timestamp: new Date(),
      type: 'text'
    };
    setMessages(prev => [...prev, completionMessage]);

    setIsProfileComplete(true);

    // Start intake questions after a short delay
    setTimeout(() => {
      askNextQuestion();
    }, 2000);
  };

  const completeIntake = async () => {
    const completionMessage: Message = {
      id: 'completion',
      text: "🎉 All done! I'll use this information to curate your weekly friend introductions. You'll see them here every Sunday at noon.\n\nWant a Friday reminder?",
      sender: 'ai',
      timestamp: new Date(),
      type: 'text'
    };
    setMessages(prev => [...prev, completionMessage]);

    // Save intake responses to database
    if (user) {
      await supabase.from('intake_responses').upsert({
        user_id: user.id,
        answers: intakeAnswers,
        completed_at: new Date().toISOString()
      });
    }

    // Check for weekly matches after completing intake
    setTimeout(() => {
      checkForWeeklyMatches();
    }, 2000);
  };

  const checkForWeeklyMatches = async () => {
    if (!user) return;

    try {
      // Get user's current matches
      const matches = await MatchingService.getUserMatches(user.id);
      
      if (matches.length > 0) {
        setWeeklyMatches(matches);
        showNextMatch();
      } else {
        // Show welcome back message if no matches
        const welcomeBackMessage: Message = {
          id: 'welcome-back',
          text: "Welcome back! Your weekly friend introductions will appear here every Sunday. For now, feel free to chat with me about anything!",
          sender: 'ai',
          timestamp: new Date(),
          type: 'text'
        };
        setMessages(prev => [...prev, welcomeBackMessage]);
      }
    } catch (error) {
      console.error('Error checking for weekly matches:', error);
    }
  };

  const showNextMatch = async () => {
    if (currentMatchIndex >= weeklyMatches.length) {
      // All matches shown
      const noMoreMatchesMessage: Message = {
        id: 'no-more-matches',
        text: "That's all your introductions for this week! Check back next Sunday for new friend suggestions. Feel free to chat with me about anything!",
        sender: 'ai',
        timestamp: new Date(),
        type: 'text'
      };
      setMessages(prev => [...prev, noMoreMatchesMessage]);
      return;
    }

    const match = weeklyMatches[currentMatchIndex];
    
    // Get the other user's profile
    const otherUserId = match.user_a === user?.id ? match.user_b : match.user_a;
    const { data: otherUser } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', otherUserId)
      .single();

    if (otherUser) {
      const matchMessage: Message = {
        id: `match-${match.id}`,
        text: `Here's your ${currentMatchIndex + 1}${currentMatchIndex === 0 ? 'st' : currentMatchIndex === 1 ? 'nd' : 'rd'} friend introduction for the week:`,
        sender: 'ai',
        timestamp: new Date(),
        type: 'match-card',
        data: { match, otherUser }
      };
      setMessages(prev => [...prev, matchMessage]);
    }
  };

  const handleMatchResponse = async (matchId: string, accepted: boolean) => {
    if (!user) return;

    try {
      // Record the user's consent
      await MatchingService.recordConsent(matchId, user.id, accepted);

      // Add response message
      const responseMessage: Message = {
        id: `response-${Date.now()}`,
        text: accepted ? "Got it — I'll check with them." : "No worries! I'll find you other great matches.",
        sender: 'ai',
        timestamp: new Date(),
        type: 'text'
      };
      setMessages(prev => [...prev, responseMessage]);

      // Move to next match
      setCurrentMatchIndex(prev => prev + 1);
      setTimeout(() => {
        showNextMatch();
      }, 1500);
    } catch (error) {
      console.error('Error handling match response:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      sender: 'user',
      timestamp: new Date(),
      type: 'text'
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputText;
    setInputText('');
    setIsTyping(true);

    // Handle profile questions if we're in profile collection mode
    if (!isProfileComplete && currentProfileStep < profileQuestions.length) {
      const currentProfileQuestion = profileQuestions[currentProfileStep];
      console.log('Profile question handling:', currentProfileQuestion, currentProfileStep);
      
      if (currentProfileQuestion.type === 'text' || currentProfileQuestion.type === 'date') {
        console.log('Saving profile answer to remote database:', currentProfileQuestion.id, currentInput);
        
        // Save directly to remote database
        await saveProfileAnswerToRemote(currentProfileQuestion.id, currentInput);
        
        // Move to next profile question
        setCurrentProfileStep(prev => prev + 1);
        
        // Ask next profile question after a short delay
        setTimeout(() => {
          askNextProfileQuestion();
        }, 1000);
        
        setIsTyping(false);
        return;
      }
    }

    // If we're in profile collection mode but this wasn't a text/date question, don't proceed to chat
    if (!isProfileComplete) {
      setIsTyping(false);
      return;
    }

    // Only handle regular chat - questions are handled via option chips
    try {
      const response = await openAIService.generateChatResponse(currentInput);
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response,
        sender: 'ai',
        timestamp: new Date(),
        type: 'text'
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "Sorry, I'm having trouble responding right now. Please try again!",
        sender: 'ai',
        timestamp: new Date(),
        type: 'text'
      };
      setMessages(prev => [...prev, errorMessage]);
    }
    setIsTyping(false);
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.sender === 'user';
    
    return (
      <View style={[
        styles.messageContainer,
        isUser ? styles.userMessage : styles.aiMessage
      ]}>
        <View style={[
          styles.messageBubble,
          isUser ? styles.userBubble : styles.aiBubble
        ]}>
          <Text style={[
            styles.messageText,
            isUser ? styles.userText : styles.aiText
          ]}>
            {item.text}
          </Text>
          
          {item.type === 'question' && item.data && (
            <View style={styles.questionOptions}>
              {item.data.options.map((option: string, index: number) => (
                <TouchableOpacity
                  key={index}
                  style={styles.optionChip}
                  onPress={() => {
                    // Add user's selection as a message
                    const userSelectionMessage: Message = {
                      id: `selection-${Date.now()}`,
                      text: option,
                      sender: 'user',
                      timestamp: new Date(),
                      type: 'text'
                    };
                    setMessages(prev => [...prev, userSelectionMessage]);
                    
                    // Save the answer
                    setIntakeAnswers(prev => ({
                      ...prev,
                      [item.data.id]: option
                    }));
                    
                    // Move to next question
                    setCurrentQuestion(prev => prev + 1);
                    
                    // Ask next question after a short delay
                    setTimeout(() => {
                      if (currentQuestion + 1 < intakeQuestions.length) {
                        askNextQuestion();
                      } else {
                        completeIntake();
                      }
                    }, 500);
                  }}
                >
                  <Text style={styles.optionText}>{option}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {item.type === 'profile-question' && item.data && (
            <View style={styles.questionOptions}>
              {item.data.type === 'chips' && item.data.options && (
                item.data.options.map((option: string, index: number) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.optionChip}
                                         onPress={async () => {
                       // Add user's selection as a message
                       const userSelectionMessage: Message = {
                         id: `profile-selection-${item.data.id}-${currentProfileStep}-${Date.now()}`,
                         text: option,
                         sender: 'user',
                         timestamp: new Date(),
                         type: 'text'
                       };
                       setMessages(prev => [...prev, userSelectionMessage]);
                       
                       // Save directly to remote database
                       await saveProfileAnswerToRemote(item.data.id, option);
                       
                       // Move to next profile question
                       setCurrentProfileStep(prev => prev + 1);
                       
                       // Ask next profile question after a short delay
                       setTimeout(() => {
                         if (currentProfileStep + 1 < profileQuestions.length) {
                           askNextProfileQuestion();
                         } else {
                           completeProfile();
                         }
                       }, 500);
                     }}
                  >
                    <Text style={styles.optionText}>{option}</Text>
                  </TouchableOpacity>
                ))
              )}
              
              {item.data.type === 'location' && item.data.options && (
                item.data.options.map((option: string, index: number) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.optionChip}
                                         onPress={async () => {
                       // Add user's selection as a message
                       const userSelectionMessage: Message = {
                         id: `profile-selection-${item.data.id}-${currentProfileStep}-${Date.now()}`,
                         text: option,
                         sender: 'user',
                         timestamp: new Date(),
                         type: 'text'
                       };
                       setMessages(prev => [...prev, userSelectionMessage]);
                       
                       // Save directly to remote database
                       await saveProfileAnswerToRemote(item.data.id, option);
                       
                       // Move to next profile question
                       setCurrentProfileStep(prev => prev + 1);
                       
                       // Ask next profile question after a short delay
                       setTimeout(() => {
                         if (currentProfileStep + 1 < profileQuestions.length) {
                           askNextProfileQuestion();
                         } else {
                           completeProfile();
                         }
                       }, 500);
                     }}
                  >
                    <Text style={styles.optionText}>{option}</Text>
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}
          
          {item.type === 'match-card' && item.data && (
            <MatchCard
              match={item.data.match}
              otherUser={item.data.otherUser}
              onAccept={() => handleMatchResponse(item.data.match.id, true)}
              onDecline={() => handleMatchResponse(item.data.match.id, false)}
            />
          )}
        </View>
        <Text style={styles.timestamp}>
          {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          🤖 Moai AI
        </Text>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
      />

      {isTyping && (
        <View style={styles.typingIndicator}>
          <Text style={[styles.typingText, { color: theme.colors.textSecondary }]}>
            Moai is typing...
          </Text>
          <ActivityIndicator size="small" color={theme.colors.primary} />
        </View>
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inputContainer}
      >
        <View style={[styles.inputWrapper, { backgroundColor: theme.colors.surface }]}>
          <TextInput
            style={[styles.textInput, { color: theme.colors.text }]}
            value={inputText}
            onChangeText={setInputText}
            placeholder={
              !isProfileComplete && currentProfileStep < profileQuestions.length
                ? profileQuestions[currentProfileStep].placeholder || "Type a message..."
                : "Type a message..."
            }
            placeholderTextColor={theme.colors.textSecondary}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              { backgroundColor: inputText.trim() ? theme.colors.primary : theme.colors.border }
            ]}
            onPress={handleSendMessage}
            disabled={!inputText.trim()}
          >
            <Ionicons
              name="send"
              size={20}
              color={inputText.trim() ? '#FFFFFF' : theme.colors.textSecondary}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1C1C1E',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  messageContainer: {
    marginVertical: 4,
    flexDirection: 'row',
  },
  userMessage: {
    justifyContent: 'flex-end',
  },
  aiMessage: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  userBubble: {
    backgroundColor: '#7C6CFF',
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: '#1C1C1E',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userText: {
    color: '#FFFFFF',
  },
  aiText: {
    color: '#FFFFFF',
  },
  timestamp: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 4,
    marginHorizontal: 8,
  },
  questionOptions: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionChip: {
    backgroundColor: '#2C2C2E',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#3C3C3E',
  },
  optionText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  typingText: {
    fontSize: 14,
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#1C1C1E',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    maxHeight: 100,
    paddingVertical: 8,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
});
