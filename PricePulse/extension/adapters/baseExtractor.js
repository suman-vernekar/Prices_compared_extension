/**
 * PricePulse - BaseExtractor Class
 * Abstract base adapter enforcing the contract for all ecommerce extractors.
 * Follows the Strategy Pattern to keep website parsing modular and open for extension.
 */

(function (root) {
  'use strict';

  class BaseExtractor {
    constructor(platformName = 'generic') {
      this.platform = platformName;
    }

    /**
     * Check if this extractor supports the given URL or document
     * @param {string} url
     * @returns {boolean}
     */
    matches(url) {
      throw new Error(`[${this.constructor.name}] matches(url) must be implemented.`);
    }

    /**
     * Extract product title
     * @returns {string}
     */
    extractTitle() {
      throw new Error(`[${this.constructor.name}] extractTitle() must be implemented.`);
    }

    /**
     * Extract raw unparsed price string (e.g. "₹4,999" or "$299.99")
     * @returns {string|null}
     */
    extractPrice() {
      throw new Error(`[${this.constructor.name}] extractPrice() must be implemented.`);
    }

    /**
     * Extract detected currency symbol or ISO code (e.g. "INR", "USD", "₹")
     * @returns {string}
     */
    extractCurrency() {
      return 'INR'; // Default fallback
    }

    /**
     * Extract normalized canonical product URL (stripped of affiliate and tracking params)
     * @returns {string}
     */
    extractUrl() {
      return window.location.href;
    }

    /**
     * Extract primary product image URL
     * @returns {string|null}
     */
    extractImage() {
      return null;
    }

    /**
     * Extract unique retailer product identifier (ASIN, SKU, PID, etc.)
     * Crucial for product deduplication.
     * @returns {string}
     */
    extractProductId() {
      throw new Error(`[${this.constructor.name}] extractProductId() must be implemented.`);
    }

    /**
     * Extract retailer platform name
     * @returns {string}
     */
    extractPlatform() {
      return this.platform;
    }

    /**
     * Return the specific DOM element holding the price text for MutationObserver binding
     * @returns {Element|null}
     */
    getPriceElement() {
      return null;
    }

    /**
     * Aggregate all extracted fields into the standardized Product Entity contract
     * @returns {Object}
     */
    extract() {
      const rawPrice = this.cleanText(this.extractPrice() || '');
      const defaultCurrency = this.extractCurrency();

      // Normalize using PriceParser if available
      let parsed = null;
      if (root.PricePulse?.PriceParser) {
        parsed = root.PricePulse.PriceParser.parse(rawPrice, defaultCurrency);
      }

      return {
        title: this.cleanText(this.extractTitle()),
        rawPrice,
        price: parsed?.isValid ? parsed.amount : null,
        formattedPrice: parsed?.isValid ? parsed.formatted : rawPrice,
        currency: parsed?.isValid ? parsed.currency : defaultCurrency,
        url: this.extractUrl(),
        image: this.extractImage(),
        productId: this.extractProductId(),
        platform: this.extractPlatform()
      };
    }

    // ==========================================
    // Shared Helper Utilities
    // ==========================================

    /**
     * Find first element matching an array of CSS selectors
     */
    queryFirst(selectors, root = document) {
      if (!selectors) return null;
      const list = Array.isArray(selectors) ? selectors : [selectors];
      for (const sel of list) {
        try {
          const el = root.querySelector(sel);
          if (el) return el;
        } catch (e) {
          // Ignore invalid selector syntax
        }
      }
      return null;
    }

    /**
     * Strip excess whitespace and newlines from extracted text
     */
    cleanText(str) {
      if (!str) return '';
      return str.replace(/\s+/g, ' ').trim();
    }

    /**
     * Clean tracking parameters (utm_*, ref, etc.) from product URLs
     */
    cleanUrl(rawUrl) {
      try {
        const parsed = new URL(rawUrl);
        const paramsToDelete = [];
        for (const key of parsed.searchParams.keys()) {
          if (key.startsWith('utm_') || key.startsWith('ref') || key === 'tag' || key === 'pf_rd_r') {
            paramsToDelete.push(key);
          }
        }
        paramsToDelete.forEach(p => parsed.searchParams.delete(p));
        return parsed.origin + parsed.pathname + (parsed.search ? parsed.search : '');
      } catch (e) {
        return rawUrl;
      }
    }
  }

  // Namespace under PricePulse globals
  root.PricePulse = root.PricePulse || {};
  root.PricePulse.BaseExtractor = BaseExtractor;

})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
