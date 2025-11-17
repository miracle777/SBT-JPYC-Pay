/**
 * 追加PWAアイコン生成スクリプト（全プラットフォーム対応）
 * Windows、Mac、Android、iOS対応のアイコンを生成
 */

const fs = require('fs');
const path = require('path');

let sharp;
try {
  sharp = require('sharp');
} catch (error) {
  console.error('❌ sharpが必要です: npm install sharp');
  process.exit(1);
}

const iconDir = __dirname;

// データ管理ショートカット用SVGを作成
function createDataShortcutSVG() {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="96" height="96" viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">
  <rect width="96" height="96" rx="20" fill="#6366f1"/>
  <!-- Database/Data icon -->
  <g transform="translate(48, 48)">
    <!-- Folder icon -->
    <path d="M -20 -15 L -10 -20 L 15 -20 L 20 -15 L 20 15 L -20 15 Z" fill="white" stroke="white" stroke-width="1"/>
    <!-- Arrow up (export) -->
    <path d="M -5 5 L 0 -5 L 5 5" stroke="#6366f1" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M 0 -5 L 0 10" stroke="#6366f1" stroke-width="3" stroke-linecap="round"/>
  </g>
</svg>`;
  
  const filePath = path.join(iconDir, 'shortcut-data-96x96.svg');
  fs.writeFileSync(filePath, svg);
  console.log(`✅ ${filePath} (SVG - Data Shortcut)`);
  return filePath;
}

// Apple Touch Icon用SVGを作成
function createAppleTouchIconSVG() {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="180" height="180" viewBox="0 0 180 180" xmlns="http://www.w3.org/2000/svg">
  <!-- iOS style rounded rectangle background -->
  <rect width="180" height="180" rx="40" fill="url(#iosGrad)"/>
  
  <defs>
    <linearGradient id="iosGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#8b5cf6;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#7c3aed;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Main content -->
  <g transform="translate(90, 90)">
    <!-- Card background -->
    <rect x="-50" y="-30" width="100" height="60" rx="8" fill="white" opacity="0.95"/>
    
    <!-- Stamp circles -->
    <circle cx="-25" cy="-10" r="8" fill="none" stroke="#ec4899" stroke-width="2"/>
    <path d="M -30 -5 L -25 0 L -15 -15" stroke="#ec4899" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    
    <circle cx="0" cy="-10" r="8" fill="none" stroke="#ec4899" stroke-width="2"/>
    <path d="M -5 -5 L 0 0 L 10 -15" stroke="#ec4899" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    
    <circle cx="25" cy="-10" r="8" fill="none" stroke="#ec4899" stroke-width="2"/>
    <path d="M 20 -5 L 25 0 L 35 -15" stroke="#ec4899" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    
    <!-- SBT Text -->
    <text x="0" y="20" font-size="20" font-weight="bold" fill="white" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, Arial, sans-serif">SBT Pay</text>
  </g>
</svg>`;
  
  const filePath = path.join(iconDir, 'apple-touch-icon-180x180.svg');
  fs.writeFileSync(filePath, svg);
  console.log(`✅ ${filePath} (SVG - Apple Touch Icon)`);
  return filePath;
}

