const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 5000;
const HOST = '0.0.0.0';


const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

const server = http.createServer((req, res) => {
  let urlPath = req.url.split('?')[0];
  if (urlPath === '/') urlPath = '/index.html';

  // Serve config.js from environment variables (never committed to repo)
  if (urlPath === '/config.js') {
    const config = {
      firebase: {
        apiKey: process.env.FIREBASE_API_KEY,
        authDomain: process.env.FIREBASE_AUTH_DOMAIN,
        projectId: process.env.FIREBASE_PROJECT_ID,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.FIREBASE_APP_ID
      },
      paystackKey: process.env.PAYSTACK_PUBLIC_KEY,
      cloudinary: {
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
        uploadPreset: process.env.CLOUDINARY_UPLOAD_PRESET
      }
    };
    res.writeHead(200, { 'Content-Type': 'application/javascript' });
    res.end(`window.CONFIG = ${JSON.stringify(config)};`);
    return;
  }

  const filePath = path.join(__dirname, urlPath);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<h1>404 Not Found</h1>');
      } else {
        res.writeHead(500);
        res.end('Internal Server Error');
      }
      return;
    }

    const ext = path.extname(filePath);
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Please stop the existing process and restart.`);
    process.exit(1);
  } else {
    throw err;
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Server running at http://${HOST}:${PORT}/`);
});
