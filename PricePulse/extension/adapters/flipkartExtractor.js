/**
 * PricePulse - FlipkartExtractor Class
 * Handles extraction and canonicalization for Flipkart ecommerce storefronts.
 */

(function (root) {
  'use strict';

  const BaseExtractor = root.PricePulse?.BaseExtractor;
  if (!BaseExtractor) {
    console.error('[FlipkartExtractor] BaseExtractor not loaded!');
    return;
  }

  class FlipkartExtractor extends BaseExtractor {
    constructor() {
      super('flipkart');
    }

    matches(url) {
      if (!url) return false;
      const isFlipkart = /flipkart\.com/i.test(url);
      const isProduct = /\/p\//i.test(url) || url.includes('pid=') || !!document.querySelector('div._30jeq3, div.Nx9bqj');
      return isFlipkart && isProduct;
    }

    extractTitle() {
      const el = this.queryFirst([
        'h1._6EBuvT',
        'span.B_NuCI',
        'h1.VU-ZEz',
        '.product-details h1',
        'h1'
      ]);
      return el ? el.textContent : document.title;
    }

    extractPrice() {
      const el = this.getPriceElement();
      return el ? el.textContent : null;
    }

    extractCurrency() {
      return 'INR';
    }

    extractProductId() {
      try {
        const parsed = new URL(window.location.href);
        const pid = parsed.searchParams.get('pid');
        if (pid) return pid.toUpperCase();
      } catch (e) {}

      // Fallback: match from canonical link
      const canonical = document.querySelector('link[rel="canonical"]');
      if (canonical && canonical.href) {
        try {
          const cUrl = new URL(canonical.href);
          const cPid = cUrl.searchParams.get('pid');
          if (cPid) return cPid.toUpperCase();
        } catch (e) {}
      }

      return 'FLIPKART-UNKNOWN';
    }

    extractUrl() {
      const pid = this.extractProductId();
      if (pid && pid !== 'FLIPKART-UNKNOWN') {
        return `https://www.flipkart.com/product/p/item?pid=${pid}`;
      }
      return this.cleanUrl(window.location.href);
    }

    extractImage() {
      const el = this.queryFirst([
        'img.DByuf4',
        'img._396cs4._2amPTt',
        '._3kidHg img',
        'img[loading="eager"]'
      ]);
      return el ? (el.src || el.getAttribute('src') || '') : '';
    }

    getPriceElement() {
      return this.queryFirst([
        'div.Nx9bqj.CxhGGd',
        'div._30jeq3._16Jk6d',
        'div._30jeq3',
        '.price-container .final-price'
      ]);
    }
  }

  root.PricePulse = root.PricePulse || {};
  root.PricePulse.FlipkartExtractor = FlipkartExtractor;

})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
