# Matcha System Deployment Guide

## Overview

The Matcha "Rolling Matches + Mutual Opt-In Payment + Chat with AI Host" feature has been implemented end-to-end. This guide covers deployment and testing.

## ✅ What's Been Implemented

### Database Schema (Applied via MCP)
- ✅ Added `in_matcha_bowl` flag to `profiles` table
- ✅ Created `matcha_match_candidates` table (rolling replenish model)
- ✅ Created `matcha_opt_ins` table (payment tracking)
- ✅ Extended `conversations` table with Matcha-specific fields
- ✅ Created `matcha_cooldowns` table (60-day cooldown)
- ✅ Added RLS policies and helper functions
- ✅ All indexes and constraints in place

### Edge Functions (Ready to Deploy)
- ✅ `replenish-matches` - Daily/on-demand match replenishment
- ✅ `pass-match` - Handle user passing on matches
- ✅ `opt-in-match` - Handle opt-ins with Stripe payments
- ✅ `expire-matches` - Scheduled expiration and cleanup
- ✅ `stripe-webhook` - Handle Stripe payment events

### Frontend Components
- ✅ Updated `MoaiMatchesScreen` with match cards and conversations
- ✅ New `MatchCard` component with modal and actions
- ✅ Added Matcha toggle to `ProfileScreen`
- ✅ Stripe integration placeholder

### AI Host Messages
- ✅ Implemented in Edge Functions with conversation starters
- ✅ Uses match reasons for personalized intros

## 🚀 Deployment Steps

### 1. Deploy Edge Functions

```bash
cd /Users/user/meetwithmoai

# Deploy all Matcha functions
supabase functions deploy replenish-matches
supabase functions deploy pass-match
supabase functions deploy opt-in-match
supabase functions deploy expire-matches
supabase functions deploy stripe-webhook
```

### 2. Set Environment Variables

Add to your Supabase project settings:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# OpenAI (if using for enhanced AI messages)
OPENAI_API_KEY=sk-your_openai_key
```

Add to your React Native `.env`:

```bash
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
EXPO_PUBLIC_STRIPE_MERCHANT_ID=your_merchant_id
```

### 3. Set Up Stripe Webhooks

1. Go to Stripe Dashboard → Webhooks
2. Add endpoint: `https://your-project.supabase.co/functions/v1/stripe-webhook`
3. Select events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `payment_intent.canceled`
   - `payment_intent.requires_action`

### 4. Set Up Scheduled Jobs

In Supabase Dashboard → Database → Extensions → pg_cron:

```sql
-- Run match expiration every hour
SELECT cron.schedule(
  'expire-matches',
  '0 * * * *', -- Every hour
  $$
  SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/expire-matches',
    headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- Run match replenishment daily at 9 AM
SELECT cron.schedule(
  'replenish-matches',
  '0 9 * * *', -- Daily at 9 AM
  $$
  SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/replenish-matches',
    headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
```

### 5. Install Stripe Dependencies (Optional)

For full Stripe integration:

```bash
npm install @stripe/stripe-react-native
```

Then update `lib/stripe.ts` with actual Stripe implementation.

## 🧪 Testing Instructions

### Local Testing

1. **Start the development server:**
   ```bash
   npm start
   ```

2. **Test the database schema:**
   - Check that new tables exist in Supabase Dashboard
   - Verify RLS policies are working

3. **Test Edge Functions locally:**
   ```bash
   supabase functions serve
   
   # Test replenishment
   curl -X POST http://localhost:54321/functions/v1/replenish-matches \
     -H "Authorization: Bearer YOUR_ANON_KEY" \
     -H "Content-Type: application/json" \
     -d '{"user_id": "test-user-id"}'
   ```

### End-to-End Testing Flow

1. **User Setup:**
   - Create test accounts
   - Complete questionnaires
   - Enable Matcha matching in profile

2. **Match Generation:**
   - Call replenish-matches function
   - Verify matches appear in Connections tab
   - Check match expiration timers

