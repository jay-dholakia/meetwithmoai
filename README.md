# Fika

A sleek, modern connection app where AI guides meaningful local connections through thoughtful onboarding, intake, and weekly introductions.

## 🎯 Vision

**Purpose**: Help people make new local connections at cafés, not romantic partners.

**Model**: 
- **Home = AI chat** — handles onboarding, intake, and weekly matches
- **Weekly cadence** — every Sunday at noon (local), AI drops up to 3 curated matches
- **Consent-first** — only if both users tap "Yes" → a triad chat opens (me, them, AI)
- **AI warms conversations** with icebreakers and meetup suggestions, then steps back

## 📱 App Structure

### iOS Tabs (3 total):

1. **✨ Liv (Home)** — chat with AI; intake and weekly connections happen here
2. **☕ Café Connections (Chats)** — list of ongoing café conversations  
3. **👤 Profile** — edit info, availability, reminders, pause, safety link

## 🎨 Design & UX

- **Fika theme**: `#F8F9FA` background, `#4A90E2` sky blue primary, `#FF8C42` warm orange accent
- **Typography**: Inter Tight for headers, Inter for body
- **Controls**: chip buttons, Likert sliders, short text, availability grid
- **Animations**: subtle typing indicator, 400–600ms micro-delays
- **Tone**: warm, brief, platonic. Always offer "Skip"

## 🔄 User Flows

### 1. Onboarding (with location detection)
- User signs up (email/phone, 18+)
- App detects device location (GPS/OS permission)
- Reverse-geocode into city + coordinates
- Show confirmation: "I found you're in [City]. Use this as your starting point?"
- User sets travel radius (default 10–25 km, adjustable)
- User adds avatar + name/initial
- Redirect immediately into AI chat to begin intake

### 2. Intake (AI chat, 50 questions)
- AI guide asks all 50 questions conversationally, one at a time
- Inputs: chips, Likert scales, text fields, availability grid
- Progress recap every ~6 Qs
- Autosave answers; allow pause/resume
- End: "All done! I'll use this to find your 3 weekly intros. They'll show up here every Sunday."

### 3. Weekly Matches (delivered in Home chat)
- Sunday at noon (local), AI posts: "Your 3 friend intros for the week are ready. Here's the first…"
- Each intro = inline card with avatar, overlaps, bio snippet, complementary difference
- Buttons: Yes, introduce us / Not now
- If Yes: AI replies "Got it — I'll check with them."
- If both Yes: AI says "Great! You both said yes. I'll open a chat in Moai Matches." → triad chat created

### 4. Triad Chats (Moai Matches tab)
- AI opener: points out overlaps, one difference, suggests 2 icebreakers + meetup options
- AI steps back after warmup; nudges if idle 24h
- Overflow actions: Report / Block / Leave. Block ends chat + suppresses resurfacing

### 5. Weekly Cycle
- Matches expire Saturday midnight if untouched
- New batch drops Sunday noon
- Prevent repeats within 8 weeks (unless profile changed)

## 🛠️ Tech Stack

- **Frontend**: React Native + Expo
- **Backend**: Supabase (Auth + Database + Real-time)
- **AI**: OpenAI GPT-3.5-turbo
- **Database**: PostgreSQL with Row Level Security (RLS)
- **Navigation**: React Navigation v6
- **Styling**: React Native StyleSheet with custom theme system
- **Location**: Expo Location
- **Images**: Expo Image Picker

## 📊 Database Schema

### Core Tables:
- `profiles` - User profiles with location and basic info
- `preferences` - User preferences and settings
- `intake_responses` - 50-question intake responses with embeddings
- `match_candidates` - Weekly match candidates with scores
- `consents` - User consent responses to matches
- `conversations` - Triad conversations between users
- `messages` - Messages in conversations
- `blocks` - User blocks
- `reports` - User reports

### Scoring Algorithm:
- Filters: blocks, distance, language
- Score = traits cosine + hobbies Jaccard + bio embedding cosine + availability Jaccard + life_stage overlap – distance penalty
- Weekly batch: pick top ≤3, exclude last-8-week repeats

## 🤖 AI Host Role

