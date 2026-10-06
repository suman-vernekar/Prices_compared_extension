/**
 * PricePulse - MongoDB Connection Manager
 * Manages Mongoose connection lifecycle, event hooks, and graceful shutdowns.
 */

const mongoose = require('mongoose');

let isConnected = false;

const connectDB = async () => {
  if (isConnected) {
    return;
  }

  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/pricepulse';

  try {
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000, // Fail fast if MongoDB is not reachable
    });

    isConnected = conn.connections[0].readyState === 1;
    console.log(`[MongoDB] Connected to database: ${conn.connection.name} @ ${conn.connection.host}`);

    mongoose.connection.on('error', (err) => {
      console.error('[MongoDB] Runtime connection error:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('[MongoDB] Database disconnected.');
      isConnected = false;
    });

  } catch (error) {
    console.error(`[MongoDB] Initial connection error: ${error.message}`);
    // Do not crash server in dev mode so API testing can still respond with informative errors
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
};

const disconnectDB = async () => {
  if (isConnected) {
    await mongoose.disconnect();
    isConnected = false;
    console.log('[MongoDB] Connection closed.');
  }
};

module.exports = { connectDB, disconnectDB };
