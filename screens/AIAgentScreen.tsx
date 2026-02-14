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
import * as Location from 'expo-location';
import { useTheme } from "../contexts/ThemeContext";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/mcp-supabase";
import { openAIService } from "../lib/openai";
import { MatchingService } from "../lib/matching-service";
import MatchCard from "../components/MatchCard";
import ErrorBoundary from "../components/ErrorBoundary";
import QuestionnaireProgress from "../components/QuestionnaireProgress";
import { intakeQuestions, profileQuestions, questionToColumnMap } from "../data/AIAgentScreen";
import { useChatMessages, Message } from "../hooks/useChatMessages";
import { useLivContext } from "../hooks/useLivContext";
import { useQuestionnaire } from "../hooks/useQuestionnaire";
import { findFirstUnansweredIntakeQuestion, isIntakeComplete } from "../utils/questionnaireUtils";

// Slider Component - must be outside main component to use hooks
interface SliderComponentProps {
  questionId: string;
  min: number;
  max: number;
  defaultValue: number;
  label: string;
  currentValue?: number | string;
  onValueChange: (value: number) => Promise<void>;
  theme: any;
}

const SliderComponent: React.FC<SliderComponentProps> = ({
  questionId,
  min,
  max,
  defaultValue,
  label,
  currentValue,
  onValueChange,
  theme,
}) => {
  const sliderTrackRef = useRef<View>(null);
  const [trackWidth, setTrackWidth] = useState(280);
  const [localSliderValue, setLocalSliderValue] = useState(() => {
    if (currentValue !== undefined) {
      return typeof currentValue === 'string' ? parseInt(currentValue) : currentValue;
    }
    return defaultValue;
  });

  const formatLabel = (value: number) => {
    return label.replace("{value}", value.toString());
  };

  const updateSliderValue = (touchX: number, width: number) => {
    const newValue = Math.round(min + ((touchX / width) * (max - min)));
    const clampedValue = Math.max(min, Math.min(max, newValue));
    setLocalSliderValue(clampedValue);
  };

  const handleConfirm = async () => {
    await onValueChange(localSliderValue);
  };

  const thumbSize = 24;
  const trackHeight = 6;
  const percentage = ((localSliderValue - min) / (max - min)) * 100;
  const thumbPosition = Math.max(0, Math.min(trackWidth - thumbSize, (percentage / 100) * (trackWidth - thumbSize)));

  return (
    <View style={styles.sliderContainer}>
      <View 
        ref={sliderTrackRef}
        style={styles.sliderTrackContainer}
        onLayout={(e) => {
          const width = e.nativeEvent.layout.width - 24; // Account for padding
          if (width > 0) {
            setTrackWidth(width);
          }
        }}
      >
        {/* Track background */}
        <View style={[styles.sliderTrack, { 
          height: trackHeight,
          backgroundColor: "#636366" 
        }]} />
        {/* Filled track */}
        <View style={[styles.sliderTrackFilled, { 
          width: `${percentage}%`,
          height: trackHeight,
          backgroundColor: theme.colors.primary 
        }]} />
        {/* Thumb */}
        <View
          style={[
            styles.sliderThumb,
            {
              width: thumbSize,
              height: thumbSize,
              backgroundColor: theme.colors.primary,
              left: thumbPosition,
            }
          ]}
        />
        {/* Touchable area for dragging */}
        <View
          style={StyleSheet.absoluteFill}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderGrant={(e) => {
            const touchX = e.nativeEvent.locationX;
            updateSliderValue(touchX, trackWidth);
          }}
          onResponderMove={(e) => {
            const touchX = e.nativeEvent.locationX;
            updateSliderValue(touchX, trackWidth);
          }}
          onResponderRelease={() => {
            // Don't auto-save on release, wait for confirmation button
          }}
        />
      </View>
      <Text style={[styles.sliderLabel, { color: theme.colors.text }]}>
        {formatLabel(localSliderValue)}
      </Text>
      <TouchableOpacity
        style={[styles.sliderConfirmButton, { backgroundColor: theme.colors.primary }]}
        onPress={handleConfirm}
      >
        <Text style={styles.sliderConfirmButtonText}>Confirm</Text>
      </TouchableOpacity>
    </View>
  );
};

// Message interface is now imported from useChatMessages hook

interface MatchData {
  match: any;
  otherUser: any;
}

