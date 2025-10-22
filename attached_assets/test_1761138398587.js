require('dotenv').config();
const fetch = require('node-fetch');

const key = process.env.GOOGLE_API_KEY;
if (!key) {
  console.error('No GOOGLE_API_KEY in .env');
  process.exit(1);
}

(async () => {
  const lat = 40.7128;   // New York
  const lng = -74.0060;  // New York
  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=5000&type=pet_store&key=${key}`;
  const res = await fetch(url);
  const data = await res.json();

console.log('API status:', data.status);
if (data.error_message) console.log('Error message:', data.error_message);
console.log('Sample results:');
console.log(JSON.stringify(data.results.slice(0, 3), null, 2));
})();
