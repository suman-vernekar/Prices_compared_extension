/**
 * PricePulse - LocalTestExtractor
 * Dedicated adapter for the deterministic local testing environment.
 */

(function (root) {
  'use strict';

  const BaseExtractor = root.PricePulse?.BaseExtractor;
  if (!BaseExtractor) {
    console.error('[LocalTestExtractor] BaseExtractor not loaded!');
    return;
  }

  class LocalTestExtractor extends BaseExtractor {
    constructor() {
      super('local-test');
    }

    matches(url) {
      if (!url) return false;
      const isLocalHost = url.includes('localhost') || url.includes('127.0.0.1') || url.startsWith('file:');
      const hasTestMarkup = !!document.querySelector('#product-price, [data-pricepulse="price"]');
      return isLocalHost && hasTestMarkup;
    }

    extractTitle() {
      const el = this.queryFirst(['#product-title', '[data-pricepulse="title"]', 'h1']);
      return el ? el.textContent : document.title || 'Local Test Product';
    }

    extractPrice() {
      const el = this.getPriceElement();
      return el ? el.textContent : null;
    }

    extractCurrency() {
      const priceText = this.extractPrice() || '';
      if (priceText.includes('₹') || priceText.includes('Rs')) return 'INR';
      if (priceText.includes('$')) return 'USD';
      if (priceText.includes('€')) return 'EUR';
      if (priceText.includes('£')) return 'GBP';
      return 'INR';
    }

    extractUrl() {
      return this.cleanUrl(window.location.href);
    }

    extractImage() {
      const el = this.queryFirst(['#product-image', '[data-pricepulse="image"]']);
      return el ? (el.src || el.getAttribute('src') || '') : '';
    }

    extractProductId() {
      // Deterministic ID for local mock product
      const title = this.extractTitle().toLowerCase();
      if (title.includes('wh-1000xm5')) return 'LOCAL-SONY-WH1000XM5';
      return 'LOCAL-TEST-ITEM-001';
    }

    getPriceElement() {
      return this.queryFirst(['#product-price', '[data-pricepulse="price"]']);
    }
  }

  root.PricePulse = root.PricePulse || {};
  root.PricePulse.LocalTestExtractor = LocalTestExtractor;

})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
