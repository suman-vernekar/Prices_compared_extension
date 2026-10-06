/**
 * PricePulse - PriceParser Engine
 * Normalizes unstructured ecommerce price strings into standardized numeric amounts and ISO currencies.
 * Handles diverse international formats, thousand separators, currency symbols, and edge cases.
 */

(function (root) {
  'use strict';

  // Currency detection map
  const CURRENCY_MAP = [
    { pattern: /(?:₹|Rs\.?|INR)/i, code: 'INR', symbol: '₹' },
    { pattern: /(?:\$|USD)/i, code: 'USD', symbol: '$' },
    { pattern: /(?:€|EUR)/i, code: 'EUR', symbol: '€' },
    { pattern: /(?:£|GBP)/i, code: 'GBP', symbol: '£' },
    { pattern: /(?:¥|JPY)/i, code: 'JPY', symbol: '¥' },
    { pattern: /(?:C\$|CAD)/i, code: 'CAD', symbol: 'C$' },
    { pattern: /(?:A\$|AUD)/i, code: 'AUD', symbol: 'A$' }
  ];

  class PriceParser {
    /**
     * Detect currency code and symbol from price string
     * @param {string} text
     * @param {string} fallbackCurrency
     * @returns {{ code: string, symbol: string }}
     */
    static detectCurrency(text, fallbackCurrency = 'INR') {
      if (!text || typeof text !== 'string') {
        return { code: fallbackCurrency, symbol: fallbackCurrency === 'INR' ? '₹' : '$' };
      }

      for (const entry of CURRENCY_MAP) {
        if (entry.pattern.test(text)) {
          return { code: entry.code, symbol: entry.symbol };
        }
      }

      return { code: fallbackCurrency, symbol: fallbackCurrency === 'INR' ? '₹' : '$' };
    }

    /**
     * Parse and normalize raw price string into a structured entity
     * @param {string|number} rawInput
     * @param {string} fallbackCurrency
     * @returns {{ raw: string, amount: number|null, currency: string|null, formatted: string|null, isValid: boolean, error?: string }}
     */
    static parse(rawInput, fallbackCurrency = 'INR') {
      // 1. Guard against empty/null/undefined inputs
      if (rawInput === null || rawInput === undefined || rawInput === '') {
        return {
          raw: String(rawInput ?? ''),
          amount: null,
          currency: null,
          formatted: null,
          isValid: false,
          error: 'EMPTY_INPUT'
        };
      }

      // If already a clean number
      if (typeof rawInput === 'number') {
        if (isNaN(rawInput) || !isFinite(rawInput) || rawInput <= 0) {
          return {
            raw: String(rawInput),
            amount: null,
            currency: null,
            formatted: null,
            isValid: false,
            error: 'INVALID_NUMBER'
          };
        }
        const currency = fallbackCurrency;
        return {
          raw: String(rawInput),
          amount: Math.round(rawInput * 100) / 100,
          currency,
          formatted: this.format(rawInput, currency),
          isValid: true
        };
      }

      const raw = String(rawInput).trim();

      // 2. Filter out non-price status strings
      const nonPriceRegex = /^(out of stock|unavailable|currently unavailable|free|tbd|null|undefined|nan)$/i;
      if (nonPriceRegex.test(raw)) {
        return {
          raw,
          amount: null,
          currency: null,
          formatted: null,
          isValid: false,
          error: 'NON_NUMERIC_STATUS'
        };
      }

      // 3. Detect currency
      const { code: currencyCode, symbol: currencySymbol } = this.detectCurrency(raw, fallbackCurrency);

      // 4. Sanitize text: remove currency words/symbols and trailing formatting like '/-'
      let cleaned = raw
        .replace(/(?:₹|Rs\.?|INR|\$|USD|€|EUR|£|GBP|¥|JPY|C\$|A\$)/gi, '')
        .replace(/\/-/g, '') // Indian trailing '/-'
        .replace(/\s+/g, ' ')
        .trim();

      // 5. Extract first valid numeric cluster (avoids noise like "(15% off)" or "Pack of 2")
      // Match numbers with possible commas, periods, or spaces
      const numberMatch = cleaned.match(/[\d\s.,]+/);
      if (!numberMatch) {
        return {
          raw,
          amount: null,
          currency: null,
          formatted: null,
          isValid: false,
          error: 'NO_DIGITS_FOUND'
        };
      }

      let numStr = numberMatch[0].trim();

      // 6. Handle decimal and thousands separators
      // European format: 1.299,50 or 49,99 (comma as decimal separator)
      const isEuropeanDecimal = /\.\d{3},\d{1,2}$/.test(numStr) || (/,\d{1,2}$/.test(numStr) && !/\./.test(numStr));

      if (isEuropeanDecimal) {
        // Remove periods (thousands), replace comma with period (decimal)
        numStr = numStr.replace(/\./g, '').replace(',', '.');
      } else {
        // Standard US/UK/India format (1,49,990.00 or 4,999): remove commas
        numStr = numStr.replace(/,/g, '');
      }

      // Remove any lingering whitespace between digits (e.g. "1 299.00")
      numStr = numStr.replace(/\s/g, '');

      const parsedAmount = parseFloat(numStr);

      if (isNaN(parsedAmount) || !isFinite(parsedAmount) || parsedAmount <= 0) {
        return {
          raw,
          amount: null,
          currency: null,
          formatted: null,
          isValid: false,
          error: 'PARSED_VALUE_INVALID'
        };
      }

      const amount = Math.round(parsedAmount * 100) / 100;

      return {
        raw,
        amount,
        currency: currencyCode,
        formatted: this.format(amount, currencyCode),
        isValid: true
      };
    }

    /**
     * Format a numeric amount into a standardized display string
     * @param {number} amount
     * @param {string} currencyCode
     * @returns {string}
     */
    static format(amount, currencyCode = 'INR') {
      if (typeof amount !== 'number' || isNaN(amount)) return '';

      const symbolMap = {
        INR: '₹',
        USD: '$',
        EUR: '€',
        GBP: '£',
        JPY: '¥',
        CAD: 'C$',
        AUD: 'A$'
      };

      const sym = symbolMap[currencyCode] || currencyCode + ' ';

      // Format with 2 decimals if has decimal cents, otherwise clean integer
      const formattedNum = amount % 1 === 0
        ? amount.toLocaleString('en-IN')
        : amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      return `${sym}${formattedNum}`;
    }

    /**
     * Calculate price drop amount and percentage change
     * @param {number} oldPrice
     * @param {number} newPrice
     * @returns {{ dropAmount: number, percentageChange: number, isDrop: boolean }}
     */
    static calculateChange(oldPrice, newPrice) {
      if (!oldPrice || !newPrice || oldPrice <= 0 || newPrice <= 0) {
        return { dropAmount: 0, percentageChange: 0, isDrop: false };
      }

      const diff = newPrice - oldPrice;
      const dropAmount = Math.round(Math.abs(diff) * 100) / 100;
      const percentageChange = Math.round(((newPrice - oldPrice) / oldPrice) * 10000) / 100; // 2 decimal precision

      return {
        dropAmount: diff < 0 ? dropAmount : 0,
        increaseAmount: diff > 0 ? dropAmount : 0,
        percentageChange,
        isDrop: diff < 0
      };
    }

    /**
     * Check if a price change is statistically meaningful (avoids floating point jitter)
     * @param {number} oldAmount
     * @param {number} newAmount
     * @param {number} threshold
     * @returns {boolean}
     */
    static isMeaningfulChange(oldAmount, newAmount, threshold = 0.01) {
      if (typeof oldAmount !== 'number' || typeof newAmount !== 'number') return false;
      return Math.abs(oldAmount - newAmount) >= threshold;
    }
  }

  // Universal export (Browser, ServiceWorker, Node.js)
  root.PricePulse = root.PricePulse || {};
  root.PricePulse.PriceParser = PriceParser;

})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
