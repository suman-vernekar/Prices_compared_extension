/**
 * PricePulse - ProductExtractor Facade
 * Provides high-level extraction methods consuming the resolved adapter.
 */

(function (root) {
  'use strict';

  class ProductExtractorFacade {
    constructor() {
      this.cachedExtractor = null;
    }

    /**
     * Get or resolve active adapter for the current page
     */
    getAdapter() {
      const detector = root.PricePulse?.siteDetector;
      if (!detector) {
        console.warn('[ProductExtractor] SiteDetector registry is not available.');
        return null;
      }
      this.cachedExtractor = detector.resolveExtractor(window.location.href);
      return this.cachedExtractor;
    }

    /**
     * Check if current page is supported by any registered adapter
     */
    isSupported() {
      return !!this.getAdapter();
    }

    /**
     * Get target DOM element for price observation
     */
    getPriceElement() {
      const adapter = this.getAdapter();
      return adapter ? adapter.getPriceElement() : null;
    }

    /**
     * Extract full product metadata according to the standard contract
     */
    extractProduct() {
      const adapter = this.getAdapter();
      if (!adapter) {
        return null;
      }

      try {
        const data = adapter.extract();
        return {
          ...data,
          extractedAt: new Date().toISOString()
        };
      } catch (err) {
        console.error('[ProductExtractor] Failed to extract product data:', err);
        return null;
      }
    }
  }

  root.PricePulse = root.PricePulse || {};
  root.PricePulse.productExtractor = new ProductExtractorFacade();

})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
