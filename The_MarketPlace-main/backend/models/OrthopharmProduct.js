const mongoose = require("mongoose");

const orthopharmProductSchema = new mongoose.Schema({
  name: String,
  category: String,
  useCase: String, // e.g., "screws for knees"
  price: Number,
  stock: Number,
  description: String,
  flashSale: { type: Boolean, default: false },
  flashSalePrice: Number,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("OrthopharmProduct", orthopharmProductSchema);