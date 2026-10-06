/**
 * PricePulse - Real-Time Observer & Lifecycle Unit Test Suite
 * Validates deterministic duplicate suppression sequence (4999 -> 4999 -> 4499 -> 4499 -> 4199),
 * lifecycle control (start/stop/check), and observer state management.
 */

const assert = require('assert');
const path = require('path');

// Mock browser global environment
global.window = { location: { href: 'https://localhost:3000/product.html' } };
global.chrome = {
  runtime: {
    sendMessage: (msg, cb) => { if (cb) cb({ success: true }); }
  }
};

// Load PriceParser
require(path.join(__dirname, '../../extension/content/priceParser.js'));
const PriceParser = (global.PricePulse || global.window.PricePulse).PriceParser;

// Load PriceDetectorEngine
require(path.join(__dirname, '../../extension/content/priceDetector.js'));
const PriceDetectorEngine = (global.PricePulse || global.window.PricePulse).PriceDetectorEngine;

let passed = 0;
let total = 0;

function test(description, fn) {
  total++;
  try {
    fn();
    console.log(`  ✓ PASS: ${description}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${description}`);
    console.error(`    ${err.message}`);
  }
}

console.log('\n==================================================');
console.log('🧪 PricePulse Phase 4 Real-Time Observer Unit Tests');
console.log('==================================================\n');

// Mock Product Extractor Facade
function createMockFacade(initialPrice = '₹4,999') {
  let mockDomPrice = initialPrice;
  return {
    getPriceElement: () => ({
      textContent: mockDomPrice,
      parentElement: {}
    }),
    setMockDomPrice: (newVal) => { mockDomPrice = newVal; },
    extractProduct: () => {
      const parsed = PriceParser.parse(mockDomPrice, 'INR');
      return {
        title: 'Sony WH-1000XM5',
        productId: 'LOCAL-SONY-WH1000XM5',
        platform: 'local-test',
        rawPrice: mockDomPrice,
        price: parsed.amount,
        currency: 'INR'
      };
    }
  };
}

// 1. Lifecycle start and baseline establishment
test('startPriceObserver establishes initial baseline and sets observing flag', () => {
  const facade = createMockFacade('₹4,999');
  const engine = new PriceDetectorEngine(facade, PriceParser);

  // Mock MutationObserver in test environment
  global.MutationObserver = class {
    observe() {}
    disconnect() {}
  };

  const started = engine.startPriceObserver();
  assert.strictEqual(started, true);
  assert.strictEqual(engine.isObserving, true);
  assert.strictEqual(engine.currentNumericPrice, 4999);
  engine.stopPriceObserver();
});

// 2. Lifecycle teardown
test('stopPriceObserver cleanly dismantles observer and resets observing flag', () => {
  const facade = createMockFacade('₹4,999');
  const engine = new PriceDetectorEngine(facade, PriceParser);
  engine.startPriceObserver();
  assert.strictEqual(engine.isObserving, true);

  engine.stopPriceObserver();
  assert.strictEqual(engine.isObserving, false);
  assert.strictEqual(engine.priceObserver, null);
});

// 3. Deterministic Price Sequence Test (Master Prompt Section 28)
// Sequence: 4999 -> 4999 -> 4499 -> 4499 -> 4199
// Expected recorded history: 4999, 4499, 4199
test('Deterministic duplicate suppression: 4999 -> 4999 -> 4499 -> 4499 -> 4199 produces strictly [4999, 4499, 4199]', () => {
  const facade = createMockFacade('₹4,999');
  const recordedHistory = [];

  // Intercept Service Worker messages to log emitted price transitions
  global.chrome.runtime.sendMessage = (msg) => {
    if (msg.type === 'PRODUCT_DETECTED') {
      recordedHistory.push(msg.payload.price);
    } else if (msg.type === 'PRICE_CHANGED') {
      recordedHistory.push(msg.payload.price);
    }
  };

  const engine = new PriceDetectorEngine(facade, PriceParser);
  engine.startPriceObserver(); // Baseline: 4999

  // Step 1: Duplicate 4999
  const r1 = engine.handlePriceChange('₹4,999');
  assert.strictEqual(r1, false, 'Duplicate ₹4,999 should be suppressed');

  // Step 2: Price drop to 4499
  facade.setMockDomPrice('₹4,499');
  const r2 = engine.handlePriceChange('₹4,499');
  assert.strictEqual(r2, true, 'Price drop to ₹4,499 should be processed');

  // Step 3: Duplicate 4499 with formatting change (₹ 4,499.00)
  const r3 = engine.handlePriceChange('₹ 4,499.00');
  assert.strictEqual(r3, false, 'Formatting variation of ₹4,499.00 should be suppressed');

  // Step 4: Price drop to 4199
  facade.setMockDomPrice('₹4,199');
  const r4 = engine.handlePriceChange('₹4,199');
  assert.strictEqual(r4, true, 'Price drop to ₹4,199 should be processed');

  // Assert final recorded history
  assert.deepStrictEqual(recordedHistory, [4999, 4499, 4199]);
  console.log(`    Recorded history sequence: [${recordedHistory.join(', ')}]`);
});

// 4. checkPrice imperatively inspects DOM
test('checkPrice detects in-place DOM mutation without waiting for timer', () => {
  const facade = createMockFacade('₹4,999');
  const engine = new PriceDetectorEngine(facade, PriceParser);
  engine.startPriceObserver();

  // Mutate DOM
  facade.setMockDomPrice('₹4,250');
  const changed = engine.checkPrice();
  assert.strictEqual(changed, true);
  assert.strictEqual(engine.currentNumericPrice, 4250);
});

console.log(`\nResults: ${passed}/${total} tests passed.\n`);

if (passed !== total) {
  process.exit(1);
}
