// V5 Questionnaire - 13 questions (7 open-ended, 6 structured)
// Streamlined approach focused on quick context, shared ground, conversation dynamics, identity, and practical rhythm

export const intakeQuestions = [
  // Section 1: Warm-in: quick context & intent (low effort) - 3 structured
  {
    id: "q1_life_stages",
    text: "Which stages of life feel relevant to you right now?",
    type: "multi_select",
    options: [
      "Student",
      "Early career",
      "Career-focused",
      "Family-focused",
      "Building something (company, project, creative work)",
      "Between phases / transitioning",
      "Retired",
      "Other"
    ],
    validation: (values: string[]) => values.length > 0 ? null : "Please select at least one life stage",
    // This maps to life_stage column (will need to handle array)
  },
  {
    id: "q2_connection_types",
    text: "What kinds of connections are you most open to through Convi?",
    type: "multi_select",
    options: [
      "Casual conversation / coffee chats",
      "Workout or movement buddy",
      "Exploring hobbies or activities together",
      "Professional conversation or support",
      "Social friends / broader social circle",
      "Just meeting new people and seeing what clicks"
    ],
    validation: (values: string[]) => values.length > 0 ? null : "Please select at least one connection type",
  },
  {
    id: "q3_introvert_extrovert",
    text: "Do you see yourself as more introverted or extroverted?",
    type: "single_select",
    options: [
      "Mostly introverted",
      "Somewhere in between",
      "Mostly extroverted"
    ],
    validation: (value: string) => value ? null : "Please select an option",
  },

  // Section 2: Shared ground: what fills their life - 3 open-ended
  {
    id: "q4_enjoy_doing",
    text: "What kinds of things do you enjoy doing in your free time—lately or in general?",
    type: "open_ended",
    validation: (value: string) => value.trim().length > 0 ? null : "Please share what you enjoy doing",
  },
  {
    id: "q5_enjoy_consuming",
    text: "What kinds of things do you enjoy consuming in your free time?",
    type: "open_ended",
    validation: (value: string) => value.trim().length > 0 ? null : "Please share what you enjoy consuming",
  },
  {
    id: "q6_excited_to_try",
    text: "Is there anything you're excited to try, learn, or get into next?",
    type: "open_ended",
    validation: (value: string) => value.trim().length > 0 ? null : "Please share what you're excited to try",
  },

  // Section 3: Conversation dynamics: how it feels - 1 structured, 1 open-ended
  {
    id: "q7_conversation_type",
    text: "What kind of conversations tend to feel best to you?",
    type: "single_select",
    options: [
      "Light and easy",
      "Thoughtful",
      "A mix of both",
      "Depends on the person"
    ],
    validation: (value: string) => value ? null : "Please select a conversation type",
  },
  {
    id: "q8_conversation_flows",
    text: "When a conversation really flows for you, what does it usually end up being about?",
    type: "open_ended",
    validation: (value: string) => value.trim().length > 0 ? null : "Please share what conversations flow about",
  },

  // Section 4: Identity & grounding (earned depth) - 2 open-ended
  {
    id: "q9_important_parts",
    text: "Are there any parts of who you are that feel especially important to you? (Culture, creativity, faith, family, upbringing, values, etc.)",
    type: "open_ended",
    validation: (value: string) => value.trim().length > 0 ? null : "Please share what's important to you",
  },
  {
    id: "q10_work_study",
    text: "What do you do for work or study right now?",
    type: "open_ended",
    validation: (value: string) => value.trim().length > 0 ? null : "Please share what you do for work or study",
  },

  // Section 5: Practical rhythm & close - 2 structured, 1 open-ended (optional)
  {
    id: "q11_availability_times",
    text: "When does it usually feel easiest for you to make time to meet someone new?",
    type: "multi_select",
    options: [
      "Weekday daytime",
      "Weekday evening",
      "Weekend daytime",
      "Weekend evening"
    ],
    validation: (values: string[]) => values.length > 0 ? null : "Please select at least one availability time",
    // This maps to availability_times column
  },
  {
    id: "q12_age_range_preference",
    text: "What age range are you most comfortable connecting with?",
    type: "slider",
    min: 0,
    max: 10,
    default: 5,
    unit: "",
    label: "± {value} years",
    validation: (value: number | string) => {
      const numValue = typeof value === 'string' ? parseInt(value) : value;
      return (numValue >= 0 && numValue <= 10) ? null : "Please select an age range";
    },
    // This maps to age_range_preference column (stored in profiles table as number representing ±X years)
  },
  {
    id: "q13_first_conversation_note",
    text: "Anything else you'd want someone to know before sitting down for a first conversation with you?",
    type: "open_ended",
    validation: (value: string) => null, // Optional question - no validation required
  },
];

// Map question IDs to column names for filtered columns
export const questionToColumnMap: Record<string, string> = {
  "q1_life_stages": "life_stage", // Note: This is now multi-select, may need array handling
  "q13_availability_times": "availability_times",
  // Note: q14_age_range_preference is now stored in profiles.age_range_preference, not as a filtered column
};

// Legacy profile questions (kept for compatibility)
export const profileQuestions = [
    {
      id: "name",
      text: "What's your first name?",
      type: "text",
      placeholder: "Enter your first name",
      validation: (value: string) =>
        value.trim().length > 0 ? null : "Please enter your first name",
    },
    {
      id: "last_name",
      text: "What's your last name? (or just initial)",
      type: "text",
      placeholder: "Enter your last name or initial",
      validation: (value: string) =>
        value.trim().length > 0
          ? null
          : "Please enter your last name or initial",
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
        if (
          monthDiff < 0 ||
          (monthDiff === 0 && today.getDate() < birthDate.getDate())
        ) {
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
      validation: (value: string) =>
        value ? null : "Please select your gender",
    },
    {
      id: "pronouns",
      text: "What are your pronouns?",
      type: "chips",
      options: ["He/Him", "She/Her", "They/Them", "Other", "Prefer not to say"],
      validation: (value: string) =>
        value ? null : "Please select your pronouns",
    },
    {
      id: "sexual_orientation",
      text: "What's your sexual orientation?",
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
      validation: (value: string) =>
        value ? null : "Please select your sexual orientation",
    },
    {
    id: "relationship_status",
      text: "What's your relationship status?",
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
      validation: (value: string) =>
        value ? null : "Please select your relationship status",
    },
  {
    id: "has_kids",
    text: "Do you have kids?",
    type: "chips",
    options: ["Yes", "No", "Prefer not to say"],
    validation: (value: string) =>
      value ? null : "Please select an option",
  },
    {
      id: "location",
      text: "To suggest meetup spots and people near you, I'll need your location — tap below and allow access when your phone asks.",
      type: "location_permission",
      options: [
        "Use My Location"
      ],
      validation: (value: string) =>
        value ? null : "Tap the button and allow access when prompted",
    },
  ];  
