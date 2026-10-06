/**
 * PricePulse - Price Routes
 * Mounts endpoints for price observation logging.
 */

const express = require('express');
const router = express.Router();
const priceController = require('../controllers/priceController');
const { validatePriceInput } = require('../middleware/validate');

// POST /api/prices - Record incoming price observation
router.post('/', validatePriceInput, priceController.recordPrice);

module.exports = router;
