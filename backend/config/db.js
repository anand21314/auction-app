const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Falls back to local database instance if process.env.MONGO_URI isn't loaded yet
    const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/auction-app';
    const conn = await mongoose.connect(uri);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

// CRUCIAL FIX: Export the function directly, NOT within an object!
module.exports = connectDB;