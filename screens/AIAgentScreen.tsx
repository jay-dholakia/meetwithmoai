import React, { useState, useEffect, useRef } from "react";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/mcp-supabase";
import { openAIService } from "../lib/openai";
import { MatchingService } from "../lib/matching-service";
import MatchCard from "../components/MatchCard";

interface Message {
  id: string;
  text: string;
  sender: "user" | "ai";
  timestamp: Date;
  type?: "text" | "match-card" | "question" | "profile-question";
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
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [intakeAnswers, setIntakeAnswers] = useState<Record<string, any>>({});
  const [weeklyMatches, setWeeklyMatches] = useState<any[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [profileData, setProfileData] = useState<Record<string, any>>({});
  const [currentProfileStep, setCurrentProfileStep] = useState(0);
  const [isProfileComplete, setIsProfileComplete] = useState(false);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [selectedMultiSelectOptions, setSelectedMultiSelectOptions] = useState<Record<string, string[]>>({});
  const [waitingForCityInput, setWaitingForCityInput] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const isInitializedRef = useRef(false);

  // Functions to save and load chat history
  const saveMessageToHistory = async (message: Message) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('ai_chat_history')
        .insert({
          user_id: user.id,
          message_data: message,
          message_order: messages.length
        });
      
      if (error) {
        console.error('Error saving message to history:', error);
      }
    } catch (error) {
      console.error('Error saving message to history:', error);
    }
  };

  const loadChatHistory = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('ai_chat_history')
        .select('message_data')
        .eq('user_id', user.id)
        .order('message_order', { ascending: true });
      
      if (error) {
        console.error('Error loading chat history:', error);
        return;
      }
      
      if (data && data.length > 0) {
        const historyMessages = data.map(item => {
          const message = item.message_data as Message;
          // Convert timestamp string back to Date object
          if (message.timestamp && typeof message.timestamp === 'string') {
            message.timestamp = new Date(message.timestamp);
          }
          return message;
        });
        setMessages(historyMessages);
        console.log('Loaded chat history:', historyMessages.length, 'messages');
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  };

  const clearChatHistory = async () => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('ai_chat_history')
        .delete()
        .eq('user_id', user.id);
      
      if (error) {
        console.error('Error clearing chat history:', error);
      } else {
        setMessages([]);
        console.log('Chat history cleared');
      }
    } catch (error) {
      console.error('Error clearing chat history:', error);
    }
  };

  // Intro and outro messages for the new questionnaire
  const intakeIntro = {
    text: "👋 Hi! I'll ask you some quick questions to help match you with new friends. It'll take about 5–7 minutes. Most are quick taps, a few are write-ins. You can skip anything. Ready?",
    type: "intro",
    options: ["Let's go", "Not now"],
  };

  const intakeOutro = {
    text: "🎉 All set! Thanks for sharing. I'll use this to curate your weekly friend intros. They'll show up here every Sunday. Want a Friday reminder?",
    type: "outro",
    options: ["Yes", "No"],
  };

  const profileQuestions = [
    {
      id: "name",
      text: "What's your first name?",
      type: "text",
      placeholder: "Enter your first name",
      validation: (value: string) => value.trim().length > 0 ? null : "Please enter your first name",
    },
    {
      id: "last_name",
      text: "What's your last name? (or just initial)",
      type: "text",
      placeholder: "Enter your last name or initial",
      validation: (value: string) => value.trim().length > 0 ? null : "Please enter your last name or initial",
    },
    {
      id: "birthdate",
      text: "When's your birthday? (You must be 18+ to use this app)",
      type: "date",
      placeholder: "MM/DD/YYYY",
      validation: (value: string) => {
        const birthDate = new Date(value);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        return age >= 18 ? null : "You must be 18 or older to use this app";
      },
    },
    {
      id: "gender",
      text: "What's your gender?",
      type: "chips",
      options: ["Male", "Female", "Non-binary", "Other", "Prefer not to say"],
      validation: (value: string) => value ? null : "Please select your gender",
    },
    {
      id: "pronouns",
      text: "What are your pronouns?",
      type: "chips",
      options: ["He/Him", "She/Her", "They/Them", "Other", "Prefer not to say"],
      validation: (value: string) => value ? null : "Please select your pronouns",
    },
    {
      id: "sexual_orientation",
      text: "What's your sexual orientation?",
      type: "chips",
      options: ["Straight", "Gay", "Lesbian", "Bisexual", "Pansexual", "Asexual", "Other", "Prefer not to say"],
      validation: (value: string) => value ? null : "Please select your sexual orientation",
    },
    {
      id: "profilePhoto",
      text: "Would you like to add a profile photo?",
      type: "photo",
      options: ["Yes, upload photo", "Skip for now"],
      validation: (value: string) => value ? null : "Please make a selection",
    },
    {
      id: "location",
      text: "Let me get your location to find friends nearby. Can I access your location?",
      type: "location",
      options: ["Yes, use my location", "No, I will enter manually"],
      validation: (value: string) => value ? null : "Please make a selection",
    },
    {
      id: "meetRadius",
      text: "What's your preferred meet radius?",
      type: "chips",
      options: ["1 mile", "5 miles", "10 miles", "20 miles"],
      validation: (value: string) => value ? null : "Please select your preferred meet radius",
    },
    {
      id: "relationshipStatus",
      text: "What's your relationship status?",
      type: "chips",
      options: ["Single", "In a relationship", "Married", "Divorced", "Widowed", "Prefer not to say"],
      validation: (value: string) => value ? null : "Please select your relationship status",
    },
    {
      id: "languages",
      text: "What languages do you speak? (Choose up to 5)",
      type: "language_select",
      options: [
        "English", "Spanish", "French", "German", "Italian", "Portuguese", 
        "Russian", "Chinese", "Japanese", "Korean", "Arabic", "Hindi", 
        "Bengali", "Dutch", "Swedish", "Norwegian", "Danish", "Finnish",
        "Polish", "Czech", "Hungarian", "Turkish", "Greek", "Hebrew",
        "Thai", "Vietnamese", "Indonesian", "Malay", "Tagalog", "Other"
      ],
      maxSelections: 5,
      validation: (values: string[]) => values.length > 0 ? null : "Please select at least one language",
    },
  ];

  const intakeQuestions = [
    // Part A — Interests, Activities & First-Meet Ideas (13)
    {
      id: "activities_enjoyed",
      text: "What activities do you enjoy?",
      type: "multi_select",
      options: [
        "Running", "Hiking", "Cycling", "Yoga/Pilates", "Gym/Strength", "Basketball", "Soccer", "Tennis", "Pickleball", "Volleyball", "Swimming", "Golf", "Ski/Snowboard", "Surfing", "Dance", "Rock climbing", "Coffee shops", "Cooking/Dining out", "Concerts/Live music", "Gaming (video/board)", "Traveling/Day trips", "Arts & crafts", "Volunteering", "Other"
      ],
      maxSelections: 10,
      validation: (values: string[]) => values.length > 0 ? null : "Please select at least one activity",
    },
    {
      id: "enjoy_trying_new_activities",
      text: "Do you enjoy trying new activities?",
      type: "likert",
      options: ["Strongly disagree", "Disagree", "Neutral", "Agree", "Strongly agree"],
    },
    {
      id: "enjoy_competitive_activities",
      text: "Do you enjoy light competitive stuff (ping-pong, trivia, bowling)?",
      type: "likert",
      options: ["Strongly disagree", "Disagree", "Neutral", "Agree", "Strongly agree"],
    },
    {
      id: "sports_teams",
      text: "Do you follow any sports teams or leagues?",
      type: "text",
      placeholder: "Tell us about your teams or leave blank if none",
    },
    {
      id: "music_genres",
      text: "Music genres",
      type: "multi_select",
      options: ["Pop", "Rap/Hip-hop", "Rock", "Indie/Alternative", "EDM/Electronic", "Jazz", "Classical", "Country", "R&B/Soul", "Latin", "K-pop/International", "Other"],
      maxSelections: 5,
      validation: (values: string[]) => values.length > 0 ? null : "Please select at least one genre",
    },
    {
      id: "movies_shows",
      text: "Movies/Shows",
      type: "multi_select",
      options: ["Comedy", "Action/Adventure", "Drama", "Sci-Fi/Fantasy", "Documentaries", "Reality TV", "Anime", "Thriller/Mystery", "Rom-com", "Horror", "Other"],
      maxSelections: 5,
      validation: (values: string[]) => values.length > 0 ? null : "Please select at least one genre",
    },
    {
      id: "books_podcasts",
      text: "Books/Podcasts",
      type: "multi_select",
      options: ["Fiction", "Non-fiction", "History", "Self-help/Personal growth", "True crime", "Business/Entrepreneurship", "Science/Technology", "Spirituality/Philosophy", "News/Current events", "Health & fitness", "Other"],
      maxSelections: 5,
      validation: (values: string[]) => values.length > 0 ? null : "Please select at least one category",
    },
    {
      id: "favorite_restaurant",
      text: "Favorite restaurant in [city]",
      type: "text",
      placeholder: "Tell us about your favorite local spot",
    },
    {
      id: "going_out_vs_quiet",
      text: "Going out vs quiet hangs",
      type: "single_select",
      options: ["Out", "Quiet", "Mix"],
    },
    {
      id: "drink_alcohol",
      text: "Do you drink alcohol?",
      type: "single_select",
      options: ["Yes", "No"],
    },
    {
      id: "enjoy_cooking_hosting",
      text: "Enjoy cooking/hosting meals?",
      type: "likert",
      options: ["Strongly disagree", "Disagree", "Neutral", "Agree", "Strongly agree"],
    },
    {
      id: "creative_hobbies",
      text: "Creative hobbies (art, music, writing, crafts)",
      type: "multi_select",
      options: ["Art", "Music", "Writing", "Crafts", "Photography", "Cooking", "DIY projects", "Other"],
      validation: (values: string[]) => values.length > 0 ? null : "Please select at least one hobby",
    },
    {
      id: "first_meet_ideas",
      text: "First-meet ideas",
      type: "multi_select",
      options: ["Playing pickleball", "Escape room", "Bowling", "Window shopping at a mall", "Grabbing coffee", "Park walk", "New restaurant", "Trivia night", "Museum", "Casual workout/fitness class"],
      maxSelections: 5,
      validation: (values: string[]) => values.length > 0 ? null : "Please select at least one idea",
    },

    // Part B — Personality & Style (10)
    {
      id: "introvert_extrovert_scale",
      text: "I'd consider myself more of an introvert, extrovert, or somewhere in between",
      type: "scale",
      options: ["Very introverted", "Somewhat introverted", "In between", "Somewhat extroverted", "Very extroverted"],
    },
    {
      id: "punctual_person",
      text: "I'd consider myself a punctual person",
      type: "likert",
      options: ["Strongly disagree", "Disagree", "Neutral", "Agree", "Strongly agree"],
    },
    {
      id: "good_communicator",
      text: "In conversations, I'd consider myself a good communicator (asking questions, listening)",
      type: "likert",
      options: ["Strongly disagree", "Disagree", "Neutral", "Agree", "Strongly agree"],
    },
    {
      id: "planner_organized",
      text: "I'd consider myself a planner (I like things organized)",
      type: "likert",
      options: ["Strongly disagree", "Disagree", "Neutral", "Agree", "Strongly agree"],
    },
    {
      id: "spontaneous_adventurous",
      text: "I'd consider myself more spontaneous/adventurous",
      type: "likert",
      options: ["Strongly disagree", "Disagree", "Neutral", "Agree", "Strongly agree"],
    },
    {
      id: "reliable_friend",
      text: "I'd consider myself a reliable friend (I show up when I say I will)",
      type: "likert",
      options: ["Strongly disagree", "Disagree", "Neutral", "Agree", "Strongly agree"],
    },
    {
      id: "listener_or_talker",
      text: "I'd consider myself more of a listener or a talker",
      type: "single_select",
      options: ["Mostly listener", "Mostly talker", "Balance of both"],
    },

    // Part C — Work, Life & Anchors (8)
    {
      id: "work_study",
      text: "What do you do for work or study?",
      type: "text",
      placeholder: "Tell us about your work or studies",
    },
    {
      id: "industries",
      text: "Which industries best describe you?",
      type: "multi_select",
      options: ["Tech", "Healthcare", "Education", "Arts", "Business", "Trades", "Student", "Other"],
      maxSelections: 3,
      validation: (values: string[]) => values.length > 0 ? null : "Please select at least one industry",
    },
    {
      id: "current_life_stage",
      text: "Current life stage?",
      type: "single_select",
      options: ["Student", "Early career", "Parent", "Mid-career", "Retired", "Other"],
    },
    {
      id: "grew_up_here_or_moved",
      text: "Did you grow up here or move later?",
      type: "single_select",
      options: ["Local", "Newcomer", "Relocated"],
    },
    {
      id: "time_in_city",
      text: "How long have you lived in [user's city]?",
      type: "single_select",
      options: ["<1 yr", "1–3 yrs", "3–5 yrs", "5+ yrs"],
    },
    {
      id: "hometown_region",
      text: "Where's your hometown or region?",
      type: "text",
      placeholder: "Tell us about your hometown",
    },

    // Part D — Communication & Logistics (3)
    {
      id: "preferred_meetup_times",
      text: "When do you usually prefer to meet up?",
      type: "multi_select",
      options: ["Weekday day", "Weekday evening", "Weekend day", "Weekend evening"],
      validation: (values: string[]) => values.length > 0 ? null : "Please select at least one time",
    },
    {
      id: "travel_distance",
      text: "How far are you willing to travel for meetups?",
      type: "single_select",
      options: ["1 mile", "5 miles", "10 miles", "20 miles"],
    },
    {
      id: "hangout_preference",
      text: "Do you prefer casual 1:1 hangouts or group meetups for first meetings?",
      type: "single_select",
      options: ["1:1", "Small group", "No preference"],
    },

    // Part E — Creative Open-Ended (5)
    {
      id: "current_song_show_podcast",
      text: "A song, show, or podcast you've been into lately",
      type: "text",
      placeholder: "Share what you're enjoying",
    },
    {
      id: "free_saturday_activity",
      text: "If you had a free Saturday, how would you spend it?",
      type: "text",
      placeholder: "Describe your ideal Saturday",
    },
    {
      id: "small_things_better_day",
      text: "What's something small that always makes your day better?",
      type: "text",
      placeholder: "Share a little joy",
    },
    {
      id: "friends_describe_three_words",
      text: "If friends described you in 3 words, what might they say?",
      type: "text",
      placeholder: "What words come to mind?",
    },
    {
      id: "new_to_try_with_friends",
      text: "What's something new you'd like to try with friends this year?",
      type: "text",
      placeholder: "Share your aspirations",
    },

    // Part F — Let's Get Deeper (About You) (5)
    {
      id: "role_model_and_why",
      text: "Who do you consider a role model, and why?",
      type: "text",
      placeholder: "Tell us about someone who inspires you",
    },
    {
      id: "proud_of_lately",
      text: "What's something you're proud of lately?",
      type: "text",
      placeholder: "Share an achievement or moment",
    },
    {
      id: "morning_motivation",
      text: "What motivates you to get out of bed in the morning?",
      type: "text",
      placeholder: "What drives you?",
    },
    {
      id: "challenge_overcome",
      text: "What's a challenge you've overcome that shaped who you are?",
      type: "text",
      placeholder: "Share a meaningful experience",
    },
    {
      id: "looking_for_in_friend",
      text: "What are you looking for in a friend?",
      type: "text",
      placeholder: "What qualities matter most to you?",
    },
  ];

  useEffect(() => {
    if (user) {
      initializeChat();
    }
  }, [user]);

  const initializeChat = async () => {
    if (isInitializedRef.current) {
      console.log("Chat already initialized, skipping");
      return;
    }

    console.log("Initializing chat...");
    isInitializedRef.current = true;

    // Load existing chat history first
    if (!user) return;
    
    const { data: historyData, error: historyError } = await supabase
      .from('ai_chat_history')
      .select('message_data')
      .eq('user_id', user.id)
      .order('message_order', { ascending: true });

    if (historyError) {
      console.error('Error loading chat history:', historyError);
    }

    let existingMessages: Message[] = [];
    if (historyData && historyData.length > 0) {
      existingMessages = historyData.map(item => {
        const message = item.message_data as Message;
        // Convert timestamp string back to Date object
        if (message.timestamp && typeof message.timestamp === 'string') {
          message.timestamp = new Date(message.timestamp);
        }
        return message;
      });
      setMessages(existingMessages);
      console.log('Loaded chat history:', existingMessages.length, 'messages');
    }

    // Check if user has completed profile and intake
    console.log("Querying database for user ID:", user?.id);
    
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, birthdate, gender, pronouns, relationship_status, languages, city, lat, lng, radius_km, sexual_orientation")
      .eq("id", user?.id)
      .single();

    const { data: intakeData, error: intakeError } = await supabase
      .from("intake_responses")
      .select("*")
      .eq("user_id", user?.id)
      .single();

    console.log("Profile data from database:", profileData);
    console.log("Profile error:", profileError);
    console.log("Intake data from database:", intakeData);
    console.log("Intake error:", intakeError);

    // Check if profile is complete (has all required fields)
    console.log("Profile data from database:", profileData);
    const isProfileComplete = profileData && 
      profileData.first_name && 
      profileData.first_name !== "Cooking/Dining out, Concerts/Live music" && // Check for corrupted data
      profileData.birthdate && 
      profileData.gender && 
      profileData.pronouns && 
      profileData.relationship_status && 
      profileData.languages &&
      profileData.radius_km; // Location fields (city, lat, lng) are optional for now since location functionality isn't working
    console.log("Is profile complete:", isProfileComplete);

    // Check if user has started intake questions (has any intake responses)
    const hasStartedIntake = intakeData && Object.keys(intakeData).some(key => 
      key !== 'user_id' && key !== 'created_at' && key !== 'updated_at' && intakeData[key] !== null
    );
    
    // Only create welcome message if no history exists
    if (existingMessages.length === 0) {
      const welcomeMessage: Message = {
        id: `welcome-${Date.now()}-${Math.random()}`,
        text: "👋 Hi! I'm Moai, your AI friend-finding assistant. I'll help you meet new people nearby through thoughtful matching.\n\nFirst, let me get to know you a bit better with some basic information, then we'll dive into what you're looking for in friendships.\n\nReady to begin?",
        sender: "ai",
        timestamp: new Date(),
        type: "text",
      };
      
      setMessages([welcomeMessage]);
      await saveMessageToHistory(welcomeMessage);

      if (!isProfileComplete) {
        // Start profile collection process - find first unanswered question
        console.log("Starting profile collection...");
        const firstUnansweredStep = findFirstUnansweredProfileStep(profileData);
        console.log("First unanswered profile step:", firstUnansweredStep);
        setCurrentProfileStep(firstUnansweredStep);
        setTimeout(() => {
          askNextProfileQuestion();
        }, 1000);
      } else if (!intakeData) {
        // Profile complete, start intake process
        console.log("Profile complete, starting intake...");
        setIsProfileComplete(true);
        setTimeout(() => {
          askNextQuestion();
        }, 1000);
      } else {
        // Both profile and intake complete, check for weekly matches
        console.log("Both profile and intake complete, checking for matches...");
        setIsProfileComplete(true);
        await checkForWeeklyMatches();
      }
    } else {
      // We have existing messages, check database state to determine current phase
      if (hasStartedIntake) {
        console.log("User has started intake questions, continuing from database state...");
        setIsProfileComplete(true);
        // Find the last answered question to determine where to continue
        if (intakeData) {
          const answeredQuestions = Object.keys(intakeData).filter(key => 
            key !== 'user_id' && key !== 'created_at' && key !== 'updated_at' && intakeData[key] !== null
          );
          const lastAnsweredQuestion = answeredQuestions[answeredQuestions.length - 1];
          const nextQuestionIndex = intakeQuestions.findIndex(q => q.id === lastAnsweredQuestion) + 1;
          if (nextQuestionIndex < intakeQuestions.length) {
            setCurrentQuestion(nextQuestionIndex);
          } else {
            // All questions answered, complete intake
            completeIntake();
          }
        }
      } else if (isProfileComplete) {
        console.log("Profile complete but no intake started, starting intake...");
        setIsProfileComplete(true);
        setCurrentQuestion(0);
        setTimeout(() => {
          askNextQuestion();
        }, 1000);
      } else {
        console.log("Profile not complete, continuing profile collection...");
        const firstUnansweredStep = findFirstUnansweredProfileStep(profileData);
        setCurrentProfileStep(firstUnansweredStep);
        setTimeout(() => {
          askNextProfileQuestion();
        }, 1000);
      }
    }
  };

  const findFirstUnansweredProfileStep = (profileData: any) => {
    if (!profileData) return 0;
    
    // Check each profile question in order
    for (let i = 0; i < profileQuestions.length; i++) {
      const question = profileQuestions[i];
      let isAnswered = false;
      
      switch (question.id) {
        case "name":
          isAnswered = !!profileData.first_name;
          break;
        case "last_name":
          isAnswered = !!profileData.last_name;
          break;
        case "birthdate":
          isAnswered = !!profileData.birthdate;
          break;
        case "gender":
          isAnswered = !!profileData.gender;
          break;
        case "pronouns":
          isAnswered = !!profileData.pronouns;
          break;
        case "sexual_orientation":
          isAnswered = !!profileData.sexual_orientation;
          break;
        case "location":
          isAnswered = !!profileData.city;
          break;
        case "meet_radius":
          isAnswered = !!profileData.radius_km;
          break;
        case "relationship_status":
          isAnswered = !!profileData.relationship_status;
          break;
        case "languages":
          isAnswered = !!(profileData.languages && profileData.languages.length > 0);
          break;
      }
      
      if (!isAnswered) {
        console.log(`First unanswered question: ${question.id} at step ${i}`);
        return i;
      }
    }
    
    // All questions answered
    return profileQuestions.length;
  };

  const askNextProfileQuestion = () => {
    console.log(
      "askNextProfileQuestion called, currentProfileStep:",
      currentProfileStep,
      "total questions:",
      profileQuestions.length
    );

    if (currentProfileStep < profileQuestions.length) {
      const question = profileQuestions[currentProfileStep];
      console.log("Asking profile question:", question.id, question.text);

      const questionMessage: Message = {
        id: `profile-${question.id}-${currentProfileStep}-${Date.now()}-${Math.random()}`,
        text: question.text,
        sender: "ai",
        timestamp: new Date(),
        type: "profile-question",
        data: question,
      };
      setMessages((prev) => {
        const newMessages = [...prev, questionMessage];
        saveMessageToHistory(questionMessage);
        return newMessages;
      });
    } else {
      console.log("Profile questions complete, calling completeProfile");
      // Profile complete
      completeProfile();
    }
  };

  const moveToNextQuestion = () => {
    setCurrentProfileStep((prev) => {
      const nextStep = prev + 1;
      console.log("Moving to next question, step:", nextStep);
      
      // Ask next profile question after a short delay
      setTimeout(() => {
        if (nextStep < profileQuestions.length) {
          // Use the nextStep directly instead of relying on state
          const question = profileQuestions[nextStep];
          console.log("Asking next profile question:", question.id, question.text);

          const questionMessage: Message = {
            id: `profile-${question.id}-${nextStep}-${Date.now()}-${Math.random()}`,
            text: question.text,
            sender: "ai",
            timestamp: new Date(),
            type: "profile-question",
            data: question,
          };
          setMessages((prevMessages) => {
            const newMessages = [...prevMessages, questionMessage];
            saveMessageToHistory(questionMessage);
            return newMessages;
          });
        } else {
          completeProfile();
        }
      }, 500);
      
      return nextStep;
    });
  };

  const askNextQuestion = () => {
    console.log("askNextQuestion called, currentQuestion:", currentQuestion, "intakeQuestions.length:", intakeQuestions.length);
    if (currentQuestion < intakeQuestions.length) {
      const question = intakeQuestions[currentQuestion];
      console.log("Asking intake question:", question.id, question.text);
      const questionMessage: Message = {
        id: `question-${question.id}-${Date.now()}-${Math.random()}`,
        text: question.text,
        sender: "ai",
        timestamp: new Date(),
        type: "question",
        data: question,
      };
      setMessages((prev) => {
        const newMessages = [...prev, questionMessage];
        saveMessageToHistory(questionMessage);
        return newMessages;
      });
    } else {
      console.log("Intake complete, calling completeIntake");
      // Intake complete
      completeIntake();
    }
  };

  const saveIntakeAnswerToRemote = async (
    questionId: string,
    answer: string | string[]
  ) => {
    if (!user) {
      console.error("No user found when saving intake answer");
      return;
    }

    try {
      // Get current intake data from database
      const { data: existingIntake } = await supabase
        .from("intake_responses")
        .select("*")
        .eq("user_id", user.id)
        .single();

      let intakeToUpdate: any = {
        user_id: user.id,
        updated_at: new Date().toISOString(),
      };

      // If intake exists, merge with existing data to preserve required fields
      if (existingIntake) {
        intakeToUpdate = { ...existingIntake, ...intakeToUpdate };
      }

      // Update based on the question ID
      intakeToUpdate[questionId] = Array.isArray(answer) ? answer : answer;

      console.log("Updating intake in database:", intakeToUpdate, "for question:", questionId, "answer type:", typeof answer, "is array:", Array.isArray(answer));

      const { data, error } = await supabase
        .from("intake_responses")
        .upsert(intakeToUpdate);

      if (error) {
        console.error("Error saving intake answer:", error);
      } else {
        console.log("Intake answer saved successfully:", data);
      }
    } catch (error) {
      console.error("Error in saveIntakeAnswerToRemote:", error);
    }
  };

  const saveProfileAnswerToRemote = async (
    questionId: string,
    answer: string | string[]
  ) => {
    if (!user) {
      console.error("No user found when saving profile answer");
      return;
    }

    try {
      // Get current profile data from database
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      let profileToUpdate: any = {
        id: user.id,
        updated_at: new Date().toISOString(),
      };

      // If profile exists, merge with existing data to preserve required fields
      if (existingProfile) {
        profileToUpdate = { ...existingProfile, ...profileToUpdate };
      }

      // Update based on the question type
      switch (questionId) {
        case "name":
          if (typeof answer === "string") {
            profileToUpdate.first_name = answer;
          }
          break;
        case "last_name":
          if (typeof answer === "string") {
            profileToUpdate.last_name = answer;
          }
          break;
        case "birthdate":
          if (typeof answer === "string") {
            // Parse MM/DD/YYYY format and convert to YYYY-MM-DD for database
            const [month, day, year] = answer.split('/');
            const birthDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
            profileToUpdate.birthdate = birthDate.toISOString().split('T')[0]; // Store as YYYY-MM-DD
          }
          break;
        case "gender":
          if (typeof answer === "string") {
            // Store in dedicated gender column
            profileToUpdate.gender = answer;
          }
          break;
        case "pronouns":
          if (typeof answer === "string") {
            // Store pronouns in a dedicated column (you may need to add this to your schema)
            profileToUpdate.pronouns = answer;
          }
          break;
        case "sexual_orientation":
          if (typeof answer === "string") {
            // Store sexual orientation in a dedicated column
            profileToUpdate.sexual_orientation = answer;
          }
          break;
        case "profilePhoto":
          if (typeof answer === "string") {
            // Handle profile photo upload (placeholder for now)
            if (answer === "Yes, upload photo") {
              // TODO: Implement photo upload functionality
              console.log("Photo upload requested");
            }
          }
          break;
        case "location":
          if (typeof answer === "string") {
            if (answer === "Yes, use my location") {
              profileToUpdate.city = "San Francisco"; // Default for now
              profileToUpdate.lat = 37.7749;
              profileToUpdate.lng = -122.4194;
            } else if (answer.startsWith("Manual: ")) {
              const city = answer.replace("Manual: ", "");
              profileToUpdate.city = city;
              // Set default coordinates for the city (you could use a geocoding service here)
              profileToUpdate.lat = 37.7749; // Default to San Francisco for now
              profileToUpdate.lng = -122.4194;
            }
          }
          break;
        case "meetRadius":
          if (typeof answer === "string") {
            // Convert miles to km and store in radius_km column
            const radiusMiles = parseInt(answer.split(" ")[0]);
            profileToUpdate.radius_km = Math.round(radiusMiles * 1.60934);
          }
          break;
        case "relationshipStatus":
          if (typeof answer === "string") {
            // Store relationship status (you may need to add this to your schema)
            profileToUpdate.relationship_status = answer;
          }
          break;
        case "languages":
          // Store languages as an array (you may need to add this to your schema)
          profileToUpdate.languages = Array.isArray(answer) ? answer : [answer as string];
          break;
      }

      console.log("Updating profile in database:", profileToUpdate);

      const { data, error } = await supabase
        .from("profiles")
        .upsert(profileToUpdate);

      if (error) {
        console.error("Error saving profile answer:", error);
      } else {
        console.log("Profile answer saved successfully:", data);
      }
    } catch (error) {
      console.error("Error in saveProfileAnswerToRemote:", error);
    }
  };

  const completeProfile = async () => {
    console.log("completeProfile called, user:", user?.id);

    // Update bio_text with clean format using dedicated columns
    if (user) {
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("first_name, last_name, gender, age, pronouns, relationship_status, languages")
        .eq("id", user.id)
        .single();

      if (existingProfile) {
        const bioParts = [];
        // Combine first and last name
        const fullName = [existingProfile.first_name, existingProfile.last_name].filter(Boolean).join(" ");
        if (fullName) bioParts.push(fullName);
        if (existingProfile.age) bioParts.push(`${existingProfile.age} years old`);
        if (existingProfile.gender) bioParts.push(existingProfile.gender);
        if (existingProfile.pronouns) bioParts.push(existingProfile.pronouns);
        if (existingProfile.relationship_status) bioParts.push(existingProfile.relationship_status);
        if (existingProfile.languages && existingProfile.languages.length > 0) {
          bioParts.push(existingProfile.languages.slice(0, 3).join(", "));
        }

        const cleanBioText = bioParts.join(" • ");

        await supabase
          .from("profiles")
          .update({
            bio_text: cleanBioText,
            updated_at: new Date().toISOString(),
          })
          .eq("id", user.id);
      }
    }

    const completionMessage: Message = {
      id: "profile-completion",
      text: "Great! Now let's dive into what you're looking for in friendships. I'll ask you 50 questions to understand your preferences, communication style, and what makes a great friend for you.\n\nThis will take about 15-20 minutes. Ready to continue?",
      sender: "ai",
      timestamp: new Date(),
      type: "text",
    };
    setMessages((prev) => [...prev, completionMessage]);

    setIsProfileComplete(true);
    setCurrentQuestion(0); // Reset intake question counter

    // Don't start intake questions immediately - let the user respond to the completion message first
  };

  const completeIntake = async () => {
    const completionMessage: Message = {
      id: "completion",
      text: "🎉 All done! I'll use this information to curate your weekly friend introductions. You'll see them here every Sunday at noon.\n\nWant a Friday reminder?",
      sender: "ai",
      timestamp: new Date(),
      type: "text",
    };
    setMessages((prev) => [...prev, completionMessage]);

    // Save intake responses to database
    if (user) {
      // The intake responses are already saved individually as the user answers each question
      // Just mark as completed by updating the updated_at timestamp
      await supabase.from("intake_responses").upsert({
        user_id: user.id,
        updated_at: new Date().toISOString(),
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
          id: "welcome-back",
          text: "Welcome back! Your weekly friend introductions will appear here every Sunday. For now, feel free to chat with me about anything!",
          sender: "ai",
          timestamp: new Date(),
          type: "text",
        };
        setMessages((prev) => [...prev, welcomeBackMessage]);
      }
    } catch (error) {
      console.error("Error checking for weekly matches:", error);
    }
  };

  const showNextMatch = async () => {
    if (currentMatchIndex >= weeklyMatches.length) {
      // All matches shown
      const noMoreMatchesMessage: Message = {
        id: "no-more-matches",
        text: "That's all your introductions for this week! Check back next Sunday for new friend suggestions. Feel free to chat with me about anything!",
        sender: "ai",
        timestamp: new Date(),
        type: "text",
      };
      setMessages((prev) => [...prev, noMoreMatchesMessage]);
      return;
    }

    const match = weeklyMatches[currentMatchIndex];

    // Get the other user's profile
    const otherUserId = match.user_a === user?.id ? match.user_b : match.user_a;
    const { data: otherUser } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", otherUserId)
      .single();

    if (otherUser) {
      const matchMessage: Message = {
        id: `match-${match.id}`,
        text: `Here's your ${currentMatchIndex + 1}${
          currentMatchIndex === 0 ? "st" : currentMatchIndex === 1 ? "nd" : "rd"
        } friend introduction for the week:`,
        sender: "ai",
        timestamp: new Date(),
        type: "match-card",
        data: { match, otherUser },
      };
      setMessages((prev) => [...prev, matchMessage]);
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
        text: accepted
          ? "Got it — I'll check with them."
          : "No worries! I'll find you other great matches.",
        sender: "ai",
        timestamp: new Date(),
        type: "text",
      };
      setMessages((prev) => [...prev, responseMessage]);

      // Move to next match
      setCurrentMatchIndex((prev) => prev + 1);
      setTimeout(() => {
        showNextMatch();
      }, 1500);
    } catch (error) {
      console.error("Error handling match response:", error);
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    const userMessage: Message = {
      id: `user-${Date.now()}-${Math.random()}`,
      text: inputText,
      sender: "user",
      timestamp: new Date(),
      type: "text",
    };

    setMessages((prev) => {
      const newMessages = [...prev, userMessage];
      saveMessageToHistory(userMessage);
      return newMessages;
    });
    const currentInput = inputText;
    setInputText("");
    setIsTyping(true);

    // Handle city input if waiting for it
    if (waitingForCityInput) {
      console.log("Saving city input:", currentInput);
      await saveProfileAnswerToRemote("location", `Manual: ${currentInput}`);
      setWaitingForCityInput(false);
      moveToNextQuestion();
      setIsTyping(false);
      return;
    }

    // Handle intake questions first if we're in intake mode
    if (isProfileComplete && currentQuestion >= 0 && currentQuestion < intakeQuestions.length) {
      const currentIntakeQuestion = intakeQuestions[currentQuestion];
      console.log(
        "Intake question handling:",
        currentIntakeQuestion,
        currentQuestion,
        "isProfileComplete:", isProfileComplete,
        "intakeQuestions.length:", intakeQuestions.length
      );

      if (currentIntakeQuestion.type === "text") {
        console.log(
          "Saving intake answer to remote database:",
          currentIntakeQuestion.id,
          currentInput,
          "Question type:", currentIntakeQuestion.type
        );

        // Save to intake_responses table
        await saveIntakeAnswerToRemote(currentIntakeQuestion.id, currentInput);

        // Move to next intake question
        setCurrentQuestion((prev) => prev + 1);
        setTimeout(() => {
          askNextQuestion();
        }, 1000);

        setIsTyping(false);
        return;
      }

      if (currentIntakeQuestion.type === "multi_select") {
        // For multi-select questions, use the selectedMultiSelectOptions state
        const selectedOptions = selectedMultiSelectOptions[currentIntakeQuestion.id] || [];
        console.log("Multi-select question, selectedOptions:", selectedOptions, "for question:", currentIntakeQuestion.id);
        
        // Run validation if it exists
        if (currentIntakeQuestion.validation) {
          const validationError = currentIntakeQuestion.validation(selectedOptions);
          if (validationError) {
            console.log("Validation failed:", validationError);
            const errorMessage: Message = {
              id: `error-${Date.now()}`,
              text: validationError,
              sender: "ai",
              timestamp: new Date(),
              type: "text",
            };
            setMessages((prev) => [...prev, errorMessage]);
            setIsTyping(false);
            return;
          }
        }
        
        if (selectedOptions.length > 0) {
          console.log(
            "Saving multi-select answer to remote database:",
            currentIntakeQuestion.id,
            selectedOptions,
            "as array:", Array.isArray(selectedOptions)
          );

          // Save to intake_responses table - ensure it's saved as an array
          await saveIntakeAnswerToRemote(currentIntakeQuestion.id, selectedOptions);

          // Clear selected options for next use
          setSelectedMultiSelectOptions(prev => {
            const newState = { ...prev };
            delete newState[currentIntakeQuestion.id];
            return newState;
          });

          // Move to next intake question
          setCurrentQuestion((prev) => prev + 1);
          setTimeout(() => {
            askNextQuestion();
          }, 1000);

          setIsTyping(false);
          return;
        } else {
          // Show error message if no options selected
          const errorMessage: Message = {
            id: (Date.now() + 1).toString(),
            text: "Please select at least one option before continuing.",
            sender: "ai",
            timestamp: new Date(),
            type: "text",
          };
          setMessages((prev) => [...prev, errorMessage]);
          setIsTyping(false);
          return;
        }
      }
    }

    // Handle profile questions if we're in profile collection mode
    if (!isProfileComplete && currentProfileStep < profileQuestions.length) {
      const currentProfileQuestion = profileQuestions[currentProfileStep];
      console.log(
        "Profile question handling:",
        currentProfileQuestion,
        currentProfileStep
      );

      if (
        currentProfileQuestion.type === "text" ||
        currentProfileQuestion.type === "date"
      ) {
        console.log(
          "Saving profile answer to remote database:",
          currentProfileQuestion.id,
          currentInput
        );

        // Save directly to remote database
        await saveProfileAnswerToRemote(
          currentProfileQuestion.id,
          currentInput
        );

        // Move to next profile question
        moveToNextQuestion();

        setIsTyping(false);
        return;
      }

      if (currentProfileQuestion.type === "language_select") {
        // For language selection, use the selectedLanguages state
        if (selectedLanguages.length > 0) {
          console.log(
            "Saving languages to remote database:",
            currentProfileQuestion.id,
            selectedLanguages
          );

          // Save directly to remote database
          await saveProfileAnswerToRemote(
            currentProfileQuestion.id,
            selectedLanguages
          );

          // Clear selected languages for next use
          setSelectedLanguages([]);

          // Move to next profile question
          moveToNextQuestion();

          setIsTyping(false);
          return;
        } else {
          // Show error message if no languages selected
          const errorMessage: Message = {
            id: (Date.now() + 1).toString(),
            text: "Please select at least one language before continuing.",
            sender: "ai",
            timestamp: new Date(),
            type: "text",
          };
          setMessages((prev) => [...prev, errorMessage]);
          setIsTyping(false);
          return;
        }
      }
    }

    // Handle profile completion message
    if (isProfileComplete && currentQuestion === 0) {
      console.log("Starting intake questions after profile completion");
      // User has responded to the profile completion message, start intake questions
      setCurrentQuestion(0);
      setTimeout(() => {
        askNextQuestion();
      }, 1000);
      setIsTyping(false);
      return;
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
        sender: "ai",
        timestamp: new Date(),
        type: "text",
      };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "Sorry, I'm having trouble responding right now. Please try again!",
        sender: "ai",
        timestamp: new Date(),
        type: "text",
      };
      setMessages((prev) => [...prev, errorMessage]);
    }
    setIsTyping(false);
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.sender === "user";

    return (
      <View
        style={[
          styles.messageContainer,
          isUser ? styles.userMessage : styles.aiMessage,
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            isUser ? styles.userBubble : styles.aiBubble,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              isUser ? styles.userText : styles.aiText,
            ]}
          >
            {item.text}
          </Text>

                      {/* Fix: Add check for item.data.options existence */}
            {item.type === "question" &&
              item.data &&
              item.data.options &&
              Array.isArray(item.data.options) &&
              (item.data.type === "single_select" || item.data.type === "likert" || item.data.type === "scale") && (
                (() => {
                  console.log("Rendering question with options:", item.data.id, "type:", item.data.type, "options:", item.data.options);
                  return (
                    <View style={styles.questionOptions}>
                      {item.data.options.map((option: string, index: number) => (
                        <TouchableOpacity
                          key={index}
                          style={styles.optionChip}
                          onPress={async () => {
                            // Add user's selection as a message
                            const userSelectionMessage: Message = {
                              id: `selection-${Date.now()}`,
                              text: option,
                              sender: "user",
                              timestamp: new Date(),
                              type: "text",
                            };
                            setMessages((prev) => [...prev, userSelectionMessage]);

                            // Save the answer to remote database
                            await saveIntakeAnswerToRemote(item.data.id, option);

                            // Move to next question
                            setCurrentQuestion((prev) => prev + 1);

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
                  );
                })()
              )}

          {/* Fix: Add check for profile question options */}
          {item.type === "profile-question" && item.data && (
            <View style={styles.questionOptions}>
              {item.data.type === "chips" &&
                item.data.options &&
                Array.isArray(item.data.options) &&
                item.data.options.map((option: string, index: number) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.optionChip}
                    onPress={async () => {
                      // Add user's selection as a message
                      const userSelectionMessage: Message = {
                        id: `profile-selection-${
                          item.data.id
                        }-${currentProfileStep}-${Date.now()}`,
                        text: option,
                        sender: "user",
                        timestamp: new Date(),
                        type: "text",
                      };
                      setMessages((prev) => [...prev, userSelectionMessage]);

                      // Save directly to remote database
                      await saveProfileAnswerToRemote(item.data.id, option);

                      // Move to next profile question
                      moveToNextQuestion();
                    }}
                  >
                    <Text style={styles.optionText}>{option}</Text>
                  </TouchableOpacity>
                ))}

              {item.data.type === "multi_select" &&
                item.data.options &&
                Array.isArray(item.data.options) && (
                  <View style={styles.multiSelectContainer}>
                    <Text style={styles.multiSelectInstruction}>
                      {item.data.maxSelections ? `Tap options to add them to the text box below (up to ${item.data.maxSelections}), then press send:` : "Tap options to add them to the text box below, then press send:"}
                    </Text>
                    {item.data.options.map((option: string, index: number) => (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.multiSelectChip,
                          selectedMultiSelectOptions[item.data.id]?.includes(option) && styles.selectedChip
                        ]}
                        onPress={() => {
                          const questionId = item.data.id;
                          setSelectedMultiSelectOptions(prev => {
                            const currentSelections = prev[questionId] || [];
                            let newSelections;
                            
                            if (currentSelections.includes(option)) {
                              // Remove if already selected
                              newSelections = currentSelections.filter(item => item !== option);
                            } else if (item.data.maxSelections && currentSelections.length >= item.data.maxSelections) {
                              // Don't add if at limit
                              newSelections = currentSelections;
                            } else {
                              // Add if under limit
                              newSelections = [...currentSelections, option];
                            }
                            
                            // Update the input text to show selected options
                            setInputText(newSelections.join(', '));
                            
                            return {
                              ...prev,
                              [questionId]: newSelections
                            };
                          });
                        }}
                      >
                        <Text style={[
                          styles.optionText,
                          selectedMultiSelectOptions[item.data.id]?.includes(option) && styles.selectedOptionText
                        ]}>
                          {option}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

              {item.data.type === "language_select" &&
                item.data.options &&
                Array.isArray(item.data.options) && (
                  <View style={styles.multiSelectContainer}>
                    <Text style={styles.multiSelectInstruction}>
                      Tap languages to add them to the text box below (up to 5), then press send:
                    </Text>
                    {item.data.options.map((option: string, index: number) => (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.multiSelectChip,
                          selectedLanguages.includes(option) && styles.selectedChip
                        ]}
                        onPress={() => {
                          setSelectedLanguages(prev => {
                            let newSelection;
                            if (prev.includes(option)) {
                              // Remove if already selected
                              newSelection = prev.filter(lang => lang !== option);
                            } else if (prev.length < 5) {
                              // Add if under limit
                              newSelection = [...prev, option];
                            } else {
                              // Don't add if at limit
                              newSelection = prev;
                            }
                            
                            // Update the input text to show selected languages
                            setInputText(newSelection.join(', '));
                            return newSelection;
                          });
                        }}
                      >
                        <Text style={[
                          styles.optionText,
                          selectedLanguages.includes(option) && styles.selectedOptionText
                        ]}>
                          {option}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}



              {item.data.type === "location" &&
                item.data.options &&
                Array.isArray(item.data.options) &&
                item.data.options.map((option: string, index: number) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.optionChip}
                    onPress={async () => {
                      // Add user's selection as a message
                      const userSelectionMessage: Message = {
                        id: `profile-selection-${
                          item.data.id
                        }-${currentProfileStep}-${Date.now()}`,
                        text: option,
                        sender: "user",
                        timestamp: new Date(),
                        type: "text",
                      };
                      setMessages((prev) => [...prev, userSelectionMessage]);

                      if (option === "Yes, use my location") {
                        // Save location data directly
                        await saveProfileAnswerToRemote(item.data.id, option);
                        // Move to next profile question
                        moveToNextQuestion();
                      } else if (option === "No, I will enter manually") {
                        // Ask user to enter their city manually
                        const cityQuestionMessage: Message = {
                          id: `city-question-${Date.now()}`,
                          text: "Please enter your city:",
                          sender: "ai",
                          timestamp: new Date(),
                          type: "text",
                        };
                        setMessages((prev) => [...prev, cityQuestionMessage]);
                        // Set a flag to indicate we're waiting for city input
                        setWaitingForCityInput(true);
                      }
                    }}
                  >
                    <Text style={styles.optionText}>{option}</Text>
                  </TouchableOpacity>
                ))}

              {item.data.type === "photo" &&
                item.data.options &&
                Array.isArray(item.data.options) &&
                item.data.options.map((option: string, index: number) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.optionChip}
                    onPress={async () => {
                      // Add user's selection as a message
                      const userSelectionMessage: Message = {
                        id: `profile-selection-${
                          item.data.id
                        }-${currentProfileStep}-${Date.now()}`,
                        text: option,
                        sender: "user",
                        timestamp: new Date(),
                        type: "text",
                      };
                      setMessages((prev) => [...prev, userSelectionMessage]);

                      // Save directly to remote database
                      await saveProfileAnswerToRemote(item.data.id, option);

                      // Move to next profile question
                      moveToNextQuestion();
                    }}
                  >
                    <Text style={styles.optionText}>{option}</Text>
                  </TouchableOpacity>
                ))}
            </View>
          )}

          {/* Multi-select rendering for intake questions */}
          {item.type === "question" && item.data && item.data.type === "multi_select" &&
            item.data.options &&
            Array.isArray(item.data.options) && (
              <View style={styles.multiSelectContainer}>
                <Text style={styles.multiSelectInstruction}>
                  {item.data.maxSelections ? `Tap options to add them to the text box below (up to ${item.data.maxSelections}), then press send:` : "Tap options to add them to the text box below, then press send:"}
                </Text>
                {item.data.options.map((option: string, index: number) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.multiSelectChip,
                      selectedMultiSelectOptions[item.data.id]?.includes(option) && styles.selectedChip
                    ]}
                    onPress={() => {
                      const questionId = item.data.id;
                      setSelectedMultiSelectOptions(prev => {
                        const currentSelections = prev[questionId] || [];
                        let newSelections;
                        
                        if (currentSelections.includes(option)) {
                          // Remove if already selected
                          newSelections = currentSelections.filter(item => item !== option);
                        } else if (item.data.maxSelections && currentSelections.length >= item.data.maxSelections) {
                          // Don't add if at limit
                          newSelections = currentSelections;
                        } else {
                          // Add if under limit
                          newSelections = [...currentSelections, option];
                        }
                        
                        // Update the input text to show selected options
                        setInputText(newSelections.join(', '));
                        
                        return {
                          ...prev,
                          [questionId]: newSelections
                        };
                      });
                    }}
                  >
                    <Text style={[
                      styles.optionText,
                      selectedMultiSelectOptions[item.data.id]?.includes(option) && styles.selectedOptionText
                    ]}>
                      {option}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

          {item.type === "match-card" && item.data && (
            <MatchCard
              match={item.data.match}
              otherUser={item.data.otherUser}
              onAccept={() => handleMatchResponse(item.data.match.id, true)}
              onDecline={() => handleMatchResponse(item.data.match.id, false)}
            />
          )}
        </View>
        <Text style={styles.timestamp}>
          {item.timestamp ? item.timestamp.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }) : ""}
        </Text>
      </View>
    );
  };

  const hasOptionsAvailable = () => {
    const lastMessage = messages[messages.length - 1];
    return (
      lastMessage &&
      lastMessage.sender === "ai" &&
      ((lastMessage.type === "question" && lastMessage.data?.options) ||
        (lastMessage.type === "profile-question" && lastMessage.data?.options))
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
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
          <Text
            style={[styles.typingText, { color: theme.colors.textSecondary }]}
          >
            Moai is typing...
          </Text>
          <ActivityIndicator size="small" color={theme.colors.primary} />
        </View>
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.inputContainer}
      >
        <View
          style={[
            styles.inputWrapper,
            { backgroundColor: theme.colors.surface },
          ]}
        >
          {/* <TextInput
            style={[styles.textInput, { color: theme.colors.text }]}
            value={inputText}
            onChangeText={setInputText}
            placeholder={
              !isProfileComplete && currentProfileStep < profileQuestions.length
                ? profileQuestions[currentProfileStep].placeholder ||
                  "Type a message..."
                : "Type a message..."
            }
            placeholderTextColor={theme.colors.textSecondary}
            multiline
            maxLength={500}
          /> */}
          <TextInput
            style={[styles.textInput, { color: theme.colors.text }]}
            value={inputText}
            onChangeText={setInputText}
            editable={!hasOptionsAvailable()} // Add this line
            placeholder={
              !isProfileComplete && currentProfileStep < profileQuestions.length
                ? profileQuestions[currentProfileStep].placeholder ||
                  "Type a message..."
                : "Type a message..."
            }
            placeholderTextColor={theme.colors.textSecondary}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              {
                backgroundColor: inputText.trim()
                  ? theme.colors.primary
                  : theme.colors.border,
              },
            ]}
            onPress={handleSendMessage}
            disabled={!inputText.trim()}
          >
            <Ionicons
              name="send"
              size={20}
              color={inputText.trim() ? "#FFFFFF" : theme.colors.textSecondary}
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
    borderBottomColor: "#1C1C1E",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    textAlign: "center",
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
    flexDirection: "row", // Change from "column" to "row"
    width: "100%",
    marginBottom: 20, // Add space for timestamp
  },
  userMessage: {
    justifyContent: "flex-end",
  },
  aiMessage: {
    justifyContent: "flex-start",
  },
  messageBubble: {
    maxWidth: "80%",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  userBubble: {
    backgroundColor: "#7C6CFF",
    borderBottomRightRadius: 4,
    alignSelf: "flex-end", // Add this
  },
  aiBubble: {
    backgroundColor: "#1C1C1E",
    borderBottomLeftRadius: 4,
    alignSelf: "flex-start", // Add this
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userText: {
    color: "#FFFFFF",
  },
  aiText: {
    color: "#FFFFFF",
  },
  timestamp: {
    position: "absolute",
    bottom: -18,
    fontSize: 12,
    color: "#8E8E93",
    marginTop: 4,
    marginHorizontal: 8,
  },
  questionOptions: {
    marginTop: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  optionChip: {
    backgroundColor: "#2C2C2E",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#3C3C3E",
  },
  optionText: {
    color: "#FFFFFF",
    fontSize: 14,
  },
  multiSelectContainer: {
    marginTop: 12,
  },
  multiSelectInstruction: {
    color: "#FFFFFF",
    fontSize: 14,
    marginBottom: 8,
    fontStyle: "italic",
  },
  multiSelectChip: {
    backgroundColor: "#2C2C2E",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#3C3C3E",
    marginBottom: 8,
  },
  typingIndicator: {
    flexDirection: "row",
    alignItems: "center",
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
    borderTopColor: "#1C1C1E",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "flex-end",
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    maxHeight: 38,
    paddingVertical: 8,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  selectedChip: {
    backgroundColor: "#7C6CFF",
    borderColor: "#7C6CFF",
  },
  selectedOptionText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  languageInputContainer: {
    marginTop: 12,
    paddingHorizontal: 8,
  },
  languageInputLabel: {
    color: "#FFFFFF",
    fontSize: 14,
    marginBottom: 4,
    fontWeight: "500",
  },
  languageInput: {
    backgroundColor: "#2C2C2E",
    borderWidth: 1,
    borderColor: "#3C3C3E",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: "#FFFFFF",
    fontSize: 14,
    minHeight: 40,
  },
});
