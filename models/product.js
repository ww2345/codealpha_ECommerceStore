const mongoose = require("mongoose");

const { Schema } = mongoose;

const ProductSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: "" },
    price: { type: Number, required: true, min: 0 },
    category: { type: String, trim: true, default: "" },
    imageUrls: { type: [String], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", ProductSchema);
