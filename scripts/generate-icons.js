/**
 * Generate PWA icon PNGs from the SVG source.
 * 
 * OPTION 1: Quick & easy (recommended)
 * Open public/icons/icon-512.svg in your browser, screenshot it, 
 * or use an online SVG-to-PNG converter like https://svgtopng.com
 * Save as icon-192.png (192x192) and icon-512.png (512x512)
 * 
 * OPTION 2: Use sharp (Node.js)
 * npm install sharp --save-dev
 * Then run: node scripts/generate-icons.js
 */

try {
  const sharp = require('sharp');
  const path = require('path');

  const svgPath = path.join(__dirname, '..', 'public', 'icons', 'icon-512.svg');
  const outDir = path.join(__dirname, '..', 'public', 'icons');

  async function generate() {
    await sharp(svgPath).resize(512, 512).png().toFile(path.join(outDir, 'icon-512.png'));
    await sharp(svgPath).resize(192, 192).png().toFile(path.join(outDir, 'icon-192.png'));
    console.log('✓ Icons generated: icon-192.png, icon-512.png');
  }

  generate().catch(console.error);
} catch (e) {
  console.log('sharp not installed. Install it with: npm install sharp --save-dev');
  console.log('Or manually convert public/icons/icon-512.svg to PNG at 192x192 and 512x512.');
  console.log('Online tool: https://svgtopng.com');
}
