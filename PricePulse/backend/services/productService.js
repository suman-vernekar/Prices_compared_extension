/**
 * PricePulse - Product Service
 * Business logic for catalog operations, product deduplication, and statistical analytics.
 */

const Product = require('../models/Product');
const PriceHistory = require('../models/PriceHistory');

/**
 * Upsert product by unique retailer platform + SKU
 * Guarantees zero duplicate entries across observing sessions.
 */
const upsertProduct = async (data) => {
  const { platform, productId, title, url, image, price, currency = 'INR', source = 'extension' } = data;

  let product = await Product.findOne({ platform, productId });
  let isNew = false;

  if (!product) {
    // Create new product
    product = await Product.create({
      platform,
      productId,
      title,
      url,
      image: image || '',
      currentPrice: price,
      currency,
      lastCheckedAt: new Date()
    });
    isNew = true;

    // Seed initial price observation in history
    await PriceHistory.create({
      productId: product._id,
      price,
      currency,
      source,
      recordedAt: new Date()
    });
  } else {
    // Update existing product metadata and lastCheckedAt
    product.title = title || product.title;
    product.url = url || product.url;
    if (image) product.image = image;
    product.lastCheckedAt = new Date();

    // Check if price changed (Data Consistency Rule)
    if (price !== undefined && price !== null && Math.abs(product.currentPrice - price) >= 0.01) {
      product.currentPrice = price;
      product.currency = currency || product.currency;

      await PriceHistory.create({
        productId: product._id,
        price,
        currency: product.currency,
        source,
        recordedAt: new Date()
      });
    }

    await product.save();
  }

  return { product, isNew };
};

/**
 * Retrieve product by MongoDB ID or Retailer SKU
 */
const getProductById = async (idOrSku) => {
  let product = null;

  // Try MongoDB ObjectId format
  if (/^[0-9a-fA-F]{24}$/.test(idOrSku)) {
    product = await Product.findById(idOrSku);
  }

  // Fallback to retailer SKU lookup
  if (!product) {
    product = await Product.findOne({ productId: idOrSku });
  }

  return product;
};

/**
 * Compute descriptive price statistics from historical observations
 */
const getProductStats = async (productId) => {
  const product = await getProductById(productId);
  if (!product) return null;

  const history = await PriceHistory.find({ productId: product._id }).sort({ recordedAt: 1 }).lean();

  if (!history || history.length === 0) {
    return {
      currentPrice: product.currentPrice,
      lowestPrice: product.currentPrice,
      highestPrice: product.currentPrice,
      averagePrice: product.currentPrice,
      totalObservations: 1,
      dropFromAverage: 0,
      dropFromHighest: 0
    };
  }

  const prices = history.map((h) => h.price);
  const lowestPrice = Math.min(...prices);
  const highestPrice = Math.max(...prices);
  const sum = prices.reduce((acc, curr) => acc + curr, 0);
  const averagePrice = Math.round((sum / prices.length) * 100) / 100;
  const currentPrice = product.currentPrice;

  const dropFromAverage = Math.round(((currentPrice - averagePrice) / averagePrice) * 10000) / 100;
  const dropFromHighest = Math.round(((currentPrice - highestPrice) / highestPrice) * 10000) / 100;

  return {
    productId: product._id,
    platform: product.platform,
    sku: product.productId,
    currency: product.currency,
    currentPrice,
    lowestPrice,
    highestPrice,
    averagePrice,
    totalObservations: history.length,
    dropFromAveragePercent: dropFromAverage,
    dropFromHighestPercent: dropFromHighest,
    firstObservedAt: history[0].recordedAt,
    lastObservedAt: history[history.length - 1].recordedAt
  };
};

module.exports = {
  upsertProduct,
  getProductById,
  getProductStats
};
