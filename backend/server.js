
require('dotenv').config();

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const redisClient = require('./config/redis');
const authRoutes = require('./routes/authRoutes');
const itemRoutes = require('./routes/itemRoutes');
const { resolveEndedAuctions } = require('./services/auctionService');

const app = express();
app.use(express.json());
const allowedOrigins = [
  'https://auction-app-git-main-qwertyasa21314-9356s-projects.vercel.app',
  'https://auction-app-six-plum.vercel.app'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
connectDB();


app.use('/api/auth', authRoutes);
app.use('/api/listings', itemRoutes);


app.get('/api/health-check', async (req, res) => {
  const dbStatus = mongoose.connection.readyState;
  if (dbStatus === 1) {
    return res.status(200).json({
      status: 'healthy',
      database: 'Connected to MongoDB Cluster',
      databaseName: mongoose.connection.name
    });
  } else {
    return res.status(503).json({
      status: 'unhealthy',
      database: 'Disconnected from Database'
    });
  }
});

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
app.set('wss', wss);


wss.on('connection', (ws) => {
  ws.on('message', async (message) => {
    try {
      const parsedData = JSON.parse(message);

      if (parsedData.type === 'PLACE_BID') {
        const { listingId, incrementAmount } = parsedData;
        const Listing = require('./models/Listing');

        const updatedItem = await Listing.findByIdAndUpdate(
          listingId,
          { $inc: { price: incrementAmount, bidsPlaced: 1 } },
          { new: true }
        );

        if (updatedItem) {
          const keys = await redisClient.keys('feed:*');
          if (keys.length > 0) await redisClient.del(keys);

          const broadcastPayload = JSON.stringify({
            event: 'BID_UPDATED',
            id: updatedItem._id,
            newPrice: updatedItem.price,
            details: `${updatedItem.bidsPlaced} Bids placed`
          });

          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(broadcastPayload);
            }
          });
        }
      }
    } catch (e) {
      console.error("Websocket sync processing error: ", e);
    }
  });
});


setInterval(resolveEndedAuctions, 15000);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server context operational across environment port: ${PORT}`));