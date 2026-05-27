const express = require('express');
const router = express.Router();
const { signUpUser, logInUser, updateProfile } = require('../controllers/authController');
const { requireAuthentication } = require('../middlewares/authMiddleware');
const uploadCloudinary = require('../config/cloudinary');

router.post('/signup', signUpUser);
router.post('/login', logInUser);
router.post('/profile/update', requireAuthentication, uploadCloudinary.single('profilePicture'), updateProfile);

module.exports = router;