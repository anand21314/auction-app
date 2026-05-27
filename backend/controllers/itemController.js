const Listing = require('../models/Listing');
const User = require('../models/User');
const redisClient = require('../config/redis');
const WebSocket = require('ws');


exports.getMarketplaceFeed = async (req, res) => {
  try {
    const { search, category, type, sort } = req.query;

    
    const cacheKey = `feed:${search || ''}:${category || ''}:${type || ''}:${sort || ''}`;
    
    
    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        console.log("🚀 REDIS: Feed Cache Hit!");
        return res.status(200).json(JSON.parse(cached));
      }
    } catch (cacheErr) {
      console.warn("REDIS Cache retrieval failed, falling back to database query:", cacheErr.message);
    }

    
    const query = { status: 'active' };

    
    if (search && search.trim() !== '') {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { details: { $regex: search, $options: 'i' } }
      ];
    }

    
    if (category && category !== 'All Categories') {
      query.category = category;
    }

    
    if (type === 'Auctions Only') {
      query.type = 'auction';
    } else if (type === 'Buy It Now') {
      query.type = 'direct';
    }

    
    let sortOption = { createdAt: -1 }; 
    if (sort === 'Ending Soonest') {
      sortOption = { endTime: 1 };
      query.endTime = { $gt: new Date() }; 
    } else if (sort === 'Price: Low to High') {
      sortOption = { price: 1 };
    } else if (sort === 'Price: High to Low') {
      sortOption = { price: -1 };
    }

    const listings = await Listing.find(query)
      .populate('seller', 'username')
      .sort(sortOption)
      .limit(50);

    
    try {
      await redisClient.set(cacheKey, JSON.stringify(listings), 'EX', 60);
      console.log("💾 REDIS: Feed Cache Written successfully");
    } catch (cacheErr) {
      console.warn("Failed to write to Redis cache:", cacheErr.message);
    }

    return res.status(200).json(listings);
  } catch (error) {
    console.error("GET FEED CONTROLLER ERROR:", error);
    return res.status(500).json({ error: 'Failed to fetch marketplace feed context' });
  }
};


exports.getListingById = async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id)
      .populate('seller', 'username')
      .populate('bids.bidder', 'username');

    if (!listing) {
      return res.status(404).json({ error: 'Item not found in current marketplace logs' });
    }

    
    if (listing.status === 'active' && listing.endTime < new Date()) {
      listing.status = 'closed';
      await listing.save();
    }

    return res.status(200).json(listing);
  } catch (error) {
    console.error("GET LISTING BY ID ERROR:", error);
    return res.status(500).json({ error: 'Failed to read detailed product registry parameters' });
  }
};


exports.getUserDashboard = async (req, res) => {
  try {
    const userId = req.user.id;
    const userDoc = await User.findById(userId).select('-password');

    
    const myListings = await Listing.find({ seller: userId })
      .populate('seller', 'username')
      .sort({ createdAt: -1 });

    
    const activeBidsListings = await Listing.find({
      'bids.bidder': userId,
      status: 'active'
    }).populate('bids.bidder', 'username');

    
    const biddingHistory = activeBidsListings.map(listing => {
      
      const sortedBids = [...listing.bids].sort((a, b) => b.amount - a.amount);
      const isHighestBidder = sortedBids.length > 0 && sortedBids[0].bidder._id.toString() === userId.toString();
      
      
      const userBids = listing.bids.filter(b => b.bidder._id.toString() === userId.toString());
      const maxUserBid = userBids.length > 0 ? Math.max(...userBids.map(b => b.amount)) : listing.price;

      return {
        _id: listing._id,
        title: listing.title,
        price: listing.price,
        image: listing.image,
        location: listing.location,
        type: listing.type,
        status: isHighestBidder ? 'winning' : 'outbid',
        myBidAmount: maxUserBid,
        endTime: listing.endTime
      };
    });

    
    const closedAuctions = await Listing.find({
      status: 'closed',
      'bids.bidder': userId
    }).populate('bids.bidder', 'username');

    const wonItems = [];
    let spentAmount = 0;

    for (const listing of closedAuctions) {
      const sortedBids = [...listing.bids].sort((a, b) => b.amount - a.amount);
      if (sortedBids.length > 0 && sortedBids[0].bidder._id.toString() === userId.toString()) {
        wonItems.push(listing);
        spentAmount += sortedBids[0].amount;
      }
    }

    
    const totalListed = myListings.length;
    const activeBids = biddingHistory.length;
    const wonCount = wonItems.length;

    return res.status(200).json({
      success: true,
      user: userDoc ? {
        id: userDoc._id,
        username: userDoc.username,
        email: userDoc.email,
        phone: userDoc.phone || '',
        profilePicture: userDoc.profilePicture || ''
      } : null,
      myListings,
      biddingHistory,
      wonItems,
      telemetry: {
        totalListed,
        activeBids,
        spentAmount,
        wonCount
      }
    });
  } catch (error) {
    console.error("GET DASHBOARD CONTROLLER ERROR:", error);
    return res.status(500).json({ error: 'Failed to aggregate secure telemetry reports' });
  }
};


