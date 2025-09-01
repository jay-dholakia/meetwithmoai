export const intakeQuestions = [
    // Part A — Interests, Activities & First-Meet Ideas (13)
    {
      id: "activities_enjoyed",
      text: "What activities do you enjoy?",
      type: "multi_select",
      options: [
        "Running",
        "Hiking",
        "Cycling",
        "Yoga/Pilates",
        "Gym/Strength",
        "Basketball",
        "Soccer",
        "Tennis",
        "Pickleball",
        "Volleyball",
        "Swimming",
        "Golf",
        "Ski/Snowboard",
        "Surfing",
        "Dance",
        "Rock climbing",
        "Coffee shops",
        "Cooking/Dining out",
        "Concerts/Live music",
        "Gaming (video/board)",
        "Traveling/Day trips",
        "Arts & crafts",
        "Volunteering",
        "Other",
      ],
      maxSelections: 10,
      validation: (values: string[]) =>
        values.length > 0 ? null : "Please select at least one activity",
    },
    {
      id: "adventure_openness",
      text: "I'm open to trying new activities and adventures",
      type: "likert",
      options: [
        "Strongly disagree",
        "Disagree",
        "Neutral",
        "Agree",
        "Strongly agree",
      ],
    },
    {
      id: "enjoy_competitive_activities",
      text: "Do you enjoy light competitive stuff (ping-pong, trivia, bowling)?",
      type: "likert",
      options: [
        "Strongly disagree",
        "Disagree",
        "Neutral",
        "Agree",
        "Strongly agree",
      ],
    },
    {
      id: "sports_teams",
      text: "Do you follow any sports teams or leagues?",
      type: "text",
      placeholder: "Tell us about your teams or leave blank if none",
    },
    {
      id: "music_genres",
      text: "Music genres",
      type: "multi_select",
      options: [
        "Pop",
        "Rap/Hip-hop",
        "Rock",
        "Indie/Alternative",
        "EDM/Electronic",
        "Jazz",
        "Classical",
        "Country",
        "R&B/Soul",
        "Latin",
        "K-pop/International",
        "Other",
      ],
      maxSelections: 5,
      validation: (values: string[]) =>
        values.length > 0 ? null : "Please select at least one genre",
    },
    {
      id: "movies_shows",
      text: "Movies/Shows",
      type: "multi_select",
      options: [
        "Comedy",
        "Action/Adventure",
        "Drama",
        "Sci-Fi/Fantasy",
        "Documentaries",
        "Reality TV",
        "Anime",
        "Thriller/Mystery",
        "Rom-com",
        "Horror",
        "Other",
      ],
      maxSelections: 5,
      validation: (values: string[]) =>
        values.length > 0 ? null : "Please select at least one genre",
    },
    {
      id: "books_podcasts",
      text: "Books/Podcasts",
      type: "multi_select",
      options: [
        "Fiction",
        "Non-fiction",
        "History",
        "Self-help/Personal growth",
        "True crime",
        "Business/Entrepreneurship",
        "Science/Technology",
        "Spirituality/Philosophy",
        "News/Current events",
        "Health & fitness",
        "Other",
      ],
      maxSelections: 5,
      validation: (values: string[]) =>
        values.length > 0 ? null : "Please select at least one category",
    },
    {
      id: "spiritual_beliefs",
      text: "How would you describe your spiritual/religious beliefs?",
      type: "single_select",
      options: [
        "Very religious/spiritual",
        "Somewhat religious/spiritual", 
        "Spiritual but not religious",
        "Agnostic/questioning",
        "Not religious/spiritual",
        "Prefer not to say"
      ],
    },
    {
      id: "going_out_vs_quiet",
      text: "Going out vs quiet hangs",
      type: "single_select",
      options: ["Out", "Quiet", "Mix"],
    },
    {
      id: "drink_alcohol",
      text: "Do you drink alcohol?",
      type: "single_select",
      options: ["Yes", "No"],
    },
    {
      id: "enjoy_cooking_hosting",
      text: "Enjoy cooking/hosting meals?",
      type: "likert",
      options: [
        "Strongly disagree",
        "Disagree",
        "Neutral",
        "Agree",
        "Strongly agree",
      ],
    },
    {
      id: "creative_hobbies",
      text: "Creative hobbies (art, music, writing, crafts)",
      type: "multi_select",
      options: [
        "Art",
        "Music",
        "Writing",
        "Crafts",
        "Photography",
        "Cooking",
        "DIY projects",
        "Other",
      ],
      validation: (values: string[]) =>
        values.length > 0 ? null : "Please select at least one hobby",
    },
    {
      id: "first_meet_ideas",
      text: "First-meet ideas",
      type: "multi_select",
      options: [
        "Playing pickleball",
        "Escape room",
        "Bowling",
        "Window shopping at a mall",
        "Grabbing coffee",
        "Park walk",
        "New restaurant",
        "Trivia night",
        "Museum",
        "Casual workout/fitness class",
      ],
      maxSelections: 5,
      validation: (values: string[]) =>
        values.length > 0 ? null : "Please select at least one idea",
    },

    // Part B — Personality & Style (10)
    {
      id: "introvert_extrovert_scale",
      text: "I'd consider myself more of an introvert, extrovert, or somewhere in between",
      type: "scale",
      options: [
        "Very introverted",
        "Somewhat introverted",
        "In between",
        "Somewhat extroverted",
        "Very extroverted",
      ],
    },
    {
      id: "punctual_person",
      text: "I'd consider myself a punctual person",
      type: "likert",
      options: [
        "Strongly disagree",
        "Disagree",
        "Neutral",
        "Agree",
        "Strongly agree",
      ],
    },
    {
      id: "good_communicator",
      text: "In conversations, I'd consider myself a good communicator (asking questions, listening)",
      type: "likert",
      options: [
        "Strongly disagree",
        "Disagree",
        "Neutral",
        "Agree",
        "Strongly agree",
      ],
    },
    {
      id: "planner_organized",
      text: "I'd consider myself a planner (I like things organized)",
      type: "likert",
      options: [
        "Strongly disagree",
        "Disagree",
        "Neutral",
        "Agree",
        "Strongly agree",
      ],
    },
    {
      id: "spontaneous_adventurous",
      text: "I'd consider myself more spontaneous/adventurous",
      type: "likert",
      options: [
        "Strongly disagree",
        "Disagree",
        "Neutral",
        "Agree",
        "Strongly agree",
      ],
    },
    {
      id: "reliable_friend",
      text: "I'd consider myself a reliable friend (I show up when I say I will)",
      type: "likert",
      options: [
        "Strongly disagree",
        "Disagree",
        "Neutral",
        "Agree",
        "Strongly agree",
      ],
    },
    {
      id: "listener_or_talker",
      text: "I'd consider myself more of a listener or a talker",
      type: "single_select",
      options: ["Mostly listener", "Mostly talker", "Balance of both"],
    },

    // Part C — Work, Life & Anchors (8)
    {
      id: "work_study",
      text: "What do you do for work or study?",
      type: "text",
      placeholder: "Tell us about your work or studies",
    },
    {
      id: "industries",
      text: "Which industries best describe you?",
      type: "multi_select",
      options: [
        "Tech",
        "Healthcare",
        "Education",
        "Arts",
        "Business",
        "Trades",
        "Student",
        "Other",
      ],
      maxSelections: 3,
      validation: (values: string[]) =>
        values.length > 0 ? null : "Please select at least one industry",
    },
    {
      id: "current_life_stage",
      text: "Current life stage?",
      type: "single_select",
      options: [
        "Student",
        "Early career",
        "Parent",
        "Mid-career",
        "Retired",
        "Other",
      ],
    },
    {
      id: "grew_up_here_or_moved",
      text: "Did you grow up here or move later?",
      type: "single_select",
      options: ["Local", "Newcomer", "Relocated"],
    },
    {
      id: "time_in_city",
      text: "How long have you lived in [user's city]?",
      type: "single_select",
      options: ["<1 yr", "1–3 yrs", "3–5 yrs", "5+ yrs"],
    },
    {
      id: "lifestyle_priorities",
      text: "Which lifestyle priorities are important to you?",
      type: "multi_select",
      options: [
        "Healthy eating & fitness",
        "Environmental consciousness",
        "Work-life balance",
        "Financial responsibility",
        "Personal growth & learning",
        "Family & relationships",
        "Career advancement",
        "Creative expression",
        "Community involvement",
        "Travel & experiences"
      ],
      maxSelections: 5,
      validation: (values: string[]) =>
        values.length > 0 ? null : "Please select at least one priority",
    },

    // Part D — Communication & Logistics (5)
    {
      id: "smoking_preference",
      text: "Do you smoke or vape?",
      type: "single_select",
      options: ["Yes, regularly", "Occasionally/socially", "No, never"],
    },
    {
      id: "punctuality_importance",
      text: "How important is punctuality to you?",
      type: "likert",
      options: [
        "Not important at all",
        "Somewhat important",
        "Moderately important", 
        "Very important",
        "Extremely important"
      ],
    },
    {
      id: "preferred_meetup_times",
      text: "When do you usually prefer to meet up?",
      type: "multi_select",
      options: [
        "Weekday day",
        "Weekday evening",
        "Weekend day",
        "Weekend evening",
      ],
      validation: (values: string[]) =>
        values.length > 0 ? null : "Please select at least one time",
    },
    {
      id: "travel_distance",
      text: "How far are you willing to travel for meetups?",
      type: "single_select",
      options: ["1 mile", "5 miles", "10 miles", "20 miles"],
    },
    {
      id: "conversation_topics",
      text: "What topics energize you in conversation?",
      type: "multi_select",
      options: [
        "Career & professional goals",
        "Personal relationships & dating",
        "Current events & news",
        "Philosophy & life meaning",
        "Hobbies & personal interests",
        "Travel & experiences",
        "Health & wellness",
        "Technology & innovation",
        "Arts & creativity",
        "Pop culture & entertainment"
      ],
      maxSelections: 5,
      validation: (values: string[]) =>
        values.length > 0 ? null : "Please select at least one topic",
    },
    {
      id: "hangout_preference",
      text: "Do you prefer casual 1:1 hangouts or group meetups for first meetings?",
      type: "single_select",
      options: ["1:1", "Small group", "No preference"],
    },

    // Part E — Creative Open-Ended (5)
    {
      id: "friendship_frequency",
      text: "How often would you like to hang out with a close friend?",
      type: "single_select",
      options: ["Weekly", "Bi-weekly", "Monthly", "Occasionally"],
    },
    {
      id: "free_saturday_activity",
      text: "If you had a free Saturday, how would you spend it?",
      type: "text",
      placeholder: "Describe your ideal Saturday",
    },
    {
      id: "friendship_values",
      text: "What's most important to you in a friendship?",
      type: "multi_select",
      options: [
        "Trust & loyalty",
        "Fun & laughter",
        "Personal growth",
        "Emotional support",
        "Shared adventures",
        "Consistency & reliability",
        "Deep conversations",
        "Mutual respect"
      ],
      maxSelections: 4,
      validation: (values: string[]) =>
        values.length > 0 ? null : "Please select at least one value",
    },
    {
      id: "friends_describe_three_words",
      text: "If friends described you in 3 words, what might they say?",
      type: "text",
      placeholder: "What words come to mind?",
    },
    {
      id: "conflict_style",
      text: "How do you prefer to handle disagreements with friends?",
      type: "single_select",
      options: [
        "Direct conversation right away",
        "Give some space first, then talk",
        "Try to avoid conflict when possible",
        "Work through it together patiently"
      ],
    },

    // Part F — Let's Get Deeper (About You) (5)
    {
      id: "role_model_and_why",
      text: "Who do you consider a role model, and why?",
      type: "text",
      placeholder: "Tell us about someone who inspires you",
    },
    {
      id: "proud_of_lately",
      text: "What's something you're proud of lately?",
      type: "text",
      placeholder: "Share an achievement or moment",
    },
    {
      id: "morning_motivation",
      text: "What motivates you to get out of bed in the morning?",
      type: "text",
      placeholder: "What drives you?",
    },
    {
      id: "social_values",
      text: "Which social/political topics do you feel strongly about?",
      type: "multi_select",
      options: [
        "Environmental sustainability",
        "Social justice & equality",
        "Community involvement",
        "Mental health awareness",
        "Economic policy",
        "Education reform",
        "Healthcare access",
        "Technology & privacy",
        "Not particularly political",
        "Prefer not to discuss politics"
      ],
      maxSelections: 5,
    },
    {
      id: "looking_for_in_friend",
      text: "What are you looking for in a friend?",
      type: "text",
      placeholder: "What qualities matter most to you?",
    },
  ];


