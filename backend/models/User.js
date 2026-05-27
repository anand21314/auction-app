const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username parameter is required'],
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email parameter is required'],
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: [true, 'Password parameter is required']
  },
  phone: {
    type: String,
    default: ''
  },
  profilePicture: {
    type: String,
    default: ''
  }
}, { timestamps: true });

// FIXED: Removed the 'next' parameter and next() callbacks to align with modern Mongoose specs
UserSchema.pre('save', async function () {
  if (!this.isModified('password')) return;

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  } catch (err) {
    throw err; // Directly throwing the error tells Mongoose to abort the database save safely
  }
});

module.exports = mongoose.model('User', UserSchema);