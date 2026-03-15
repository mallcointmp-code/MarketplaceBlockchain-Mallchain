// backend/services/multisigService.js
const crypto = require("crypto");

const MultisigService = {
  requiredSignatures: 2,
  signers: ["avastaian36@gmail.com", "security@themarketplace.ai"],

  generateHash(data) {
    return crypto.createHash("sha256").update(JSON.stringify(data)).digest("hex");
  },

  async verifySignatures(transactionData, providedSignatures) {
    const hash = this.generateHash(transactionData);
    const valid = providedSignatures.filter(sig =>
      this.signers.includes(sig.email) && sig.hash === hash
    );

    if (valid.length < this.requiredSignatures) {
      throw new Error("Insufficient multisig approvals");
    }

    return true;
  },
};

module.exports = {
  MultisigService,
};
