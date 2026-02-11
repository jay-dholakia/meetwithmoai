import { useReducer, useCallback, useRef } from "react";
import { profileQuestions, intakeQuestions, questionToColumnMap } from "../data/AIAgentScreen";
import { supabase } from "../lib/mcp-supabase";
import { ProfileData, IntakeData } from "../utils/questionnaireUtils";
import {
  findFirstUnansweredProfileStep,
  findFirstUnansweredIntakeQuestion,
  isProfileComplete,
  isIntakeComplete,
} from "../utils/questionnaireUtils";

interface QuestionnaireState {
  profileData: ProfileData | null;
  intakeData: IntakeData | null;
  currentProfileStep: number;
  currentIntakeQuestion: number;
  isProfileComplete: boolean;
  isIntakeComplete: boolean;
  selectedLanguages: string[];
  selectedMultiSelectOptions: Record<string, string[]>;
  waitingForCityInput: boolean;
  waitingForLocationInput: boolean;
  loading: boolean;
  /** True only after the first initialize() has completed. Use this to avoid running dependent logic before data is loaded. */
  initialLoadComplete: boolean;
  error: string | null;
}

type QuestionnaireAction =
  | { type: "SET_PROFILE_DATA"; payload: ProfileData | null }
  | { type: "SET_INTAKE_DATA"; payload: IntakeData | null }
  | { type: "SET_CURRENT_PROFILE_STEP"; payload: number }
  | { type: "SET_CURRENT_INTAKE_QUESTION"; payload: number }
  | { type: "SET_SELECTED_LANGUAGES"; payload: string[] }
  | { type: "SET_SELECTED_MULTI_SELECT"; payload: { questionId: string; options: string[] } }
  | { type: "SET_WAITING_FOR_CITY"; payload: boolean }
  | { type: "SET_WAITING_FOR_LOCATION"; payload: boolean }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_INITIAL_LOAD_COMPLETE"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "RESET" };

const initialState: QuestionnaireState = {
  profileData: null,
  intakeData: null,
  currentProfileStep: 0,
  currentIntakeQuestion: 0,
  isProfileComplete: false,
  isIntakeComplete: false,
  selectedLanguages: [],
  selectedMultiSelectOptions: {},
  waitingForCityInput: false,
  waitingForLocationInput: false,
  loading: false,
  initialLoadComplete: false,
  error: null,
};

function questionnaireReducer(
  state: QuestionnaireState,
  action: QuestionnaireAction
): QuestionnaireState {
  switch (action.type) {
    case "SET_PROFILE_DATA":
      return {
        ...state,
        profileData: action.payload,
        isProfileComplete: isProfileComplete(action.payload),
      };
    case "SET_INTAKE_DATA":
      return {
        ...state,
        intakeData: action.payload,
        isIntakeComplete: isIntakeComplete(action.payload, state.profileData),
      };
    case "SET_CURRENT_PROFILE_STEP":
      return { ...state, currentProfileStep: action.payload };
    case "SET_CURRENT_INTAKE_QUESTION":
      return { ...state, currentIntakeQuestion: action.payload };
    case "SET_SELECTED_LANGUAGES":
      return { ...state, selectedLanguages: action.payload };
    case "SET_SELECTED_MULTI_SELECT":
      return {
        ...state,
        selectedMultiSelectOptions: {
          ...state.selectedMultiSelectOptions,
          [action.payload.questionId]: action.payload.options,
        },
      };
    case "SET_WAITING_FOR_CITY":
      return { ...state, waitingForCityInput: action.payload };
    case "SET_WAITING_FOR_LOCATION":
      return { ...state, waitingForLocationInput: action.payload };
    case "SET_LOADING":
      return { ...state, loading: action.payload };
    case "SET_INITIAL_LOAD_COMPLETE":
      return { ...state, initialLoadComplete: action.payload };
    case "SET_ERROR":
      return { ...state, error: action.payload };
    case "RESET":
      return initialState;
    default:
      return state;
  }
}

