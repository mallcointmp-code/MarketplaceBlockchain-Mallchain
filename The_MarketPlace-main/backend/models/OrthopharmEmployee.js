const mongoose = require("mongoose");

const employeeSchema = new mongoose.Schema({
  name: String,
  phone: String,
  email: String,
  fiatBalance: { type: Number, default: 0 },
  mallcoins: { type: Number, default: 0 },
  growBalance: { type: Number, default: 0 },
  rating: { type: Number, default: 0 },
  reviews: [{ type: String }]
});

module.exports = mongoose.model("OrthopharmEmployee", employeeSchema);