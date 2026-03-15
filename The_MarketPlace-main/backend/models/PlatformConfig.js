const mongoose = require('mongoose');

const PlatformConfigSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: { type: mongoose.Schema.Types.Mixed }
});

module.exports = mongoose.models.PlatformConfig || mongoose.model('PlatformConfig', PlatformConfigSchema);
