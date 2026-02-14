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
    id: "q1_activities_enjoy",
    text: "What activities do you enjoy doing?\n(As many as you'd like.)",
    type: "multi_select",
    options: [
      "Gym / strength training",
      "Running",
      "Walking",
      "Hiking",
      "Cycling",
      "Swimming",
      "Yoga / Pilates",
      "Dance",
      "Climbing",
      "Basketball",
      "Tennis",
      "Table Tennis",
      "Pickleball",
      "Cricket",
      "Golf",
      "Surfing",
      "Martial arts",
      "Reading",
      "Writing",
      "Photography",
      "Art / design",
      "Playing music",
      "Cooking",
      "Baking",
      "Watching sports",
      "Board games",
      "Coffee shop coworking",
      "Exploring restaurants",
      "Wine tastings",
      "Attending events",
      "Live music",
      "Film screenings",
      "Language learning",
      "Building side projects",
      "Tech tinkering",
      "Investing / finance",
      "Entrepreneurship",
      "Volunteering",
      "Travel",
    ],
    validation: (values: string[]) =>
      values.length > 0 ? null : "Please select at least one.",
  },
  {
    id: "q4_time_focus",
    text: "What does most of your time go toward right now?\n(Choose up to 4)",
    type: "multi_select",
    maxSelections: 4,
    options: [
      "Work",
      "School",
      "Family",
      "Creative projects",
      "Transitioning",
      "Retired",
      "Caregiving",
      "Community / volunteering",
      "Side projects",
      "Learning / education",
      "Health & wellness",
    ],
    validation: (values: string[]) =>
      values.length > 0
        ? values.length <= 4
          ? null
          : "Please choose up to 4."
        : "Please select at least one.",
  },
  {
    id: "q4_more",
    text: "What do you do for work or study?\nShare as much or as little as you want. (industry, company, role, university, major, etc.)",
    type: "open_ended",
    validation: () => null,
  },
  {
    id: "q5_conversation_themes",
    text: "Conversation themes you enjoy\n(Choose up to 7)",
    type: "multi_select",
    maxSelections: 7,
    options: [
      "Culture",
      "Relationships",
      "Career",
      "Creativity",
      "Tech",
      "Philosophy",
      "Health",
      "Entrepreneurship",
      "Faith",
      "Travel",
      "Parenting",
      "Politics",
      "Books",
      "Film",
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
  // Age and travel distance at end of intake (matching preferences; stored only in intake_responses_v5)
  {
    id: "q7_age_range",
    text: "What age range are you open to connecting with?",
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
    text: "How far are you open to meeting?",
    type: "slider",
    min: 0,
    max: 50,
    default: 15,
    unit: "miles",
    label: "{value} miles",
    validation: (value: number | string) => {
      const numValue = typeof value === "string" ? parseInt(value, 10) : value;
      return numValue >= 0 && numValue <= 50 ? null : "Please select 0–50 miles.";
    },
  },
  {
    id: "q6_availability",
    text: "When are you typically free to meet?",
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
    text: "Anything else shaping your season of life right now?\nA big move, job change, new relationship, or a personal goal you're focused on.",
    type: "open_ended",
    validation: () => null,
  },
  {
    id: "q11_first_conversation",
    text: "Anything else that would help us set up a great first conversation?\n(preferences, favorite topics, or topics you'd rather avoid)",
    type: "open_ended",
    validation: () => null,
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
