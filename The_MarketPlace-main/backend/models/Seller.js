const mongoose = require("mongoose");

const SellerSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    shopName: { type: String, required: true },
    products: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
    rating: { type: Number, default: 0 },
    deliveryOptions: [{ type: String }], // e.g., standard, express
  },
  { timestamps: true }
);

module.exports = mongoose.model("Seller", SellerSchema);
