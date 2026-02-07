// V4 Questionnaire - 27 questions (15 open-ended, 12 structured)
// Hybrid approach: 6 filtered columns + JSON array for all responses

export const intakeQuestions = [
  // Section 1: Getting to know you (warm-up) - 3 open-ended
  {
    id: "q1_passionate_about",
    text: "What are you passionate about or curious about right now?",
    type: "open_ended",
    validation: (value: string) => value.trim().length > 0 ? null : "Please share what you're passionate about",
  },
  {
    id: "q2_friends_describe",
    text: "How would your closest friends describe your personality?",
    type: "open_ended",
    validation: (value: string) => value.trim().length > 0 ? null : "Please describe your personality",
  },
  {
    id: "q3_recharge_method",
    text: "How do you recharge when you're feeling drained?",
    type: "open_ended",
    validation: (value: string) => value.trim().length > 0 ? null : "Please share how you recharge",
  },

  // Section 2: Your life & routine - 1 structured, 4 open-ended
  {
    id: "q4_time_energy",
    text: "What's taking up most of your time and energy these days?",
    type: "open_ended",
    validation: (value: string) => value.trim().length > 0 ? null : "Please share what's taking up your time",
  },
  {
    id: "q5_life_stage",
    text: "Which stage of life feels most like you right now?",
    type: "single_select",
    options: [
      "Student",
      "Early career (just starting out)",
      "Career-focused (building my career)",
      "Family-focused (kids/family are my priority)",
      "Retired",
      "Transitioning / Figuring it out",
      "Other"
    ],
    validation: (value: string) => value ? null : "Please select a life stage",
    // This maps to life_stage column
  },
  {
    id: "q6_industry",
    text: "What industry or field do you work or study in?",
    type: "single_select",
    options: [
      "Tech",
      "Healthcare",
      "Education",
      "Finance",
      "Creative/Arts",
      "Non-profit",
      "Student",
      "Retired",
      "Other"
    ],
    validation: (value: string) => value ? null : "Please select an industry",
  },
  {
    id: "q7_day_to_day",
    text: "Tell me about what you do day-to-day.",
    type: "open_ended",
    validation: (value: string) => value.trim().length > 0 ? null : "Please tell us about your day-to-day",
  },
  {
    id: "q8_work_relationship",
    text: "What's your relationship with work? Is it just a job, or is your career a big part of who you are?",
    type: "open_ended",
    validation: (value: string) => value.trim().length > 0 ? null : "Please share your relationship with work",
  },
  {
    id: "q9_weekends",
    text: "How do you usually spend your weekends?",
    type: "open_ended",
    validation: (value: string) => value.trim().length > 0 ? null : "Please share how you spend weekends",
  },

  // Section 3: What you enjoy - 4 open-ended
  {
    id: "q10_activities_enjoy",
    text: "What activities or hobbies do you genuinely enjoy?",
    type: "open_ended",
    validation: (value: string) => value.trim().length > 0 ? null : "Please share your activities and hobbies",
  },
  {
    id: "q11_talk_about_hours",
    text: "What could you talk about or do for hours?",
    type: "open_ended",
    validation: (value: string) => value.trim().length > 0 ? null : "Please share what you could talk about for hours",
  },
  {
    id: "q12_new_to_try",
    text: "What's something new you've been wanting to try or learn?",
    type: "open_ended",
    validation: (value: string) => value.trim().length > 0 ? null : "Please share what you want to try or learn",
  },
  {
    id: "q13_food_music_books",
    text: "What kind of food, music, books, shows, or podcasts are you into right now? Spill it all.",
    type: "open_ended",
    validation: (value: string) => value.trim().length > 0 ? null : "Please share your interests",
  },

  // Section 4: How you connect - 3 structured
  {
    id: "q14_friendship_cadence",
    text: "What's your ideal cadence for new friendships?",
    type: "single_select",
    options: [
      "A few times a week",
      "Weekly",
      "A few times a month",
      "Monthly",
      "A few times a year",
      "Flexible - depends on the connection"
    ],
    validation: (value: string) => value ? null : "Please select a cadence",
  },
  {
    id: "q15_communication_preference",
    text: "How do you like to communicate with friends?",
    type: "single_select",
    options: [
      "Texting",
      "Phone calls",
      "In-person",
      "Group chats",
      "Mix of all"
    ],
    validation: (value: string) => value ? null : "Please select a communication preference",
  },
  {
    id: "q16_planner_spontaneous",
    text: "Are you a planner, spontaneous, or somewhere in between?",
    type: "single_select",
    options: [
      "I'm a planner - I like structure",
      "Mostly a planner",
      "Mix of both",
      "Mostly spontaneous",
      "Very spontaneous - go with the flow"
    ],
    validation: (value: string) => value ? null : "Please select an option",
  },

  // Section 5: Practical matching - 3 structured
  {
    id: "q17_drive_distance",
    text: "How far are you willing to drive to meet up with someone?",
    type: "single_select",
    options: [
      "5 miles",
      "10 miles",
      "25 miles",
      "50 miles",
      "I don't have a car"
    ],
    validation: (value: string) => value ? null : "Please select a distance",
    // This maps to drive_distance column
  },
  {
    id: "q18_availability_times",
    text: "When are you usually most available to meet up with friends?",
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
    id: "q19_age_range_preference",
    text: "What age range would you prefer for new friends?",
    type: "single_select",
    options: [
      "Similar age (within 3 years)",
      "Slightly younger or older (within 5 years)",
      "Wide range - age doesn't matter much to me"
    ],
    validation: (value: string) => value ? null : "Please select an age range preference",
    // This maps to age_range_preference column
  },

  // Section 6: Values & politics - 1 open-ended, 3 structured
  {
    id: "q20_issues_causes",
    text: "What issues or causes matter most to you personally? What gets you fired up or concerned about the world?",
    type: "open_ended",
    validation: (value: string) => value.trim().length > 0 ? null : "Please share what issues matter to you",
  },
  {
    id: "q21_political_classification",
    text: "How would you classify yourself politically?",
    type: "single_select",
    options: [
      "Liberal",
      "Conservative",
      "Moderate",
      "Independent",
      "I don't really follow politics",
      "Other"
    ],
    validation: (value: string) => value ? null : "Please select a political classification",
    // This maps to political_classification column
  },
  {
    id: "q22_political_alignment_important",
    text: "Is it important for you and your friends to be aligned politically?",
    type: "single_select",
    options: [
      "Very important",
      "Somewhat important",
      "Not important",
      "I don't really follow politics"
    ],
    validation: (value: string) => value ? null : "Please select an option",
    // This maps to political_alignment_important column
  },
  {
    id: "q23_discuss_politics",
    text: "How do you feel about discussing politics or current events with friends?",
    type: "single_select",
    options: [
      "I prefer friends who share my views",
      "I enjoy respectful debate with different perspectives",
      "I prefer to keep it light and avoid politics",
      "It depends on the topic"
    ],
    validation: (value: string) => value ? null : "Please select an option",
  },

  // Section 7: What you're looking for - 3 open-ended
  {
    id: "q24_friendship_matters_most",
    text: "What matters most to you in a friendship?",
    type: "open_ended",
    validation: (value: string) => value.trim().length > 0 ? null : "Please share what matters most in friendship",
  },
  {
    id: "q25_kinds_of_friends",
    text: "What kinds of friends are you hoping to find? (e.g., activity partner, deep conversation buddy, casual hangout friend)",
    type: "open_ended",
    validation: (value: string) => value.trim().length > 0 ? null : "Please share what kinds of friends you're looking for",
  },
  {
    id: "q26_matcha_hopes",
    text: "What are you hoping to get out of using Matcha? What would make this feel successful for you?",
    type: "open_ended",
    validation: (value: string) => value.trim().length > 0 ? null : "Please share your hopes for Matcha",
  },
];

// Map question IDs to column names for the 6 filtered columns
export const questionToColumnMap: Record<string, string> = {
  "q5_life_stage": "life_stage",
  "q17_drive_distance": "drive_distance",
  "q18_availability_times": "availability_times",
  "q19_age_range_preference": "age_range_preference",
  "q21_political_classification": "political_classification",
  "q22_political_alignment_important": "political_alignment_important",
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
    text: "We'd like to find friends near you. How would you like to set your location?",
    type: "location_permission",
    options: [
      "Use My Location",
      "Enter Manually"
    ],
    validation: (value: string) =>
      value ? null : "Please choose a location option",
  },
];
