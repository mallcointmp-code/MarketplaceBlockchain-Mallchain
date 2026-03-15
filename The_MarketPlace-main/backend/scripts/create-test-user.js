const dotenv = require('dotenv');
const connectDB = require('../config/db.js');
const User = require('../models/User.js');

dotenv.config();

async function main() {
  const MONGO = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/the_market_place_test';
  await connectDB(MONGO);

  const email = process.env.TEST_USER_EMAIL || 'testuser@example.com';
  const phone = process.env.TEST_USER_PHONE || '+254700000001';
  const fullName = process.env.TEST_USER_FULLNAME || 'Test User';
  const countryCode = process.env.TEST_USER_COUNTRY || 'KE';
  const password = process.env.TEST_USER_PASSWORD || 'password123';

  let user = await User.findOne({ email }).catch(()=>null);
  if (!user) {
    user = new User({ fullName, email, phone, countryCode, password });
    await user.save();
    console.log('Created user:', user._id.toString());
  } else {
    console.log('Found user:', user._id.toString());
  }
  console.log('USER_ID=' + user._id.toString());
}

main().catch(e => { console.error(e); process.exit(1); });

module.exports = { dotenv, connectDB, User, MONGO, email, phone, fullName, countryCode, password };