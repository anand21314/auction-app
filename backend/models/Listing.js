const mongoose = require('mongoose');

const ListingSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  details: { type: String, default: 'No technical specs supplied.' },
  price: { type: Number, required: true, min: 0 },
  image: { type: String, required: true },
  location: { type: String, default: 'India' },
  category: { type: String, default: 'Electronics' },
  type: { type: String, enum: ['auction', 'direct'], default: 'auction' },
  status: { type: String, enum: ['active', 'closed'], default: 'active' },
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  bids: [{
    bidder: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    timestamp: { type: Date, default: Date.now }
  }],
  bidsPlaced: { type: Number, default: 0 },
  endTime: { type: Date, required: true },
  winner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  emailSent: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Listing', ListingSchema);