export const intakeQuestions = [
  // 🟢 Light & Fun Starters (5)
  {
    id: "friend_type",
    text: "What kind of friend are you usually?",
    type: "single_select",
    options: [
      "The planner (sets up hangouts)",
      "The chill one (always down to join)",
      "The hype one (brings the energy)",
      "The listener (keeps it grounded)"
    ],
    validation: (value: string) => value ? null : "Please select a friend type",
  },
  {
    id: "lazy_sunday",
    text: "How do you usually spend a lazy Sunday?",
    type: "single_select",
    options: [
      "Sleeping in and relaxing",
      "Catching up on shows/books",
      "Getting outside and active",
      "Meal prepping or organizing for the week"
    ],
    validation: (value: string) => value ? null : "Please select an option",
  },
  {
    id: "sense_of_humor",
    text: "Which best describes your sense of humor?",
    type: "single_select",
    options: [
      "Sarcastic/dry",
      "Goofy/silly",
      "Clever/witty",
      "A little dark"
    ],
    validation: (value: string) => value ? null : "Please select a humor style",
  },
  {
    id: "recharge_method",
    text: "If you could only pick one way to recharge, what would it be?",
    type: "single_select",
    options: [
      "Time alone",
      "Time with friends",
      "Doing something active",
      "Doing something creative"
    ],
    validation: (value: string) => value ? null : "Please select a recharge method",
  },
  {
    id: "default_hangout",
    text: "What's your default first hangout idea with a new friend?",
    type: "single_select",
    options: [
      "Grab food or coffee",
      "Go for a walk or something outdoors",
      "Watch a movie/show together",
      "Play a game (board or video)"
    ],
    validation: (value: string) => value ? null : "Please select a hangout idea",
  },

  // 🎯 Interests & Activities (17)
  {
    id: "sports_fitness",
    text: "Which kinds of sports or fitness activities do you enjoy?",
    type: "multi_select",
    useTextBox: true,
    textBoxPlaceholder: "Search sports and fitness activities...",
    options: [
      "Running", "Walking", "Hiking", "Strength training", "CrossFit",
      "Cycling (indoor or outdoor)", "Swimming", "Yoga", "Pilates", "Dance",
      "Martial arts", "Boxing or kickboxing", "Rock climbing", "Basketball",
      "Soccer", "Football", "Volleyball", "Baseball", "Softball", "Tennis",
      "Pickleball", "Padel", "Badminton", "Squash", "Golf", "Skiing",
      "Snowboarding", "Surfing", "Paddleboarding", "Rowing", "Kayaking",
      "Ultimate frisbee", "Lacrosse", "Cricket", "Rugby", "Field hockey",
      "Ice hockey", "Other"
    ],
    validation: (values: string[]) =>
      values.length > 0 ? null : "Please select at least one activity",
  },
  {
    id: "is_gamer",
    text: "Do you consider yourself a gamer?",
    type: "single_select",
    options: ["Yes", "Sometimes", "No"],
    validation: (value: string) => value ? null : "Please select an option",
  },
  {
    id: "gaming_types",
    text: "Nice, what do you play?",
    type: "multi_select",
    useTextBox: true,
    textBoxPlaceholder: "Search game types...",
    options: [
      "Fortnite", "Call of Duty", "Minecraft", "Roblox", "League of Legends",
      "Valorant", "Counter-Strike", "Grand Theft Auto V (GTA Online)",
      "Apex Legends", "Elden Ring", "Other"
    ],
    conditionalOn: "is_gamer",
    showIf: ["Yes", "Sometimes"],
    validation: (values: string[]) =>
      values.length > 0 ? null : "Please select at least one game type",
  },
  {
    id: "plays_nyt_games",
    text: "Do you play any New York Times games?",
    type: "single_select",
    options: ["Yes", "No"],
    validation: (value: string) => value ? null : "Please select an option",
  },
  {
    id: "nyt_games",
    text: "Which ones?",
    type: "multi_select",
    options: [
      "Wordle", "Connections", "Mini Crossword", "Spelling Bee",
      "Letter Boxed", "Tiles", "Sudoku", "Other"
    ],
    conditionalOn: "plays_nyt_games",
    showIf: ["Yes"],
    validation: (values: string[]) =>
      values.length > 0 ? null : "Please select at least one game",
  },
  {
    id: "cultural_activities",
    text: "Do you enjoy cultural or creative activities with friends?",
    type: "multi_select",
    options: [
      "Live music and concerts",
      "Festivals and events",
      "Museums and art",
      "Theatre and performances",
      "Making or creating together",
      "Not really my thing"
    ],
    validation: (values: string[]) =>
      values.length > 0 ? null : "Please select at least one option",
  },
  {
    id: "live_music_frequency",
    text: "Do you enjoy going to live music events?",
    type: "single_select",
    options: ["Yes, often", "Sometimes", "Rarely", "Not really"],
    validation: (value: string) => value ? null : "Please select an option",
  },
  {
    id: "music_genres",
    text: "What kind of music do you usually listen to?",
    type: "multi_select",
    useTextBox: true,
    textBoxPlaceholder: "Search music genres...",
    options: [
      "Pop", "Hip hop", "Rock", "EDM", "Country", "Indie", "Classical", "Other"
    ],
    validation: (values: string[]) =>
      values.length > 0 ? null : "Please select at least one genre",
  },
  {
    id: "enjoys_reading",
    text: "Do you enjoy reading?",
    type: "single_select",
    options: ["Yes, a lot", "Occasionally", "Not much", "Not at all"],
    validation: (value: string) => value ? null : "Please select an option",
  },
  {
    id: "book_types",
    text: "What types of books do you like reading?",
    type: "multi_select",
    useTextBox: true,
    textBoxPlaceholder: "Search book genres...",
    options: [
      "Fiction", "Non-fiction", "Mystery or thriller", "Fantasy",
      "Science fiction", "Romance", "Historical", "Self-development",
      "Biographies or memoirs", "Poetry", "Other"
    ],
    conditionalOn: "enjoys_reading",
    showIf: ["Yes, a lot", "Occasionally"],
    validation: (values: string[]) =>
      values.length > 0 ? null : "Please select at least one book type",
  },
  {
    id: "podcast_types",
    text: "What types of podcasts do you listen to most?",
    type: "multi_select",
    options: [
      "Comedy", "News and politics", "Business and tech", "Health and fitness",
      "True crime", "Storytelling and culture", "Don't really listen"
    ],
    validation: (values: string[]) =>
      values.length > 0 ? null : "Please select at least one option",
  },
  {
    id: "watching_with_friends",
    text: "Do you like watching shows or movies with friends?",
    type: "single_select",
    options: ["Yes, it's a go-to activity", "Sometimes", "Rarely", "Not really"],
    validation: (value: string) => value ? null : "Please select an option",
  },
  {
    id: "enjoys_cooking",
    text: "Do you enjoy cooking?",
    type: "single_select",
    options: ["Love it", "Sometimes", "Rarely", "Not at all"],
    validation: (value: string) => value ? null : "Please select an option",
  },
  {
    id: "coffee_or_tea",
    text: "Are you more of a coffee or tea person?",
    type: "single_select",
    options: ["Coffee", "Tea", "Both", "Neither"],
    validation: (value: string) => value ? null : "Please select an option",
  },
  {
    id: "trying_restaurants",
    text: "Do you like trying new restaurants?",
    type: "single_select",
    options: ["All the time", "Sometimes", "Rarely", "Not really"],
    validation: (value: string) => value ? null : "Please select an option",
  },
  {
    id: "favorite_cuisines",
    text: "What are your favorite cuisines?",
    type: "multi_select",
    useTextBox: true,
    textBoxPlaceholder: "Search cuisines...",
    maxSelections: 3,
    options: [
      "Italian", "Mexican", "Chinese", "Japanese", "Thai", "Indian",
      "Mediterranean", "Middle Eastern", "American / comfort food",
      "French", "Korean", "Vietnamese", "Other"
    ],
    validation: (values: string[]) =>
      values.length > 0 ? null : "Please select at least one cuisine",
  },
  {
    id: "fun_activities",
    text: "What sounds fun to do with a friend?",
    type: "multi_select",
    useTextBox: true,
    textBoxPlaceholder: "Search activities...",
    maxSelections: 3,
    options: [
      "Learn a new sport", "Learn a new language", "Join a book club",
      "Take a cooking class", "Try a new fitness class", "Travel somewhere new",
      "Go to a live event or show", "Volunteer together", "Start a creative project", "Other"
    ],
    validation: (values: string[]) =>
      values.length > 0 ? null : "Please select at least one activity",
  },

  // 👥 Types of Friends You're Looking For (1)
  {
    id: "friend_types_seeking",
    text: "What kinds of friends are you hoping to find?",
    type: "multi_select",
    useTextBox: true,
    textBoxPlaceholder: "Search friend types...",
    maxSelections: 5,
    options: [
      "Running partner", "Gym partner", "Hiking companion", "Coffee friend",
      "Brunch or dinner friend", "Movie night friend", "Concert or festival companion",
      "Board game or trivia friend", "Gaming friend", "Study/work buddy",
      "Foodie friend (try new restaurants)", "Travel or road trip companion",
      "Adventure friend (kayaking, camping, climbing, etc.)", "Shopping companion",
      "Volunteering friend", "Wingman/wingwoman"
    ],
    validation: (values: string[]) =>
      values.length > 0 ? null : "Please select at least one friend type",
  },

  // 🔵 Lifestyle & Social Fit (11)
  {
    id: "hangout_frequency",
    text: "How often do you like hanging out with friends?",
    type: "single_select",
    options: ["Daily", "A few times a week", "Weekly", "Once in a while"],
    validation: (value: string) => value ? null : "Please select a frequency",
  },
  {
    id: "social_setting",
    text: "What kind of social setting do you enjoy most?",
    type: "single_select",
    options: ["Big groups", "Small groups", "One on one"],
    validation: (value: string) => value ? null : "Please select a setting",
  },
  {
    id: "social_activity_level",
    text: "How socially active do you like to be?",
    type: "single_select",
    options: [
      "I love being busy with friends often",
      "A few quality hangouts each week is ideal",
      "I prefer less frequent, lower-key meetups"
    ],
    validation: (value: string) => value ? null : "Please select an activity level",
  },
  {
    id: "personality_type",
    text: "Are you more of an introvert, extrovert, or in between?",
    type: "single_select",
    options: ["Introvert", "Extrovert", "Ambivert"],
    validation: (value: string) => value ? null : "Please select a personality type",
  },
  {
    id: "communication_preference",
    text: "What's your preferred way to stay connected with friends?",
    type: "single_select",
    options: ["Texting", "Phone calls", "In person", "Group chats"],
    validation: (value: string) => value ? null : "Please select a communication preference",
  },
  {
    id: "active_friends_preference",
    text: "Do you like having active friends?",
    type: "single_select",
    options: ["Definitely", "Somewhat", "Not really"],
    validation: (value: string) => value ? null : "Please select a preference",
  },
  {
    id: "travel_with_friends",
    text: "How do you feel about traveling with friends?",
    type: "single_select",
    options: ["Love it", "Sometimes", "Rarely", "Not my thing"],
    validation: (value: string) => value ? null : "Please select an option",
  },
  {
    id: "holiday_preference",
    text: "How do you like to spend holidays?",
    type: "single_select",
    options: ["With family", "With friends", "Traveling", "Solo quiet"],
    validation: (value: string) => value ? null : "Please select a preference",
  },
  {
    id: "routine_vs_flexible",
    text: "Do you prefer structured routines or going with the flow?",
    type: "single_select",
    options: [
      "Love routine",
      "Mix of both",
      "Mostly flexible",
      "Go with the flow entirely"
    ],
    validation: (value: string) => value ? null : "Please select a preference",
  },
  {
    id: "weekend_preference",
    text: "Which weekend sounds better?",
    type: "single_select",
    options: ["Outdoor adventure", "Brunch and city time", "Relaxing at home", "Road trip"],
    validation: (value: string) => value ? null : "Please select a weekend preference",
  },
  {
    id: "availability_times",
    text: "When are you usually most available to meet up with friends?",
    type: "multi_select",
    options: ["Weekday daytime", "Weekday evening", "Weekend daytime", "Weekend evening"],
    useTextBox: true,
    searchPlaceholder: "Search availability times...",
    maxSelections: 4,
    validation: (values: string[]) => 
      values.length > 0 ? null : "Please select at least one availability time",
  },

  // 🟠 Values & Friendship Dynamics (6)
  {
    id: "friendship_commitment",
    text: "Friendships should be:",
    type: "single_select",
    options: ["Lifelong commitments", "Okay if seasonal", "Depends on the friendship"],
    validation: (value: string) => value ? null : "Please select a commitment level",
  },
  {
    id: "friendship_pace",
    text: "Which pace feels right for new friendships?",
    type: "single_select",
    options: ["Quick bonding", "Build slowly", "Depends on the person"],
    validation: (value: string) => value ? null : "Please select a pace",
  },
  {
    id: "shared_vs_different",
    text: "Do you want friends with shared interests or different perspectives?",
    type: "single_select",
    options: ["Mostly shared", "Mix of both", "Mostly different"],
    validation: (value: string) => value ? null : "Please select a preference",
  },
  {
    id: "values_importance",
    text: "How important is it for friends to share your values?",
    type: "single_select",
    options: ["Not important", "Somewhat important", "Very important"],
    validation: (value: string) => value ? null : "Please select an importance level",
  },
  {
    id: "honesty_approach",
    text: "What role do you think honesty should play in friendships?",
    type: "single_select",
    options: ["Always tell it straight", "Gentle honesty matters", "Depends on situation"],
    validation: (value: string) => value ? null : "Please select an approach",
  },
  {
    id: "deep_conversation_frequency",
    text: "How often do you like deep conversations with friends?",
    type: "single_select",
    options: ["Rarely", "Sometimes", "Often", "Almost always"],
    validation: (value: string) => value ? null : "Please select a frequency",
  },

  // 🌍 Ideological Alignment (5)
  {
    id: "news_engagement",
    text: "How do you usually engage with news and current events?",
    type: "single_select",
    options: [
      "I follow it closely",
      "I check in occasionally",
      "I skim headlines only",
      "I mostly avoid it"
    ],
    validation: (value: string) => value ? null : "Please select an engagement level",
  },
  {
    id: "political_alignment_importance",
    text: "How important is it for your friends to share your political views?",
    type: "single_select",
    options: ["Not important at all", "Somewhat important", "Very important"],
    validation: (value: string) => value ? null : "Please select an importance level",
  },
  {
    id: "important_issues",
    text: "Which issues matter most to you personally?",
    type: "multi_select",
    maxSelections: 3,
    options: [
      "Climate and environment",
      "Social justice and equality",
      "Health and wellness",
      "Education and learning",
      "Technology and innovation",
      "Community and volunteering",
      "Other"
    ],
    validation: (values: string[]) =>
      values.length > 0 ? null : "Please select at least one issue",
  },
  {
    id: "big_picture_discussions",
    text: "Do you prefer discussing big-picture topics (politics, philosophy, culture) with friends?",
    type: "single_select",
    options: ["Rarely", "Sometimes", "Often", "Almost always"],
    validation: (value: string) => value ? null : "Please select a frequency",
  },
  {
    id: "worldview_preference",
    text: "When it comes to differences in worldview, do you prefer friends who are:",
    type: "single_select",
    options: [
      "Aligned with me",
      "A mix of aligned and different",
      "Very different (I enjoy debate)"
    ],
    validation: (value: string) => value ? null : "Please select a preference",
  },

  // 🔴 Lifestyle Context (8 including conditional)
  {
    id: "partnered_friend_preference",
    text: "Would you prefer to connect with friends who are also partnered?",
    type: "single_select",
    options: ["Yes, that's important", "Doesn't matter to me", "I prefer the opposite"],
    conditionalOn: "relationship_status", // This comes from onboarding
    showIf: ["partnered"],
    validation: (value: string) => value ? null : "Please select a preference",
  },
  {
    id: "single_friend_preference",
    text: "Would you prefer to connect with friends who are single?",
    type: "single_select",
    options: ["Yes, that's important", "Doesn't matter to me", "I prefer the opposite"],
    conditionalOn: "relationship_status", // This comes from onboarding
    showIf: ["single"],
    validation: (value: string) => value ? null : "Please select a preference",
  },
  {
    id: "has_kids",
    text: "Do you have kids?",
    type: "single_select",
    options: ["Yes", "No", "Prefer not to say"],
    validation: (value: string) => value ? null : "Please select an option",
  },
  {
    id: "kids_friend_preference",
    text: "Would you like to connect with friends who also have kids?",
    type: "single_select",
    options: ["Yes, that's important", "Doesn't matter to me", "No preference"],
    validation: (value: string) => value ? null : "Please select a preference",
  },
  {
    id: "location_preference",
    text: "Do you prefer making friends who live:",
    type: "single_select",
    options: [
      "Very close by (same neighborhood)",
      "Within the same city",
      "Anywhere, as long as we connect"
    ],
    validation: (value: string) => value ? null : "Please select a location preference",
  },
  {
    id: "meetup_budget",
    text: "What budget feels right for your meetups?",
    type: "single_select",
    options: [
      "Free (tennis at the park, walk on the beach, game night at home)",
      "Around $10 (coffee, Chipotle, casual snack)",
      "Around $20 (lunch, drinks, casual sit-down)",
      "Around $30+ (dinner out, nicer night plans)"
    ],
    validation: (value: string) => value ? null : "Please select a budget preference",
  },
  {
    id: "life_stage",
    text: "Which stage of life feels most like you right now?",
    type: "single_select",
    options: [
      "School or university",
      "Early career",
      "Career-focused",
      "Family-focused",
      "Transitioning or figuring it out"
    ],
    validation: (value: string) => value ? null : "Please select a life stage",
  },
  {
    id: "work_life_approach",
    text: "Which best describes your approach to work and life?",
    type: "single_select",
    options: [
      "My job is just a job — I prioritize life outside of work",
      "My career is a central part of who I am",
      "Somewhere in the middle"
    ],
    validation: (value: string) => value ? null : "Please select an approach",
  },
];

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
];