exports.placeBid = async (req, res) => {
  try {
    const { listingId, amount } = req.body;
    const userId = req.user.id;

    if (!listingId || !amount) {
      return res.status(400).json({ error: "Missing required bid submission parameters" });
    }

    const listing = await Listing.findById(listingId);
    if (!listing) {
      return res.status(404).json({ error: "Target auction system index offline" });
    }

    
    if (listing.seller.toString() === userId.toString()) {
      return res.status(400).json({ error: "Sellers cannot participate in their own auctions." });
    }

    
    if (listing.status === 'closed' || listing.endTime < new Date()) {
      if (listing.status === 'active') {
        listing.status = 'closed';
        await listing.save();
      }
      return res.status(400).json({ error: "Auction terminal closed. Bids rejected." });
    }

    
    if (amount <= listing.price) {
      return res.status(400).json({ error: `Bid must be higher than current price (current: ₹${listing.price})` });
    }

    
    listing.bids.push({ bidder: userId, amount: Number(amount) });
    listing.price = Number(amount);
    listing.bidsPlaced += 1;
    await listing.save();

    
    try {
      const keys = await redisClient.keys('feed:*');
      if (keys.length > 0) {
        await redisClient.del(keys);
        console.log("🧹 REDIS: Cleared feed cache entries post bid");
      }
    } catch (cacheErr) {
      console.warn("Failed to clear Redis feed cache post-bid:", cacheErr.message);
    }

    
    const wss = req.app.get('wss');
    if (wss) {
      const broadcastPayload = JSON.stringify({
        event: 'BID_UPDATED',
        id: listing._id,
        newPrice: listing.price,
        details: `${listing.bidsPlaced} Bids placed`
      });

      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(broadcastPayload);
        }
      });
    }

    return res.status(200).json({ 
      success: true, 
      newPrice: listing.price, 
      bidsPlaced: listing.bidsPlaced 
    });

  } catch (error) {
    console.error("PLACE BID CONTROLLER ERROR:", error);
    return res.status(500).json({ error: "Bidding registry exception. Transaction aborted." });
  }
};


exports.createListing = async (req, res) => {
  try {
    const { title, price, details, category, type, location, durationHours } = req.body;
    const userId = req.user.id;

    if (!title || !price) {
      return res.status(400).json({ error: "Missing title or base starting price credentials" });
    }

    
    const hours = Number(durationHours) || 24;
    const endTime = new Date(Date.now() + hours * 60 * 60 * 1000);

    
    const imageUrl = req.file 
      ? req.file.path 
      : 'https://placehold.co/600x400/000000/00ff66?text=Velocity+Item';

    const newListing = await Listing.create({
      title,
      price: Number(price),
      details: details || 'No technical specifications supplied.',
      category: category || 'Electronics',
      type: type || 'auction',
      location: location || 'Bengaluru, India',
      endTime,
      image: imageUrl,
      seller: userId
    });

    
    try {
      const keys = await redisClient.keys('feed:*');
      if (keys.length > 0) {
        await redisClient.del(keys);
        console.log("🧹 REDIS: Cleared feed cache entries post listing create");
      }
    } catch (cacheErr) {
      console.warn("Failed to clear Redis feed cache post-creation:", cacheErr.message);
    }

    return res.status(201).json({
      success: true,
      listing: newListing
    });
  } catch (error) {
    console.error("CREATE LISTING CONTROLLER ERROR:", error);
    return res.status(500).json({ error: "Failed to compile listing credentials on Atlas clusters" });
  }
};