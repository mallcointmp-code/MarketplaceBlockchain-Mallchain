// backend/services/kycService.js
const User = require("../models/User");
const { uploadFile } = require("../utils/fileupload");

const KycService = {
  async submitKYC(userId, files) {
    const uploadedDocs = [];
    for (const file of files) {
      const url = await uploadFile(file);
      uploadedDocs.push(url);
    }
    await User.findByIdAndUpdate(userId, { kycDocs: uploadedDocs, kycStatus: "pending" });
    return { message: "KYC documents submitted successfully", uploadedDocs };
  },

  async verifyKYC(adminEmail, userId, status) {
    if (adminEmail !== "avastaian36@gmail.com") throw new Error("Unauthorized admin");

    await User.findByIdAndUpdate(userId, { kycStatus: status });
    return { message: `KYC ${status} for user ${userId}` };
  },
};

module.exports = {
  KycService,
};
