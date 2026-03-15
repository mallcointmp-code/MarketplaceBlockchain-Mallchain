const mongoose = require("mongoose");

const RefreshTokenSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    token: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now },
    replacedByToken: { type: String }, // For token rotation
    revokedAt: { type: Date },
});

RefreshTokenSchema.virtual("isExpired").get(function () {
    return Date.now() >= this.expiresAt;
});

RefreshTokenSchema.virtual("isActive").get(function () {
    return !this.revokedAt && !this.isExpired;
});

module.exports = mongoose.model("RefreshToken", RefreshTokenSchema);