export function useQuestionnaire(userId: string | null) {
  const [state, dispatch] = useReducer(questionnaireReducer, initialState);
  const initializedRef = useRef(false);
  const initializedUserIdRef = useRef<string | null>(null);

  const initialize = useCallback(async () => {
    if (!userId) return;
    if (initializedRef.current && initializedUserIdRef.current === userId) {
      return;
    }

    if (initializedUserIdRef.current !== userId) {
      initializedRef.current = false;
      initializedUserIdRef.current = null;
      dispatch({ type: "RESET" });
    }

    dispatch({ type: "SET_LOADING", payload: true });
    dispatch({ type: "SET_ERROR", payload: null });

    try {
      // Combined query for profile and intake
      const [profileResult, intakeResult] = await Promise.all([
        supabase
          .from("profiles")
          .select(
            "id, first_name, last_name, birthdate, gender, pronouns, relationship_status, languages, city, lat, lng, radius_km, sexual_orientation, age_range_preference"
          )
          .eq("id", userId)
          .single(),
        supabase
          .from("intake_responses_v5")
          .select("*")
          .eq("user_id", userId)
          .single(),
      ]);

      if (profileResult.error && profileResult.error.code !== "PGRST116") {
        throw profileResult.error;
      }

      if (intakeResult.error && intakeResult.error.code !== "PGRST116") {
        throw intakeResult.error;
      }

      const profileData = profileResult.data as ProfileData | null;
      const intakeData = intakeResult.data as IntakeData | null;

      console.log("useQuestionnaire: Loaded data", {
        profileData,
        intakeData,
        profileError: profileResult.error?.code,
        intakeError: intakeResult.error?.code,
      });

      dispatch({ type: "SET_PROFILE_DATA", payload: profileData });
      dispatch({ type: "SET_INTAKE_DATA", payload: intakeData });

      // Calculate initial positions
      if (profileData) {
        const firstUnansweredProfile = findFirstUnansweredProfileStep(profileData);
        dispatch({ type: "SET_CURRENT_PROFILE_STEP", payload: firstUnansweredProfile });
      }

      if (intakeData) {
        const firstUnansweredIntake = findFirstUnansweredIntakeQuestion(intakeData, profileData);
        dispatch({ type: "SET_CURRENT_INTAKE_QUESTION", payload: firstUnansweredIntake });
      }

      initializedRef.current = true;
      initializedUserIdRef.current = userId;
    } catch (error: any) {
      console.error("Error initializing questionnaire:", error);
      dispatch({ type: "SET_ERROR", payload: error.message || "Failed to load questionnaire data" });
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
      dispatch({ type: "SET_INITIAL_LOAD_COMPLETE", payload: true });
    }
  }, [userId]);

  const saveProfileAnswer = useCallback(
    async (questionId: string, answer: string | string[]) => {
      if (!userId) return;

      try {
        const columnName = questionToColumnMap[questionId];
        if (!columnName) {
          console.error("No column mapping for question:", questionId);
          return;
        }

        const updateData: any = {};
        if (columnName === "languages" && Array.isArray(answer)) {
          updateData[columnName] = answer;
        } else {
          updateData[columnName] = answer;
        }

        const { error } = await supabase
          .from("profiles")
          .update(updateData)
          .eq("id", userId);

        if (error) throw error;

        // Update local state
        const updatedProfileData = {
          ...state.profileData,
          [columnName]: answer,
        } as ProfileData;

        dispatch({ type: "SET_PROFILE_DATA", payload: updatedProfileData });
      } catch (error: any) {
        console.error("Error saving profile answer:", error);
        dispatch({ type: "SET_ERROR", payload: error.message || "Failed to save answer" });
        throw error;
      }
    },
    [userId, state.profileData]
  );

  const saveIntakeAnswer = useCallback(
    async (questionId: string, answer: string | string[] | number) => {
      if (!userId) return;

      try {
        const { data: existingIntake } = await supabase
          .from("intake_responses_v5")
          .select("*")
          .eq("user_id", userId)
          .single();

        const question = intakeQuestions.find((q) => q.id === questionId);
        if (!question) {
          throw new Error(`Question not found: ${questionId}`);
        }

        const existingResponses: any[] = existingIntake?.responses || [];
        const responseIndex = existingResponses.findIndex((r) => r.question_id === questionId);

        let formattedAnswer: string | string[];
        if (question.type === "slider" && typeof answer === "number") {
          const label = question.label || "{value}";
          const unit = question.unit || "";
          formattedAnswer = label.replace("{value}", answer.toString()) + (unit ? ` ${unit}` : "");
        } else {
          formattedAnswer = Array.isArray(answer) ? answer : String(answer);
        }

        const responseObj = {
          question_id: questionId,
          question_text: question.text,
          answer: formattedAnswer,
          type: question.type === "open_ended" ? "open_ended" : "structured",
          answered_at: new Date().toISOString(),
        };

        let updatedResponses: any[];
        if (responseIndex >= 0) {
          updatedResponses = [...existingResponses];
          updatedResponses[responseIndex] = responseObj;
        } else {
          updatedResponses = [...existingResponses, responseObj];
        }

        const intakeToUpdate: any = {
          user_id: userId,
          responses: updatedResponses,
          updated_at: new Date().toISOString(),
        };

        const columnName = questionToColumnMap[questionId];
        if (columnName) {
          if ((columnName === "life_stage" || columnName === "availability_times") && Array.isArray(answer)) {
            intakeToUpdate[columnName] = answer;
          } else if (typeof answer === "string") {
            intakeToUpdate[columnName] = answer;
          }
        }

        // Handle age_range_preference
        if (questionId === "q12_age_range_preference" && (typeof answer === "number" || typeof answer === "string")) {
          const ageRangeValue = typeof answer === "string" ? parseInt(answer) : answer;
          await supabase
            .from("profiles")
            .update({ age_range_preference: ageRangeValue })
            .eq("id", userId);
        }

        if (existingIntake) {
          if (existingIntake.embed_vector) {
            intakeToUpdate.embed_vector = existingIntake.embed_vector;
          }
          if (existingIntake.completed_at) {
            intakeToUpdate.completed_at = existingIntake.completed_at;
          }
        }

        const { data, error } = await supabase
          .from("intake_responses_v5")
          .upsert(intakeToUpdate);

        if (error) throw error;

        // Update local state
        const updatedIntakeData = {
          ...existingIntake,
          ...intakeToUpdate,
          responses: updatedResponses,
        } as IntakeData;

        dispatch({ type: "SET_INTAKE_DATA", payload: updatedIntakeData });
      } catch (error: any) {
        console.error("Error saving intake answer:", error);
        dispatch({ type: "SET_ERROR", payload: error.message || "Failed to save answer" });
        throw error;
      }
    },
    [userId, state.intakeData]
  );

  const moveToNextProfileStep = useCallback(() => {
    const nextStep = state.currentProfileStep + 1;
    if (nextStep < profileQuestions.length) {
      dispatch({ type: "SET_CURRENT_PROFILE_STEP", payload: nextStep });
    }
  }, [state.currentProfileStep]);

  const moveToNextIntakeQuestion = useCallback(() => {
    const nextQuestion = state.currentIntakeQuestion + 1;
    if (nextQuestion < intakeQuestions.length) {
      dispatch({ type: "SET_CURRENT_INTAKE_QUESTION", payload: nextQuestion });
    }
  }, [state.currentIntakeQuestion]);

  const moveToPreviousIntakeQuestion = useCallback(() => {
    const prevQuestion = Math.max(0, state.currentIntakeQuestion - 1);
    dispatch({ type: "SET_CURRENT_INTAKE_QUESTION", payload: prevQuestion });
  }, [state.currentIntakeQuestion]);

  return {
    ...state,
    dispatch,
    initialize,
    saveProfileAnswer,
    saveIntakeAnswer,
    moveToNextProfileStep,
    moveToNextIntakeQuestion,
    moveToPreviousIntakeQuestion,
  };
}
