const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID || '',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  callbackURL: (process.env.BACKEND_URL || 'http://localhost:4000') + '/api/auth/google/callback'
}, function(accessToken, refreshToken, profile, cb) {
  // For simplicity, pass profile through; controller will find/create User
  cb(null, profile);
}));

passport.serializeUser(function(user, done) { done(null, user); });
passport.deserializeUser(function(obj, done) { done(null, obj); });
