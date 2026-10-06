/**
 * PricePulse - Real-Time Price Detector Engine
 * Implements strict lifecycle control (start, stop, check, handle),
 * debounced DOM observation on minimal subtrees, and duplicate suppression.
 */

(function (root) {
  'use strict';

  class PriceDetectorEngine {
    /**
     * @param {Object} facade - ProductExtractor facade instance
     * @param {Object} parser - PriceParser utility class
     */
    constructor(facade, parser) {
      this.facade = facade;
      this.parser = parser;
      this.priceObserver = null;
      this.parentObserver = null;
      this.debounceTimer = null;
      this.debounceDelayMs = 250;
      this.currentNumericPrice = null;
      this.currentRawPrice = null;
      this.isObserving = false;
      this.lastDispatchedHash = null;
      this.targetElement = null;
    }

    /**
     * Start observing the target price element
     * Establishes baseline and configures scoped MutationObservers.
     * @returns {boolean}
     */
    startPriceObserver() {
      // 1. Guard against double-starting
      if (this.isObserving) {
        this.stopPriceObserver();
      }

      // 2. Locate target element through adapter
      this.targetElement = this.facade?.getPriceElement();
      if (!this.targetElement) {
        console.warn('[PricePulse Engine] Cannot start observer: Target price element not found in DOM.');
        return false;
      }

      // 3. Extract baseline product snapshot
      const baselineProduct = this.facade.extractProduct();
      if (!baselineProduct) {
        console.warn('[PricePulse Engine] Failed to extract baseline product metadata.');
        return false;
      }

      this.currentNumericPrice = baselineProduct.price;
      this.currentRawPrice = baselineProduct.rawPrice;
      this.lastDispatchedHash = `${baselineProduct.productId}_${baselineProduct.price}`;

      console.log(`[PricePulse Engine] Observer started. Baseline: ${baselineProduct.formattedPrice || baselineProduct.rawPrice} (${baselineProduct.currency}) on [${baselineProduct.platform}] SKU: ${baselineProduct.productId}`);

      // 4. Notify Service Worker of baseline product discovery
      chrome.runtime?.sendMessage?.({
        type: 'PRODUCT_DETECTED',
        payload: baselineProduct
      }, () => {});

      // 5. Attach scoped MutationObserver to smallest practical subtree (the price element itself)
      this.priceObserver = new MutationObserver(() => {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
          this.checkPrice();
        }, this.debounceDelayMs);
      });

      this.priceObserver.observe(this.targetElement, {
        characterData: true,
        childList: true,
        subtree: true
      });

      // 6. Attach parent observer to survive SPA element swapping
      if (this.targetElement.parentElement) {
        this.parentObserver = new MutationObserver(() => {
          const freshElement = this.facade.getPriceElement();
          if (freshElement && freshElement !== this.targetElement) {
            console.log('[PricePulse Engine] Price DOM node swapped by framework. Rebinding observer...');
            this.startPriceObserver();
          }
        });

        this.parentObserver.observe(this.targetElement.parentElement, {
          childList: true
        });
      }

      this.isObserving = true;
      return true;
    }

    /**
     * Stop and tear down all active observers and timers
     */
    stopPriceObserver() {
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = null;
      }

      if (this.priceObserver) {
        this.priceObserver.disconnect();
        this.priceObserver = null;
      }

      if (this.parentObserver) {
        this.parentObserver.disconnect();
        this.parentObserver = null;
      }

      this.isObserving = false;
      this.targetElement = null;
      console.log('[PricePulse Engine] Price observer stopped and resources dismantled.');
    }

    /**
     * Imperatively inspect current DOM price and evaluate changes
     * @returns {boolean} whether a change was detected and processed
     */
    checkPrice() {
      const priceEl = this.facade?.getPriceElement();
      if (!priceEl) return false;

      const rawText = priceEl.textContent ? priceEl.textContent.trim() : '';
      if (!rawText) return false;

      return this.handlePriceChange(rawText);
    }

    /**
     * Process detected price text with normalization, validation, and duplicate suppression
     * @param {string} newPriceText
     * @returns {boolean}
     */
    handlePriceChange(newPriceText) {
      const sanitized = (newPriceText || '').trim();
      if (!sanitized) return false;

      // 1. Parse using robust normalizer
      const parsed = this.parser
        ? this.parser.parse(sanitized)
        : { isValid: true, amount: parseFloat(sanitized), currency: 'INR' };

      if (!parsed.isValid || parsed.amount === null) {
        console.log(`[PricePulse Engine] Ignored non-monetary or unparseable text: "${sanitized}"`);
        return false;
      }

      // 2. Duplicate Suppression: Compare numeric values, not formatting strings
      if (this.currentNumericPrice !== null && this.parser) {
        const isMeaningful = this.parser.isMeaningfulChange(this.currentNumericPrice, parsed.amount);
        if (!isMeaningful) {
          return false; // Identical price; suppress duplicate write
        }
      }

      // 3. Extract updated product metadata
      const product = this.facade.extractProduct();
      if (!product) return false;

      // 4. Deduplication hash guard (prevents rapid re-trigger for identical SKU + price)
      const dispatchHash = `${product.productId}_${parsed.amount}`;
      if (dispatchHash === this.lastDispatchedHash) {
        return false;
      }

      // 5. Calculate price delta and percentage drop
      const previousNumeric = this.currentNumericPrice;
      const previousRaw = this.currentRawPrice;
      this.currentNumericPrice = parsed.amount;
      this.currentRawPrice = sanitized;
      this.lastDispatchedHash = dispatchHash;

      const changeStats = (this.parser && previousNumeric)
        ? this.parser.calculateChange(previousNumeric, parsed.amount)
        : { dropAmount: 0, percentageChange: 0, isDrop: false };

      console.log(`[PricePulse Engine] Meaningful price change: ${previousNumeric || 'init'} -> ${parsed.amount} (${changeStats.percentageChange}%) on [${product.platform}]`);

      // 6. Deliver structured observation to Service Worker
      const payload = {
        ...product,
        price: parsed.amount,
        rawPrice: sanitized,
        formattedPrice: parsed.formatted || sanitized,
        currency: parsed.currency || product.currency,
        previousPrice: previousNumeric,
        previousRawPrice: previousRaw,
        dropAmount: changeStats.dropAmount,
        percentageChange: changeStats.percentageChange,
        isDrop: changeStats.isDrop
      };

      chrome.runtime?.sendMessage?.({
        type: 'PRICE_CHANGED',
        payload
      }, (response) => {
        if (chrome.runtime?.lastError) {
          console.warn('[PricePulse Engine] Communication error with Service Worker:', chrome.runtime.lastError.message);
        } else {
          console.log('[PricePulse Engine] SW confirmed receipt of price change.');
        }
      });

      return true;
    }
  }

  // Export engine class universally
  root.PricePulse = root.PricePulse || {};
  root.PricePulse.PriceDetectorEngine = PriceDetectorEngine;

  // Browser Content Script Bootstrap
  if (typeof window !== 'undefined' && window.document) {
    const facade = root.PricePulse.productExtractor;
    const parser = root.PricePulse.PriceParser;

    if (!facade || !facade.isSupported()) {
      console.log('[PricePulse CS] Inactive: Not a supported product page.');
      return;
    }

    const engine = new PriceDetectorEngine(facade, parser);
    root.PricePulse.engine = engine;

    // Start observer once DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => engine.startPriceObserver());
    } else {
      engine.startPriceObserver();
    }

    // SPA Navigation Listener (popstate / route changes)
    window.addEventListener('popstate', () => {
      console.log('[PricePulse CS] SPA navigation detected. Re-evaluating product...');
      setTimeout(() => engine.startPriceObserver(), 300);
    });

    // Page Visibility Listener (re-check when returning to active tab)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && engine.isObserving) {
        engine.checkPrice();
      }
    });

    // Page Teardown Listener
    window.addEventListener('beforeunload', () => {
      engine.stopPriceObserver();
    });

    // Runtime Message Bus: Handle Popup & Background requests
    chrome.runtime?.onMessage?.addListener((request, sender, sendResponse) => {
      switch (request.type) {
        case 'GET_PAGE_PRODUCT': {
          const snapshot = facade.extractProduct();
          sendResponse({
            success: !!snapshot,
            product: snapshot,
            isMonitoring: engine.isObserving
          });
          return true;
        }

        case 'START_TRACKING': {
          const started = engine.startPriceObserver();
          sendResponse({ success: started, isMonitoring: engine.isObserving });
          return true;
        }

        case 'STOP_TRACKING': {
          engine.stopPriceObserver();
          sendResponse({ success: true, isMonitoring: false });
          return true;
        }

        case 'CHECK_PRICE': {
          const detectedChange = engine.checkPrice();
          sendResponse({ success: true, detectedChange, product: facade.extractProduct() });
          return true;
        }

        case 'FORCE_REFRESH_PRICE': {
          engine.startPriceObserver();
          sendResponse({ success: true, product: facade.extractProduct() });
          return true;
        }

        default:
          return false;
      }
    });
  }

})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
