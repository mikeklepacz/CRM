require('dotenv').config();
console.log('Your API key is:', process.env.GOOGLE_API_KEY ? 'LOADED' : 'MISSING');
