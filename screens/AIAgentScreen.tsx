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
import { intakeQuestions, profileQuestions, questionToColumnMap } from "../data/AIAgentScreen";

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
  const [selectedMultiSelectOptions, setSelectedMultiSelectOptions] = useState<
    Record<string, string[]>
  >({});
  const [waitingForCityInput, setWaitingForCityInput] = useState(false);
  const [waitingForLocationInput, setWaitingForLocationInput] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const isInitializedRef = useRef(false);
  const initializedUserIdRef = useRef<string | null>(null);
  const isAskingQuestionRef = useRef(false);
  const profileCompletedRef = useRef(false);

  const saveMessageToHistory = async (message: Message) => {
    if (!user) return;
    
    try {
      const { error } = await supabase.from("ai_chat_history").insert({
          user_id: user.id,
          message_data: message,
        });
      
      if (error) {
        console.error("Error saving message to history:", error);
      }
    } catch (error) {
      console.error("Error saving message to history:", error);
    }
  };

  const loadChatHistory = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("ai_chat_history")
        .select("message_data")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });
      
      if (error) {
        console.error("Error loading chat history:", error);
        return;
      }
      
      if (data && data.length > 0) {
        const historyMessages = data.map((item, index) => {
          const message = item.message_data as Message;
          // Convert timestamp string back to Date object
          if (message.timestamp && typeof message.timestamp === "string") {
            message.timestamp = new Date(message.timestamp);
          }
          // Fix old message IDs that might cause duplicates - use index to ensure uniqueness
          if (message.id === "profile-completion" || message.id === "ready-options" || 
              message.id === "completion" || message.id === "welcome-back" || 
              message.id === "no-more-matches") {
            message.id = `${message.id}-${Date.now()}-${index}-${Math.random()}`;
          }
          return message;
        });
        // Deduplicate messages by ID (keep the last occurrence of each ID)
        const seenIds = new Set<string>();
        const uniqueMessages = historyMessages.reverse().filter(m => {
          if (seenIds.has(m.id)) {
            return false;
          }
          seenIds.add(m.id);
          return true;
        }).reverse(); // Reverse back to original order
        setMessages(uniqueMessages);
        console.log("Loaded chat history:", uniqueMessages.length, "messages (deduplicated from", historyMessages.length, ")");
      }
    } catch (error) {
      console.error("Error loading chat history:", error);
    }
  };

  const clearChatHistory = async () => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from("ai_chat_history")
        .delete()
        .eq("user_id", user.id);
      
      if (error) {
        console.error("Error clearing chat history:", error);
      } else {
        setMessages([]);
        console.log("Chat history cleared");
      }
    } catch (error) {
      console.error("Error clearing chat history:", error);
    }
  };

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

  useEffect(() => {
    if (user) {
      initializeChat();
    }
  }, [user]);

  const initializeChat = async () => {
    if (!user) return;
    
    // Reset initialization if user changed
    if (initializedUserIdRef.current !== user.id) {
      console.log("User changed, resetting initialization state");
      isInitializedRef.current = false;
      initializedUserIdRef.current = null;
      profileCompletedRef.current = false; // Reset profile completion ref
      // Reset state
      setMessages([]);
      setCurrentQuestion(0);
      setCurrentProfileStep(0);
      setIntakeAnswers({});
      setProfileData({});
      setIsProfileComplete(false);
      setSelectedLanguages([]);
      setSelectedMultiSelectOptions({});
    }
    
    if (isInitializedRef.current) {
      console.log("Chat already initialized for this user, skipping");
      return;
    }
    
    console.log("Initializing chat...");
    isInitializedRef.current = true;
    initializedUserIdRef.current = user.id;
    
    const { data: historyData, error: historyError } = await supabase
      .from("ai_chat_history")
      .select("message_data")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (historyError) {
      console.error("Error loading chat history:", historyError);
    }

    let existingMessages: Message[] = [];
    if (historyData && historyData.length > 0) {
      existingMessages = historyData.map((item) => {
        const message = item.message_data as Message;
        if (message.timestamp && typeof message.timestamp === "string") {
          message.timestamp = new Date(message.timestamp);
        }
        return message;
      });
      setMessages(existingMessages);
      console.log("Loaded chat history:", existingMessages.length, "messages");
    }

    console.log("Querying database for user ID:", user?.id);
    
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select(
        "id, first_name, last_name, birthdate, gender, pronouns, relationship_status, languages, city, lat, lng, radius_km, sexual_orientation"
      )
      .eq("id", user?.id)
      .single();

    // Check for v4 intake first, fall back to v3 for existing users
    const { data: intakeDataV4, error: intakeErrorV4 } = await supabase
      .from("intake_responses_v4")
      .select("*")
      .eq("user_id", user?.id)
      .single();

    // If v4 doesn't exist, check v3 for backward compatibility
    let intakeData = intakeDataV4;
    let intakeError = intakeErrorV4;
    if (intakeErrorV4 && intakeErrorV4.code === 'PGRST116') {
      const { data: intakeDataV3, error: intakeErrorV3 } = await supabase
      .from("intake_responses_v3")
      .select("*")
      .eq("user_id", user?.id)
      .single();
      intakeData = intakeDataV3;
      intakeError = intakeErrorV3;
    }

    console.log("Profile data from database:", profileData);
    console.log("Profile error:", profileError);
    console.log("Intake data from database:", intakeData);
    console.log("Intake error:", intakeError);

    // Profile is complete if we have the essential fields
    // relationship_status and languages are optional for continuing with intake
    const isProfileComplete = !!(
      profileData &&
      profileData.first_name && 
      profileData.first_name !== "Cooking/Dining out, Concerts/Live music" &&
      profileData.birthdate && 
      profileData.gender && 
      profileData.pronouns && 
      profileData.radius_km &&
      profileData.city
    );

    console.log("Is profile complete:", isProfileComplete);

    // Check if intake is started (v4 or v3 format)
    let hasStartedIntake = false;
    if (intakeData) {
      if (intakeData.responses && Array.isArray(intakeData.responses)) {
        // v4 format: check if any responses exist
        hasStartedIntake = intakeData.responses.length > 0;
      } else {
        // v3 format: backward compatibility
        hasStartedIntake = Object.keys(intakeData).some(
        (key) =>
          key !== "user_id" &&
          key !== "created_at" &&
          key !== "updated_at" &&
            key !== "completed_at" &&
            key !== "embed_vector" &&
          intakeData[key] !== null
      );
      }
    }

    if (existingMessages.length === 0) {
      const welcomeMessage: Message = {
        id: `welcome-${Date.now()}-${Math.random()}`,
        text: "Hi! I'm Cora, your AI connection assistant. I'll help you meet like-minded people through thoughtful matching.\n\nFirst, let me get to know you a bit better with some basic information, then we'll explore what you're looking for in new connections.\n\nReady to begin?",
        sender: "ai",
        timestamp: new Date(),
        type: "text",
      };
      
      setMessages([welcomeMessage]);
      await saveMessageToHistory(welcomeMessage);

      if (!isProfileComplete) {
        console.log("Starting profile collection...");
        const firstUnansweredStep = findFirstUnansweredProfileStep(profileData);
        console.log("First unanswered profile step:", firstUnansweredStep);
        setCurrentProfileStep(firstUnansweredStep);
      setTimeout(() => {
        askNextProfileQuestion();
      }, 1000);
      } else if (!isIntakeComplete(intakeData)) {
        console.log("Profile complete, checking intake questions...");
      setIsProfileComplete(true);
        const firstUnansweredIntake = findFirstUnansweredIntakeQuestion(intakeData);
        console.log("First unanswered intake question index:", firstUnansweredIntake);
        setCurrentQuestion(firstUnansweredIntake);
      setTimeout(() => {
        // Use checkAndAskQuestion directly with the calculated index to avoid state timing issues
        checkAndAskQuestion(firstUnansweredIntake);
      }, 1000);
    } else {
        console.log(
          "Both profile and intake complete, showing completion message..."
        );
        setIsProfileComplete(true);
        setCurrentQuestion(intakeQuestions.length); // Set to completion state
        setTimeout(() => {
          const completionMessage: Message = {
            id: `completion-${Date.now()}-${Math.random()}`,
            text: "🎉 You're all set! We have everything we need to find you great matches.\n\nWe'll send over your next set of matches this weekend. In the meantime, feel free to chat with me about anything!",
            sender: "ai",
            timestamp: new Date(),
            type: "text",
          };
          setMessages((prev) => [...prev, completionMessage]);
          saveMessageToHistory(completionMessage);
        }, 1000);
      }
      } else {
      // If intake has started, prioritize continuing intake over completing profile
      // This prevents restarting profile questions when user is in the middle of intake
      if (hasStartedIntake && !isIntakeComplete(intakeData)) {
        console.log("Intake already started, continuing intake questions...");
        setIsProfileComplete(true); // Mark profile as complete to skip profile questions
        const firstUnansweredIntake = findFirstUnansweredIntakeQuestion(intakeData);
        console.log("First unanswered intake question index:", firstUnansweredIntake);
        setCurrentQuestion(firstUnansweredIntake);
        // Use checkAndAskQuestion directly with the calculated index to avoid state timing issues
        setTimeout(() => {
          checkAndAskQuestion(firstUnansweredIntake);
        }, 1000);
      } else if (!isProfileComplete) {
        console.log("Profile not complete, continuing profile collection...");
        const firstUnansweredStep = findFirstUnansweredProfileStep(profileData);
        setCurrentProfileStep(firstUnansweredStep);
        setTimeout(() => {
          askNextProfileQuestion();
        }, 1000);
      } else if (!isIntakeComplete(intakeData)) {
        console.log("Profile complete, continuing intake questions...");
        setIsProfileComplete(true);
        const firstUnansweredIntake = findFirstUnansweredIntakeQuestion(intakeData);
        console.log("First unanswered intake question index:", firstUnansweredIntake);
        setCurrentQuestion(firstUnansweredIntake);
        // Use checkAndAskQuestion directly with the calculated index to avoid state timing issues
        setTimeout(() => {
          checkAndAskQuestion(firstUnansweredIntake);
        }, 1000);
      } else {
        console.log("Both profile and intake complete, ready for matches...");
        setIsProfileComplete(true);
        setCurrentQuestion(intakeQuestions.length); // Set to completion state
        // Don't add completion message again if messages already exist
      }
    }
  };

  const findFirstUnansweredProfileStep = (profileData: any) => {
    if (!profileData) return 0;
    
    // Check each profile question in order
    for (let i = 0; i < profileQuestions.length; i++) {
      const question = profileQuestions[i];
      
      // Skip conditional questions that shouldn't be shown
      if (question.conditionalOn && question.showIf) {
        const conditionalValue = profileData[question.conditionalOn];
        if (!conditionalValue || !question.showIf.includes(conditionalValue)) {
          continue; // Skip this question as it's conditional and conditions aren't met
        }
      }
      
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
          isAnswered = !!(
            profileData.languages && profileData.languages.length > 0
          );
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

  const findFirstUnansweredIntakeQuestion = (intakeData: any) => {
    if (!intakeData) {
      console.log("findFirstUnansweredIntakeQuestion: no intakeData");
      return 0;
    }

    // Handle v4 format (JSON array) vs v3 format (columns)
    const isV4Format = intakeData.responses && Array.isArray(intakeData.responses);
    const responsesMap = isV4Format 
      ? new Map(intakeData.responses.map((r: any) => [r.question_id, r.answer]))
      : null;

    console.log("findFirstUnansweredIntakeQuestion: checking", 
      isV4Format ? `${intakeData.responses.length} responses (v4)` : `${Object.keys(intakeData).length} fields (v3)`);
    
    // Log all question IDs in responses for debugging
    if (isV4Format && intakeData.responses.length > 0) {
      const responseQuestionIds = intakeData.responses.map((r: any) => r.question_id);
      console.log("Response question IDs in database:", responseQuestionIds);
      console.log("Expected question IDs:", intakeQuestions.map(q => q.id));
    }

    // Check each intake question in order
    for (let i = 0; i < intakeQuestions.length; i++) {
      const question = intakeQuestions[i];
      
      // Get answer from v4 format (JSON) or v3 format (columns)
      const fieldValue = isV4Format 
        ? responsesMap?.get(question.id)
        : intakeData[question.id];
      
      // Skip conditional questions that shouldn't be shown
      if (question.conditionalOn && question.showIf) {
        const conditionalValue = isV4Format 
          ? responsesMap?.get(question.conditionalOn)
          : intakeData[question.conditionalOn];
        if (!conditionalValue || !question.showIf.includes(conditionalValue)) {
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

  const isIntakeComplete = (intakeData: any) => {
    const firstUnanswered = findFirstUnansweredIntakeQuestion(intakeData);
    const isComplete = firstUnanswered >= intakeQuestions.length;
    console.log("isIntakeComplete check:", {
      intakeData: intakeData ? Object.keys(intakeData).length : 'null',
      firstUnanswered,
      intakeQuestionsLength: intakeQuestions.length,
      isComplete
    });
    return isComplete;
  };

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

  const askNextProfileQuestion = () => {
    console.log(
      "askNextProfileQuestion called, currentProfileStep:",
      currentProfileStep,
      "total questions:",
      profileQuestions.length
    );
    
    if (currentProfileStep < profileQuestions.length) {
      const question = profileQuestions[currentProfileStep];
      
      // Skip conditional questions that shouldn't be shown
      if (question.conditionalOn && question.showIf) {
        const conditionalValue = profileData[question.conditionalOn];
        if (!conditionalValue || !question.showIf.includes(conditionalValue)) {
          console.log(`Skipping conditional question ${question.id} - condition not met`);
          // Move to next question
          setCurrentProfileStep(currentProfileStep + 1);
          setTimeout(() => askNextProfileQuestion(), 100);
          return;
        }
      }
      
      console.log("Asking profile question:", question.id, question.text);
      
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
          
          // Skip conditional questions that shouldn't be shown
          if (question.conditionalOn && question.showIf) {
            const conditionalValue = profileData[question.conditionalOn];
            if (!conditionalValue || !question.showIf.includes(conditionalValue)) {
              console.log(`Skipping conditional question ${question.id} in moveToNextQuestion - condition not met`);
              // Recursively move to next question
              setCurrentProfileStep(nextStep);
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

  const checkAndAskQuestion = (questionIndex: number, latestAnswers?: Record<string, any>) => {
    console.log("checkAndAskQuestion called with index:", questionIndex);
    
    if (questionIndex >= intakeQuestions.length) {
      completeIntake();
      return;
    }
    
    const question = intakeQuestions[questionIndex];
    
    // Skip conditional questions that shouldn't be shown
    if (question.conditionalOn && question.showIf) {
      // Use latest answers if provided, otherwise fall back to state
      const answersToCheck = latestAnswers || intakeAnswers;
      const conditionalValue = answersToCheck[question.conditionalOn];
      if (!conditionalValue || !question.showIf.includes(conditionalValue)) {
        console.log(`Skipping conditional intake question ${question.id} at index ${questionIndex} - condition not met`);
        // Recursively check the next question, passing along latest answers
        checkAndAskQuestion(questionIndex + 1, latestAnswers);
        return;
      }
    }
    
    // Update the current question state and ask the question
    setCurrentQuestion(questionIndex);
    console.log("Asking intake question:", question.id, question.text);
    const questionMessage: Message = {
      id: `question-${question.id}-${Date.now()}-${Math.random()}`,
      text: question.text,
      sender: "ai" as const,
      timestamp: new Date(),
      type: "question",
      data: question,
    };
    setMessages((prev) => {
      const newMessages = [...prev, questionMessage];
      saveMessageToHistory(questionMessage);
      return newMessages;
    });
  };

  const askNextQuestion = () => {
    if (isAskingQuestionRef.current) {
      console.log("askNextQuestion called but already asking a question, skipping");
      return;
    }
    
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
    answer: string | string[]
  ) => {
    if (!user) {
      console.error("No user found when saving intake answer");
      return;
    }

    try {
      // Get current v4 intake data from database
      const { data: existingIntake } = await supabase
        .from("intake_responses_v4")
        .select("*")
        .eq("user_id", user.id)
        .single();

      // Find the question to get its metadata
      const question = intakeQuestions.find(q => q.id === questionId);
      if (!question) {
        console.error("Question not found:", questionId);
        return;
      }

      // Get existing responses array or create new one
      const existingResponses: any[] = existingIntake?.responses || [];
      
      // Find if this question already has a response
      const responseIndex = existingResponses.findIndex(r => r.question_id === questionId);
      
      // Create response object
      const responseObj = {
        question_id: questionId,
        question_text: question.text,
        answer: Array.isArray(answer) ? answer : answer,
        type: question.type === "open_ended" ? "open_ended" : "structured",
        answered_at: new Date().toISOString()
      };

      // Update or add response
      let updatedResponses: any[];
      if (responseIndex >= 0) {
        updatedResponses = [...existingResponses];
        updatedResponses[responseIndex] = responseObj;
      } else {
        updatedResponses = [...existingResponses, responseObj];
      }

      // Build update object
      const intakeToUpdate: any = {
        user_id: user.id,
        responses: updatedResponses,
        updated_at: new Date().toISOString(),
      };

      // Extract and update filtered columns if this question maps to one
      const columnName = questionToColumnMap[questionId];
      if (columnName) {
        if (columnName === "availability_times" && Array.isArray(answer)) {
          intakeToUpdate[columnName] = answer;
        } else if (typeof answer === "string") {
          intakeToUpdate[columnName] = answer;
        }
      }

      // If intake exists, preserve embed_vector and completed_at
      if (existingIntake) {
        if (existingIntake.embed_vector) {
          intakeToUpdate.embed_vector = existingIntake.embed_vector;
        }
        if (existingIntake.completed_at) {
          intakeToUpdate.completed_at = existingIntake.completed_at;
        }
      }

      console.log(
        "Updating intake v4 in database:",
        intakeToUpdate,
        "for question:",
        questionId
      );

      const { data, error } = await supabase
        .from("intake_responses_v4")
        .upsert(intakeToUpdate);

      if (error) {
        console.error("Error saving intake answer:", error);
      } else {
        console.log("Intake answer saved successfully:", data);
        
        // Update local intakeAnswers state for conditional logic
        const updatedAnswers = {
          ...intakeAnswers,
          [questionId]: answer
        };
        setIntakeAnswers(updatedAnswers);
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
            const [month, day, year] = answer.split("/");
            const birthDate = new Date(
              parseInt(year),
              parseInt(month) - 1,
              parseInt(day)
            );
            profileToUpdate.birthdate = birthDate.toISOString().split("T")[0]; // Store as YYYY-MM-DD
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
            if (answer === "Use My Location") {
              // Location permission and coordinates will be handled separately
              // This case is handled by the location permission UI flow
              console.log("Location permission flow initiated");
            } else if (answer === "Enter Manually") {
              // Manual entry will be handled by a text input
              console.log("Manual location entry initiated");
            } else if (answer.startsWith("manual_city:")) {
              // Handle manual city input
              const city = answer.replace("manual_city:", "");
              profileToUpdate.city = city;
              // Set default coordinates (could be improved with geocoding)
            profileToUpdate.lat = 37.7749;
            profileToUpdate.lng = -122.4194;
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
        case "meetRadius":
          if (typeof answer === "string") {
            // Convert miles to km and store in radius_km column
            const radiusMiles = parseInt(answer.split(" ")[0]);
            profileToUpdate.radius_km = Math.round(radiusMiles * 1.60934);
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
        case "has_kids":
          if (typeof answer === "string") {
            profileToUpdate.has_kids = answer;
          }
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
        .select(
          "first_name, last_name, gender, age, pronouns, relationship_status, languages"
        )
        .eq("id", user.id)
        .single();

      if (existingProfile) {
        const bioParts = [];
        // Combine first and last name
        const fullName = [existingProfile.first_name, existingProfile.last_name]
          .filter(Boolean)
          .join(" ");
        if (fullName) bioParts.push(fullName);
        if (existingProfile.age)
          bioParts.push(`${existingProfile.age} years old`);
        if (existingProfile.gender) bioParts.push(existingProfile.gender);
        if (existingProfile.pronouns) bioParts.push(existingProfile.pronouns);
        if (existingProfile.relationship_status)
          bioParts.push(existingProfile.relationship_status);
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
    
    // Check if completion message already exists to avoid duplicates
    const completionText = "Great! To help me find people you'd connect with, I'd like to get to know you better. I'll ask you some questions about yourself.\n\nReady to continue?";
    
    setMessages((prev) => {
      const hasCompletionMessage = prev.some(m => 
        m.sender === "ai" && 
        m.text === completionText
      );

      if (hasCompletionMessage) {
        console.log("Completion message already exists, skipping");
        return prev;
      }

      // Also check for any message with profile-completion in the ID
      const hasCompletionById = prev.some(m => 
        m.id && (m.id.includes("profile-completion") || m.id === "profile-completion")
      );

      if (hasCompletionById) {
        console.log("Completion message with profile-completion ID already exists, skipping");
        return prev;
      }

      const completionMessage: Message = {
        id: `profile-completion-${Date.now()}-${Math.random()}-${user?.id}`,
        text: completionText,
        sender: "ai" as const,
        timestamp: new Date(),
        type: "text",
      };

      const newMessages = [...prev, completionMessage];
      saveMessageToHistory(completionMessage);
      return newMessages;
    });

    setIsProfileComplete(true);

    // Add a ready button or wait for user response
    setTimeout(() => {
      setMessages((prev) => {
        // Check if ready options message already exists to avoid duplicates
        const hasReadyOptions = prev.some(m => 
          m.sender === "ai" && 
          m.type === "profile-question" &&
          m.data?.id === "ready_to_start"
        );

        if (hasReadyOptions) {
          console.log("Ready options message already exists, skipping");
          return prev;
        }

        // Also check for any message with ready-options in the ID
        const hasReadyById = prev.some(m => 
          m.id && (m.id.includes("ready-options") || m.id === "ready-options")
        );

        if (hasReadyById) {
          console.log("Ready options message with ready-options ID already exists, skipping");
          return prev;
        }

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
        
        const newMessages = [...prev, readyOptions];
        saveMessageToHistory(readyOptions);
        return newMessages;
      });
    }, 1000);
  };

  const completeIntake = async () => {
    const completionMessage: Message = {
      id: `completion-${Date.now()}-${Math.random()}`,
      text: "🎉 All done! I'll use this information to curate your café connections. You'll see match suggestions in the Connections tab!\n\nWant to chat about anything else?",
      sender: "ai" as const,
      timestamp: new Date(),
      type: "text",
    };
    setMessages((prev) => [...prev, completionMessage]);

    // Generate embeddings and save final v4 record
    if (user) {
      try {
        // Get all responses from v4 table
        const { data: existingIntake, error: fetchError } = await supabase
          .from("intake_responses_v4")
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

        // Combine all responses into text for embedding
        const allAnswersText = existingIntake.responses
          .map((r: any) => `${r.question_text}: ${r.answer}`)
          .join('\n\n');

        // Generate embedding
        const embedding = await openAIService.generateEmbedding(allAnswersText);

        // Update v4 record with embedding and completed_at
        const { error: updateError } = await supabase
          .from("intake_responses_v4")
          .upsert({
        user_id: user.id,
            responses: existingIntake.responses,
            embed_vector: embedding,
            completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
            // Preserve filtered columns
            life_stage: existingIntake.life_stage,
            drive_distance: existingIntake.drive_distance,
            availability_times: existingIntake.availability_times,
            age_range_preference: existingIntake.age_range_preference,
            political_classification: existingIntake.political_classification,
            political_alignment_important: existingIntake.political_alignment_important,
          });

        if (updateError) {
          console.error("Error saving final intake with embedding:", updateError);
        } else {
          console.log("Intake completed and embedding generated successfully");
          
          // Trigger match replenishment
          try {
            await fetch(`https://hgllvhohhyamsbljekrd.supabase.co/functions/v1/replenish-matches`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
              },
              body: JSON.stringify({ user_id: user.id }),
            });
          } catch (error) {
            console.error("Error triggering match replenishment:", error);
          }
        }
      } catch (error) {
        console.error("Error completing intake:", error);
      }
    }

    // Check for matches after completing intake
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
          id: `welcome-back-${Date.now()}-${Math.random()}`,
          text: "Welcome back! Your weekly Flock connections will appear here every Sunday. For now, feel free to chat with me about anything!",
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
        id: `no-more-matches-${Date.now()}-${Math.random()}`,
        text: "That's all your café connections for this week! Check back next Sunday for new local suggestions. Feel free to chat with me about anything!",
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
        } café connection for the week:`,
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

  const fetchConnectionContext = async () => {
    if (!user) return null;

    try {
      // Fetch all matches (active, opted-in, and passed)
      const { data: matchesData } = await supabase
        .from('matcha_match_candidates')
        .select('*')
        .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
        .in('status', ['active', 'opted_in_a', 'opted_in_b', 'mutual_opt_in', 'passed'])
        .gt('expires_at', new Date().toISOString());

      // Fetch active conversations
      const { data: conversationsData } = await supabase
        .from('conversations')
        .select('*')
        .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
        .eq('conversation_type', 'matcha')
        .eq('status', 'active');

      // Fetch opt-ins and passes
      const { data: optInsData } = await supabase
        .from('matcha_opt_ins')
        .select('*')
        .eq('user_id', user.id);

      // Get match IDs from opt_ins to fetch their data
      const optInMatchIds = optInsData?.map(optIn => optIn.match_id) || [];
      
      // Fetch match data for passed/opted-in matches that might not be in active matches
      let additionalMatchesData: any[] = [];
      if (optInMatchIds.length > 0) {
        const { data: additionalMatches } = await supabase
          .from('matcha_match_candidates')
          .select('*')
          .in('id', optInMatchIds);
        additionalMatchesData = additionalMatches || [];
      }

      // Combine all matches
      const allMatchesData = [...(matchesData || []), ...additionalMatchesData];
      const uniqueMatchesMap = new Map();
      allMatchesData.forEach((match: any) => {
        if (!uniqueMatchesMap.has(match.id)) {
          uniqueMatchesMap.set(match.id, match);
        }
      });
      const allMatches = Array.from(uniqueMatchesMap.values());

      // Get all unique user IDs
      const userIds = new Set<string>();
      allMatches.forEach((match: any) => {
        userIds.add(match.user_a);
        userIds.add(match.user_b);
      });
      conversationsData?.forEach((conv: any) => {
        userIds.add(conv.user_a);
        userIds.add(conv.user_b);
      });

      // Fetch all profiles
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, age, city')
        .in('id', Array.from(userIds));

      const profilesMap = new Map();
      profilesData?.forEach((profile: any) => {
        profilesMap.set(profile.id, profile);
      });

      // Process matches
      const activeMatches: Array<{ 
        name: string; 
        age?: number; 
        sharedInterests?: string[]; 
        conversationHooks?: string[];
        matchScore?: string;
        matchReasons?: any;
      }> = [];
      const optedInMatches: Array<{ name: string; status: string; matchReasons?: any }> = [];
      const passedMatches: Array<{ name: string; reason?: string; matchReasons?: any; matchScore?: string }> = [];

      allMatches.forEach((match: any) => {
        const isUserA = match.user_a === user.id;
        const otherUserId = isUserA ? match.user_b : match.user_a;
        const otherUser = profilesMap.get(otherUserId);
        if (!otherUser) return;

        const name = `${otherUser.first_name || 'Unknown'} ${otherUser.last_name ? otherUser.last_name.charAt(0) + '.' : ''}`;
        const sharedInterests = match.reasons?.shared_interests || [];
        const conversationHooks = match.reasons?.conversation_hooks || [];
        const matchScore = match.score;

        if (match.status === 'active') {
          activeMatches.push({
            name: name.trim(),
            age: otherUser.age,
            sharedInterests: sharedInterests,
            conversationHooks: conversationHooks,
            matchScore: matchScore,
            matchReasons: match.reasons
          });
        } else if (match.status === 'opted_in_a' || match.status === 'opted_in_b') {
          const userOptedIn = (isUserA && match.status === 'opted_in_a') || (!isUserA && match.status === 'opted_in_b');
          if (userOptedIn) {
            optedInMatches.push({
              name: name.trim(),
              status: match.status,
              matchReasons: match.reasons
            });
          }
        } else if (match.status === 'passed') {
          passedMatches.push({
            name: name.trim(),
            matchReasons: match.reasons,
            matchScore: matchScore
          });
        }
      });

      // Process opt-ins and passes
      if (optInsData && allMatches.length > 0) {
        const matchesMap = new Map();
        allMatches.forEach((match: any) => {
          matchesMap.set(match.id, match);
        });

        optInsData.forEach((optIn: any) => {
          const match = matchesMap.get(optIn.match_id);
          if (!match) return;

          const isUserA = match.user_a === user.id;
          const otherUserId = isUserA ? match.user_b : match.user_a;
          const otherUser = profilesMap.get(otherUserId);
          if (!otherUser) return;

          const name = `${otherUser.first_name || 'Unknown'} ${otherUser.last_name ? otherUser.last_name.charAt(0) + '.' : ''}`;

          if (optIn.decision === 'opt_in') {
            if (match.status === 'mutual_opt_in') {
              optedInMatches.push({
                name: name.trim(),
                status: 'mutual_opt_in',
                matchReasons: match.reasons
              });
            }
          } else if (optIn.decision === 'pass') {
            passedMatches.push({
              name: name.trim(),
              matchReasons: match.reasons,
              matchScore: match.score
            });
          }
        });
      }

      // Process conversations
      const activeConversations: Array<{ name: string; age?: number; city?: string }> = [];
      conversationsData?.forEach((conv: any) => {
        const isUserA = conv.user_a === user.id;
        const otherUserId = isUserA ? conv.user_b : conv.user_a;
        const otherUser = profilesMap.get(otherUserId);
        if (!otherUser) return;

        activeConversations.push({
          name: `${otherUser.first_name || 'Unknown'} ${otherUser.last_name ? otherUser.last_name.charAt(0) + '.' : ''}`.trim(),
          age: otherUser.age,
          city: otherUser.city
        });
      });

      return {
        activeMatches,
        activeConversations,
        optedInMatches,
        passedMatches
      };
    } catch (error) {
      console.error('Error fetching connection context:', error);
      return null;
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

    if (waitingForCityInput) {
      console.log("Saving city input:", currentInput);
      await saveProfileAnswerToRemote("location", `Manual: ${currentInput}`);
      setWaitingForCityInput(false);
      moveToNextQuestion();
      setIsTyping(false);
      return;
    }

    if (waitingForLocationInput) {
      console.log("Saving manual location input:", currentInput);
      await saveProfileAnswerToRemote("location", `manual_city:${currentInput}`);
      setWaitingForLocationInput(false);
      
      const confirmMessage: Message = {
        id: `location-manual-confirm-${Date.now()}`,
        text: `Perfect! I've set your location to ${currentInput}.`,
        sender: "ai" as const,
        timestamp: new Date(),
        type: "text",
      };
      setMessages((prev) => [...prev, confirmMessage]);
      
      setTimeout(() => {
        moveToNextQuestion();
      }, 1500);
      
      setIsTyping(false);
      setCurrentInput("");
      return;
    }

    // Handle intake questions when profile is complete
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

      // Handle text-type and open-ended questions
      if (currentIntakeQuestion.type === "text" || currentIntakeQuestion.type === "open_ended") {
        console.log(
          "Saving intake answer to remote database:",
          currentIntakeQuestion.id,
          currentInput,
          "Question type:",
          currentIntakeQuestion.type
        );

        await saveIntakeAnswerToRemote(currentIntakeQuestion.id, currentInput);

        // Create updated answers object with the latest input
        const updatedAnswers = {
          ...intakeAnswers,
          [currentIntakeQuestion.id]: currentInput
        };

        // Move to next question
        const nextQuestionIndex = currentQuestion + 1;

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
        const validationResult = currentIntakeQuestion.validation
          ? currentIntakeQuestion.validation(currentInput)
          : null;

        if (validationResult) {
          const errorMessage: Message = {
            id: `error-${Date.now()}`,
            text: validationResult,
            sender: "ai",
            timestamp: new Date(),
            type: "text",
          };
          setMessages((prev) => [...prev, errorMessage]);
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
        setCurrentQuestion(nextQuestionIndex);
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
            setMessages((prev) => [...prev, errorMessage]);
            setIsTyping(false);
            return;
          }

      // Handle multi-select questions
      if (currentIntakeQuestion.type === "multi_select") {
        let selectedOptions =
          selectedMultiSelectOptions[currentIntakeQuestion.id] || [];

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

          setSelectedMultiSelectOptions((prev) => {
            const newState = { ...prev };
            delete newState[currentIntakeQuestion.id];
            return newState;
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
          setMessages((prev) => [...prev, errorMessage]);
          setIsTyping(false);
          return;
        }

      setIsTyping(false);
      return;
    }

    // Handle profile questions when profile is not complete
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
        if (selectedLanguages.length > 0) {
          console.log(
            "Saving languages to remote database:",
            currentProfileQuestion.id,
            selectedLanguages
          );

          await saveProfileAnswerToRemote(
            currentProfileQuestion.id,
            selectedLanguages
          );
          setSelectedLanguages([]);
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
          setMessages((prev) => [...prev, errorMessage]);
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
      setCurrentQuestion(0);
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

    // Handle general chat when both profile and intake are complete
    try {
      const connectionContext = await fetchConnectionContext();
      const response = await openAIService.generateChatResponse(currentInput, connectionContext || undefined);
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
                            setMessages((prev) => [...prev, userSelectionMessage]);

                            await saveIntakeAnswerToRemote(item.data.id, option);
                    
                        // Create updated answers object with the latest selection
                        const updatedAnswers = {
                          ...intakeAnswers,
                          [item.data.id]: option
                        };

                        const nextQuestionIndex = currentQuestion + 1;
                    
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
                        }-${currentProfileStep}-${Date.now()}`,
                         text: option,
                        sender: "user" as const,
                         timestamp: new Date(),
                        type: "text",
                       };
                      setMessages((prev) => [...prev, userSelectionMessage]);
                       
                      // Special handling for ready_to_start transition
                      if (item.data.id === "ready_to_start") {
                        if (option === "Yes, let's start!") {
                          // Start intake questions
                          setCurrentQuestion(0);
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
                          setMessages((prev) => [...prev, laterMessage]);
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
                    <Text style={styles.multiSelectInstruction}>
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
                                backgroundColor: selectedMultiSelectOptions[item.data.id]?.includes(option)
                                  ? theme.colors.primary
                                  : theme.colors.surface,
                                borderColor: selectedMultiSelectOptions[item.data.id]?.includes(option)
                                  ? theme.colors.primary
                                  : theme.colors.border,
                              },
                        ]}
                        onPress={() => {
                          const questionId = item.data.id;
                              setSelectedMultiSelectOptions((prev) => {
                                const currentSelections =
                                  prev[questionId] || [];
                            let newSelections;
                            
                            if (currentSelections.includes(option)) {
                              // Remove if already selected
                                  newSelections = currentSelections.filter(
                                    (item) => item !== option
                                  );
                                } else if (
                                  item.data.maxSelections &&
                                  currentSelections.length >=
                                    item.data.maxSelections
                                ) {
                              // Don't add if at limit
                              newSelections = currentSelections;
                         } else {
                              // Add if under limit
                                  newSelections = [
                                    ...currentSelections,
                                    option,
                                  ];
                            }
                            
                            // Update the input text to show selected options
                                setInputText(newSelections.join(", "));
                            
                            return {
                              ...prev,
                                  [questionId]: newSelections,
                            };
                          });
                        }}
                      >
                            <Text
                              style={[
                          styles.optionText,
                                {
                                  color: selectedMultiSelectOptions[item.data.id]?.includes(option)
                                    ? '#FFFFFF'
                                    : theme.colors.text,
                                  fontWeight: selectedMultiSelectOptions[item.data.id]?.includes(option)
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
                    <Text style={styles.multiSelectInstruction}>
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
                              selectedLanguages.includes(option) &&
                                styles.selectedChip,
                        ]}
                        onPress={() => {
                              setSelectedLanguages((prev) => {
                            let newSelection;
                            if (prev.includes(option)) {
                              // Remove if already selected
                                  newSelection = prev.filter(
                                    (lang) => lang !== option
                                  );
                            } else if (prev.length < 5) {
                              // Add if under limit
                              newSelection = [...prev, option];
                            } else {
                              // Don't add if at limit
                              newSelection = prev;
                            }
                            
                            // Update the input text to show selected languages
                                setInputText(newSelection.join(", "));
                            return newSelection;
                          });
                        }}
                      >
                            <Text
                              style={[
                          styles.optionText,
                                selectedLanguages.includes(option) &&
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
                      setMessages((prev) => [...prev, userSelectionMessage]);
                       
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
                              setMessages((prev) => [...prev, confirmMessage]);
                              
                              // Move to next question
                              setTimeout(() => {
                      moveToNextQuestion();
                              }, 1500);
                            } else {
                              // Permission denied, offer manual entry
                              const manualMessage: Message = {
                                id: `manual-fallback-${Date.now()}`,
                                text: "No worries! Please enter your city manually:",
                                sender: "ai" as const,
                                timestamp: new Date(),
                                type: "text",
                              };
                              setMessages((prev) => [...prev, manualMessage]);
                              
                              // Show manual input (handled by text input logic)
                              setInputPlaceholder("Enter your city (e.g., Los Angeles, CA)");
                              setWaitingForLocationInput(true);
                            }
                          } else if (option === "Enter Manually") {
                            // Show manual input
                            const manualMessage: Message = {
                              id: `manual-entry-${Date.now()}`,
                              text: "Please enter your city:",
                              sender: "ai" as const,
                              timestamp: new Date(),
                              type: "text",
                            };
                            setMessages((prev) => [...prev, manualMessage]);
                            setInputPlaceholder("Enter your city (e.g., Los Angeles, CA)");
                            setWaitingForLocationInput(true);
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
                <Text style={styles.multiSelectInstruction}>
                  {item.data.maxSelections
                    ? `Tap options to add them to the text box below (up to ${item.data.maxSelections}), then press send:`
                    : "Tap options to add them to the text box below, then press send:"}
                </Text>
                <View style={styles.multiSelectOptionsWrapper}>
                {item.data.options.map((option: string, index: number) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.multiSelectChip,
                        selectedMultiSelectOptions[item.data.id]?.includes(
                          option
                        ) && styles.selectedChip,
                    ]}
                    onPress={() => {
                      const questionId = item.data.id;
                        setSelectedMultiSelectOptions((prev) => {
                        const currentSelections = prev[questionId] || [];
                        let newSelections;
                        
                        if (currentSelections.includes(option)) {
                          // Remove if already selected
                            newSelections = currentSelections.filter(
                              (item) => item !== option
                            );
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
                        
                        return {
                          ...prev,
                            [questionId]: newSelections,
                        };
                      });
                    }}
                  >
                      <Text
                        style={[
                      styles.optionText,
                          selectedMultiSelectOptions[item.data.id]?.includes(
                            option
                          ) && styles.selectedOptionText,
                        ]}
                      >
                      {option}
                    </Text>
                  </TouchableOpacity>
                ))}
                </View>
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

    if (lastMessage.type === "question" && lastMessage.data?.options) {
      const questionType = lastMessage.data.type;
      // Only disable for questions that should use option chips (NOT text, open_ended, or multi_select)
  return (
        questionType === "single_select" ||
        questionType === "likert" ||
        questionType === "scale"
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
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={['top', 'left', 'right']}
    >
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Cora
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
            Cora is typing...
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
    backgroundColor: "#007AFF", // iOS iMessage blue
    borderBottomRightRadius: 4,
    alignSelf: "flex-end",
  },
  aiBubble: {
    backgroundColor: "#E5E5EA", // iOS Messages gray
    borderBottomLeftRadius: 4,
    alignSelf: "flex-start",
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
    color: "#FFFFFF",
    fontSize: 14,
    marginBottom: 8,
    fontStyle: "italic",
  },

  multiSelectOptionsWrapper: {
    flexDirection: "column",
    width: "100%",
  },

  multiSelectChipInline: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    width: '100%',
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
