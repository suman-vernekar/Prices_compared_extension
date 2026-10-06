/**
 * PricePulse - PriceParser Unit Test Suite
 * Tests normalization across Indian, US, and European currency formats,
 * whitespace variations, decimal handling, noise stripping, and percentage calculations.
 */

const assert = require('assert');
const path = require('path');

// Load PriceParser
require(path.join(__dirname, '../../extension/content/priceParser.js'));
const PriceParser = global.PricePulse.PriceParser;

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
console.log('🧪 PricePulse Phase 3 PriceParser Unit Tests');
console.log('==================================================\n');

// 1. Indian Rupee Formats
test('Parses standard Rupee symbol: "₹4,999" -> 4999 INR', () => {
  const res = PriceParser.parse('₹4,999');
  assert.strictEqual(res.isValid, true);
  assert.strictEqual(res.amount, 4999);
  assert.strictEqual(res.currency, 'INR');
});

test('Parses Rupee with whitespace: "₹ 4,999" -> 4999 INR', () => {
  const res = PriceParser.parse('₹ 4,999');
  assert.strictEqual(res.isValid, true);
  assert.strictEqual(res.amount, 4999);
  assert.strictEqual(res.currency, 'INR');
});

test('Parses legacy "Rs." format: "Rs. 4,999" -> 4999 INR', () => {
  const res = PriceParser.parse('Rs. 4,999');
  assert.strictEqual(res.isValid, true);
  assert.strictEqual(res.amount, 4999);
  assert.strictEqual(res.currency, 'INR');
});

test('Parses trailing slash format: "₹4,999/-" -> 4999 INR', () => {
  const res = PriceParser.parse('₹4,999/-');
  assert.strictEqual(res.isValid, true);
  assert.strictEqual(res.amount, 4999);
});

test('Parses Indian lakh grouping: "₹ 1,49,990.00" -> 149990 INR', () => {
  const res = PriceParser.parse('₹ 1,49,990.00');
  assert.strictEqual(res.isValid, true);
  assert.strictEqual(res.amount, 149990);
  assert.strictEqual(res.currency, 'INR');
});

// 2. US Dollar Formats
test('Parses US Dollar decimal price: "$299.99" -> 299.99 USD', () => {
  const res = PriceParser.parse('$299.99');
  assert.strictEqual(res.isValid, true);
  assert.strictEqual(res.amount, 299.99);
  assert.strictEqual(res.currency, 'USD');
});

test('Parses US Dollar thousand separator: "$ 1,299.00" -> 1299 USD', () => {
  const res = PriceParser.parse('$ 1,299.00');
  assert.strictEqual(res.isValid, true);
  assert.strictEqual(res.amount, 1299);
  assert.strictEqual(res.currency, 'USD');
});

// 3. European Formats (Comma as Decimal Separator)
test('Parses European decimal comma: "EUR 49,99" -> 49.99 EUR', () => {
  const res = PriceParser.parse('EUR 49,99');
  assert.strictEqual(res.isValid, true);
  assert.strictEqual(res.amount, 49.99);
  assert.strictEqual(res.currency, 'EUR');
});

test('Parses European thousand dot with comma cents: "€ 1.499,00" -> 1499 EUR', () => {
  const res = PriceParser.parse('€ 1.499,00');
  assert.strictEqual(res.isValid, true);
  assert.strictEqual(res.amount, 1499);
  assert.strictEqual(res.currency, 'EUR');
});

// 4. Raw Numeric Strings
test('Parses clean numeric string: "4,999.00" -> 4999', () => {
  const res = PriceParser.parse('4,999.00');
  assert.strictEqual(res.isValid, true);
  assert.strictEqual(res.amount, 4999);
});

test('Parses bare integer string: "4999" -> 4999', () => {
  const res = PriceParser.parse('4999');
  assert.strictEqual(res.isValid, true);
  assert.strictEqual(res.amount, 4999);
});

test('Parses number type directly: 4999.5 -> 4999.5', () => {
  const res = PriceParser.parse(4999.5);
  assert.strictEqual(res.isValid, true);
  assert.strictEqual(res.amount, 4999.5);
});

// 5. Promotional Text Noise Stripping
test('Strips promotional text noise: "Deal: ₹4,499 (Save 20%)" -> 4499', () => {
  const res = PriceParser.parse('Deal: ₹4,499 (Save 20%)');
  assert.strictEqual(res.isValid, true);
  assert.strictEqual(res.amount, 4499);
});

// 6. Invalid and Edge Case Inputs
test('Rejects null input cleanly', () => {
  const res = PriceParser.parse(null);
  assert.strictEqual(res.isValid, false);
  assert.strictEqual(res.amount, null);
});

test('Rejects empty string input cleanly', () => {
  const res = PriceParser.parse('');
  assert.strictEqual(res.isValid, false);
  assert.strictEqual(res.amount, null);
});

test('Rejects "Out of Stock" status text', () => {
  const res = PriceParser.parse('Out of Stock');
  assert.strictEqual(res.isValid, false);
  assert.strictEqual(res.amount, null);
});

test('Rejects "Free" non-monetary text', () => {
  const res = PriceParser.parse('Free');
  assert.strictEqual(res.isValid, false);
  assert.strictEqual(res.amount, null);
});

// 7. Price Drop & Percentage Change Calculations
test('Calculates price drop: 4999 -> 4499 = drop 500 (-10.00%)', () => {
  const change = PriceParser.calculateChange(4999, 4499);
  assert.strictEqual(change.isDrop, true);
  assert.strictEqual(change.dropAmount, 500);
  assert.strictEqual(change.percentageChange, -10);
});

test('Calculates price increase: 4199 -> 4499 = increase 300 (+7.14%)', () => {
  const change = PriceParser.calculateChange(4199, 4499);
  assert.strictEqual(change.isDrop, false);
  assert.strictEqual(change.increaseAmount, 300);
  assert.strictEqual(change.percentageChange, 7.14);
});

// 8. Meaningful Change Threshold
test('Filters out sub-cent precision jitter', () => {
  assert.strictEqual(PriceParser.isMeaningfulChange(4999.00, 4999.004), false);
  assert.strictEqual(PriceParser.isMeaningfulChange(4999.00, 4998.90), true);
});

console.log(`\nResults: ${passed}/${total} tests passed.\n`);

if (passed !== total) {
  process.exit(1);
}
