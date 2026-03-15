const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// Add notification settings to user schema
const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  username: { type: String, required: true, unique: true, trim: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true, unique: true },
  countryCode: { type: String, required: true },
  idNumber: { type: String, unique: true, sparse: true }, // National ID for verification
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ["buyer", "seller", "creator", "delivery", "admin", "superadmin"],
    default: "buyer",
  },
  avatar: { type: String },
  agentId: { type: mongoose.Schema.Types.ObjectId, ref: "DeliveryAgent", required: false },
  badgeOwned: { type: Boolean, default: false },
  referralCode: { type: String },
  referredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  referrals: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  socialRewards: [{ type: String }], // e.g., ["share", "invite", "review"]
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  walletAddress: { type: String }, // Linked wallet address
  notificationSettings: {
    email: { type: Boolean, default: true },
    push: { type: Boolean, default: true },
    sms: { type: Boolean, default: false },
    whatsapp: { type: Boolean, default: false },
    categories: [{ type: String, enum: ["wallet", "market", "system", "social"] }]
  },
  preferences: {
    theme: { type: String, enum: ['light', 'dark', 'auto'], default: 'dark' },
    accentColor: { type: String, default: 'indigo' },
    fontSize: { type: String, enum: ['small', 'medium', 'large'], default: 'medium' },
    reducedMotion: { type: Boolean, default: false },
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
      marketing: { type: Boolean, default: false }
    },
    privacy: {
      profileVisibility: { type: String, enum: ['public', 'friends', 'private'], default: 'public' },
      showEmail: { type: Boolean, default: false },
      showPhone: { type: Boolean, default: false },
      activityStatus: { type: Boolean, default: true }
    }
  },
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date }
});

userSchema.index({ referralCode: 1 }, { unique: true, sparse: true });
userSchema.index({ walletAddress: 1 }, { unique: true, sparse: true });

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Method to compare password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
