/**
 * PricePulse - AmazonExtractor Class
 * Handles extraction and canonicalization for Amazon ecommerce storefronts.
 */

(function (root) {
  'use strict';

  const BaseExtractor = root.PricePulse?.BaseExtractor;
  if (!BaseExtractor) {
    console.error('[AmazonExtractor] BaseExtractor not loaded!');
    return;
  }

  class AmazonExtractor extends BaseExtractor {
    constructor() {
      super('amazon');
    }

    matches(url) {
      if (!url) return false;
      const isAmazonDomain = /amazon\.(in|com|co\.uk|de|ca|co\.jp|fr)/i.test(url);
      const isProductPage = /\/(dp|gp\/product)\/[A-Z0-9]{10}/i.test(url) || !!document.querySelector('#productTitle, #ASIN');
      return isAmazonDomain && isProductPage;
    }

    extractTitle() {
      const el = this.queryFirst(['#productTitle', '#title', '#title_feature_div h1']);
      return el ? el.textContent : document.title;
    }

    extractPrice() {
      const el = this.getPriceElement();
      return el ? el.textContent : null;
    }

    extractCurrency() {
      const symbolEl = this.queryFirst([
        '#corePrice_feature_div .a-price-symbol',
        '#apex_desktop .a-price-symbol',
        '.a-price-symbol'
      ]);
      const symbol = symbolEl ? symbolEl.textContent.trim() : '';
      if (symbol === '₹') return 'INR';
      if (symbol === '$') return 'USD';
      if (symbol === '€') return 'EUR';
      if (symbol === '£') return 'GBP';

      const priceText = this.extractPrice() || '';
      if (priceText.includes('₹') || priceText.includes('Rs')) return 'INR';
      if (priceText.includes('$')) return 'USD';
      return 'INR';
    }

    extractProductId() {
      // 1. Try hidden input #ASIN (standard on Amazon detail pages)
      const asinInput = document.querySelector('#ASIN, input[name="ASIN"]');
      if (asinInput && asinInput.value && /^[A-Z0-9]{10}$/i.test(asinInput.value.trim())) {
        return asinInput.value.trim().toUpperCase();
      }

      // 2. Parse ASIN from current URL
      const match = window.location.href.match(/(?:dp|gp\/product)\/([A-Z0-9]{10})/i);
      if (match && match[1]) {
        return match[1].toUpperCase();
      }

      // 3. Fallback to canonical link
      const canonical = document.querySelector('link[rel="canonical"]');
      if (canonical && canonical.href) {
        const canMatch = canonical.href.match(/(?:dp|gp\/product)\/([A-Z0-9]{10})/i);
        if (canMatch && canMatch[1]) return canMatch[1].toUpperCase();
      }

      return 'AMAZON-UNKNOWN';
    }

    extractUrl() {
      const asin = this.extractProductId();
      if (asin && asin !== 'AMAZON-UNKNOWN') {
        const host = window.location.hostname;
        return `https://${host}/dp/${asin}`;
      }
      return this.cleanUrl(window.location.href);
    }

    extractImage() {
      const el = this.queryFirst(['#landingImage', '#imgBlkFront', '#main-image']);
      return el ? (el.src || el.getAttribute('data-old-hires') || '') : '';
    }

    getPriceElement() {
      return this.queryFirst([
        '#corePriceDisplay_desktop_feature_div .a-price .a-offscreen',
        '#corePrice_feature_div .a-price .a-offscreen',
        '#apex_desktop .a-price .a-offscreen',
        '#priceblock_ourprice',
        '#priceblock_dealprice',
        '.a-price .a-offscreen'
      ]);
    }
  }

  root.PricePulse = root.PricePulse || {};
  root.PricePulse.AmazonExtractor = AmazonExtractor;

})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
