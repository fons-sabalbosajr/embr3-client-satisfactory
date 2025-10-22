'use strict';
const fs = require('fs');
const path = require('path');

// Ensure SPA rewrites file exists in dist for Render static hosting
const distDir = path.resolve(__dirname, '..', 'dist');
const srcStatic = path.resolve(__dirname, '..', 'static.json');
const dstStatic = path.join(distDir, 'static.json');

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
} catch (err) {
  console.error('[postbuild] Failed to write static.json:', err);
  process.exit(1);
}
