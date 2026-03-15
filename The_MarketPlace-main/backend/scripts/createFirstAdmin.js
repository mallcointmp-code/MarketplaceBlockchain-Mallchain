require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");
const Wallet = require("../models/Wallet");

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/marketplace";

async function createAdmin() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log("Connected to MongoDB");

        const email = "admin@artcafe.com";
        const password = "adminPassword123!"; // Change this after login!
        const username = "SuperAdmin12";

        // Check if exists
        let admin = await User.findOne({ email });
        if (admin) {
            console.log("Admin user already exists:", email);
            if (admin.role !== 'admin') {
                admin.role = 'admin';
                await admin.save();
                console.log("Updated existing user to admin role.");
            }
            process.exit(0);
        }

        // Create new admin
        admin = await User.create({
            fullName: "System Administrator",
            username,
            email,
            password, // Pre-save hook will hash this
            phone: "+254710000000",
            countryCode: "KE",
            role: "admin",
            isActive: true,
            referralCode: "ADMIN-" + Date.now()
        });

        // Create wallet
        await Wallet.create({
            ownerId: admin._id,
            mallmoney: 1000000, // Seed with funds for testing
            mallcoins: 1000000,
            mallpoints: 1000000
        });

        console.log("✅ Admin account created successfully!");
        console.log("Email:", email);
        console.log("Password:", password);
        console.log("PLEASE CHANGE PASSWORD IMMEDIATELY AFTER LOGIN");

        process.exit(0);
    } catch (err) {
        console.error("Failed to create admin:", err);
        process.exit(1);
    }
}

createAdmin();
