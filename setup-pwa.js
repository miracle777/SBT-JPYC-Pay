#!/usr/bin/env node
/**
 * PWA簡易セットアップスクリプト
 * 使用方法: node setup-pwa.js
 */

const fs = require('fs');
const path = require('path');

const iconsDir = path.join(__dirname, 'public', 'icons');
const colors = {
  primary: '#7c3aed',
  secondary: '#06b6d4',
  accent: '#ec4899',
};

/**
 * ダミー PNG ファイルを生成 (アイコン用ファイルテンプレート)
 */
function createDummyIcon(filename) {
  const dummyPNG = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG signature
    0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 pixel
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, // bit depth, color type
    0xde, 0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41, // CRC, IDAT chunk
    0x54, 0x08, 0x99, 0x63, 0xf8, 0xcf, 0xc0, 0x00,
    0x00, 0x00, 0x03, 0x00, 0x01, 0x5b, 0xfb, 0x56, // image data
    0xae, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, // CRC, IEND chunk
    0x44, 0xae, 0x42, 0x60                          // PNG end
  ]);
  
  fs.writeFileSync(path.join(iconsDir, filename), dummyPNG);
}

/**
 * SVG アイコンを生成
 */
function createSVGIcon(filename, size, isMaskable = false) {
  const padding = size * 0.1;
  const contentSize = size * 0.8;
  const cardSize = contentSize;
  const cardY = (size - cardSize) / 2;
  
  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">`;

  if (isMaskable) {
    // Maskable: フルサイズの背景
    svg += `
  <rect width="${size}" height="${size}" fill="#7c3aed"/>
  <circle cx="${size/2}" cy="${size/2}" r="${size * 0.4}" fill="white" opacity="0.2"/>
  <text x="${size/2}" y="${size * 0.65}" font-size="${size * 0.35}" font-weight="bold" fill="white" text-anchor="middle" font-family="Arial, sans-serif">SBT</text>`;
  } else {
    // 通常: 白背景 + グラデーション
    svg += `
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#7c3aed;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#06b6d4;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" fill="white"/>
  <circle cx="${size/2}" cy="${size/2}" r="${size * 0.45}" fill="url(#grad)"/>
  <text x="${size/2}" y="${size * 0.65}" font-size="${size * 0.3}" font-weight="bold" fill="white" text-anchor="middle" font-family="Arial, sans-serif">SBT</text>`;
  }

  svg += `
</svg>`;

  fs.writeFileSync(path.join(iconsDir, filename), svg);
  console.log(`✅ ${filename}`);
}

/**
 * スクリーンショット SVG を生成
 */
function createScreenshotSVG() {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="540" height="720" viewBox="0 0 540 720" xmlns="http://www.w3.org/2000/svg">
  <rect width="540" height="720" fill="#f9fafb"/>
  
  <!-- Header -->
  <defs>
    <linearGradient id="headerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#7c3aed;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#06b6d4;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="540" height="80" fill="url(#headerGrad)"/>
  <text x="270" y="50" font-size="36" font-weight="bold" fill="white" text-anchor="middle" font-family="Arial, sans-serif">SBT masaru21 Pay(仮)</text>
  
  <!-- Content -->
  <rect x="20" y="120" width="500" height="500" rx="20" fill="white" stroke="#e5e7eb" stroke-width="2"/>
  <text x="270" y="170" font-size="24" font-weight="bold" fill="#1f2937" text-anchor="middle" font-family="Arial, sans-serif">SBT管理画面</text>
  
  <!-- Mock cards -->
  <rect x="40" y="200" width="460" height="80" rx="12" fill="#f3f4f6" stroke="#d1d5db" stroke-width="1"/>
  <text x="60" y="235" font-size="14" font-weight="bold" fill="#1f2937" font-family="Arial, sans-serif">テンプレート1</text>
  <rect x="40" y="300" width="460" height="80" rx="12" fill="#f3f4f6" stroke="#d1d5db" stroke-width="1"/>
  <text x="60" y="335" font-size="14" font-weight="bold" fill="#1f2937" font-family="Arial, sans-serif">テンプレート2</text>
  <rect x="40" y="400" width="460" height="80" rx="12" fill="#f3f4f6" stroke="#d1d5db" stroke-width="1"/>
  <text x="60" y="435" font-size="14" font-weight="bold" fill="#1f2937" font-family="Arial, sans-serif">テンプレート3</text>
</svg>`;

  fs.writeFileSync(path.join(iconsDir, 'screenshot-540x720.svg'), svg);
  console.log('✅ screenshot-540x720.svg');
}

/**
 * セットアップ実行
 */
function setup() {
  console.log('🎨 PWA セットアップ\n');
  
  // ディレクトリ作成
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
    console.log(`📁 ${iconsDir} を作成しました`);
  }

  console.log('\n📝 SVG アイコン生成中...\n');
  
  // SVG アイコン生成
  createSVGIcon('icon-192x192.svg', 192, false);
  createSVGIcon('icon-192x192-maskable.svg', 192, true);
  createSVGIcon('icon-512x512.svg', 512, false);
  createSVGIcon('icon-512x512-maskable.svg', 512, true);
  createSVGIcon('shortcut-sbt-96x96.svg', 96, false);
  createSVGIcon('shortcut-payment-96x96.svg', 96, false);
  createScreenshotSVG();

  console.log('\n📋 次のステップ:\n');
  console.log('1️⃣ SVG から PNG への変換:');
  console.log('   • 方法A: Canva (https://www.canva.com)');
  console.log('   • 方法B: 以下のコマンド実行:');
  console.log('      npm install sharp');
  console.log('      node public/icons/generate-icons.js\n');
  
  console.log('2️⃣ または、生成されたSVGファイルを以下のツールで変換:');
  console.log('   • https://cloudconvert.com/svg-to-png');
  console.log('   • https://svg2png.online.fr\n');
  
  console.log('3️⃣ PNG ファイルが public/icons フォルダに配置されたら:');
  console.log('   npm run build\n');
  
  console.log('📌 manifest.json は既に public/ に配置されています\n');
  
  console.log('✅ セットアップ完了！\n');
}

setup();
