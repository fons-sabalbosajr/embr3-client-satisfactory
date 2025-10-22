'use strict';
const fs = require('fs');
const path = require('path');

// Ensure SPA rewrites file exists in dist for Render static hosting
const distDir = path.resolve(__dirname, '..', 'dist');
const srcStatic = path.resolve(__dirname, '..', 'static.json');
const dstStatic = path.join(distDir, 'static.json');
const indexHtml = path.join(distDir, 'index.html');
const notFoundHtml = path.join(distDir, '404.html');

try {
  if (!fs.existsSync(distDir)) {
    console.warn('[postbuild] dist directory not found, skipping static.json copy');
    process.exit(0);
  }

  let content;
  if (fs.existsSync(srcStatic)) {
    content = fs.readFileSync(srcStatic, 'utf8');
  } else {
    // Fallback: generate a minimal SPA rewrite file
    content = JSON.stringify({ rewrites: [{ source: '/**', destination: '/index.html' }] }, null, 2);
  }

  fs.writeFileSync(dstStatic, content, 'utf8');
  console.log('[postbuild] Wrote SPA rewrites to dist/static.json');

  // Also create a 404.html that mirrors index.html as a safety net for hosts
  // that serve 404.html on unknown routes (lets SPA boot even with 404 status)
  if (fs.existsSync(indexHtml)) {
    try {
      fs.copyFileSync(indexHtml, notFoundHtml);
      console.log('[postbuild] Created dist/404.html from index.html');
    } catch (err) {
      console.warn('[postbuild] Failed to create 404.html:', err.message);
    }
  }
} catch (err) {
  console.error('[postbuild] Failed to write static.json:', err);
  process.exit(1);
}
