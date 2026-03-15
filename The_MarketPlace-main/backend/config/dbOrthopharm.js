const mongoose = require("mongoose");
const dbUrl = process.env.ORTHOPHARM_DB_URL;

const connectOrthopharm = async () => {
  try {
    await mongoose.createConnection(dbUrl, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log("Connected to Orthopharm DB");
  } catch (err) {
    console.error("Orthopharm DB connection error:", err);
  }
};

module.exports = connectOrthopharm;