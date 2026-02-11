require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const OpenAI = require('openai');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://hgllvhohhyamsbljekrd.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const openaiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY || process.env.OPENAI_API_KEY;

if (!supabaseServiceKey) {
  console.error('Error: SUPABASE_SERVICE_ROLE_KEY not found in .env');
  process.exit(1);
}

if (!openaiKey) {
  console.error('Error: EXPO_PUBLIC_OPENAI_API_KEY or OPENAI_API_KEY not found in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const openai = new OpenAI({ apiKey: openaiKey });

async function generateEmbedding(text) {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
}

async function generateEmbeddingForUser(userId, userName) {
  try {
    // Get user's v5 intake responses
    const { data: intake, error } = await supabase
      .from('intake_responses_v5')
      .select('responses')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error(`   Error fetching intake for ${userName}:`, error.message);
      return null;
    }

    if (!intake || !intake.responses || !Array.isArray(intake.responses)) {
      console.error(`   No responses found for ${userName}`);
      return null;
    }

    // Extract open-ended responses (type === 'open_ended')
    const openEndedResponses = intake.responses
      .filter((r) => r.type === 'open_ended' && r.answer && r.answer.trim().length > 0)
      .map((r) => `${r.question_text}: ${r.answer}`)
      .join('\n\n');

    if (!openEndedResponses || openEndedResponses.trim().length === 0) {
      console.error(`   No open-ended responses found for ${userName}`);
      return null;
    }

    console.log(`   Generating embedding for ${userName} (${openEndedResponses.length} chars)...`);
    const embedding = await generateEmbedding(openEndedResponses);

    // Convert array to string format for PostgreSQL vector type
    const embeddingString = `[${embedding.join(',')}]`;

    // Update the intake_responses_v5 record with the embedding
    const { error: updateError } = await supabase
      .from('intake_responses_v5')
      .update({ 
        embed_vector: embeddingString,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error(`   Error updating embedding for ${userName}:`, updateError.message);
      return null;
    }

    console.log(`   ✅ ${userName} embedding generated and saved`);
    return embedding;
  } catch (error) {
    console.error(`   Error processing ${userName}:`, error.message);
    return null;
  }
}

async function main() {
  console.log('🔍 Finding all users with v5 intake responses...\n');

  try {
    // Get all users with v5 intake data
    const { data: intakes, error } = await supabase
      .from('intake_responses_v5')
      .select('user_id, responses, embed_vector');

    if (error) {
      console.error('Error fetching intake data:', error);
      process.exit(1);
    }

    if (!intakes || intakes.length === 0) {
      console.log('No users found with v5 intake responses.');
      return;
    }

    console.log(`Found ${intakes.length} users with v5 intake data\n`);

    let successCount = 0;
    let errorCount = 0;
    let skipCount = 0;

    for (const intake of intakes) {
      const userId = intake.user_id;
      
      // Fetch profile separately
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', userId)
        .single();
      
      const userName = profile ? `${profile.first_name} ${profile.last_name || ''}`.trim() : userId.substring(0, 8);

      // Check if embedding already exists
      if (intake.embed_vector) {
        console.log(`⏭️  Skipping ${userName} - embedding already exists`);
        skipCount++;
        continue;
      }

      console.log(`Processing ${userName} (${userId.substring(0, 8)}...)`);

      const result = await generateEmbeddingForUser(userId, userName);

      if (result) {
        successCount++;
      } else {
        errorCount++;
      }

      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`\n✅ Complete!`);
    console.log(`   Success: ${successCount}`);
    console.log(`   Skipped: ${skipCount}`);
    console.log(`   Errors: ${errorCount}`);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main();
