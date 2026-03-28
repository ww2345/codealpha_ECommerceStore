require("dotenv").config();

const mongoose = require("mongoose");
const Product = require("../models/product");
const products = require("./data");
const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/ECommerceStore";

(async () => {
  await mongoose.connect(mongoUri);
  await Product.deleteMany({});
  const inserted = await Product.insertMany(products);
  console.log(`Inserted ${inserted.length} products`);
  await mongoose.connection.close();
})().catch(async (err) => {
  console.error(err);
  try {
    await mongoose.connection.close();
  } catch {}
});