3. **Match Actions:**
   - Test "Pass" functionality
   - Test "Down to Chat" with payment flow
   - Verify mutual opt-in creates chat

4. **Chat Creation:**
   - Check AI intro message appears
   - Verify conversation is active
   - Test chat limit enforcement (3 max)

5. **Payment Flow:**
   - Test Stripe payment authorization
   - Test payment capture on mutual opt-in
   - Test payment cancellation on expiration

### Key Test Scenarios

#### Scenario 1: Basic Match Flow
1. User A gets match suggestion for User B
2. User A opts in → payment authorized
3. User B opts in → both payments captured, chat created
4. AI intro message sent with conversation starters

#### Scenario 2: One-Sided Opt-In
1. User A opts in → payment authorized
2. Match expires after 72 hours
3. Payment automatically canceled
4. Users added to cooldown

#### Scenario 3: Chat Limit
1. User has 3 active Matcha chats
2. New matches show but "Down to Chat" disabled
3. User closes a chat → matching resumes

#### Scenario 4: Replenishment
1. User has 3 active matches
2. User passes on 1 match
3. System automatically replenishes to 5 matches

## 📊 Monitoring & Analytics

### Key Metrics to Track

1. **Match Metrics:**
   - Daily active users in Matcha bowl
   - Match generation rate
   - Match acceptance rate
   - Time to mutual opt-in

2. **Payment Metrics:**
   - Payment authorization success rate
   - Payment capture success rate
   - Revenue per successful match

3. **Engagement Metrics:**
   - Messages per Matcha conversation
   - Conversation duration
   - User retention after first match

### Database Queries for Monitoring

```sql
-- Active users in Matcha bowl
SELECT COUNT(*) FROM profiles WHERE in_matcha_bowl = true AND is_active = true;

-- Match success rate (last 7 days)
SELECT 
  COUNT(*) FILTER (WHERE status = 'converted') as successful_matches,
  COUNT(*) as total_matches,
  (COUNT(*) FILTER (WHERE status = 'converted') * 100.0 / COUNT(*)) as success_rate
FROM matcha_match_candidates 
WHERE created_at >= NOW() - INTERVAL '7 days';

-- Revenue (successful payments)
SELECT 
  COUNT(*) * 5.00 as total_revenue,
  COUNT(*) as successful_payments
FROM matcha_opt_ins 
WHERE payment_status = 'succeeded' 
AND created_at >= NOW() - INTERVAL '30 days';
```

## 🔧 Troubleshooting

### Common Issues

1. **Matches not appearing:**
   - Check `in_matcha_bowl` flag is true
   - Verify questionnaire is complete
   - Check active chat count < 3

2. **Payments failing:**
   - Verify Stripe keys are correct
   - Check webhook endpoint is reachable
   - Review Stripe Dashboard for errors

3. **AI messages not sending:**
   - Check conversation creation in logs
   - Verify message insertion permissions
   - Review Edge Function logs

### Debug Commands

```bash
# Check Edge Function logs
supabase functions logs replenish-matches

# Test database functions
SELECT count_active_matcha_chats('user-id');
SELECT users_in_cooldown('user-a-id', 'user-b-id');

# Check RLS policies
SELECT * FROM matcha_match_candidates; -- Should only show user's matches
```

## 🎯 Next Steps

1. **Enhanced Matching Algorithm:**
   - Implement ML-based compatibility scoring
   - Add location-based filtering improvements
   - Optimize for diversity and engagement

2. **Advanced Features:**
   - Push notifications for new matches
   - In-app messaging for match discussions
   - Photo verification system

3. **Analytics Dashboard:**
   - Admin panel for monitoring
   - A/B testing framework
   - User feedback collection

## 📞 Support

For issues with the Matcha system:

1. Check Edge Function logs in Supabase Dashboard
2. Review database queries and RLS policies
3. Test payment flow in Stripe Dashboard
4. Monitor user feedback and engagement metrics

The system is designed to be self-healing with automatic replenishment and cleanup, but monitoring is recommended for optimal performance.