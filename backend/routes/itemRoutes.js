const express = require('express');
const router = express.Router();
const { 
  getMarketplaceFeed, 
  getListingById, 
  getUserDashboard, 
  placeBid, 
  createListing 
} = require('../controllers/itemController');
const { requireAuthentication } = require('../middlewares/authMiddleware');
const uploadCloudinary = require('../config/cloudinary');


router.get('/feed', getMarketplaceFeed);
router.get('/dashboard', requireAuthentication, getUserDashboard);
router.get('/:id', getListingById);


router.post('/bid', requireAuthentication, placeBid);
router.post('/create', requireAuthentication, uploadCloudinary.single('image'), createListing);

module.exports = router;