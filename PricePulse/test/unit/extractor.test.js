/**
 * PricePulse - Extractor Unit Test Suite
 * Tests BaseExtractor contract, Amazon ASIN extraction, Flipkart PID extraction,
 * and canonical URL cleansing in pure Node.js.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

// Mock browser window and document environment for pure Node execution
global.window = { location: { href: 'https://localhost:3000/product.html', hostname: 'localhost' } };
global.document = {
  title: 'Test Title',
  querySelector: () => null
};

// Load BaseExtractor
require(path.join(__dirname, '../../extension/adapters/baseExtractor.js'));
const BaseExtractor = global.window.PricePulse.BaseExtractor;

// Load AmazonExtractor
require(path.join(__dirname, '../../extension/adapters/amazonExtractor.js'));
const AmazonExtractor = global.window.PricePulse.AmazonExtractor;

// Load FlipkartExtractor
require(path.join(__dirname, '../../extension/adapters/flipkartExtractor.js'));
const FlipkartExtractor = global.window.PricePulse.FlipkartExtractor;

let testsPassed = 0;
let testsTotal = 0;

function runTest(name, fn) {
  testsTotal++;
  try {
    fn();
    console.log(`  ✓ PASS: ${name}`);
    testsPassed++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${name}`);
    console.error(`    ${err.message}`);
  }
}

console.log('\n==================================================');
console.log('🧪 PricePulse Phase 2 Extractor Unit Tests');
console.log('==================================================\n');

// 1. Contract enforcement test
runTest('BaseExtractor throws if abstract methods are not implemented', () => {
  class IncompleteExtractor extends BaseExtractor {}
  const instance = new IncompleteExtractor();
  assert.throws(() => instance.extractTitle(), /must be implemented/);
  assert.throws(() => instance.extractPrice(), /must be implemented/);
  assert.throws(() => instance.extractProductId(), /must be implemented/);
});

// 2. URL canonicalization test
runTest('BaseExtractor.cleanUrl strips tracking & affiliate query params', () => {
  const extractor = new BaseExtractor();
  const dirtyUrl = 'https://example.com/product?utm_source=google&utm_medium=cpc&ref=xyz&color=blue';
  const cleaned = extractor.cleanUrl(dirtyUrl);
  assert.strictEqual(cleaned, 'https://example.com/product?color=blue');
});

// 3. Amazon ASIN & URL canonicalization test
runTest('AmazonExtractor extracts ASIN and produces canonical URL', () => {
  const amazon = new AmazonExtractor();
  
  // Format 1: /dp/ASIN
  global.window.location.href = 'https://www.amazon.in/Sony-WH-1000XM5-Headphones/dp/B09XS7JWHH?ref=sr_1_1';
  global.window.location.hostname = 'www.amazon.in';
  assert.strictEqual(amazon.extractProductId(), 'B09XS7JWHH');
  assert.strictEqual(amazon.extractUrl(), 'https://www.amazon.in/dp/B09XS7JWHH');

  // Format 2: /gp/product/ASIN
  global.window.location.href = 'https://www.amazon.com/gp/product/B08N5WRWNW';
  global.window.location.hostname = 'www.amazon.com';
  assert.strictEqual(amazon.extractProductId(), 'B08N5WRWNW');
  assert.strictEqual(amazon.extractUrl(), 'https://www.amazon.com/dp/B08N5WRWNW');
});

// 4. Flipkart PID & URL canonicalization test
runTest('FlipkartExtractor extracts PID and produces canonical URL', () => {
  const flipkart = new FlipkartExtractor();
  global.window.location.href = 'https://www.flipkart.com/sony-wh-1000xm5/p/itm123?pid=ACCE987XYZ&lid=LST123';
  assert.strictEqual(flipkart.extractProductId(), 'ACCE987XYZ');
  assert.strictEqual(flipkart.extractUrl(), 'https://www.flipkart.com/product/p/item?pid=ACCE987XYZ');
});

console.log(`\nResults: ${testsPassed}/${testsTotal} tests passed.\n`);

if (testsPassed !== testsTotal) {
  process.exit(1);
}
