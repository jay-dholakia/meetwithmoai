const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = 'https://hgllvhohhyamsbljekrd.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('Error: SUPABASE_SERVICE_ROLE_KEY not found in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function triggerMatching() {
  console.log('🚀 Triggering matching algorithm for all users...\n');
  
  try {
    // Get all eligible users
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id')
      .eq('in_match_bowl', true)
      .eq('is_active', true);

    if (profilesError) throw profilesError;

    console.log(`Found ${profiles.length} eligible users\n`);

    // Call function for each user
    for (const profile of profiles) {
      console.log(`Processing user ${profile.id.substring(0, 8)}...`);
      const { data, error } = await supabase.functions.invoke('replenish-matches', {
        body: { user_id: profile.id },
      });

      if (error) {
        console.error(`  ❌ Error: ${error.message}`);
      } else {
        console.log(`  ✅ Success`);
      }
      await new Promise(resolve => setTimeout(resolve, 500)); // Small delay
    }

    console.log('\n✅ Matching complete!');
    
    // Show summary
    const { data: matches, error: matchError } = await supabase
      .from('match_candidates')
      .select('score, status')
      .eq('status', 'active');

    if (!matchError && matches) {
      const avgScore = matches.reduce((sum, m) => sum + (m.score || 0), 0) / matches.length;
      console.log(`\n📊 Summary:`);
      console.log(`   Total active matches: ${matches.length}`);
      console.log(`   Average score: ${avgScore.toFixed(3)}`);
      console.log(`   Score range: ${Math.min(...matches.map(m => m.score || 0)).toFixed(3)} - ${Math.max(...matches.map(m => m.score || 0)).toFixed(3)}`);
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

triggerMatching();
