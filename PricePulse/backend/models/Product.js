/**
 * PricePulse - Product Mongoose Model
 * Stores canonical product catalog representations deduplicated by platform + productId.
 */

const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    platform: {
      type: String,
      required: [true, 'Retailer platform is required'],
      trim: true,
      lowercase: true,
      index: true
    },
    productId: {
      type: String,
      required: [true, 'Retailer product identifier is required'],
      trim: true,
      index: true
    },
    title: {
      type: String,
      required: [true, 'Product title is required'],
      trim: true
    },
    url: {
      type: String,
      required: [true, 'Product canonical URL is required'],
      trim: true
    },
    image: {
      type: String,
      default: ''
    },
    currentPrice: {
      type: Number,
      required: [true, 'Current price is required'],
      min: [0, 'Price must be positive']
    },
    currency: {
      type: String,
      default: 'INR',
      uppercase: true,
      trim: true
    },
    lastCheckedAt: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: true
  }
);

// Compound unique index ensuring no duplicate products per retailer platform
productSchema.index({ platform: 1, productId: 1 }, { unique: true });

const Product = mongoose.models.Product || mongoose.model('Product', productSchema);

module.exports = Product;
