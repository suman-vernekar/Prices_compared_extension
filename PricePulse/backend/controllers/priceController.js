/**
 * PricePulse - Price Controller
 * Handles HTTP endpoints for real-time price observation logging and historical queries.
 */

const priceService = require('../services/priceService');
const { ApiError } = require('../middleware/errorHandler');

/**
 * POST /api/prices
 * Submit price observation (with duplicate suppression)
 */
const recordPrice = async (req, res, next) => {
  try {
    const { productId, price, currency, source, confidence } = req.body;

    const result = await priceService.recordPriceObservation(productId, {
      price,
      currency,
      source,
      confidence
    });

    res.status(result.isNewObservation ? 201 : 200).json({
      success: true,
      data: result
    });
  } catch (error) {
    if (error.message === 'PRODUCT_NOT_FOUND') {
      return next(new ApiError(404, 'PRODUCT_NOT_FOUND', 'Cannot record price for non-existent product.'));
    }
    next(error);
  }
};

/**
 * GET /api/products/:id/history
 * Retrieve price history with range and pagination options
 */
const getPriceHistory = async (req, res, next) => {
  try {
    const { from, to, limit, sort } = req.query;

    const result = await priceService.getProductPriceHistory(req.params.id, {
      from,
      to,
      limit,
      sort
    });

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    if (error.message === 'PRODUCT_NOT_FOUND') {
      return next(new ApiError(404, 'PRODUCT_NOT_FOUND', `Product not found with identifier: ${req.params.id}`));
    }
    next(error);
  }
};

module.exports = {
  recordPrice,
  getPriceHistory
};
