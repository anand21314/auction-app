const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');


exports.signUpUser = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    console.log("--> Inbound Signup Data payload:", req.body);

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Missing field keys. Please fill out all forms.' });
    }

    let userExists = await User.findOne({ email: email.toLowerCase() });
    if (userExists) {
      return res.status(400).json({ error: 'Identity matching this email already exists' });
    }

    const newUser = await User.create({ username, email, password });
    console.log("--> Document written to MongoDB Atlas successfully:", newUser._id);

    const token = jwt.sign(
      { id: newUser._id }, 
      process.env.JWT_SECRET || 'dev_secret_override', 
      { expiresIn: '24h' }
    );

    return res.status(201).json({ 
      success: true, 
      token, 
      user: { id: newUser._id, username: newUser.username } 
    });

  } catch (err) {
    console.error("CRITICAL REGISTRATION DATABASE EXCEPTION:", err);
    return res.status(500).json({ error: 'Signup pipeline error context exception', details: err.message });
  }
};


exports.logInUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log("--> Inbound Login Request:", req.body);

    if (!email || !password) {
      return res.status(400).json({ error: 'Please provide both email and password parameters' });
    }

    
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ error: 'No user matches this profile footprint' });
    }

    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid authentication credentials' });
    }

    
    const token = jwt.sign(
      { id: user._id }, 
      process.env.JWT_SECRET || 'dev_secret_override', 
      { expiresIn: '24h' }
    );

    console.log(`--> User authenticated successfully: ${user.username}`);

    return res.status(200).json({ 
      success: true, 
      token, 
      user: { id: user._id, username: user.username } 
    });

  } catch (err) {
    console.error("CRITICAL AUTHENTICATION LOGIN EXCEPTION:", err);
    return res.status(500).json({ error: 'Login pipeline error context exception', details: err.message });
  }
};


exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { phone } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User footprint not found' });
    }

    if (phone !== undefined) {
      user.phone = phone;
    }

    if (req.file && req.file.path) {
      user.profilePicture = req.file.path;
    }

    await user.save();
    console.log(`--> Profile updated successfully for user: ${user.username}`);

    return res.status(200).json({
      success: true,
      message: 'Profile metrics updated successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        phone: user.phone || '',
        profilePicture: user.profilePicture || ''
      }
    });
  } catch (err) {
    console.error("CRITICAL PROFILE UPDATE DATABASE EXCEPTION:", err);
    return res.status(500).json({ error: 'Profile update pipeline error context exception', details: err.message });
  }
};