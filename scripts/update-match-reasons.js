require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://hgllvhohhyamsbljekrd.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('Error: SUPABASE_SERVICE_ROLE_KEY not found in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function updateMatchReasons() {
  console.log('🔄 Updating match reasons for all active matches...\n');
  
  try {
    // Get all active matches
    const { data: matches, error: matchesError } = await supabase
      .from('match_candidates')
      .select('id, user_a, user_b, score, status')
      .eq('status', 'active')
      .limit(100);

    if (matchesError) throw matchesError;

    console.log(`Found ${matches.length} active matches to update\n`);

    let successCount = 0;
    let errorCount = 0;

    for (const match of matches) {
      try {
        console.log(`Processing match ${match.id.substring(0, 8)}...`);
        
        // Call the Edge Function to regenerate reasons
        // We'll trigger it by calling replenish-matches for user_a
        // But first, let's delete this match so it gets recreated with new reasons
        const { error: deleteError } = await supabase
          .from('match_candidates')
          .delete()
          .eq('id', match.id);

        if (deleteError) {
          console.error(`  ❌ Error deleting match: ${deleteError.message}`);
          errorCount++;
          continue;
        }

        // Now trigger match creation for user_a (it will recreate this match with new reasons)
        const { data, error } = await supabase.functions.invoke('replenish-matches', {
          body: { user_id: match.user_a },
        });

        if (error) {
          console.error(`  ❌ Error: ${error.message}`);
          errorCount++;
        } else {
          console.log(`  ✅ Success`);
          successCount++;
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (err) {
        console.error(`  ❌ Exception: ${err.message}`);
        errorCount++;
      }
    }

    console.log(`\n✅ Update complete!`);
    console.log(`   Success: ${successCount}`);
    console.log(`   Errors: ${errorCount}`);
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

updateMatchReasons();
