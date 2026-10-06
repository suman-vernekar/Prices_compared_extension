/**
 * PricePulse - Storage Utility
 * Provides asynchronous wrapper methods for chrome.storage.local.
 * Works seamlessly in both Service Worker (self) and Popup / Page (window) contexts.
 */

(function (root) {
  'use strict';

  const STORAGE_KEYS = {
    OBSERVED_PRODUCT: 'lastObservedProduct',
    HISTORY_LOG: 'historyLog',
    TRACKING_ENABLED: 'trackingEnabled',
    TARGET_PRICE: 'targetPrice'
  };

  const MAX_HISTORY_ITEMS = 50;

  const StorageUtil = {
    KEYS: STORAGE_KEYS,

    /**
     * Retrieve one or more keys from chrome.storage.local
     * @param {string|string[]|Object} keys
     * @returns {Promise<Object>}
     */
    get(keys) {
      return new Promise((resolve, reject) => {
        chrome.storage.local.get(keys, (result) => {
          if (chrome.runtime.lastError) {
            return reject(new Error(chrome.runtime.lastError.message));
          }
          resolve(result);
        });
      });
    },

    /**
     * Store key-value pairs into chrome.storage.local
     * @param {Object} items
     * @returns {Promise<void>}
     */
    set(items) {
      return new Promise((resolve, reject) => {
        chrome.storage.local.set(items, () => {
          if (chrome.runtime.lastError) {
            return reject(new Error(chrome.runtime.lastError.message));
          }
          resolve();
        });
      });
    },

    /**
     * Record a new price observation into history
     * @param {Object} observation
     * @returns {Promise<Object[]>} updated history list
     */
    async addObservation(observation) {
      const { [STORAGE_KEYS.HISTORY_LOG]: history = [] } = await this.get([STORAGE_KEYS.HISTORY_LOG]);

      const entry = {
        id: 'obs_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        title: observation.title || 'Untitled Product',
        rawPrice: observation.rawPrice || observation.newPrice,
        previousPrice: observation.previousPrice || null,
        url: observation.url || '',
        recordedAt: new Date().toISOString()
      };

      // Prepend newest observation and cap length to avoid storage bloat
      const updated = [entry, ...history].slice(0, MAX_HISTORY_ITEMS);

      await this.set({
        [STORAGE_KEYS.HISTORY_LOG]: updated,
        [STORAGE_KEYS.OBSERVED_PRODUCT]: entry
      });

      return updated;
    },

    /**
     * Retrieve all recorded price observations
     * @returns {Promise<Object[]>}
     */
    async getHistory() {
      const data = await this.get([STORAGE_KEYS.HISTORY_LOG]);
      return data[STORAGE_KEYS.HISTORY_LOG] || [];
    },

    /**
     * Clear all recorded price observations
     * @returns {Promise<void>}
     */
    async clearHistory() {
      await this.set({
        [STORAGE_KEYS.HISTORY_LOG]: [],
        [STORAGE_KEYS.OBSERVED_PRODUCT]: null
      });
    }
  };

  // Expose to global context (self in ServiceWorker, window in Popup)
  root.StorageUtil = StorageUtil;

})(typeof self !== 'undefined' ? self : this);
