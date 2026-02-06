// Test script for Matcha system without payments
// Run with: node test-matcha-no-payment.js

const SUPABASE_URL = 'https://hgllvhohhyamsbljekrd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhnbGx2aG9oaHlhbXNibGpla3JkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzNDg4NzEsImV4cCI6MjA4NTkyNDg3MX0.nCGJGZGKWKEqoYHFgKnhJFPdKJOTKdGVqJJGKWKEqoY';

async function testMatchingFlow() {
  console.log('🍵 Testing Matcha matching flow without payments...\n');

  try {
    // Test 1: Replenish matches
    console.log('1. Testing match replenishment...');
    const replenishResponse = await fetch(`${SUPABASE_URL}/functions/v1/replenish-matches`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });
    
    const replenishResult = await replenishResponse.json();
    console.log('Replenish result:', replenishResult);

    // Test 2: Expire matches
    console.log('\n2. Testing match expiration...');
    const expireResponse = await fetch(`${SUPABASE_URL}/functions/v1/expire-matches`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });
    
    const expireResult = await expireResponse.json();
    console.log('Expire result:', expireResult);

    console.log('\n✅ Basic function tests completed!');
    console.log('\nTo test the full flow:');
    console.log('1. Create two user accounts in the app');
    console.log('2. Complete questionnaires for both');
    console.log('3. Enable "in_matcha_bowl" for both users');
    console.log('4. Run replenish-matches to create matches');
    console.log('5. Use "Down to Chat" button (no payment required)');
    console.log('6. Both users opt in to create chat with AI intro');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testMatchingFlow();