/**
 * PricePulse - Product Controller
 * Handles HTTP endpoints for product catalog management and price statistics.
 */

const productService = require('../services/productService');
const { ApiError } = require('../middleware/errorHandler');

/**
 * POST /api/products
 * Create or update product observation
 */
const createOrUpdateProduct = async (req, res, next) => {
  try {
    const { product, isNew } = await productService.upsertProduct(req.body);

    res.status(isNew ? 201 : 200).json({
      success: true,
      data: product,
      isNew
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/products/:id
 * Retrieve product by MongoDB ID or Retailer SKU
 */
const getProduct = async (req, res, next) => {
  try {
    const product = await productService.getProductById(req.params.id);

    if (!product) {
      return next(new ApiError(404, 'PRODUCT_NOT_FOUND', `Product not found with identifier: ${req.params.id}`));
    }

    res.status(200).json({
      success: true,
      data: product
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/products/:id/stats
 * Retrieve historical price statistics (lowest, highest, average, drop percentages)
 */
const getProductStats = async (req, res, next) => {
  try {
    const stats = await productService.getProductStats(req.params.id);

    if (!stats) {
      return next(new ApiError(404, 'PRODUCT_NOT_FOUND', `Product not found with identifier: ${req.params.id}`));
    }

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createOrUpdateProduct,
  getProduct,
  getProductStats
};