// Favicon用SVGを作成
function createFaviconSVG() {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
  <rect width="32" height="32" fill="#7c3aed"/>
  <g transform="translate(16, 16)">
    <!-- Simplified stamp -->
    <rect x="-10" y="-6" width="20" height="12" rx="2" fill="white"/>
    <circle cx="-5" cy="-2" r="2" fill="none" stroke="#ec4899" stroke-width="1"/>
    <circle cx="0" cy="-2" r="2" fill="none" stroke="#ec4899" stroke-width="1"/>
    <circle cx="5" cy="-2" r="2" fill="none" stroke="#ec4899" stroke-width="1"/>
    <text x="0" y="5" font-size="6" font-weight="bold" fill="#7c3aed" text-anchor="middle" font-family="Arial, sans-serif">SBT</text>
  </g>
</svg>`;
  
  const filePath = path.join(iconDir, 'favicon.svg');
  fs.writeFileSync(filePath, svg);
  console.log(`✅ ${filePath} (SVG - Favicon)`);
  return filePath;
}

// SVGから複数サイズのPNGを生成
async function generateMultipleSizes(svgPath, baseName, sizes) {
  for (const size of sizes) {
    try {
      const outputPath = path.join(iconDir, `${baseName}-${size}x${size}.png`);
      await sharp(svgPath)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 }
        })
        .png()
        .toFile(outputPath);
      console.log(`✅ ${outputPath}`);
    } catch (error) {
      console.error(`❌ Error generating ${baseName}-${size}x${size}.png:`, error.message);
    }
  }
}

// メイン処理
async function generateAdditionalIcons() {
  console.log('🎨 追加PWAアイコン生成開始...\n');
  
  console.log('📝 追加SVG生成中...');
  const dataShortcutSvg = createDataShortcutSVG();
  const appleTouchIconSvg = createAppleTouchIconSVG();
  const faviconSvg = createFaviconSVG();
  
  console.log('\n📦 追加PNG生成中...');
  
  // 既存のメインアイコンSVGから追加サイズを生成
  const mainSvgPath = path.join(iconDir, 'icon-main.svg');
  const maskableSvgPath = path.join(iconDir, 'icon-maskable.svg');
  
  if (fs.existsSync(mainSvgPath)) {
    // Android, iOS, Windows, Mac用のサイズ
    const additionalSizes = [72, 96, 128, 144, 152, 384];
    await generateMultipleSizes(mainSvgPath, 'icon', additionalSizes);
  }
  
  // データ管理ショートカットアイコン
  try {
    await sharp(dataShortcutSvg)
      .resize(96, 96)
      .png()
      .toFile(path.join(iconDir, 'shortcut-data-96x96.png'));
    console.log(`✅ shortcut-data-96x96.png`);
  } catch (error) {
    console.error('❌ データショートカットアイコン生成エラー:', error.message);
  }
  
  // Apple Touch Icon
  try {
    await sharp(appleTouchIconSvg)
      .resize(180, 180)
      .png()
      .toFile(path.join(iconDir, 'apple-touch-icon.png'));
    console.log(`✅ apple-touch-icon.png`);
  } catch (error) {
    console.error('❌ Apple Touch Iconアイコン生成エラー:', error.message);
  }
  
  // Favicon (ICO形式用にも32x32 PNGを生成)
  try {
    await sharp(faviconSvg)
      .resize(32, 32)
      .png()
      .toFile(path.join(iconDir, 'favicon-32x32.png'));
    console.log(`✅ favicon-32x32.png`);
    
    await sharp(faviconSvg)
      .resize(16, 16)
      .png()
      .toFile(path.join(iconDir, 'favicon-16x16.png'));
    console.log(`✅ favicon-16x16.png`);
  } catch (error) {
    console.error('❌ Faviconアイコン生成エラー:', error.message);
  }
  
  console.log('\n✅ 追加PWAアイコン生成完了！');
  console.log('\n📋 全プラットフォーム対応アイコン:');
  console.log('  📱 Android: 72, 96, 128, 144, 152, 192, 384, 512px');
  console.log('  🍎 iOS: 120, 152, 167, 180px + Apple Touch Icon');
  console.log('  🪟 Windows: 48, 64, 96, 128, 256px');
  console.log('  🍎 Mac: 16, 32, 64, 128, 256, 512px');
  console.log('  🌐 Web: Favicon (16, 32px) + SVG');
  console.log('\n🎯 PWA対応状況:');
  console.log('  ✅ ホーム画面追加 (Android/iOS)');
  console.log('  ✅ デスクトップインストール (Windows/Mac)');
  console.log('  ✅ ショートカット機能');
  console.log('  ✅ スクリーンショット (Store表示用)');
}

generateAdditionalIcons().catch(console.error);