/**
 * PricePulse - Request Validation Middleware
 * Validates request schemas and sanitizes input data.
 */

const { ApiError } = require('./errorHandler');

/**
 * Validate product creation/upsert payload
 */
const validateProductInput = (req, res, next) => {
  const { title, url, platform, productId, price } = req.body;

  if (!title || typeof title !== 'string' || !title.trim()) {
    return next(new ApiError(400, 'INVALID_PRODUCT_TITLE', 'Product title is required.'));
  }

  if (!url || typeof url !== 'string' || !url.trim()) {
    return next(new ApiError(400, 'INVALID_PRODUCT_URL', 'Product URL is required.'));
  }

  try {
    new URL(url);
  } catch (e) {
    return next(new ApiError(400, 'MALFORMED_PRODUCT_URL', 'Valid product URL is required.'));
  }

  if (!platform || typeof platform !== 'string' || !platform.trim()) {
    return next(new ApiError(400, 'INVALID_PLATFORM', 'Retailer platform is required.'));
  }

  if (!productId || typeof productId !== 'string' || !productId.trim()) {
    return next(new ApiError(400, 'INVALID_PRODUCT_ID', 'Retailer product identifier is required.'));
  }

  if (price !== undefined && price !== null) {
    const numPrice = Number(price);
    if (isNaN(numPrice) || numPrice <= 0) {
      return next(new ApiError(400, 'INVALID_PRICE_VALUE', 'Product price must be a positive number.'));
    }
  }

  next();
};

/**
 * Validate price observation payload
 */
const validatePriceInput = (req, res, next) => {
  const { productId, price } = req.body;

  if (!productId || typeof productId !== 'string' || !productId.trim()) {
    return next(new ApiError(400, 'MISSING_PRODUCT_ID', 'Product ID is required for price observation.'));
  }

  const numPrice = Number(price);
  if (price === undefined || price === null || isNaN(numPrice) || numPrice <= 0) {
    return next(new ApiError(400, 'INVALID_PRICE', 'Valid positive price amount is required.'));
  }

  next();
};

module.exports = {
  validateProductInput,
  validatePriceInput
};
