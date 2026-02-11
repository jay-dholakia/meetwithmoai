const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = 'https://hgllvhohhyamsbljekrd.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('Error: SUPABASE_SERVICE_ROLE_KEY not found in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMatching() {
  console.log('🚀 Running matching algorithm for all eligible users...\n');

  try {
    // Call the Edge Function
    const response = await fetch(`${supabaseUrl}/functions/v1/replenish-matches`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({}), // No user_id = run for all eligible users
    });

    const result = await response.json();
    
    if (!response.ok) {
      console.error('❌ Error running matching:', result);
      return;
    }

    console.log('✅ Matching algorithm completed!\n');

    // Now query the results
    console.log('📊 Fetching match results...\n');

    // Get all active matches with user details
    const { data: matches, error: matchError } = await supabase
      .from('match_candidates')
      .select(`
        id,
        user_a,
        user_b,
        status,
        score,
        match_reasons,
        created_at,
        expires_at,
        user_a_profile:profiles!match_candidates_user_a_fkey(first_name, last_name, email),
        user_b_profile:profiles!match_candidates_user_b_fkey(first_name, last_name, email)
      `)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (matchError) {
      console.error('Error fetching matches:', matchError);
      return;
    }

    console.log(`\n📈 Total active matches: ${matches.length}\n`);

    // Group matches by user
    const matchesByUser = {};
    matches.forEach(match => {
      const userA = match.user_a_profile;
      const userB = match.user_b_profile;
      
      if (!matchesByUser[userA.email]) {
        matchesByUser[userA.email] = [];
      }
      if (!matchesByUser[userB.email]) {
        matchesByUser[userB.email] = [];
      }
      
      matchesByUser[userA.email].push({
        with: `${userB.first_name} ${userB.last_name.charAt(0)}.`,
        score: match.score,
        reasons: match.match_reasons,
      });
      
      matchesByUser[userB.email].push({
        with: `${userA.first_name} ${userA.last_name.charAt(0)}.`,
        score: match.score,
        reasons: match.match_reasons,
      });
    });

    // Display results
    for (const [email, userMatches] of Object.entries(matchesByUser)) {
      console.log(`\n👤 ${email}`);
      console.log(`   Matches: ${userMatches.length}`);
      userMatches.forEach((match, idx) => {
        console.log(`   ${idx + 1}. ${match.with} (score: ${(match.score * 100).toFixed(1)}%)`);
        if (match.reasons?.sharedInterests?.length > 0) {
          console.log(`      Shared: ${match.reasons.sharedInterests.slice(0, 3).join(', ')}`);
        }
      });
    }

    // Show match distribution
    console.log('\n\n📊 Match Distribution:');
    const distribution = {};
    Object.values(matchesByUser).forEach(userMatches => {
      const count = userMatches.length;
      distribution[count] = (distribution[count] || 0) + 1;
    });
    
    Object.entries(distribution)
      .sort((a, b) => parseInt(b[0]) - parseInt(a[0]))
      .forEach(([count, users]) => {
        console.log(`   ${count} matches: ${users} user(s)`);
      });

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

runMatching();