- Greets, runs intake in chat
- Drops weekly intros as inline cards
- Confirms Yes/No; opens triad chat on mutual Yes
- Triad opener: overlaps, complement, icebreakers, meetup suggestion
- Nudges idle after 24h
- Reinforces safety (public spaces, share info later, easy block/report)

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Expo CLI
- Supabase account
- OpenAI API key

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd moai-friends
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env
   ```
   
   Add your API keys:
   ```
   EXPO_PUBLIC_OPENAI_API_KEY=your_openai_api_key_here
   ```

4. **Set up Supabase**
   - Create a new Supabase project
   - Update the Supabase URL and anon key in `lib/mcp-supabase.ts`
   - Run the database schema setup

5. **Start the development server**
   ```bash
   npm start
   ```

6. **Run on device/simulator**
   ```bash
   # iOS
   npm run ios
   
   # Android
   npm run android
   
   # Web
   npm run web
   ```

## 📝 Full Intake Questionnaire (50 Questions)

### Section A — Interests & Activities (10)
1. "What kinds of activities do you enjoy with friends?" → Chips
2. "Nice! Which 3 are your top favorites?" → Drag list
3. "How often do you want active/outdoor hangs?" → Scale
4. "How often do you want low-key indoor hangs?" → Scale
5. "I like trying new activities even if I'm not good at them." → Likert
6. "I'm happy sticking to favorite spots." → Likert
7. "Interested in learning/teaching a skill?" → Likert
8. "Do you enjoy light competitive stuff?" → Likert
9. "How do you feel about alcohol at hangouts?" → Single select
10. "Would you like kid-friendly meetups?" → Single select

### Section B — Social Vibe & Hang Style (8)
11–18. Likert questions: energy, 1:1 vs group, spontaneity, banter, quiet hangs, etc.

### Section C — Communication & Coordination (8)
19. "What's your favorite way to make plans?" → Single select
20. "How fast do you usually reply?" → Single select
21–26. Likert: comfort with short chats, reminders, reschedules, proposing ideas.

### Section D — Availability & Logistics (7)
27. "Which times are usually good?" → Grid
28. "On a weeknight, how long do you usually have?" → Single select
29. "On a weekend, how long?" → Single select
30. "How far are you willing to travel?" → Single select
31. "Which areas/neighborhoods work best?" → Multi + text
32. "What kind of budget feels comfortable?" → $, $$, $$$
33. "Any accessibility needs?" → Short text

### Section E — Boundaries & Comfort (7)
34–39. Likert: public first meetups, selfies, hosting, check-ins
40. "Any topics to avoid early on?" → Multi select

### Section F — What You're Looking For (6)
41–46. Likert: new to city, activity partners, casual hangs, accountability, recurring cadence, similar rhythm.

### Section G — Conversation & Personality (6)
47. "Which topics do you enjoy chatting about?" → Multi
48. "What kind of humor lands with you?" → Multi
49. "I like conversations where we trade stories back and forth." → Likert
50. "Write a short bio — just a couple of lines that sound like you." → Text (≤140 chars)

## 🎯 Acceptance Criteria

- ✅ Onboarding uses device location to suggest city/coords, with ability to adjust
- ✅ AI-led intake chat runs full 50 questions with autosave, skip, and progress
- ✅ Weekly matches drop Sunday noon in Home chat (≤3), expire Saturday midnight
- ✅ Only dual Yes opens triad chat; AI seeds opener
- ✅ Triad chat includes nudges, safety reminders, and block/report
- ✅ Profile lets users adjust city/radius, availability, avatar, reminders, pause account
- ✅ Dark, modern UI throughout
- ✅ Logs: intake completion, weekly open rate, Yes/No %, mutual Yes %, expiry rate, nudge triggers

## 🔒 Safety & Privacy

- **Consent-first approach**: No matches without mutual consent
- **Easy blocking**: One-tap block and report functionality
- **Public spaces**: AI encourages first meetups in public locations
- **Gradual sharing**: Encourages sharing personal info gradually
- **Data privacy**: Row Level Security (RLS) ensures users only see their own data
- **Location control**: Users control their location and radius settings

## 📈 Analytics & Metrics

Track these key metrics:
- Intake completion rate
- Weekly match open rate
- Yes/No response percentages
- Mutual Yes rate
- Match expiry rate
- Nudge trigger frequency
- Conversation engagement
- Block/report incidents

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with React Native and Expo
- Powered by Supabase and OpenAI
- Inspired by the need for meaningful platonic connections
- Designed for safety, consent, and genuine friendship building

---

**Moai Friends** - Where meaningful friendships begin 🤝





