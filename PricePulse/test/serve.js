/**
 * PricePulse - Lightweight Local Test Server
 * Serves the deterministic product test page on http://localhost:3000/product.html
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const FILE_PATH = path.join(__dirname, 'product.html');

const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url === '/product.html') {
    fs.readFile(FILE_PATH, (err, content) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Error loading product.html: ' + err.message);
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(content);
    });
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found. Visit http://localhost:3000/product.html');
  }
});

server.listen(PORT, () => {
  console.log(`\n==================================================`);
  console.log(`⚡ PricePulse Test Server Running!`);
  console.log(`👉 Open: http://localhost:3000/product.html in Chrome`);
  console.log(`==================================================\n`);
});
