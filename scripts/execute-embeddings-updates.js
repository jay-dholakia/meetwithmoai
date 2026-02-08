const fs = require('fs');

// Read the SQL file
const sqlFile = '/tmp/update_embeddings.sql';
const content = fs.readFileSync(sqlFile, 'utf8');

// Split by UPDATE statements (each statement starts with UPDATE)
const statements = content.split(/(?=UPDATE intake_responses_v4)/).filter(s => s.trim());

console.log(`Found ${statements.length} UPDATE statements`);

// Print each statement with its user_id
statements.forEach((stmt, idx) => {
  const match = stmt.match(/WHERE user_id = '([^']+)'/);
  const userId = match ? match[1] : 'unknown';
  console.log(`\n${idx + 1}. User ID: ${userId.substring(0, 8)}...`);
  console.log(`   Length: ${stmt.length} characters`);
  console.log(`   SQL: ${stmt.substring(0, 100)}...`);
});
