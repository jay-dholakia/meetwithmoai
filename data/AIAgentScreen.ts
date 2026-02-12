// V6 Intake - 9 questions (connections, conversation style, time focus, free time, availability, age range, optional context)

export const intakeQuestions = [
  {
    id: "q1_connection_types",
    text: "What kinds of connections feel right for you right now?\n(Choose up to 5 — you can update this anytime.)",
    type: "multi_select",
    maxSelections: 5,
    options: [
      "Light, easy conversation",
      "Deeper, thoughtful conversation",
      "Big-idea discussions",
      "Workout or movement partner",
      "Racquet sports partner",
      "Outdoor adventures",
      "Exploring the city",
      "Creative collaboration",
      "Coworking companion",
      "Professional or builder connection",
      "Accountability partner",
      "Similar season of life",
      "Totally different worlds",
      "Just seeing what clicks",
    ],
    validation: (values: string[]) =>
      values.length > 0
        ? values.length <= 5
          ? null
          : "Please choose up to 5."
        : "Please select at least one.",
  },
  {
    id: "q2_conversation_great",
    text: "What makes a conversation great for you?\n(Choose up to 3)",
    type: "multi_select",
    maxSelections: 3,
    options: [
      "It goes deep",
      "It's light and playful",
      "We explore big ideas",
      "It flows naturally",
      "We challenge each other",
      "We feel genuinely understood",
    ],
    validation: (values: string[]) =>
      values.length > 0
        ? values.length <= 3
          ? null
          : "Please choose up to 3."
        : "Please select at least one.",
  },
  {
    id: "q3_meeting_style",
    text: "When meeting someone new, what feels most natural to you?",
    type: "single_select",
    options: ["Taking it slow", "Finding a steady rhythm", "Jumping right in"],
    validation: (value: string) => (value ? null : "Please select an option"),
  },
  {
    id: "q4_time_focus",
    text: "What does most of your time go toward right now?",
    type: "single_select",
    options: [
      "Mostly work",
      "Mostly school",
      "Building something",
      "Family",
      "Creative projects",
      "Transitioning",
      "Retired",
      "A mix",
    ],
    validation: (value: string) => (value ? null : "Please select an option"),
  },
  {
    id: "q4_more",
    text: "Want to share a bit more? (Optional)\nWhatever feels relevant — share more about your work, your family, or what you're focused on lately to help us tailor your introductions.",
    type: "open_ended",
    validation: () => null,
  },
  {
    id: "q5_free_time",
    text: "What do you gravitate toward in your free time?\n(Choose up to 7)",
    type: "multi_select",
    maxSelections: 7,
    options: [
      "Working out / movement",
      "Reading",
      "Podcasts",
      "Art & design",
      "Music",
      "Food & coffee",
      "Outdoors",
      "Tech",
      "Philosophy",
      "Travel",
      "Film & TV",
      "Writing",
      "Faith / spirituality",
      "Entrepreneurship",
      "Parenting",
      "Culture",
      "Other",
    ],
    validation: (values: string[]) =>
      values.length > 0
        ? values.length <= 7
          ? null
          : "Please choose up to 7."
        : "Please select at least one.",
  },
  {
    id: "q6_availability",
    text: "When does it usually feel easiest to meet someone new?",
    type: "multi_select",
    options: [
      "Weekday daytime",
      "Weekday evening",
      "Weekend daytime",
      "Weekend evening",
    ],
    validation: (values: string[]) =>
      values.length > 0 ? null : "Please select at least one.",
  },
  {
    id: "q8_background",
    text: "Is there anything about your background or life experience that shapes how you see the world?\n(Optional short answer)",
    type: "open_ended",
    validation: () => null,
  },
  {
    id: "q9_first_conversation",
    text: "Anything that would help us set up a great first conversation?\n(Optional — tone preferences, topics you love, or anything you'd rather avoid.)",
    type: "open_ended",
    validation: () => null,
  },
  // Age and travel distance at end of intake (matching preferences; stored only in intake_responses_v5)
  {
    id: "q7_age_range",
    text: "What age range feels most comfortable to you?",
    type: "slider",
    min: 0,
    max: 15,
    default: 5,
    unit: "",
    label: "± {value} years",
    validation: (value: number | string) => {
      const numValue = typeof value === "string" ? parseInt(value, 10) : value;
      return numValue >= 0 && numValue <= 15 ? null : "Please select 0–15.";
    },
  },
  {
    id: "q10_travel_distance_miles",
    text: "How far would you travel to meet someone?",
    type: "slider",
    min: 0,
    max: 50,
    default: 15,
    unit: "miles",
    label: "{value}",
    validation: (value: number | string) => {
      const numValue = typeof value === "string" ? parseInt(value, 10) : value;
      return numValue >= 0 && numValue <= 50 ? null : "Please select 0–50 miles.";
    },
  },
];

// Map question IDs to column names for matching/filtering (update replenish-matches if needed)
export const questionToColumnMap: Record<string, string> = {
  q1_connection_types: "connection_types",
  q6_availability: "availability_times",
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
      id: "pronouns",
      text: "What are your pronouns?",
      type: "chips",
      options: ["He/Him", "She/Her", "They/Them", "Other", "Prefer not to say"],
      validation: (value: string) =>
        value ? null : "Please select your pronouns",
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
