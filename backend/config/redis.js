const Redis = require('ioredis');

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
let redisClient;
let isConnected = false;

const mockRedis = {
  get: async () => null,
  set: async () => 'OK',
  del: async () => 0,
  keys: async () => [],
  defineCommand: () => {}
};

try {
  console.log(`Connecting to Redis at: ${redisUrl}`);
  
  redisClient = new Redis(redisUrl, {
    maxRetriesPerRequest: 1,
    connectTimeout: 2000,
    enableOfflineQueue: false, 
    retryStrategy(times) {
      if (times > 1) {
        console.warn("⚠️ REDIS: Connection timed out. Operating in DEGRADED MODE (Mock client active).");
        return null; 
      }
      return 500;
    }
  });

  redisClient.on('connect', () => {
    console.log("🚀 REDIS: Connected successfully!");
    isConnected = true;
  });

  redisClient.on('error', (err) => {
    
    isConnected = false;
  });
} catch (error) {
  console.warn("⚠️ REDIS: Exception during driver initialization. Fallback enabled.");
}


const safeRedis = {
  get: async (key) => {
    if (!isConnected) return null;
    try { return await redisClient.get(key); } catch { return null; }
  },
  set: async (key, val, mode, duration) => {
    if (!isConnected) return 'OK';
    try { return await redisClient.set(key, val, mode, duration); } catch { return 'OK'; }
  },
  del: async (key) => {
    if (!isConnected) return 0;
    try { return await redisClient.del(key); } catch { return 0; }
  },
  keys: async (pattern) => {
    if (!isConnected) return [];
    try { return await redisClient.keys(pattern); } catch { return []; }
  },
  defineCommand: (name, opts) => {
    if (redisClient) {
      try { redisClient.defineCommand(name, opts); } catch {}
    }
  }
};

module.exports = safeRedis;
