/**
 * PricePulse - Server Entrypoint
 * Boots HTTP listener, connects to database, and handles process termination.
 */

require('dotenv').config();

const app = require('./app');
const { connectDB, disconnectDB } = require('./config/db');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  // Connect database
  await connectDB();

  // Start HTTP listener
  const server = app.listen(PORT, () => {
    console.log(`\n==================================================`);
    console.log(`⚡ PricePulse Backend Service Active!`);
    console.log(`🌐 Listening on: http://localhost:${PORT}`);
    console.log(`📡 Health endpoint: http://localhost:${PORT}/api/health`);
    console.log(`📦 Products API: http://localhost:${PORT}/api/products`);
    console.log(`💰 Prices API: http://localhost:${PORT}/api/prices`);
    console.log(`==================================================\n`);
  });

  // Graceful shutdown
  const gracefulShutdown = async (signal) => {
    console.log(`\n[Process] Received ${signal}. Initiating graceful shutdown...`);
    server.close(async () => {
      console.log('[Server] HTTP listener closed.');
      await disconnectDB();
      process.exit(0);
    });

    // Force shutdown after 10s timeout
    setTimeout(() => {
      console.error('[Process] Forcing shutdown after timeout.');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
};

startServer();
