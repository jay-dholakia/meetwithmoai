/**
 * Steps for the multipage profile onboarding flow.
 * Each step maps to profiles table columns; order matches UX flow.
 */

export interface OnboardingStepBase {
  id: string;
  title: string;
  subtitle?: string;
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
}

export interface OnboardingStepLocation extends OnboardingStepBase {
  type: "location";
}

export interface OnboardingStepRadius extends OnboardingStepBase {
  type: "radius";
  options: { label: string; valueKm: number }[];
  validation: (value: number) => string | null;
}

export interface OnboardingStepRadiusSlider extends OnboardingStepBase {
  type: "radius_slider";
  minMiles: number;
  maxMiles: number;
  stepMiles: number;
  validation: (value: number) => string | null;
}

export type OnboardingStep =
  | OnboardingStepText
  | OnboardingStepDate
  | OnboardingStepChips
  | OnboardingStepLocation
  | OnboardingStepRadius
  | OnboardingStepRadiusSlider;

/** Column name in profiles table for each step id */
export const onboardingStepToColumn: Record<string, string> = {
  name: "first_name",
  last_name: "last_name",
  birthdate: "birthdate",
  gender: "gender",
  pronouns: "pronouns",
  sexual_orientation: "sexual_orientation",
  relationship_status: "relationship_status",
  has_kids: "has_kids",
  location: "city", // plus lat, lng saved separately
  radius: "radius_km",
};

/** Profile shape for resume check (subset of profiles row) */
export type OnboardingProfileSnapshot = {
  first_name?: string | null;
  last_name?: string | null;
  birthdate?: string | null;
  gender?: string | null;
  pronouns?: string | null;
  sexual_orientation?: string | null;
  relationship_status?: string | null;
  has_kids?: string | null;
  city?: string | null;
  lat?: number | null;
  lng?: number | null;
  radius_km?: number | null;
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
    id: "last_name",
    title: "Last name (or initial)",
    subtitle: "Helps others recognize you",
    type: "text",
    placeholder: "Last name or initial",
    validation: (v) => (v.trim().length > 0 ? null : "Please enter your last name or initial"),
  },
  {
    id: "birthdate",
    title: "When's your birthday?",
    subtitle: "You must be 18+ to use this app",
    type: "date",
    placeholder: "MM/DD/YYYY",
    validation: (v) => {
      const trimmed = v.trim();
      if (!trimmed) return "Please enter your birthday";
      // Parse explicitly as MM/DD/YYYY (avoids locale-dependent Date parsing)
      const parts = trimmed.split("/").map((s) => parseInt(s, 10));
      if (parts.length !== 3 || parts.some((n) => isNaN(n))) {
        return "Please use MM/DD/YYYY format";
      }
      const [month, day, year] = parts;
      if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900 || year > new Date().getFullYear()) {
        return "Please enter a valid date";
      }
      const birthDate = new Date(year, month - 1, day);
      if (birthDate.getMonth() !== month - 1 || birthDate.getDate() !== day) {
        return "Please enter a valid date";
      }
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
      return age >= 18 ? null : "You must be 18 or older to use this app";
    },
  },
  {
    id: "gender",
    title: "What's your gender?",
    type: "chips",
    options: ["Male", "Female", "Non-binary", "Other", "Prefer not to say"],
    validation: (v) => (v ? null : "Please select your gender"),
  },
  {
    id: "pronouns",
    title: "What are your pronouns?",
    type: "chips",
    options: ["He/Him", "She/Her", "They/Them", "Other", "Prefer not to say"],
    validation: (v) => (v ? null : "Please select your pronouns"),
  },
  {
    id: "sexual_orientation",
    title: "What's your sexual orientation?",
    type: "chips",
    options: [
      "Straight",
      "Gay",
      "Lesbian",
      "Bisexual",
      "Pansexual",
      "Asexual",
      "Queer",
      "Other",
      "Prefer not to say",
    ],
    validation: (v) => (v ? null : "Please select an option"),
  },
  {
    id: "relationship_status",
    title: "What's your relationship status?",
    type: "chips",
    options: [
      "Single",
      "In a relationship",
      "Married",
      "Divorced",
      "Widowed",
      "It's complicated",
      "Prefer not to say",
    ],
    validation: (v) => (v ? null : "Please select an option"),
  },
  {
    id: "has_kids",
    title: "Do you have kids?",
    type: "chips",
    options: ["Yes", "No", "Prefer not to say"],
    validation: (v) => (v ? null : "Please select an option"),
  },
  {
    id: "location",
    title: "Where are you based?",
    subtitle: "We use this to suggest meetup spots and people near you.",
    type: "location",
  },
  {
    id: "radius",
    title: "How far would you travel to meet someone?",
    type: "radius_slider",
    minMiles: 0,
    maxMiles: 50,
    stepMiles: 5,
    validation: () => null,
  },
];
