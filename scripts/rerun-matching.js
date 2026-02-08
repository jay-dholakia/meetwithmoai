const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://hgllvhohhyamsbljekrd.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhnbGx2aG9oaHlhbXNibGpla3JkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTgxMzk1OCwiZXhwIjoyMDcxMzg5OTU4fQ.RHJD0751FgOI2ySVZbR6N7RDrkzcap2VaD_NjwBCcYI';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function rerunMatching() {
  console.log('🚀 Rerunning matching algorithm with new distance logic...\n');
  
  try {
    // Get all eligible users
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id')
      .eq('in_matcha_bowl', true)
      .eq('is_active', true);

    if (profilesError) throw profilesError;

    console.log(`Found ${profiles.length} eligible users\n`);

    // Call function for each user
    let successCount = 0;
    let errorCount = 0;
    
    for (const profile of profiles) {
      console.log(`Processing user ${profile.id.substring(0, 8)}...`);
      
      try {
        const { data, error } = await supabase.functions.invoke('replenish-matches', {
          body: { user_id: profile.id },
        });

        if (error) {
          console.error(`  ❌ Error: ${error.message}`);
          errorCount++;
        } else {
          console.log(`  ✅ Success`);
          successCount++;
        }
      } catch (err) {
        console.error(`  ❌ Exception: ${err.message}`);
        errorCount++;
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    console.log(`\n✅ Matching complete!`);
    console.log(`   Success: ${successCount}`);
    console.log(`   Errors: ${errorCount}`);
    
    // Show summary
    const { data: matches, error: matchError } = await supabase
      .from('matcha_match_candidates')
      .select('score, status')
      .eq('status', 'active');

    if (!matchError && matches && matches.length > 0) {
      const scores = matches.map(m => m.score || 0).filter(s => s > 0);
      const avgScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;
      const minScore = Math.min(...scores);
      const maxScore = Math.max(...scores);
      
      console.log(`\n📊 Summary:`);
      console.log(`   Total active matches: ${matches.length}`);
      console.log(`   Average score: ${avgScore.toFixed(3)}`);
      console.log(`   Score range: ${minScore.toFixed(3)} - ${maxScore.toFixed(3)}`);
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

rerunMatching();
