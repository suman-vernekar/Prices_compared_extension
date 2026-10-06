/**
 * PricePulse - Express Application Factory
 * Configures security middleware, rate limiters, routes, and centralized error handling.
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const productRoutes = require('./routes/productRoutes');
const priceRoutes = require('./routes/priceRoutes');
const { errorHandler, ApiError } = require('./middleware/errorHandler');

const app = express();

// 1. Security HTTP Headers
app.use(helmet());

// 2. Cross-Origin Resource Sharing
const corsOptions = {
  origin: process.env.CLIENT_URL || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));

// 3. Rate Limiter (Protects against abuse and scrapers)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP, please try again after 15 minutes.'
    }
  }
});
app.use('/api/', limiter);

// 4. Body Parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// 5. System Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      status: 'HEALTHY',
      service: 'PricePulse API',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    }
  });
});

// 6. Mount Resource Routes
app.use('/api/products', productRoutes);
app.use('/api/prices', priceRoutes);

// 7. 404 Not Found Catch-All
app.use('*', (req, res, next) => {
  next(new ApiError(404, 'ROUTE_NOT_FOUND', `Cannot ${req.method} ${req.originalUrl}`));
});

// 8. Centralized Error Handler (Must be registered last)
app.use(errorHandler);

module.exports = app;