export default function AIAgentScreen() {
  const theme = useTheme();
  const { user } = useAuth();
  
  // Use optimized hooks
  const {
    messages,
    loading: messagesLoading,
    addMessage,
    addMessages,
    scrollToBottom,
    flatListRef,
    keyExtractor,
  } = useChatMessages(user?.id || null);
  
  const { context, refreshContext } = useLivContext(user?.id || null);
  
  const questionnaire = useQuestionnaire(user?.id || null);
  
  // Local UI state
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [intakeAnswers, setIntakeAnswers] = useState<Record<string, any>>({});
  const [weeklyMatches, setWeeklyMatches] = useState<any[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  
  // Refs for preventing duplicate operations
  const isAskingQuestionRef = useRef(false);
  const profileCompletedRef = useRef(false);
  const initializedRef = useRef(false);
  const intakeInitializedRef = useRef(false);
  const hasScrolledToBottomRef = useRef(false);
  const isUserScrollingRef = useRef(false);

  // Intro and outro messages for the new questionnaire
  const intakeIntro = {
    text: "👋 Hi! I'll ask you some quick questions to help match you with new friends. It'll take about 5–7 minutes. Most are quick taps, a few are write-ins. You can skip anything. Ready?",
    type: "intro",
    options: ["Let's go", "Not now"],
  };

  const intakeOutro = {
    text: "🎉 All set! Thanks for sharing. I'll use this to curate your weekly connections. They'll show up here every Sunday. Want a Friday reminder?",
    type: "outro",
    options: ["Yes", "No"],
  };

  // Initialize questionnaire when user loads. Only runs when this screen is mounted;
  // AuthScreen gates so we only mount after profile is complete (onboarding done).
  useEffect(() => {
    if (user && !initializedRef.current) {
      initializedRef.current = true;
      console.log("Liv: Profile gate passed, initializing questionnaire (intake) for user:", user.id);
      questionnaire.initialize();
    }
  }, [user, questionnaire]);

  // Initialize chat flow after questionnaire and messages load. Run when we're in intake mode
  // and either chat is empty or the last message isn't the current intake question (so we ask it).
  // Never run when the last message is from the user (they just answered) — handleSendMessage
  // will ask the next question; running here would use stale intake data and re-ask the same question.
  useEffect(() => {
    if (
      !user ||
      !questionnaire.initialLoadComplete ||
      !questionnaire.isProfileComplete ||
      messagesLoading ||
      questionnaire.isIntakeComplete ||
      intakeInitializedRef.current
    ) {
      return;
    }
    const lastMsg = messages[messages.length - 1];
    if (lastMsg?.sender === "user") return;

    const currentQ = questionnaire.currentIntakeQuestion;
    const lastIsCurrentQuestion =
      lastMsg?.type === "question" && lastMsg?.data?.id === intakeQuestions[currentQ]?.id;
    const needToAsk = messages.length === 0 || !lastIsCurrentQuestion;
    if (!needToAsk) return;

    intakeInitializedRef.current = true;
    initializeChat();
  }, [user, questionnaire.initialLoadComplete, questionnaire.isProfileComplete, questionnaire.isIntakeComplete, questionnaire.currentIntakeQuestion, messagesLoading, messages.length, messages]);

  // Scroll to bottom when messages first load (only once)
  useEffect(() => {
    if (messages.length > 0 && flatListRef.current && !hasScrolledToBottomRef.current) {
      // Delay to ensure FlatList is fully rendered
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
        hasScrolledToBottomRef.current = true;
      }, 300);
    }
  }, [messages.length === 0 ? null : messages[0]?.id]); // Only trigger on initial load

  const initializeChat = async () => {
    if (!user) {
      console.log("initializeChat: No user, returning");
      return;
    }
    
    console.log("initializeChat: Starting initialization", {
      messagesLength: messages.length,
      profileData: questionnaire.profileData,
      intakeData: questionnaire.intakeData,
    });
    
    const profileData = questionnaire.profileData;
    const intakeData = questionnaire.intakeData;
    const isProfileComplete = questionnaire.isProfileComplete;
    const isIntakeCompleteValue = isIntakeComplete(intakeData);
    
    console.log("initializeChat: Status check", {
      isProfileComplete,
      isIntakeCompleteValue,
    });
    
    // Check if intake has started
    let hasStartedIntake = false;
    if (intakeData) {
      if (intakeData.responses && Array.isArray(intakeData.responses)) {
        hasStartedIntake = intakeData.responses.length > 0;
      }
    }

    // Check if questionnaire is already complete
    const questionnaireComplete = isProfileComplete && isIntakeCompleteValue;
    
    console.log("initializeChat: Questionnaire complete?", questionnaireComplete);
    
    // Check if completion message already exists
    const hasCompletionMessage = messages.some(m => 
      m.sender === "ai" && 
      m.text && 
      m.text.includes("You're all set") && 
      m.text.includes("great matches")
    );

    // Profile is collected via multipage onboarding; here we only run intake + completion.
    // Always check database state to determine what question to ask next.
    if (!questionnaireComplete) {
      // Show welcome only when starting fresh (no messages) and intake not complete
      if (messages.length === 0 && !isIntakeCompleteValue) {
        console.log("initializeChat: Showing welcome message");
        const welcomeMessage: Message = {
          id: `welcome-${Date.now()}-${Math.random()}`,
          text: "Hi! I'm Liv, your AI connection assistant. I'll help you meet like-minded people through thoughtful matching.\n\nLet me ask you a few questions about what you're looking for in new connections. Feel free to skip any question by typing \"skip.\" Ready?",
          sender: "ai",
          timestamp: new Date(),
          type: "text",
        };
        await addMessage(welcomeMessage);
      }

      if (!isIntakeCompleteValue) {
        const firstUnansweredIntake = findFirstUnansweredIntakeQuestion(intakeData, profileData);
        console.log("initializeChat: Next intake question based on database:", firstUnansweredIntake);
        questionnaire.dispatch({ type: "SET_CURRENT_INTAKE_QUESTION", payload: firstUnansweredIntake });

        const lastMessage = messages[messages.length - 1];
        const isAlreadyAsking = lastMessage?.type === "question" &&
          lastMessage?.data?.id === intakeQuestions[firstUnansweredIntake]?.id;

        if (!isAlreadyAsking) {
          setTimeout(() => {
            checkAndAskQuestion(firstUnansweredIntake);
          }, messages.length === 0 ? 1000 : 500);
        }
      }
    } else {
      // Questionnaire complete
      console.log("initializeChat: Questionnaire complete based on database");
      questionnaire.dispatch({ type: "SET_CURRENT_INTAKE_QUESTION", payload: intakeQuestions.length });
      
      // Only show completion message if it doesn't already exist
      if (!hasCompletionMessage) {
        setTimeout(() => {
          const completionMessage: Message = {
            id: `completion-${Date.now()}-${Math.random()}`,
            text: "🎉 You're all set! We have everything we need to find you great matches.\n\nWe'll send over your next set of matches this weekend. In the meantime, feel free to chat with me about anything!",
            sender: "ai",
            timestamp: new Date(),
            type: "text",
          };
          addMessage(completionMessage);
        }, 1000);
      }
    }
  };

  // Note: findFirstUnansweredIntakeQuestion is now imported from utils/questionnaireUtils
  // Keeping this for backward compatibility but it should use the imported version
  const findFirstUnansweredIntakeQuestionLocal = (intakeData: any, profileDataParam?: any) => {
    if (!intakeData) {
      console.log("findFirstUnansweredIntakeQuestion: no intakeData");
      return 0;
    }

    // Handle v5 format (JSON array)
    const isV5Format = intakeData.responses && Array.isArray(intakeData.responses);
    const responsesMap = isV5Format 
      ? new Map(intakeData.responses.map((r: any) => [r.question_id, r.answer]))
      : null;

    console.log("findFirstUnansweredIntakeQuestion: checking", 
      isV5Format ? `${intakeData.responses.length} responses (v5)` : `no responses`);
    
    // Log all question IDs in responses for debugging
    if (isV5Format && intakeData.responses.length > 0) {
      const responseQuestionIds = intakeData.responses.map((r: any) => r.question_id);
      console.log("Response question IDs in database:", responseQuestionIds);
      console.log("Expected question IDs:", intakeQuestions.map(q => q.id));
    }

    // Check each intake question in order
    for (let i = 0; i < intakeQuestions.length; i++) {
      const question = intakeQuestions[i];
      
      // Get answer from v5 format (JSON array)
      const fieldValue = isV5Format 
        ? responsesMap?.get(question.id)
        : null;
      
      // Skip conditional questions that shouldn't be shown
      if ('conditionalOn' in question && question.conditionalOn && 'showIf' in question && question.showIf) {
        const conditionalOn = question.conditionalOn as string;
        const showIf = question.showIf as string[];
        const conditionalValue = isV5Format 
          ? responsesMap?.get(conditionalOn)
          : (intakeData as any)[conditionalOn];
        if (!conditionalValue || !showIf.includes(conditionalValue)) {
          console.log(`Skipping conditional question ${question.id} - condition not met`);
          continue; // Skip this question as it's conditional and conditions aren't met
        }
      }

      // Check if question is answered
      let isAnswered = false;
      if (question.type === "multi_select") {
        isAnswered = !!(fieldValue && Array.isArray(fieldValue) && fieldValue.length > 0);
      } else if (question.type === "open_ended") {
        // For open-ended questions, check if answer exists and has non-whitespace content
        isAnswered = !!(fieldValue && typeof fieldValue === "string" && fieldValue.trim().length > 0);
      } else if (question.type === "slider") {
        // For slider questions, check if answer is a valid number
        // Handle both numeric values and formatted strings like "± 5 years"
        if (fieldValue !== null && fieldValue !== undefined) {
          if (typeof fieldValue === "number") {
            isAnswered = true;
          } else if (typeof fieldValue === "string") {
            // Try to parse as number first
            const numericValue = parseInt(fieldValue);
            if (!isNaN(numericValue)) {
              isAnswered = true;
      } else {
              // Check if it's a formatted string like "± 5 years" or "±5 years"
              const match = fieldValue.match(/±\s*(\d+)/);
              if (match && match[1]) {
                isAnswered = true;
              }
            }
          }
        }
        
      } else {
        // For structured questions (single_select, etc.), check if answer exists and is not empty
        isAnswered = !!(fieldValue && fieldValue !== null && fieldValue !== "" && String(fieldValue).trim().length > 0);
      }

      console.log(`Question ${i} (${question.id}): type=${question.type}, value="${fieldValue}", isAnswered=${isAnswered}, valueType=${typeof fieldValue}`);

      if (!isAnswered) {
        console.log(`First unanswered intake question: ${question.id} at step ${i}`);
        return i;
      }
    }

    // All questions answered
    console.log("All intake questions answered, returning", intakeQuestions.length);
    return intakeQuestions.length;
  };

  // Note: isIntakeComplete is now imported from utils/questionnaireUtils
  // Using the imported version for consistency

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Location Permission',
          'Location access was denied. You can enter your city manually instead.',
          [{ text: 'OK' }]
        );
        return null;
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

      return {
        city,
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      };
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert(
        'Location Error', 
        'Unable to get your location. Please try entering it manually.',
        [{ text: 'OK' }]
      );
      return null;
    }
  };

  const askNextProfileQuestion = async () => {
    const currentProfileStep = questionnaire.currentProfileStep;
    const profileData = questionnaire.profileData;
    
    console.log(
      "askNextProfileQuestion called, currentProfileStep:",
      currentProfileStep,
      "total questions:",
      profileQuestions.length
    );
    
    if (currentProfileStep < profileQuestions.length) {
      const question = profileQuestions[currentProfileStep];
      
      // Skip conditional questions that shouldn't be shown
      if ('conditionalOn' in question && question.conditionalOn && 'showIf' in question && question.showIf && profileData) {
        const conditionalOn = question.conditionalOn as string;
        const showIf = question.showIf as string[];
        const conditionalValue = (profileData as any)[conditionalOn];
        if (!conditionalValue || !showIf.includes(conditionalValue)) {
          console.log(`Skipping conditional question ${question.id} - condition not met`);
          // Move to next question
          questionnaire.dispatch({ type: "SET_CURRENT_PROFILE_STEP", payload: currentProfileStep + 1 });
          setTimeout(() => askNextProfileQuestion(), 100);
          return;
        }
      }
      
      console.log("Asking profile question:", question.id, question.text, "at step", currentProfileStep);
      
      const questionMessage: Message = {
        id: `profile-${
          question.id
        }-${currentProfileStep}-${Date.now()}-${Math.random()}`,
        text: question.text,
        sender: "ai",
        timestamp: new Date(),
        type: "profile-question",
        data: question,
      };
      console.log("Adding question message to chat:", questionMessage.id, questionMessage.text);
      await addMessage(questionMessage);
      // Scroll to show the new question after a brief delay
      setTimeout(() => {
        if (flatListRef.current) {
          flatListRef.current.scrollToEnd({ animated: true });
        }
      }, 300);
    } else {
      console.log("Profile questions complete, calling completeProfile");
      // Profile complete
      completeProfile();
    }
  };

  const moveToNextQuestion = () => {
    const currentProfileStep = questionnaire.currentProfileStep;
    const profileData = questionnaire.profileData;
    const nextStep = currentProfileStep + 1;
    
      console.log("Moving to next question, step:", nextStep);
    questionnaire.dispatch({ type: "SET_CURRENT_PROFILE_STEP", payload: nextStep });
      
      // Ask next profile question after a short delay
      setTimeout(() => {
        if (nextStep < profileQuestions.length) {
          // Use the nextStep directly instead of relying on state
          const question = profileQuestions[nextStep];
          
          // Skip conditional questions that shouldn't be shown
        if ('conditionalOn' in question && question.conditionalOn && 'showIf' in question && question.showIf && profileData) {
          const conditionalOn = question.conditionalOn as string;
          const showIf = question.showIf as string[];
          const conditionalValue = (profileData as any)[conditionalOn];
          if (!conditionalValue || !showIf.includes(conditionalValue)) {
              console.log(`Skipping conditional question ${question.id} in moveToNextQuestion - condition not met`);
              // Recursively move to next question
            questionnaire.dispatch({ type: "SET_CURRENT_PROFILE_STEP", payload: nextStep });
              setTimeout(() => moveToNextQuestion(), 100);
              return;
            }
          }
          
          console.log(
            "Asking next profile question:",
            question.id,
            question.text
          );

          const questionMessage: Message = {
            id: `profile-${
              question.id
            }-${nextStep}-${Date.now()}-${Math.random()}`,
            text: question.text,
            sender: "ai",
            timestamp: new Date(),
            type: "profile-question",
            data: question,
          };
        addMessage(questionMessage);
        } else {
          completeProfile();
        }
      }, 500);
  };

  const checkAndAskQuestion = (questionIndex: number, latestAnswers?: Record<string, any>) => {
    console.log("checkAndAskQuestion called with index:", questionIndex);
    
    if (questionIndex >= intakeQuestions.length) {
      completeIntake();
      return;
    }
    
    const question = intakeQuestions[questionIndex];
    
    // Skip conditional questions that shouldn't be shown
      if ('conditionalOn' in question && question.conditionalOn && 'showIf' in question && question.showIf) {
      // Use latest answers if provided, otherwise fall back to state
      const answersToCheck = latestAnswers || intakeAnswers;
        const conditionalOn = question.conditionalOn as string;
        const showIf = question.showIf as string[];
        const conditionalValue = answersToCheck[conditionalOn];
        if (!conditionalValue || !showIf.includes(conditionalValue)) {
        console.log(`Skipping conditional intake question ${question.id} at index ${questionIndex} - condition not met`);
        // Recursively check the next question, passing along latest answers
        checkAndAskQuestion(questionIndex + 1, latestAnswers);
        return;
      }
    }
    
    // Update the current question state and ask the question
    questionnaire.dispatch({ type: "SET_CURRENT_INTAKE_QUESTION", payload: questionIndex });
    console.log("Asking intake question:", question.id, question.text);
    const questionMessage: Message = {
      id: `question-${question.id}-${Date.now()}-${Math.random()}`,
      text: question.text,
      sender: "ai" as const,
      timestamp: new Date(),
      type: "question",
      data: question,
    };
    addMessage(questionMessage);
  };

  const askNextQuestion = () => {
    if (isAskingQuestionRef.current) {
      console.log("askNextQuestion called but already asking a question, skipping");
      return;
    }
    
    const currentQuestion = questionnaire.currentIntakeQuestion;
    console.log(
      "askNextQuestion called, currentQuestion:",
      currentQuestion,
      "intakeQuestions.length:",
      intakeQuestions.length
    );
    
    isAskingQuestionRef.current = true;
    checkAndAskQuestion(currentQuestion);
    
    // Reset the flag after a short delay to allow for the next question
    setTimeout(() => {
      isAskingQuestionRef.current = false;
    }, 2000);
  };

  const saveIntakeAnswerToRemote = async (
    questionId: string,
    answer: string | string[] | number
  ) => {
    try {
      await questionnaire.saveIntakeAnswer(questionId, answer);
        
        // Update local intakeAnswers state for conditional logic
        const updatedAnswers = {
          ...intakeAnswers,
          [questionId]: answer
        };
        setIntakeAnswers(updatedAnswers);
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
        case "birthdate":
          if (typeof answer === "string") {
            // Parse MM/DD/YYYY format and convert to YYYY-MM-DD for database
            const [month, day, year] = answer.split("/");
            const birthDate = new Date(
              parseInt(year),
              parseInt(month) - 1,
              parseInt(day)
            );
            profileToUpdate.birthdate = birthDate.toISOString().split("T")[0]; // Store as YYYY-MM-DD
          }
          break;
        case "pronouns":
          if (typeof answer === "string") {
            // Store pronouns in a dedicated column (you may need to add this to your schema)
            profileToUpdate.pronouns = answer;
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
            if (answer === "Use My Location") {
              // Location permission and coordinates will be handled separately
              // This case is handled by the location permission UI flow
              console.log("Location permission flow initiated");
            } else if (answer.startsWith("location_data:")) {
              // Handle location permission result
              try {
                const locationData = JSON.parse(answer.replace("location_data:", ""));
                profileToUpdate.city = locationData.city;
                profileToUpdate.lat = locationData.lat;
                profileToUpdate.lng = locationData.lng;
              } catch (error) {
                console.error("Error parsing location data:", error);
              }
            }
          }
          break;
        case "relationship_status":
          if (typeof answer === "string") {
            // Store relationship status
            profileToUpdate.relationship_status = answer;
          }
          break;
        case "languages":
          // Store languages as an array (you may need to add this to your schema)
          profileToUpdate.languages = Array.isArray(answer)
            ? answer
            : [answer as string];
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

    // Check if completion message already exists to avoid duplicates
    const completionText = "Great! To help me find people you'd connect with, I'd like to get to know you better. I'll ask you some questions about yourself.\n\nReady to continue?";
    
    const hasCompletionMessage = messages.some(m => 
      m.sender === "ai" && 
      m.text === completionText
    );

    if (!hasCompletionMessage) {
      // Also check for any message with profile-completion in the ID
      const hasCompletionById = messages.some(m => 
        m.id && (m.id.includes("profile-completion") || m.id === "profile-completion")
      );

      if (!hasCompletionById) {
    const completionMessage: Message = {
          id: `profile-completion-${Date.now()}-${Math.random()}-${user?.id}`,
          text: completionText,
      sender: "ai" as const,
      timestamp: new Date(),
      type: "text",
    };
        await addMessage(completionMessage);
      }
    }

    // Profile is now complete via questionnaire hook
    // The hook will update isProfileComplete automatically

    // Add a ready button or wait for user response
    setTimeout(() => {
      // Check if ready options message already exists to avoid duplicates
      const hasReadyOptions = messages.some(m => 
        m.sender === "ai" && 
        m.type === "profile-question" &&
        m.data?.id === "ready_to_start"
      );

      if (!hasReadyOptions) {
        // Also check for any message with ready-options in the ID
        const hasReadyById = messages.some(m => 
          m.id && (m.id.includes("ready-options") || m.id === "ready-options")
        );

        if (!hasReadyById) {
    const readyOptions: Message = {
            id: `ready-options-${Date.now()}-${Math.random()}-${user?.id}`,
      text: "Choose an option:",
      sender: "ai" as const,
      timestamp: new Date(),
      type: "profile-question",
      data: {
        id: "ready_to_start",
        type: "chips",
        options: ["Yes, let's start!", "Maybe later"],
      },
    };
          addMessage(readyOptions);
        }
      }
    }, 1000);
  };

  const completeIntake = async () => {
    const firstName = questionnaire.profileData?.first_name?.trim() || "";
    const greeting = firstName ? `Perfect, ${firstName}!` : "Perfect!";
    const completionMessage: Message = {
      id: `completion-${Date.now()}-${Math.random()}`,
      text: `🎉 ${greeting} You're all set.\nI'll start curating introductions that align with your interests and rhythm.\n\nYou'll find them in the People tab.`,
      sender: "ai" as const,
      timestamp: new Date(),
      type: "text",
    };
    await addMessage(completionMessage);

    // Generate embeddings and save final v4 record
    if (user) {
      try {
        // Get all responses from v5 table
        const { data: existingIntake, error: fetchError } = await supabase
          .from("intake_responses_v5")
          .select("*")
          .eq("user_id", user.id)
          .single();

        if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows returned
          console.error("Error fetching intake for embedding:", fetchError);
          return;
        }

        if (!existingIntake || !existingIntake.responses || existingIntake.responses.length === 0) {
          console.error("No responses found to generate embedding");
          return;
        }

        // Combine all responses into text for embedding (ensure string to avoid serialization issues)
        const allAnswersText = existingIntake.responses
          .map((r: any) => {
            const q = r.question_text ?? "";
            const a = r.answer == null ? "" : Array.isArray(r.answer) ? r.answer.join(", ") : String(r.answer);
            return `${q}: ${a}`.trim();
          })
          .filter(Boolean)
          .join("\n\n");

        // Generate embedding
        const embedding = await openAIService.generateEmbedding(allAnswersText);
        // pgvector expects a string literal like "[0.1,0.2,...]" for the vector column
        const embedVectorString = `[${embedding.join(",")}]`;

        // Update v5 record with embedding and completed_at
        const { error: updateError } = await supabase
          .from("intake_responses_v5")
          .upsert({
        user_id: user.id,
            responses: existingIntake.responses,
            embed_vector: embedVectorString,
            completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
            // Preserve filtered columns
            life_stage: existingIntake.life_stage,
            availability_times: existingIntake.availability_times,
            age_range_preference: existingIntake.age_range_preference,
          });

        if (updateError) {
          console.error("Error saving final intake with embedding:", updateError);
        } else {
          console.log("Intake completed and embedding generated successfully");
          // Replenish runs only on Tuesday cron; new users get matches in the next weekly run
        }
      } catch (error) {
        console.error("Error completing intake:", error);
      }
    }

    // Check for matches after completing intake (skip welcome-back message when we just showed completion)
    setTimeout(() => {
      checkForWeeklyMatches(true);
    }, 2000);
  };

  const checkForWeeklyMatches = async (fromIntakeCompletion = false) => {
    if (!user) return;

    try {
      // Get user's current matches
      const matches = await MatchingService.getUserMatches(user.id);
      
      if (matches.length > 0) {
        setWeeklyMatches(matches);
        showNextMatch();
      } else if (!fromIntakeCompletion) {
        // Show welcome back only when not right after intake (we already said where to see matches)
        const welcomeBackMessage: Message = {
          id: `welcome-back-${Date.now()}-${Math.random()}`,
          text: "Welcome back! Your weekly Fika connections will appear here every Sunday. For now, feel free to chat with me about anything!",
          sender: "ai",
          timestamp: new Date(),
          type: "text",
        };
        await addMessage(welcomeBackMessage);
      }
    } catch (error) {
      console.error("Error checking for weekly matches:", error);
    }
  };

  const showNextMatch = async () => {
    if (currentMatchIndex >= weeklyMatches.length) {
      // All matches shown
      const noMoreMatchesMessage: Message = {
        id: `no-more-matches-${Date.now()}-${Math.random()}`,
        text: "That's all your connections for this week! Check back next Sunday for new local suggestions. Feel free to chat with me about anything!",
        sender: "ai",
        timestamp: new Date(),
        type: "text",
      };
      await addMessage(noMoreMatchesMessage);
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
        } connection for the week:`,
        sender: "ai",
        timestamp: new Date(),
        type: "match-card",
        data: { match, otherUser },
      };
      await addMessage(matchMessage);
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
      await addMessage(responseMessage);

      // Move to next match
      setCurrentMatchIndex((prev) => prev + 1);
      setTimeout(() => {
        showNextMatch();
      }, 1500);
    } catch (error) {
      console.error("Error handling match response:", error);
    }
  };

  // fetchConnectionContext is now handled by useLivContext hook
  // Use context from the hook instead

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    const userMessage: Message = {
      id: `user-${Date.now()}-${Math.random()}`,
      text: inputText,
      sender: "user",
      timestamp: new Date(),
      type: "text",
    };

    await addMessage(userMessage);
    const currentInput = inputText;
    setInputText("");
    setIsTyping(true);

    // User just sent from the bottom; allow auto-scroll and scroll to reveal the new message
    isUserScrollingRef.current = false;
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 150);

    if (questionnaire.waitingForCityInput) {
      console.log("Saving city input:", currentInput);
      await saveProfileAnswerToRemote("location", `Manual: ${currentInput}`);
      questionnaire.dispatch({ type: "SET_WAITING_FOR_CITY", payload: false });
      moveToNextQuestion();
      setIsTyping(false);
      return;
    }

    // Manual location input removed - location is now required via permission

    // Handle intake questions when profile is complete
    const isProfileComplete = questionnaire.isProfileComplete;
    const currentQuestion = questionnaire.currentIntakeQuestion;
    
    if (
      isProfileComplete &&
      currentQuestion >= 0 &&
      currentQuestion < intakeQuestions.length
    ) {
      const currentIntakeQuestion = intakeQuestions[currentQuestion];
      console.log(
        "Intake question handling:",
        currentIntakeQuestion,
        currentQuestion,
        "isProfileComplete:",
        isProfileComplete,
        "intakeQuestions.length:",
        intakeQuestions.length
      );

      // Skip: user typed "skip" or "skip." — advance without saving (or save empty)
      if (/^skip\.?$/i.test(currentInput.trim())) {
        const valueToSaveForSkip =
          currentIntakeQuestion.type === "multi_select" || currentIntakeQuestion.type === "language_select"
            ? []
            : "";
        await saveIntakeAnswerToRemote(currentIntakeQuestion.id, valueToSaveForSkip);
        const nextQuestionIndex = currentQuestion + 1;
        questionnaire.dispatch({ type: "SET_CURRENT_INTAKE_QUESTION", payload: nextQuestionIndex });
        if (currentIntakeQuestion.type === "multi_select" || currentIntakeQuestion.type === "language_select") {
          questionnaire.dispatch({
            type: "SET_SELECTED_MULTI_SELECT",
            payload: { questionId: currentIntakeQuestion.id, options: [] },
          });
        }
        setTimeout(() => {
          if (nextQuestionIndex < intakeQuestions.length) {
            checkAndAskQuestion(nextQuestionIndex, intakeAnswers);
          } else {
            completeIntake();
          }
        }, 500);
        setIsTyping(false);
        return;
      }

      // Handle text-type and open-ended questions
      if (currentIntakeQuestion.type === "text" || currentIntakeQuestion.type === "open_ended") {
        const isSkip = /^skip\.?$/i.test(currentInput.trim());
        const valueToSave = isSkip ? "" : currentInput;
        console.log(
          isSkip ? "Skipping question:" : "Saving intake answer to remote database:",
          currentIntakeQuestion.id,
          isSkip ? "(skipped)" : currentInput,
          "Question type:",
          currentIntakeQuestion.type
        );

        await saveIntakeAnswerToRemote(currentIntakeQuestion.id, valueToSave);

        // Create updated answers object with the latest input (empty if skipped)
        const updatedAnswers = {
          ...intakeAnswers,
          [currentIntakeQuestion.id]: valueToSave
        };

        // Move to next question and update state so no other logic re-asks the current one
        const nextQuestionIndex = currentQuestion + 1;
        questionnaire.dispatch({ type: "SET_CURRENT_INTAKE_QUESTION", payload: nextQuestionIndex });

        setTimeout(() => {
          if (nextQuestionIndex < intakeQuestions.length) {
            checkAndAskQuestion(nextQuestionIndex, updatedAnswers);
          } else {
            completeIntake();
          }
        }, 1000);

        setIsTyping(false);
        return;
      }

      // Handle option-based questions that require selection (not text input)
      // Open-ended questions should allow text input
      if (
        currentIntakeQuestion.type === "open_ended" ||
        currentIntakeQuestion.type === "text"
      ) {
        // Handle open-ended/text questions - save the answer
        // Handle validation - for text/open_ended questions, validation expects string
        const validationResult = currentIntakeQuestion.validation
          ? (currentIntakeQuestion.validation as (value: string) => string | null)(currentInput)
          : null;

        if (validationResult) {
          const errorMessage: Message = {
            id: `error-${Date.now()}`,
            text: validationResult,
            sender: "ai",
            timestamp: new Date(),
            type: "text",
          };
          await addMessage(errorMessage);
          setIsTyping(false);
          return;
        }

        // Save answer and move to next question
        await saveIntakeAnswerToRemote(currentIntakeQuestion.id, currentInput);
        const updatedAnswers = {
          ...intakeAnswers,
          [currentIntakeQuestion.id]: currentInput,
        };
        setIntakeAnswers(updatedAnswers);

        const nextQuestionIndex = currentQuestion + 1;
        questionnaire.dispatch({ type: "SET_CURRENT_INTAKE_QUESTION", payload: nextQuestionIndex });
        setInputText("");

        setTimeout(() => {
          if (nextQuestionIndex < intakeQuestions.length) {
            checkAndAskQuestion(nextQuestionIndex, updatedAnswers);
          } else {
            completeIntake();
          }
        }, 1000);

        setIsTyping(false);
        return;
      }

      // Handle option-based questions that require selection (not text input)
      if (
        currentIntakeQuestion.type === "likert" ||
        currentIntakeQuestion.type === "single_select" ||
        currentIntakeQuestion.type === "scale"
      ) {
            const errorMessage: Message = {
              id: `error-${Date.now()}`,
          text: "Please select one of the options above by tapping on it.",
              sender: "ai",
              timestamp: new Date(),
              type: "text",
            };
            await addMessage(errorMessage);
            setIsTyping(false);
            return;
          }

      // Handle multi-select questions
      if (currentIntakeQuestion.type === "multi_select") {
        let selectedOptions =
          questionnaire.selectedMultiSelectOptions[currentIntakeQuestion.id] || [];

        console.log("DEBUG: Multi-select processing", {
          questionId: currentIntakeQuestion.id,
          selectedOptions,
          currentInput,
          selectedOptionsLength: selectedOptions.length,
        });

        if (selectedOptions.length === 0 && currentInput.trim()) {
          selectedOptions = currentInput
            .split(",")
            .map((s) => s.trim())
            .filter((s) => s.length > 0);
          console.log("DEBUG: Parsed from input:", selectedOptions);
        }
        
        if (selectedOptions.length > 0) {
          console.log("DEBUG: About to save and move to next question");

          await saveIntakeAnswerToRemote(
            currentIntakeQuestion.id,
            selectedOptions
          );

          // Create updated answers object with the latest multi-select
          const updatedAnswers = {
            ...intakeAnswers,
            [currentIntakeQuestion.id]: selectedOptions
          };

          questionnaire.dispatch({ 
            type: "SET_SELECTED_MULTI_SELECT", 
            payload: { questionId: currentIntakeQuestion.id, options: [] } 
          });

          const nextQuestionIndex = currentQuestion + 1;
          console.log(
            "DEBUG: Moving from question",
            currentQuestion,
            "to",
            nextQuestionIndex
          );

          setTimeout(() => {
            console.log(
              "DEBUG: About to ask next question, index:",
              nextQuestionIndex
            );
            if (nextQuestionIndex < intakeQuestions.length) {
              checkAndAskQuestion(nextQuestionIndex, updatedAnswers);
            } else {
              completeIntake();
            }
          }, 1000);

          console.log("DEBUG: About to return from multi-select handling");
          setIsTyping(false);
          return;
        }

          const errorMessage: Message = {
          id: `error-${Date.now()}`,
            text: "Please select at least one option before continuing.",
            sender: "ai",
            timestamp: new Date(),
            type: "text",
          };
          await addMessage(errorMessage);
          setIsTyping(false);
          return;
        }

      setIsTyping(false);
      return;
    }

    // Handle profile questions when profile is not complete
    const currentProfileStep = questionnaire.currentProfileStep;
    
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
        
        await saveProfileAnswerToRemote(
          currentProfileQuestion.id,
          currentInput
        );
        moveToNextQuestion();
        setIsTyping(false);
        return;
      }

      if (currentProfileQuestion.type === "language_select") {
        if (questionnaire.selectedLanguages.length > 0) {
          console.log(
            "Saving languages to remote database:",
            currentProfileQuestion.id,
            questionnaire.selectedLanguages
          );

          await saveProfileAnswerToRemote(
            currentProfileQuestion.id,
            questionnaire.selectedLanguages
          );
          questionnaire.dispatch({ type: "SET_SELECTED_LANGUAGES", payload: [] });
          moveToNextQuestion();
        setIsTyping(false);
        return;
        } else {
          const errorMessage: Message = {
            id: (Date.now() + 1).toString(),
            text: "Please select at least one language before continuing.",
            sender: "ai",
            timestamp: new Date(),
            type: "text",
          };
          await addMessage(errorMessage);
          setIsTyping(false);
          return;
        }
      }
    }

    // Handle starting intake questions after user confirmation
    if (
      isProfileComplete &&
      currentQuestion === 0 &&
      (currentInput.includes("Yes") ||
        currentInput.includes("start") ||
        currentInput.includes("Continue"))
    ) {
      console.log("Starting intake questions after user confirmation");
      questionnaire.dispatch({ type: "SET_CURRENT_INTAKE_QUESTION", payload: 0 });
      setTimeout(() => {
        askNextQuestion();
      }, 1000);
      setIsTyping(false);
      return;
    }

    if (!isProfileComplete) {
      setIsTyping(false);
      return;
    }

    // Check if questionnaire is incomplete - if so, prompt user to continue it
    const { data: currentIntakeData } = await supabase
      .from("intake_responses_v5")
      .select("*")
      .eq("user_id", user?.id)
      .single();

    if (!isIntakeComplete(currentIntakeData)) {
      // Questionnaire is incomplete - prompt user to continue
      const promptMessage: Message = {
        id: `questionnaire-prompt-${Date.now()}-${Math.random()}`,
        text: "I'd love to chat, but first let's finish getting to know you! This will help me find you great matches.\n\nLet's continue with your questionnaire:",
        sender: "ai",
        timestamp: new Date(),
        type: "text",
      };

      await addMessage(promptMessage);

      // Find the first unanswered question and ask it
      const firstUnansweredIntake = findFirstUnansweredIntakeQuestion(currentIntakeData, questionnaire.profileData);
      questionnaire.dispatch({ type: "SET_CURRENT_INTAKE_QUESTION", payload: firstUnansweredIntake });
      setTimeout(() => {
        checkAndAskQuestion(firstUnansweredIntake);
      }, 1000);

      setIsTyping(false);
      return;
    }

    // Handle general chat when both profile and intake are complete
    try {
      // Refresh context if needed, then use it
      await refreshContext();
      const response = await openAIService.generateChatResponse(currentInput, context || undefined);
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response,
        sender: "ai",
        timestamp: new Date(),
        type: "text",
      };
      await addMessage(aiMessage);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "Sorry, I'm having trouble responding right now. Please try again!",
        sender: "ai",
        timestamp: new Date(),
        type: "text",
      };
      addMessage(errorMessage);
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
            (item.data.type === "single_select" ||
              item.data.type === "likert" ||
              item.data.type === "scale") &&
                (() => {
              console.log(
                "Rendering question with options:",
                item.data.id,
                "type:",
                item.data.type,
                "options:",
                item.data.options
              );
                  return (
            <View style={styles.questionOptions}>
              {item.data.options.map((option: string, index: number) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.optionChip, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                          onPress={async () => {
                    const userSelectionMessage: Message = {
                      id: `selection-${Date.now()}`,
                      text: option,
                              sender: "user",
                      timestamp: new Date(),
                              type: "text",
                            };
                            addMessage(userSelectionMessage);

                            await saveIntakeAnswerToRemote(item.data.id, option);
                    
                        // Create updated answers object with the latest selection
                        const updatedAnswers = {
                          ...intakeAnswers,
                          [item.data.id]: option
                        };

                        const nextQuestionIndex = questionnaire.currentIntakeQuestion + 1;
                    
                    setTimeout(() => {
                          if (nextQuestionIndex < intakeQuestions.length) {
                            checkAndAskQuestion(nextQuestionIndex, updatedAnswers);
                      } else {
                        completeIntake();
                      }
                    }, 500);
                  }}
                >
                  <Text style={[styles.optionText, { color: theme.colors.text }]}>{option}</Text>
                </TouchableOpacity>
              ))}
            </View>
                  );
            })()}

          {/* Slider question rendering */}
          {item.type === "question" &&
            item.data &&
            item.data.type === "slider" && (
              <SliderComponent
                questionId={item.data.id}
                min={item.data.min || 0}
                max={item.data.max || 10}
                defaultValue={item.data.default || item.data.min || 0}
                label={item.data.label || "{value}"}
                currentValue={intakeAnswers[item.data.id]}
                theme={theme}
                onValueChange={async (value: number) => {
                  await saveIntakeAnswerToRemote(item.data.id, value);
                  
                  const label = item.data.label || "{value}";
                  const formatLabel = (val: number) => label.replace("{value}", val.toString());
                  const formattedValue = formatLabel(value);
                  
                  const userSelectionMessage: Message = {
                    id: `slider-selection-${Date.now()}`,
                    text: formattedValue,
                    sender: "user",
                    timestamp: new Date(),
                    type: "text",
                  };
                  addMessage(userSelectionMessage);

                  const updatedAnswers = {
                    ...intakeAnswers,
                    [item.data.id]: value
                  };
                  setIntakeAnswers(updatedAnswers);

                  const nextQuestionIndex = questionnaire.currentIntakeQuestion + 1;
                  
                  setTimeout(() => {
                    if (nextQuestionIndex < intakeQuestions.length) {
                      checkAndAskQuestion(nextQuestionIndex, updatedAnswers);
                    } else {
                      completeIntake();
                    }
                  }, 500);
                }}
              />
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
                    style={[styles.optionChip, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                                         onPress={async () => {
                       // Add user's selection as a message
                       const userSelectionMessage: Message = {
                        id: `profile-selection-${
                          item.data.id
                        }-${questionnaire.currentProfileStep}-${Date.now()}`,
                         text: option,
                        sender: "user" as const,
                         timestamp: new Date(),
                        type: "text",
                       };
                      addMessage(userSelectionMessage);
                       
                      // Special handling for ready_to_start transition
                      if (item.data.id === "ready_to_start") {
                        if (option === "Yes, let's start!") {
                          // Start intake questions
                          questionnaire.dispatch({ type: "SET_CURRENT_INTAKE_QUESTION", payload: 0 });
                          setTimeout(() => {
                            askNextQuestion();
                          }, 1000);
                        } else {
                          const laterMessage: Message = {
                            id: `later-${Date.now()}`,
                            text: "No problem! Come back when you're ready to continue.",
                            sender: "ai" as const,
                            timestamp: new Date(),
                            type: "text",
                          };
                          addMessage(laterMessage);
                        }
                        return;
                      }

                      // Save directly to remote database for other profile questions
                       await saveProfileAnswerToRemote(item.data.id, option);
                       
                       // Move to next profile question
                      moveToNextQuestion();
                    }}
                  >
                    <Text style={[styles.optionText, { color: theme.colors.text }]}>{option}</Text>
                  </TouchableOpacity>
                ))}

              {item.data.type === "multi_select" &&
                item.data.options &&
                Array.isArray(item.data.options) && (
                  <View style={styles.multiSelectContainer}>
                    <Text style={[styles.multiSelectInstruction, { color: theme.colors.textSecondary }]}>
                      {item.data.maxSelections
                        ? `Tap options to add them to the text box below (up to ${item.data.maxSelections}), then press send:`
                        : "Tap options to add them to the text box below, then press send:"}
                    </Text>
                    {/* Add this wrapper with proper flex styles */}
                    <View style={styles.multiSelectOptionsWrapper}>
                      {item.data.options.map(
                        (option: string, index: number) => (
                      <TouchableOpacity
                        key={index}
                        style={[
                              styles.multiSelectChipInline,
                              {
                                backgroundColor: questionnaire.selectedMultiSelectOptions[item.data.id]?.includes(option)
                                  ? theme.colors.primary
                                  : theme.colors.surface,
                                borderColor: questionnaire.selectedMultiSelectOptions[item.data.id]?.includes(option)
                                  ? theme.colors.primary
                                  : theme.colors.border,
                              },
                        ]}
                        onPress={() => {
                          const questionId = item.data.id;
                          const currentSelections = questionnaire.selectedMultiSelectOptions[questionId] || [];
                            let newSelections;
                            
                            if (currentSelections.includes(option)) {
                              // Remove if already selected
                            newSelections = currentSelections.filter((item) => item !== option);
                                } else if (
                                  item.data.maxSelections &&
                            currentSelections.length >= item.data.maxSelections
                                ) {
                              // Don't add if at limit
                              newSelections = currentSelections;
                         } else {
                              // Add if under limit
                            newSelections = [...currentSelections, option];
                            }
                            
                            // Update the input text to show selected options
                                setInputText(newSelections.join(", "));
                            
                          questionnaire.dispatch({ 
                            type: "SET_SELECTED_MULTI_SELECT", 
                            payload: { questionId, options: newSelections } 
                          });
                        }}
                      >
                            <Text
                              style={[
                          styles.optionText,
                                {
                                  color: questionnaire.selectedMultiSelectOptions[item.data.id]?.includes(option)
                                    ? '#FFFFFF'
                                    : theme.colors.text,
                                  fontWeight: questionnaire.selectedMultiSelectOptions[item.data.id]?.includes(option)
                                    ? '600'
                                    : '400',
                                },
                              ]}
                            >
                          {option}
                        </Text>
                  </TouchableOpacity>
                        )
                      )}
                    </View>
                  </View>
                )}

              {item.data.type === "language_select" &&
                item.data.options &&
                Array.isArray(item.data.options) && (
                  <View style={styles.multiSelectContainer}>
                    <Text style={[styles.multiSelectInstruction, { color: theme.colors.textSecondary }]}>
                      Tap languages to add them to the text box below (up to 5),
                      then press send:
                    </Text>
                    <View style={styles.languageOptionsGrid}>
                      {item.data.options.map(
                        (option: string, index: number) => (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.multiSelectChip,
                              questionnaire.selectedLanguages.includes(option) &&
                                styles.selectedChip,
                        ]}
                        onPress={() => {
                          const currentLanguages = questionnaire.selectedLanguages;
                            let newSelection;
                          if (currentLanguages.includes(option)) {
                              // Remove if already selected
                            newSelection = currentLanguages.filter((lang) => lang !== option);
                          } else if (currentLanguages.length < 5) {
                              // Add if under limit
                            newSelection = [...currentLanguages, option];
                            } else {
                              // Don't add if at limit
                            newSelection = currentLanguages;
                            }
                            
                            // Update the input text to show selected languages
                                setInputText(newSelection.join(", "));
                          questionnaire.dispatch({ type: "SET_SELECTED_LANGUAGES", payload: newSelection });
                        }}
                      >
                            <Text
                              style={[
                          styles.optionText,
                                questionnaire.selectedLanguages.includes(option) &&
                                  styles.selectedOptionText,
                              ]}
                            >
                          {option}
                        </Text>
                      </TouchableOpacity>
                        )
                      )}
                    </View>
                  </View>
                )}

              {item.data.type === "photo" &&
                item.data.options &&
                Array.isArray(item.data.options) &&
                item.data.options.map((option: string, index: number) => (
                  <TouchableOpacity
                    key={index}
                    style={[styles.optionChip, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                    onPress={async () => {
                      // Add user's selection as a message
                      const userSelectionMessage: Message = {
                        id: `profile-selection-${
                          item.data.id
                        }-${questionnaire.currentProfileStep}-${Date.now()}`,
                        text: option,
                        sender: "user",
                        timestamp: new Date(),
                        type: "text",
                      };
                      addMessage(userSelectionMessage);

                      // Save directly to remote database
                      await saveProfileAnswerToRemote(item.data.id, option);

                      // Move to next profile question
                      moveToNextQuestion();
                    }}
                  >
                    <Text style={[styles.optionText, { color: theme.colors.text }]}>{option}</Text>
                  </TouchableOpacity>
                ))}

              {item.data.type === "location" &&
                item.data.options &&
                Array.isArray(item.data.options) &&
                item.data.options.map((option: string, index: number) => (
                  <TouchableOpacity
                    key={index}
                    style={[styles.optionChip, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                                         onPress={async () => {
                       // Add user's selection as a message
                       const userSelectionMessage: Message = {
                        id: `profile-selection-${
                          item.data.id
                        }-${questionnaire.currentProfileStep}-${Date.now()}`,
                         text: option,
                        sender: "user",
                         timestamp: new Date(),
                        type: "text",
                      };
                      addMessage(userSelectionMessage);

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
                        addMessage(cityQuestionMessage);
                        // Set a flag to indicate we're waiting for city input
                        questionnaire.dispatch({ type: "SET_WAITING_FOR_CITY", payload: true });
                      }
                    }}
                  >
                    <Text style={[styles.optionText, { color: theme.colors.text }]}>{option}</Text>
                  </TouchableOpacity>
                ))}

              {/* Location permission handling */}
              {item.data.type === "location_permission" &&
                item.data.options &&
                Array.isArray(item.data.options) && (
                  <View style={styles.locationContainer}>
                    {item.data.options.map((option: string, index: number) => (
                  <TouchableOpacity
                    key={index}
                        style={[styles.optionChip, index === 0 ? styles.primaryLocationButton : styles.secondaryLocationButton]}
                    onPress={async () => {
                      // Add user's selection as a message
                      const userSelectionMessage: Message = {
                            id: `location-selection-${Date.now()}`,
                        text: option,
                            sender: "user" as const,
                        timestamp: new Date(),
                        type: "text",
                      };
                      addMessage(userSelectionMessage);
                       
                          if (option === "Use My Location") {
                            // Request location permission
                            const locationData = await requestLocationPermission();
                            if (locationData) {
                              // Save location data
                              await saveProfileAnswerToRemote(item.data.id, `location_data:${JSON.stringify(locationData)}`);
                              
                              const confirmMessage: Message = {
                                id: `location-confirm-${Date.now()}`,
                                text: `Great! I've set your location to ${locationData.city}.`,
                                sender: "ai" as const,
                                timestamp: new Date(),
                                type: "text",
                              };
                              addMessage(confirmMessage);
                              
                              // Move to next question
                              setTimeout(() => {
                                moveToNextQuestion();
                              }, 1500);
                            } else {
                              // Permission denied - show error and ask to try again
                              const errorMessage: Message = {
                                id: `location-error-${Date.now()}`,
                                text: "I need location access to suggest spots near you. Turn it on in your device settings and try again.",
                                sender: "ai" as const,
                                timestamp: new Date(),
                                type: "text",
                              };
                              addMessage(errorMessage);
                              
                              // Don't move to next question - user needs to grant permission
                            }
                          }
                        }}
                      >
                        <Text style={[styles.optionText, index === 0 ? styles.primaryLocationText : styles.secondaryLocationText]}>
                          {index === 0 ? "📍 " : "✏️ "}{option}
                        </Text>
                  </TouchableOpacity>
                ))}
                  </View>
                )}
            </View>
          )}

          {/* Multi-select rendering for intake questions */}
          {item.type === "question" &&
            item.data &&
            item.data.type === "multi_select" &&
            item.data.options &&
            Array.isArray(item.data.options) && (
              <View style={styles.multiSelectContainer}>
                <Text style={[styles.multiSelectInstruction, { color: theme.colors.textSecondary }]}>
                  {item.data.maxSelections
                    ? `Tap options to add them to the text box below (up to ${item.data.maxSelections}), then press send:`
                    : "Tap options to add them to the text box below, then press send:"}
                </Text>
                <View style={styles.multiSelectOptionsWrapper}>
                {item.data.options.map((option: string, index: number) => {
                  const isSelected = questionnaire.selectedMultiSelectOptions[item.data.id]?.includes(option);
                  return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.multiSelectChip,
                      {
                        backgroundColor: isSelected ? theme.colors.primary : theme.colors.surface,
                        borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                      }
                    ]}
                    onPress={() => {
                      const questionId = item.data.id;
                      const currentSelections = questionnaire.selectedMultiSelectOptions[questionId] || [];
                        let newSelections;
                        
                        if (currentSelections.includes(option)) {
                          // Remove if already selected
                        newSelections = currentSelections.filter((item) => item !== option);
                          } else if (
                            item.data.maxSelections &&
                            currentSelections.length >= item.data.maxSelections
                          ) {
                          // Don't add if at limit
                          newSelections = currentSelections;
                         } else {
                          // Add if under limit
                          newSelections = [...currentSelections, option];
                        }
                        
                        // Update the input text to show selected options
                          setInputText(newSelections.join(", "));
                        
                      questionnaire.dispatch({ 
                        type: "SET_SELECTED_MULTI_SELECT", 
                        payload: { questionId, options: newSelections } 
                      });
                    }}
                  >
                      <Text
                        style={[
                      styles.optionText,
                          {
                            color: isSelected ? '#FFFFFF' : theme.colors.text,
                            fontWeight: isSelected ? '600' : '400',
                          }
                        ]}
                      >
                      {option}
                    </Text>
                  </TouchableOpacity>
                  );
                })}
                </View>
            </View>
          )}
          
          {item.type === "match-card" && item.data && (
            <MatchCard
              match={item.data.match}
              otherUser={item.data.otherUser}
              onMatchUpdate={() => {}}
              activeChatCount={0}
            />
          )}
        </View>
        <Text style={[styles.timestamp, { color: theme.colors.textSecondary }]}>
          {item.timestamp
            ? item.timestamp.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
              })
            : ""}
        </Text>
      </View>
    );
  };

  const hasOptionsAvailable = () => {
    const lastMessage = messages[messages.length - 1];

    // Only disable input if the last message is a question with options AND it's from AI
    if (!lastMessage || lastMessage.sender !== "ai") return false;

    if (lastMessage.type === "question" && lastMessage.data) {
      const questionType = lastMessage.data.type;
      // Only disable for questions that should use option chips (NOT text, open_ended, or multi_select)
      // Slider questions also disable input (user selects via slider)
  return (
        questionType === "single_select" ||
        questionType === "likert" ||
        questionType === "scale" ||
        questionType === "slider"
      );
    }

    // Check for profile questions with chip options
    if (lastMessage.type === "profile-question" && lastMessage.data?.options) {
      const questionType = lastMessage.data.type;
      // Only disable for questions that should use option chips (NOT text, date, language_select, or multi_select)
      return (
        questionType === "chips" ||
        questionType === "photo" ||
        questionType === "location"
      );
    }

    return false;
  };

  return (
    <ErrorBoundary>
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
        edges={['top', 'left', 'right']}
    >
        <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            Liv
        </Text>
      </View>
        
        {/* Show progress indicator when questionnaire is in progress */}
        {!questionnaire.isProfileComplete && (
          <QuestionnaireProgress
            current={questionnaire.currentProfileStep}
            total={profileQuestions.length}
          />
        )}
        {questionnaire.isProfileComplete && !questionnaire.isIntakeComplete && (
          <QuestionnaireProgress
            current={questionnaire.currentIntakeQuestion}
            total={intakeQuestions.length}
          />
        )}

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={keyExtractor}
        style={styles.messagesList}
        contentContainerStyle={[
          styles.messagesContent,
          (!questionnaire.isProfileComplete || !questionnaire.isIntakeComplete) && styles.messagesContentWithProgress
        ]}
        inverted={false}
        initialScrollIndex={messages.length > 0 ? messages.length - 1 : 0}
        onScrollToIndexFailed={(info) => {
          // Fallback: scroll to end if initialScrollIndex fails
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: false });
          }, 100);
        }}
        onLayout={() => {
          // Start at bottom on initial render (only if not already scrolled)
          if (messages.length > 0 && !hasScrolledToBottomRef.current) {
            setTimeout(() => {
              flatListRef.current?.scrollToEnd({ animated: false });
              hasScrolledToBottomRef.current = true;
            }, 100);
          }
        }}
        onContentSizeChange={() => {
          // Scroll to bottom when new messages are added (only if user hasn't manually scrolled up)
          if (!isUserScrollingRef.current && messages.length > 0) {
            flatListRef.current?.scrollToEnd({ animated: true });
          }
        }}
        onScrollBeginDrag={() => {
          // Track when user starts scrolling manually
          isUserScrollingRef.current = true;
        }}
        onScrollEndDrag={() => {
          // Reset after a delay to allow auto-scroll for new messages if user is at bottom
          setTimeout(() => {
            isUserScrollingRef.current = false;
          }, 1000);
        }}
      />

      {isTyping && (
        <View style={styles.typingIndicator}>
          <Text
            style={[styles.typingText, { color: theme.colors.textSecondary }]}
          >
            Liv is typing...
          </Text>
          <ActivityIndicator size="small" color={theme.colors.primary} />
        </View>
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <View style={[styles.inputContainer, { borderTopColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
          <TextInput
            style={[styles.textInput, { 
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.background,
              color: theme.colors.text 
            }]}
            value={inputText}
            onChangeText={setInputText}
            editable={!hasOptionsAvailable()}
            placeholder={
              !questionnaire.isProfileComplete && questionnaire.currentProfileStep < profileQuestions.length
                ? profileQuestions[questionnaire.currentProfileStep].placeholder ||
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
              !inputText.trim() && styles.sendButtonDisabled,
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
    </ErrorBoundary>
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
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    fontStyle: "italic",
    fontFamily: "PlayfairDisplay-Italic",
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    paddingBottom: 40, // Extra padding at bottom to ensure we can scroll all the way
    flexGrow: 1,
  },
  messagesContentWithProgress: {
    paddingTop: 12, // Extra top padding when progress bar is visible to prevent overlap
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
    backgroundColor: "#007AFF", // iOS iMessage blue
    borderBottomRightRadius: 4,
    alignSelf: "flex-end",
  },
  aiBubble: {
    backgroundColor: "#E5E5EA", // iOS Messages gray
    borderBottomLeftRadius: 4,
    alignSelf: "flex-start",
    width: "80%", // Fixed width so text wraps inside bubble instead of being cut off
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userText: {
    color: "#FFFFFF",
  },
  aiText: {
    color: "#000000", // Black text for iOS Messages gray bubbles
  },
  timestamp: {
    position: "absolute",
    bottom: -18,
    fontSize: 12,
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
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  optionText: {
    fontSize: 14,
  },
  sliderContainer: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  sliderTrackContainer: {
    width: "100%",
    height: 40,
    justifyContent: "center",
    marginBottom: 16,
    position: "relative",
    paddingHorizontal: 12,
  },
  sliderTrack: {
    position: "absolute",
    width: "100%",
    borderRadius: 3,
  },
  sliderTrackFilled: {
    position: "absolute",
    borderRadius: 3,
  },
  sliderThumb: {
    position: "absolute",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  sliderLabel: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 12,
  },
  sliderConfirmButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    alignSelf: "center",
    marginTop: 8,
  },
  sliderConfirmButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  locationContainer: {
    flexDirection: "column",
    gap: 12,
  },
  primaryLocationButton: {
    backgroundColor: "#007AFF",
    borderColor: "#007AFF",
  },
  secondaryLocationButton: {
    backgroundColor: "transparent",
    borderColor: "#3C3C3E",
    borderWidth: 1,
  },
  primaryLocationText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  secondaryLocationText: {
    color: "#FFFFFF",
    fontWeight: "400",
  },
  multiSelectContainer: {
    width: "100%",
    marginTop: 12,
  },

  multiSelectInstruction: {
    fontSize: 14,
    marginBottom: 8,
    fontStyle: "italic",
  },

  multiSelectOptionsWrapper: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  multiSelectChipInline: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  multiSelectChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
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
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    borderTopWidth: 1,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
    fontSize: 16,
    minHeight: 40,
    maxHeight: 100,
  },
  sendButton: {
    borderRadius: 20,
    padding: 10,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  selectedChip: {
    // This style is now handled inline with theme colors
  },
  selectedOptionText: {
    // This style is now handled inline with theme colors
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
  languageOptionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    maxWidth: "100%",
  },
});
