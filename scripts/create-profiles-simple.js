// Simplified script - creates profiles via SQL and shows matching
// This will create the profiles, then we'll use the Edge Function to show matching

const testProfiles = [
  { name: 'Sarah Chen', email: 'sarah.tech@test.com', age: 28, city: 'San Francisco', lat: 37.7749, lng: -122.4194, gender: 'Female', pronouns: 'She/Her', relationship_status: 'Single', has_kids: 'No' },
  { name: 'Mike Rodriguez', email: 'mike.music@test.com', age: 32, city: 'Oakland', lat: 37.8044, lng: -122.2712, gender: 'Male', pronouns: 'He/Him', relationship_status: 'In a relationship', has_kids: 'No' },
  { name: 'Jessica Kim', email: 'jessica.parent@test.com', age: 35, city: 'Berkeley', lat: 37.8715, lng: -122.2730, gender: 'Female', pronouns: 'She/Her', relationship_status: 'Married', has_kids: 'Yes' },
  { name: 'David Thompson', email: 'david.outdoor@test.com', age: 29, city: 'Mill Valley', lat: 37.9060, lng: -122.5449, gender: 'Male', pronouns: 'He/Him', relationship_status: 'Single', has_kids: 'No' },
  { name: 'Emma Williams', email: 'emma.creative@test.com', age: 26, city: 'San Francisco', lat: 37.7849, lng: -122.4094, gender: 'Female', pronouns: 'She/Her', relationship_status: 'Single', has_kids: 'No' },
  { name: 'Alex Martinez', email: 'alex.finance@test.com', age: 31, city: 'San Francisco', lat: 37.7749, lng: -122.4194, gender: 'Non-binary', pronouns: 'They/Them', relationship_status: 'Single', has_kids: 'No' },
  { name: 'Chris Anderson', email: 'chris.student@test.com', age: 22, city: 'Berkeley', lat: 37.8715, lng: -122.2730, gender: 'Male', pronouns: 'He/Him', relationship_status: 'Single', has_kids: 'No' },
  { name: 'Lisa Patel', email: 'lisa.yoga@test.com', age: 30, city: 'San Francisco', lat: 37.7749, lng: -122.4194, gender: 'Female', pronouns: 'She/Her', relationship_status: 'Single', has_kids: 'No' },
  { name: 'James Wilson', email: 'james.retired@test.com', age: 68, city: 'Sausalito', lat: 37.8591, lng: -122.4853, gender: 'Male', pronouns: 'He/Him', relationship_status: 'Married', has_kids: 'Yes' },
  { name: 'Maria Garcia', email: 'maria.foodie@test.com', age: 27, city: 'San Francisco', lat: 37.7749, lng: -122.4194, gender: 'Female', pronouns: 'She/Her', relationship_status: 'Single', has_kids: 'No' },
];

console.log('Test profiles to create:');
testProfiles.forEach((p, i) => {
  console.log(`${i + 1}. ${p.name} (${p.age}, ${p.city})`);
});

console.log('\nThis script will need to be run with proper Supabase admin access.');
console.log('For now, I\'ll create the profiles via MCP SQL directly...');
