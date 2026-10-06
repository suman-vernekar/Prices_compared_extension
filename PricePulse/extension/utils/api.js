/**
 * PricePulse - Extension API Client
 * Dispatches synchronized product observations to the Node.js Express backend.
 * Handles network failures gracefully without interrupting local extension workflows.
 */

(function (root) {
  'use strict';

  const DEFAULT_API_BASE = 'http://localhost:5000/api';

  class ApiClient {
    constructor(baseUrl = DEFAULT_API_BASE) {
      this.baseUrl = baseUrl;
    }

    /**
     * Submit or upsert product metadata to backend
     * @param {Object} productData
     * @returns {Promise<Object|null>}
     */
    async syncProduct(productData) {
      try {
        const response = await fetch(`${this.baseUrl}/products`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            title: productData.title,
            url: productData.url,
            platform: productData.platform,
            productId: productData.productId,
            image: productData.image,
            price: productData.price,
            currency: productData.currency,
            source: 'extension'
          })
        });

        const data = await response.json();
        return data;
      } catch (err) {
        console.warn('[PricePulse API] Backend unreachable or sync failed (is Node.js running?):', err.message);
        return null;
      }
    }

    /**
     * Submit price observation to backend
     * @param {Object} observationData
     * @returns {Promise<Object|null>}
     */
    async syncPriceObservation(observationData) {
      try {
        const response = await fetch(`${this.baseUrl}/prices`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            productId: observationData.productId,
            price: observationData.price,
            currency: observationData.currency,
            source: 'extension',
            confidence: 1.0
          })
        });

        const data = await response.json();
        return data;
      } catch (err) {
        console.warn('[PricePulse API] Could not deliver observation to backend:', err.message);
        return null;
      }
    }
  }

  root.PricePulse = root.PricePulse || {};
  root.PricePulse.ApiClient = new ApiClient();

})(typeof self !== 'undefined' ? self : (typeof window !== 'undefined' ? window : this));
