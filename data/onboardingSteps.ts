/**
 * Cove Profile Setup (platonic by design).
 * Each step maps to profiles table columns; order matches UX flow.
 */

export interface OnboardingStepBase {
  id: string;
  title: string;
  subtitle?: string;
}

export interface OnboardingStepInfo extends OnboardingStepBase {
  type: "info";
  /** Positioning line shown before questions (no input, no column). */
}

export interface OnboardingStepText extends OnboardingStepBase {
  type: "text";
  placeholder: string;
  validation: (value: string) => string | null;
}

export interface OnboardingStepDate extends OnboardingStepBase {
  type: "date";
  placeholder: string;
  validation: (value: string) => string | null;
}

export interface OnboardingStepChips extends OnboardingStepBase {
  type: "chips";
  options: string[];
  validation: (value: string) => string | null;
  optional?: boolean;
}

export interface OnboardingStepLocation extends OnboardingStepBase {
  type: "location";
}

export interface OnboardingStepConfirm extends OnboardingStepBase {
  type: "confirm";
  /** Body text (optional). If no checkboxLabel, step shows body + Continue button only. */
  body?: string;
  /** Optional bullet points (only used when checkboxLabel is set) */
  bullets?: string[];
  /** If set, show checkbox; if omitted, show only body + Continue button */
  checkboxLabel?: string;
  validation?: (checked: boolean) => string | null;
}

export type OnboardingStep =
  | OnboardingStepInfo
  | OnboardingStepText
  | OnboardingStepDate
  | OnboardingStepChips
  | OnboardingStepLocation
  | OnboardingStepConfirm;

/** Column name in profiles table for each step id (info and confirm use special handling) */
export const onboardingStepToColumn: Record<string, string> = {
  name: "first_name",
  birthdate: "birthdate",
  location: "city",
  pronouns: "pronouns",
  relationship_status: "relationship_status",
  confirm_intent: "intent_confirmed_at",
};

/** Profile shape for resume check (subset of profiles row) */
export type OnboardingProfileSnapshot = {
  first_name?: string | null;
  birthdate?: string | null;
  city?: string | null;
  lat?: number | null;
  lng?: number | null;
  pronouns?: string | null;
  relationship_status?: string | null;
  intent_confirmed_at?: string | null;
};

/** Index of the first step that has no value in profile (0-based). Use to resume onboarding. */
export function getFirstIncompleteOnboardingStepIndex(profile: OnboardingProfileSnapshot | null): number {
  if (!profile) return 0;
  for (let i = 0; i < onboardingSteps.length; i++) {
    const step = onboardingSteps[i];
    const col = onboardingStepToColumn[step.id];
    if (!col) continue;
    if (step.id === "location") {
      if (!profile.city || profile.city.trim() === "") return i;
      continue;
    }
    if (step.type === "chips" && (step as OnboardingStepChips).optional) {
      continue;
    }
    const value = (profile as Record<string, unknown>)[col];
    const hasValue = value != null && (typeof value !== "string" || value.trim() !== "");
    if (!hasValue) return i;
  }
  return onboardingSteps.length;
}

export const onboardingSteps: OnboardingStep[] = [
  {
    id: "name",
    title: "What's your first name?",
    type: "text",
    placeholder: "First name",
    validation: (v) => (v.trim().length > 0 ? null : "Please enter your first name"),
  },
  {
    id: "birthdate",
    title: "When's your birthday?",
    subtitle: "You must be 18+ to use Cove.",
    type: "date",
    placeholder: "MM/DD/YYYY",
    validation: (v) => {
      const trimmed = v.trim();
      if (!trimmed) return "Please enter your birthday";
      const parts = trimmed.split("/").map((s) => parseInt(s, 10));
      if (parts.length !== 3 || parts.some((n) => isNaN(n))) return "Please use MM/DD/YYYY format";
      const [month, day, year] = parts;
      if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900 || year > new Date().getFullYear())
        return "Please enter a valid date";
      const birthDate = new Date(year, month - 1, day);
      if (birthDate.getMonth() !== month - 1 || birthDate.getDate() !== day) return "Please enter a valid date";
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
      return age >= 18 ? null : "You must be 18 or older to use Cove";
    },
  },
  {
    id: "location",
    title: "Where are you based?",
    subtitle: "We use this to suggest nearby introductions and meetup spots.",
    type: "location",
  },
  {
    id: "pronouns",
    title: "What are your pronouns? (Optional)",
    type: "chips",
    optional: true,
    options: ["He / Him", "She / Her", "They / Them", "Other", "Prefer not to say"],
    validation: () => null,
  },
  {
    id: "relationship_status",
    title: "What's your relationship status? (Optional)",
    subtitle: "This is profile texture only. It does not signal romantic intent.",
    type: "chips",
    optional: true,
    options: ["Single", "In a relationship", "Married", "Divorced", "Widowed", "Prefer not to say"],
    validation: () => null,
  },
  {
    id: "confirm_intent",
    title: "A Quick Note",
    type: "confirm",
    body:
      "Cove is built for thoughtful, platonic connection.\n\nWe're here to meet new people for real conversation, shared interests, and meaningful experiences — clearly and respectfully.",
  },
];