export  const profileQuestions = [
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
        "Other",
        "Prefer not to say",
      ],
      validation: (value: string) =>
        value ? null : "Please select your sexual orientation",
    },
    {
      id: "profilePhoto",
      text: "Would you like to add a profile photo?",
      type: "photo",
      options: ["Yes, upload photo", "Skip for now"],
      validation: (value: string) => (value ? null : "Please make a selection"),
    },
    {
      id: "location",
      text: "Let me get your location to find friends nearby. Can I access your location?",
      type: "location",
      options: ["Yes, use my location", "No, I will enter manually"],
      validation: (value: string) => (value ? null : "Please make a selection"),
    },
    {
      id: "meetRadius",
      text: "What's your preferred meet radius?",
      type: "chips",
      options: ["1 mile", "5 miles", "10 miles", "20 miles"],
      validation: (value: string) =>
        value ? null : "Please select your preferred meet radius",
    },
    {
      id: "relationshipStatus",
      text: "What's your relationship status?",
      type: "chips",
      options: [
        "Single",
        "In a relationship",
        "Married",
        "Divorced",
        "Widowed",
        "Prefer not to say",
      ],
      validation: (value: string) =>
        value ? null : "Please select your relationship status",
    },
    {
      id: "languages",
      text: "What languages do you speak? (Choose up to 5)",
      type: "language_select",
      options: [
        "English",
        "Spanish",
        "French",
        "German",
        "Italian",
        "Portuguese",
        "Russian",
        "Chinese",
        "Japanese",
        "Korean",
        "Arabic",
        "Hindi",
        "Bengali",
        "Dutch",
        "Swedish",
        "Norwegian",
        "Danish",
        "Finnish",
        "Polish",
        "Czech",
        "Hungarian",
        "Turkish",
        "Greek",
        "Hebrew",
        "Thai",
        "Vietnamese",
        "Indonesian",
        "Malay",
        "Tagalog",
        "Other",
      ],
      maxSelections: 5,
      validation: (values: string[]) =>
        values.length > 0 ? null : "Please select at least one language",
    },
  ];  