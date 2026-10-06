/**
 * PricePulse - Backend API Integration Test Suite
 * Tests HTTP status codes, request validation middleware,
 * error formatting contract, and health check endpoints.
 */

const http = require('http');
const assert = require('assert');
const path = require('path');

// Load Express application
const app = require(path.join(__dirname, '../../backend/app'));

let passed = 0;
let total = 0;

function test(description, fn) {
  total++;
  return fn()
    .then(() => {
      console.log(`  ✓ PASS: ${description}`);
      passed++;
    })
    .catch((err) => {
      console.error(`  ✗ FAIL: ${description}`);
      console.error(`    ${err.message}`);
    });
}

/**
 * Helper to make HTTP requests against ephemeral test server
 */
function request(server, options, body = null) {
  return new Promise((resolve, reject) => {
    const port = server.address().port;
    const reqOptions = {
      hostname: '127.0.0.1',
      port,
      path: options.path,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, headers: res.headers, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, raw: data });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runSuite() {
  console.log('\n==================================================');
  console.log('🧪 PricePulse Phase 5 Backend API Test Suite');
  console.log('==================================================\n');

  // Start ephemeral server on free port 0
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));

  try {
    // 1. Health check endpoint test
    await test('GET /api/health returns HTTP 200 with HEALTHY status', async () => {
      const res = await request(server, { path: '/api/health', method: 'GET' });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.data.status, 'HEALTHY');
    });

    // 2. Validation failure: missing product title
    await test('POST /api/products returns HTTP 400 when title is missing', async () => {
      const res = await request(server, { path: '/api/products', method: 'POST' }, {
        url: 'https://example.com/product',
        platform: 'amazon',
        productId: 'B09XS7JWHH',
        price: 4999
      });
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
      assert.strictEqual(res.body.error.code, 'INVALID_PRODUCT_TITLE');
    });

    // 3. Validation failure: malformed URL
    await test('POST /api/products returns HTTP 400 for malformed URL', async () => {
      const res = await request(server, { path: '/api/products', method: 'POST' }, {
        title: 'Sony Headphones',
        url: 'not-a-valid-url',
        platform: 'amazon',
        productId: 'B09XS7JWHH',
        price: 4999
      });
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
      assert.strictEqual(res.body.error.code, 'MALFORMED_PRODUCT_URL');
    });

    // 4. Validation failure: invalid negative price
    await test('POST /api/products returns HTTP 400 for negative price', async () => {
      const res = await request(server, { path: '/api/products', method: 'POST' }, {
        title: 'Sony Headphones',
        url: 'https://example.com/product',
        platform: 'amazon',
        productId: 'B09XS7JWHH',
        price: -50
      });
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
      assert.strictEqual(res.body.error.code, 'INVALID_PRICE_VALUE');
    });

    // 5. Validation failure on POST /api/prices: missing productId
    await test('POST /api/prices returns HTTP 400 when productId is missing', async () => {
      const res = await request(server, { path: '/api/prices', method: 'POST' }, {
        price: 4499
      });
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
      assert.strictEqual(res.body.error.code, 'MISSING_PRODUCT_ID');
    });

    // 6. 404 Route handling
    await test('GET /api/nonexistent-route returns standardized 404 error schema', async () => {
      const res = await request(server, { path: '/api/nonexistent-route', method: 'GET' });
      assert.strictEqual(res.status, 404);
      assert.strictEqual(res.body.success, false);
      assert.strictEqual(res.body.error.code, 'ROUTE_NOT_FOUND');
    });

    // 7. Security Headers check (Helmet)
    await test('Responses include Helmet security headers (x-content-type-options)', async () => {
      const res = await request(server, { path: '/api/health', method: 'GET' });
      assert.strictEqual(res.headers['x-content-type-options'], 'nosniff');
    });

  } finally {
    server.close();
  }

  console.log(`\nResults: ${passed}/${total} tests passed.\n`);

  if (passed !== total) {
    process.exit(1);
  }
}

runSuite().catch((err) => {
  console.error('Test suite runner crashed:', err);
  process.exit(1);
});
