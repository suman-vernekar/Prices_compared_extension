/**
 * PricePulse - Price Service
 * Implements Section 16 Data Consistency Rule:
 * Compares incoming observations against stored prices and suppresses duplicate history writes.
 */

const Product = require('../models/Product');
const PriceHistory = require('../models/PriceHistory');
const { getProductById } = require('./productService');

/**
 * Record a price observation with strict deduplication
 */
const recordPriceObservation = async (productIdOrSku, priceData) => {
  const product = await getProductById(productIdOrSku);
  if (!product) {
    throw new Error('PRODUCT_NOT_FOUND');
  }

  const newPrice = Number(priceData.price);
  const oldPrice = product.currentPrice;
  const source = priceData.source || 'extension';
  const confidence = priceData.confidence !== undefined ? Number(priceData.confidence) : 1.0;

  // Data Consistency Rule: Check if price changed meaningfully
  const isDifferent = Math.abs(oldPrice - newPrice) >= 0.01;

  if (!isDifferent) {
    // Refresh lastCheckedAt without creating redundant history records
    product.lastCheckedAt = new Date();
    await product.save();

    return {
      isNewObservation: false,
      reason: 'PRICE_IDENTICAL_DUPLICATE_SUPPRESSED',
      productId: product._id,
      currentPrice: oldPrice,
      lastCheckedAt: product.lastCheckedAt
    };
  }

  // Price changed: insert new temporal observation
  const historyEntry = await PriceHistory.create({
    productId: product._id,
    price: newPrice,
    currency: priceData.currency || product.currency,
    source,
    confidence,
    recordedAt: new Date()
  });

  // Calculate delta
  const diff = newPrice - oldPrice;
  const dropAmount = Math.round(Math.abs(diff) * 100) / 100;
  const percentageChange = Math.round(((newPrice - oldPrice) / oldPrice) * 10000) / 100;

  // Update product's currentPrice
  product.currentPrice = newPrice;
  if (priceData.currency) product.currency = priceData.currency;
  product.lastCheckedAt = new Date();
  await product.save();

  return {
    isNewObservation: true,
    productId: product._id,
    oldPrice,
    newPrice,
    currency: product.currency,
    dropAmount: diff < 0 ? dropAmount : 0,
    increaseAmount: diff > 0 ? dropAmount : 0,
    percentageChange,
    isDrop: diff < 0,
    recordedAt: historyEntry.recordedAt,
    historyId: historyEntry._id
  };
};

/**
 * Query historical observations with pagination and date range filters
 */
const getProductPriceHistory = async (productIdOrSku, options = {}) => {
  const product = await getProductById(productIdOrSku);
  if (!product) {
    throw new Error('PRODUCT_NOT_FOUND');
  }

  const { from, to, limit = 50, sort = -1 } = options;
  const query = { productId: product._id };

  if (from || to) {
    query.recordedAt = {};
    if (from) query.recordedAt.$gte = new Date(from);
    if (to) query.recordedAt.$lte = new Date(to);
  }

  const history = await PriceHistory.find(query)
    .sort({ recordedAt: Number(sort) })
    .limit(Math.min(Number(limit), 500))
    .lean();

  return {
    productId: product._id,
    title: product.title,
    currentPrice: product.currentPrice,
    currency: product.currency,
    count: history.length,
    history
  };
};

module.exports = {
  recordPriceObservation,
  getProductPriceHistory
};
