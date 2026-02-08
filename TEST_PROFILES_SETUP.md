# Test Profiles Setup Guide

## Current Status

✅ **Sarah Chen** (sarah.tech@test.com) - Complete
- Profile created
- V4 intake questionnaire completed (26 responses)
- OpenAI embedding generated
- Ready for matching

⏳ **9 Remaining Profiles** - Need to be created
- Mike Rodriguez (mike.music@test.com) - Profile exists, needs intake
- Chris Anderson (chris.student@test.com)
- Emma Williams (emma.creative@test.com)
- Maria Garcia (maria.foodie@test.com)
- David Thompson (david.outdoor@test.com)
- Lisa Patel (lisa.yoga@test.com)
- Alex Martinez (alex.finance@test.com)
- Jessica Kim (jessica.parent@test.com)
- James Wilson (james.retired@test.com)

## How the New Matching Algorithm Works

### 1. **Semantic Matching (50% weight)**
- Uses OpenAI `text-embedding-3-small` to create vector embeddings from all open-ended questionnaire responses
- Calculates cosine similarity between user embeddings
- Higher similarity = users with similar values, interests, and communication styles

**Example**: Sarah (climate/sustainability focus) would have high semantic similarity with Chris (climate activism student)

### 2. **Structured Filters (Hard Requirements)**
These must ALL pass for a match to be considered:

- **Distance**: User B must be within User A's `drive_distance` preference
  - Sarah: 10 miles → Only matches within 10 miles
  
- **Age Range**: User B's age must match User A's `age_range_preference`
  - Sarah: "Similar age (within 3 years)" → Matches ages 25-31
  
- **Availability**: Must have overlapping `availability_times`
  - Sarah: ["Weekend daytime", "Weekend evening"]
  - Must match with someone who also has weekend availability
  
- **Political Alignment**: If `political_alignment_important` = "Very important", must match `political_classification`
  - Sarah: "Very important" + "Liberal" → Only matches other Liberals

### 3. **Additional Scoring (50% weight)**
After passing filters, additional factors boost the score:

- **Distance Proximity (20%)**: Closer = higher score
- **Life Stage Compatibility (15%)**: Similar life stages score higher
- **Age Similarity (10%)**: Closer in age = higher score
- **Availability Overlap (5%)**: More overlapping times = higher score

### 4. **Match Reasons Generation**
The algorithm extracts:
- **Shared Interests**: Common topics from open-ended responses
- **Conversation Hooks**: Specific things they could talk about
- **Match Score**: Overall compatibility percentage

### 5. **Safety & Quality Controls**
- **Cooldown System**: No re-matching within 60 days
- **Blocked Users**: Automatically excluded
- **Active Chat Cap**: Stops matching if user has 3+ active chats
- **Minimum Score**: Only matches above 0.3 (30%) threshold
- **Diversity**: Ensures variety in matches (not all identical)

## Profile Data

All 10 profiles have been defined with realistic, human-like responses in:
- `scripts/create-all-profiles-complete.js`

Each profile includes:
- Basic info (name, age, location, gender, etc.)
- Complete v4 questionnaire responses (26 questions)
- Structured preferences (life stage, drive distance, availability, etc.)

## Next Steps to Complete Setup

### Option 1: Create via MCP SQL (Recommended)
Use the MCP Supabase tools to create users, profiles, and intake responses:

1. Create auth users for remaining 9 profiles
2. Create profiles for each user
3. Create `intake_responses_v4` records with all 26 responses
4. Run `scripts/final-setup-and-demo.js` to generate embeddings
5. Run matching algorithm to see results

### Option 2: Use Supabase Admin API
Create a script with service role key that:
1. Creates users via `supabase.auth.admin.createUser()`
2. Creates profiles and intake responses
3. Generates embeddings via OpenAI
4. Runs matching

### Option 3: Manual Creation via App
1. Sign up as each test user
2. Complete the v4 questionnaire in the app
3. Embeddings will be generated automatically on completion
4. Matching will happen via cron job or manual trigger

## Testing the Matching Algorithm

Once all profiles are created:

1. **Generate Embeddings**:
   ```bash
   node scripts/final-setup-and-demo.js
   ```

2. **Run Matching**:
   ```bash
   # Via Edge Function
   curl -X POST https://hgllvhohhyamsbljekrd.supabase.co/functions/v1/replenish-matches \
     -H "Authorization: Bearer YOUR_ANON_KEY" \
     -H "Content-Type: application/json" \
     -d '{"user_id": "USER_ID"}'
   ```

3. **View Matches**:
   ```sql
   SELECT 
     m.*,
     p1.first_name as user_a_name,
     p2.first_name as user_b_name,
     m.score,
     m.reasons
   FROM matcha_match_candidates m
   JOIN profiles p1 ON m.user_a = p1.id
   JOIN profiles p2 ON m.user_b = p2.id
   WHERE m.user_a = 'USER_ID' OR m.user_b = 'USER_ID'
   ORDER BY m.score DESC;
   ```

## Expected Matches for Sarah

Based on the algorithm, Sarah should match well with:

1. **Chris Anderson** (22, Berkeley) - High semantic similarity (both climate-focused), similar age range, overlapping availability
2. **Emma Williams** (26, SF) - Creative, similar age, both value deep conversations
3. **Lisa Patel** (30, SF) - Both into wellness/sustainability, similar values

Less likely matches:
- **Mike Rodriguez** (32, Oakland) - Different interests (music vs climate), but could match on values
- **David Thompson** (29, Mill Valley) - Different focus (outdoors vs urban), but both value nature
- **Maria Garcia** (27, SF) - Different interests (food vs climate), but similar age/location

## Key Improvements in V4 Algorithm

1. **Semantic Understanding**: OpenAI embeddings capture meaning, not just keywords
2. **Better Filtering**: Hard filters ensure compatibility on deal-breakers
3. **Weighted Scoring**: Balances semantic similarity with practical factors
4. **Rich Match Reasons**: Provides specific conversation starters
5. **Hybrid Schema**: Structured columns for fast filtering + JSONB for flexibility
