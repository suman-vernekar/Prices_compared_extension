/**
 * PricePulse - PriceHistory Mongoose Model
 * Stores append-only historical price observations for analytical charting and price-drop detection.
 */

const mongoose = require('mongoose');

const priceHistorySchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product reference is required'],
      index: true
    },
    price: {
      type: Number,
      required: [true, 'Observed price is required'],
      min: [0, 'Price must be positive']
    },
    currency: {
      type: String,
      default: 'INR',
      uppercase: true,
      trim: true
    },
    source: {
      type: String,
      enum: ['extension', 'scheduler', 'manual', 'api'],
      default: 'extension'
    },
    confidence: {
      type: Number,
      default: 1.0,
      min: 0,
      max: 1
    },
    recordedAt: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    // Append-only temporal log: no updated_at needed
    timestamps: false
  }
);

// High-performance compound index for time-series charts and range queries
priceHistorySchema.index({ productId: 1, recordedAt: -1 });

const PriceHistory = mongoose.models.PriceHistory || mongoose.model('PriceHistory', priceHistorySchema);

module.exports = PriceHistory;
