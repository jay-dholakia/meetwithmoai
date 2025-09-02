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
import { intakeQuestions, profileQuestions } from "../data/AIAgentScreen";

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
  const flatListRef = useRef<FlatList>(null);
  const isInitializedRef = useRef(false);

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
        const historyMessages = data.map((item) => {
          const message = item.message_data as Message;
          // Convert timestamp string back to Date object
          if (message.timestamp && typeof message.timestamp === "string") {
            message.timestamp = new Date(message.timestamp);
          }
          return message;
        });
        setMessages(historyMessages);
        console.log("Loaded chat history:", historyMessages.length, "messages");
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
    text: "🎉 All set! Thanks for sharing. I'll use this to curate your weekly friend intros. They'll show up here every Sunday. Want a Friday reminder?",
    type: "outro",
    options: ["Yes", "No"],
  };

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

    if (!user) return;

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

    const { data: intakeData, error: intakeError } = await supabase
      .from("intake_responses_v3")
      .select("*")
      .eq("user_id", user?.id)
      .single();

    console.log("Profile data from database:", profileData);
    console.log("Profile error:", profileError);
    console.log("Intake data from database:", intakeData);
    console.log("Intake error:", intakeError);

    const isProfileComplete = !!(
      profileData &&
      profileData.first_name &&
      profileData.first_name !== "Cooking/Dining out, Concerts/Live music" &&
      profileData.birthdate &&
      profileData.gender &&
      profileData.pronouns &&
      profileData.relationship_status &&
      profileData.languages &&
      Array.isArray(profileData.languages) &&
      profileData.languages.length > 0 &&
      profileData.radius_km &&
      profileData.city
    );

    console.log("Is profile complete:", isProfileComplete);

    const hasStartedIntake =
      intakeData &&
      Object.keys(intakeData).some(
        (key) =>
          key !== "user_id" &&
          key !== "created_at" &&
          key !== "updated_at" &&
          intakeData[key] !== null
      );

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
        console.log("Starting profile collection...");
        const firstUnansweredStep = findFirstUnansweredProfileStep(profileData);
        console.log("First unanswered profile step:", firstUnansweredStep);
        setCurrentProfileStep(firstUnansweredStep);
        setTimeout(() => {
          askNextProfileQuestion();
        }, 1000);
      } else if (!intakeData) {
        console.log("Profile complete, starting intake...");
        setIsProfileComplete(true);
        setTimeout(() => {
          askNextQuestion();
        }, 1000);
      } else {
        console.log(
          "Both profile and intake complete, checking for matches..."
        );
        setIsProfileComplete(true);
        await checkForWeeklyMatches();
      }
    } else {
      if (hasStartedIntake) {
        console.log(
          "User has started intake questions, continuing from database state..."
        );
        setIsProfileComplete(true);
        if (intakeData) {
          const answeredQuestions = Object.keys(intakeData).filter(
            (key) =>
              key !== "user_id" &&
              key !== "created_at" &&
              key !== "updated_at" &&
              intakeData[key] !== null
          );
          const lastAnsweredQuestion =
            answeredQuestions[answeredQuestions.length - 1];
          const nextQuestionIndex =
            intakeQuestions.findIndex((q) => q.id === lastAnsweredQuestion) + 1;
          if (nextQuestionIndex < intakeQuestions.length) {
            setCurrentQuestion(nextQuestionIndex);
            // ADD THIS LINE TO ACTUALLY DISPLAY THE QUESTION
            setTimeout(() => {
              const question = intakeQuestions[nextQuestionIndex];
              const questionMessage: Message = {
                id: `question-${question.id}-${Date.now()}-${Math.random()}`,
                text: question.text,
                sender: "ai" as const,
                timestamp: new Date(),
                type: "question",
                data: question,
              };
              setMessages((prev) => [...prev, questionMessage]);
            }, 1000);
          } else {
            completeIntake();
          }
        }
      } else if (isProfileComplete) {
        console.log(
          "Profile complete but no intake started, starting intake..."
        );
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

  const askNextQuestion = () => {
    console.log(
      "askNextQuestion called, currentQuestion:",
      currentQuestion,
      "intakeQuestions.length:",
      intakeQuestions.length
    );
    if (currentQuestion < intakeQuestions.length) {
      const question = intakeQuestions[currentQuestion];
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
        .from("intake_responses_v3")
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

      console.log(
        "Updating intake in database:",
        intakeToUpdate,
        "for question:",
        questionId,
        "answer type:",
        typeof answer,
        "is array:",
        Array.isArray(answer)
      );

      const { data, error } = await supabase
        .from("intake_responses_v3")
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

    const completionMessage: Message = {
      id: "profile-completion",
      text: "Great! Now let's dive into what you're looking for in friendships. I'll ask you about 50 questions to understand your preferences, communication style, and what makes a great friend for you.\n\nThis will take about 15-20 minutes. Ready to continue?",
      sender: "ai" as const,
      timestamp: new Date(),
      type: "text",
    };

    setMessages((prev) => {
      const newMessages = [...prev, completionMessage];
      saveMessageToHistory(completionMessage);
      return newMessages;
    });

    setIsProfileComplete(true);

    // Add a ready button or wait for user response
    const readyOptions: Message = {
      id: "ready-options",
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

    setTimeout(() => {
      setMessages((prev) => {
        const newMessages = [...prev, readyOptions];
        saveMessageToHistory(readyOptions);
        return newMessages;
      });
    }, 1000);
  };

  const completeIntake = async () => {
    const completionMessage: Message = {
      id: "completion",
      text: "🎉 All done! I'll use this information to curate your weekly friend introductions. You'll see them here every Sunday at noon.\n\nWant a Friday reminder?",
      sender: "ai" as const,
      timestamp: new Date(),
      type: "text",
    };
    setMessages((prev) => [...prev, completionMessage]);

    // Save intake responses to database
    if (user) {
      // The intake responses are already saved individually as the user answers each question
      // Just mark as completed by updating the updated_at timestamp
      await supabase.from("intake_responses_v3").upsert({
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

    if (waitingForCityInput) {
      console.log("Saving city input:", currentInput);
      await saveProfileAnswerToRemote("location", `Manual: ${currentInput}`);
      setWaitingForCityInput(false);
      moveToNextQuestion();
      setIsTyping(false);
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

      // Handle text-type questions
      if (currentIntakeQuestion.type === "text") {
        console.log(
          "Saving intake answer to remote database:",
          currentIntakeQuestion.id,
          currentInput,
          "Question type:",
          currentIntakeQuestion.type
        );

        await saveIntakeAnswerToRemote(currentIntakeQuestion.id, currentInput);

        // Move to next question
        const nextQuestionIndex = currentQuestion + 1;
        setCurrentQuestion(nextQuestionIndex);

        setTimeout(() => {
          if (nextQuestionIndex < intakeQuestions.length) {
            const question = intakeQuestions[nextQuestionIndex];
            const questionMessage: Message = {
              id: `question-${question.id}-${Date.now()}-${Math.random()}`,
              text: question.text,
              sender: "ai" as const,
              timestamp: new Date(),
              type: "question",
              data: question,
            };
            setMessages((prev) => [...prev, questionMessage]);
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

          setCurrentQuestion(nextQuestionIndex);

          setTimeout(() => {
            console.log(
              "DEBUG: About to ask next question, index:",
              nextQuestionIndex
            );
            if (nextQuestionIndex < intakeQuestions.length) {
              const question = intakeQuestions[nextQuestionIndex];
              console.log(
                "DEBUG: Next question is:",
                question.id,
                question.text
              );
              const questionMessage: Message = {
                id: `question-${question.id}-${Date.now()}-${Math.random()}`,
                text: question.text,
                sender: "ai" as const,
                timestamp: new Date(),
                type: "question",
                data: question,
              };
              setMessages((prev) => [...prev, questionMessage]);
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
                      style={styles.optionChip}
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

                        const nextQuestionIndex = currentQuestion + 1;
                        setCurrentQuestion(nextQuestionIndex);

                        setTimeout(() => {
                          if (nextQuestionIndex < intakeQuestions.length) {
                            const question = intakeQuestions[nextQuestionIndex];
                            const questionMessage: Message = {
                              id: `question-${
                                question.id
                              }-${Date.now()}-${Math.random()}`,
                              text: question.text,
                              sender: "ai" as const,
                              timestamp: new Date(),
                              type: "question",
                              data: question,
                            };
                            setMessages((prev) => [...prev, questionMessage]);
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
                    style={styles.optionChip}
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
                    <Text style={styles.optionText}>{option}</Text>
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
                              styles.multiSelectChipInline, // Use new style for inline chips
                              selectedMultiSelectOptions[
                                item.data.id
                              ]?.includes(option) && styles.selectedChip,
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
                                selectedMultiSelectOptions[
                                  item.data.id
                                ]?.includes(option) &&
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
        <Text style={styles.timestamp}>
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
      // Only disable for questions that should use option chips (NOT text or multi_select)
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
          <TextInput
            style={[styles.textInput, { color: theme.colors.text }]}
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
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    maxWidth: "100%",
  },

  multiSelectChipInline: {
    backgroundColor: "#2C2C2E",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#3C3C3E",
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
  languageOptionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    maxWidth: "100%",
  },
});
