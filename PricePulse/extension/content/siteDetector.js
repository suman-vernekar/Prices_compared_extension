/**
 * PricePulse - SiteDetector & Extractor Registry
 * Dynamically resolves the appropriate extractor adapter for the active webpage.
 * Avoids monolithic if/else chains.
 */

(function (root) {
  'use strict';

  class SiteDetector {
    constructor() {
      this.extractors = [];
    }

    /**
     * Register an extractor class with the detector
     */
    register(ExtractorClass) {
      if (typeof ExtractorClass === 'function') {
        this.extractors.push(ExtractorClass);
      }
    }

    /**
     * Detect and return an instantiated extractor matching the current URL/DOM
     * @param {string} url
     * @returns {BaseExtractor|null}
     */
    resolveExtractor(url = window.location.href) {
      for (const ExtractorClass of this.extractors) {
        try {
          const instance = new ExtractorClass();
          if (instance.matches(url)) {
            console.log(`[SiteDetector] Resolved adapter: [${instance.platform}] for ${url}`);
            return instance;
          }
        } catch (err) {
          console.error(`[SiteDetector] Error evaluating extractor:`, err);
        }
      }

      console.log('[SiteDetector] No specialized adapter matched this URL.');
      return null;
    }
  }

  // Instantiate singleton registry
  const detector = new SiteDetector();

  // Register all available adapters in order of specificity
  if (root.PricePulse?.LocalTestExtractor) detector.register(root.PricePulse.LocalTestExtractor);
  if (root.PricePulse?.AmazonExtractor) detector.register(root.PricePulse.AmazonExtractor);
  if (root.PricePulse?.FlipkartExtractor) detector.register(root.PricePulse.FlipkartExtractor);

  root.PricePulse = root.PricePulse || {};
  root.PricePulse.siteDetector = detector;

})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
