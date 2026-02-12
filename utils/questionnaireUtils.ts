import { profileQuestions, intakeQuestions } from "../data/AIAgentScreen";

export interface ProfileData {
  first_name?: string;
  birthdate?: string;
  pronouns?: string;
  city?: string;
  relationship_status?: string;
  languages?: string[];
  intent_confirmed_at?: string | null;
}

export interface IntakeData {
  responses?: Array<{
    question_id: string;
    answer: any;
  }>;
  [key: string]: any;
}

// Memoized profile completion check
let cachedProfileComplete: {
  profileData: ProfileData | null;
  result: boolean;
} = { profileData: null, result: false };

export const isProfileComplete = (profileData: ProfileData | null | undefined): boolean => {
  if (!profileData) return false;

  // Check if we can use cached result
  if (cachedProfileComplete.profileData === profileData) {
    return cachedProfileComplete.result;
  }

  const result = !!(
    profileData.first_name &&
    profileData.first_name !== "Cooking/Dining out, Concerts/Live music" &&
    profileData.birthdate &&
    profileData.city &&
    profileData.intent_confirmed_at
  );

  // Cache the result
  cachedProfileComplete = { profileData, result };
  return result;
};

// Memoized intake completion check
let cachedIntakeComplete: {
  intakeData: IntakeData | null;
  profileData: ProfileData | null;
  result: number; // Returns the first unanswered index
} = { intakeData: null, profileData: null, result: 0 };

export const findFirstUnansweredIntakeQuestion = (
  intakeData: IntakeData | null | undefined,
  profileData?: ProfileData | null
): number => {
  if (!intakeData) {
    return 0;
  }

  // Check cache
  if (
    cachedIntakeComplete.intakeData === intakeData &&
    cachedIntakeComplete.profileData === profileData
  ) {
    return cachedIntakeComplete.result;
  }

  const isV5Format = intakeData.responses && Array.isArray(intakeData.responses);
  const responsesMap = isV5Format
    ? new Map(intakeData.responses.map((r: any) => [r.question_id, r.answer]))
    : null;

  for (let i = 0; i < intakeQuestions.length; i++) {
    const question = intakeQuestions[i];

    // Skip conditional questions
    if (question.conditionalOn && question.showIf) {
      const conditionalValue = isV5Format
        ? responsesMap?.get(question.conditionalOn)
        : intakeData[question.conditionalOn];
      if (!conditionalValue || !question.showIf.includes(conditionalValue)) {
        continue;
      }
    }

    const fieldValue = isV5Format ? responsesMap?.get(question.id) : null;

    let isAnswered = false;
    if (question.type === "multi_select") {
      isAnswered = !!(fieldValue && Array.isArray(fieldValue) && fieldValue.length > 0);
    } else if (question.type === "open_ended") {
      isAnswered = !!(fieldValue && typeof fieldValue === "string" && fieldValue.trim().length > 0);
    } else if (question.type === "slider") {
      if (fieldValue !== null && fieldValue !== undefined) {
        if (typeof fieldValue === "number") {
          isAnswered = true;
        } else if (typeof fieldValue === "string") {
          const numericValue = parseInt(fieldValue);
          if (!isNaN(numericValue)) {
            isAnswered = true;
          } else {
            const match = fieldValue.match(/±\s*(\d+)/);
            if (match && match[1]) {
              isAnswered = true;
            }
          }
        }
      }

    } else {
      isAnswered = !!(
        fieldValue &&
        fieldValue !== null &&
        fieldValue !== "" &&
        String(fieldValue).trim().length > 0
      );
    }

    if (!isAnswered) {
      const result = i;
      cachedIntakeComplete = { intakeData, profileData: profileData || null, result };
      return result;
    }
  }

  const result = intakeQuestions.length;
  cachedIntakeComplete = { intakeData, profileData: profileData || null, result };
  return result;
};

export const isIntakeComplete = (
  intakeData: IntakeData | null | undefined,
  profileData?: ProfileData | null
): boolean => {
  const firstUnanswered = findFirstUnansweredIntakeQuestion(intakeData, profileData);
  return firstUnanswered >= intakeQuestions.length;
};

export const findFirstUnansweredProfileStep = (profileData: ProfileData | null | undefined): number => {
  if (!profileData) return 0;

  for (let i = 0; i < profileQuestions.length; i++) {
    const question = profileQuestions[i];

    if (question.conditionalOn && question.showIf) {
      const conditionalValue = profileData[question.conditionalOn as keyof ProfileData];
      if (!conditionalValue || !question.showIf.includes(String(conditionalValue))) {
        continue;
      }
    }

    let isAnswered = false;
    switch (question.id) {
      case "name":
        isAnswered = !!profileData.first_name;
        break;
      case "birthdate":
        isAnswered = !!profileData.birthdate;
        break;
      case "pronouns":
        isAnswered = !!profileData.pronouns;
        break;
      case "relationship_status":
        isAnswered = !!profileData.relationship_status;
        break;
      case "location":
        isAnswered = !!profileData.city;
        break;
      case "languages":
        isAnswered = !!(profileData.languages && profileData.languages.length > 0);
        break;
      default:
        isAnswered = false;
        break;
    }

    if (!isAnswered) {
      return i;
    }
  }

  return profileQuestions.length;
};

export const getQuestionnaireProgress = (
  intakeData: IntakeData | null | undefined,
  profileData?: ProfileData | null
): { current: number; total: number; percentage: number } => {
  const firstUnanswered = findFirstUnansweredIntakeQuestion(intakeData, profileData);
  const total = intakeQuestions.length;
  const current = Math.min(firstUnanswered, total);
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
  return { current, total, percentage };
};
