/**
 * PricePulse - Product Routes
 * Mounts endpoints for catalog management, historical data, and statistics.
 */

const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const priceController = require('../controllers/priceController');
const { validateProductInput } = require('../middleware/validate');

// POST /api/products - Create or update product
router.post('/', validateProductInput, productController.createOrUpdateProduct);

// GET /api/products/:id - Retrieve product details
router.get('/:id', productController.getProduct);

// GET /api/products/:id/stats - Retrieve analytical statistics
router.get('/:id/stats', productController.getProductStats);

// GET /api/products/:id/history - Retrieve price history observations
router.get('/:id/history', priceController.getPriceHistory);

module.exports = router;
