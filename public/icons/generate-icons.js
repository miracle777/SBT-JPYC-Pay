#!/usr/bin/env node
/**
 * PWAアイコン生成スクリプト
 * 使用方法: node generate-icons.js
 * 
 * 必要なライブラリのインストール:
 * npm install sharp
 */

const fs = require('fs');
const path = require('path');

// 必須ライブラリのチェック
let sharp;
try {
  sharp = require('sharp');
} catch (error) {
  console.error('❌ sharpをインストールしてください: npm install sharp');
  console.log('💡 アイコン生成の代替案:');
  console.log('   1. Figma: PWAアイコンテンプレートで作成 (https://www.figma.com)');
  console.log('   2. Canva: PWAアイコンテンプレート (https://www.canva.com)');
  console.log('   3. Online Tools: https://www.favicon-generator.org');
  process.exit(1);
}

const iconDir = __dirname;
const colors = {
  primary: '#7c3aed',    // Purple
  secondary: '#06b6d4',  // Cyan
  accent: '#ec4899',     // Pink
};

/**
 * SVGから画像を生成
 */
async function generateIcon(svgPath, outputPath, size) {
  try {
    await sharp(svgPath)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .png()
      .toFile(outputPath);
    console.log(`✅ ${outputPath}`);
  } catch (error) {
    console.error(`❌ ${outputPath}: ${error.message}`);
  }
}

/**
 * SVGアイコンを作成
 */
function createMainSVG() {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="512" height="512" fill="white"/>
  
  <!-- Gradient -->
  <defs>
    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#7c3aed;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#06b6d4;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Main circle -->
  <circle cx="256" cy="256" r="220" fill="url(#grad1)"/>
  
  <!-- Card/Stamp icon -->
  <rect x="140" y="180" width="240" height="160" rx="20" fill="white" opacity="0.95"/>
  
  <!-- Stamp circles (スタンプ) -->
  <circle cx="170" cy="220" r="18" fill="none" stroke="${colors.accent}" stroke-width="3"/>
  <path d="M 165 225 L 170 230 L 180 215" stroke="${colors.accent}" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  
  <circle cx="250" cy="220" r="18" fill="none" stroke="${colors.accent}" stroke-width="3"/>
  <path d="M 245 225 L 250 230 L 260 215" stroke="${colors.accent}" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  
  <circle cx="330" cy="220" r="18" fill="none" stroke="${colors.accent}" stroke-width="3"/>
  <path d="M 325 225 L 330 230 L 340 215" stroke="${colors.accent}" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  
  <!-- Text: SBT -->
  <text x="256" y="290" font-size="48" font-weight="bold" fill="${colors.primary}" text-anchor="middle" font-family="Arial, sans-serif">SBT</text>
  <text x="256" y="330" font-size="20" fill="${colors.secondary}" text-anchor="middle" font-family="Arial, sans-serif">Pay</text>
</svg>`;
  
  const mainIconPath = path.join(iconDir, 'icon-main.svg');
  fs.writeFileSync(mainIconPath, svg);
  console.log(`✅ ${mainIconPath} (SVG)`);
  return mainIconPath;
}

/**
 * Maskable用SVGを作成
 */
function createMaskableSVG() {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <!-- Maskable icon should use full canvas -->
  <rect width="512" height="512" fill="white"/>
  
  <!-- Gradient -->
  <defs>
    <linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#7c3aed;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#06b6d4;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Full circle for maskable -->
  <circle cx="256" cy="256" r="256" fill="url(#grad2)"/>
  
  <!-- Icon inside -->
  <g transform="translate(256, 256)">
    <!-- Card -->
    <rect x="-100" y="-60" width="200" height="120" rx="15" fill="white" opacity="0.9"/>
    
    <!-- Stamps -->
    <circle cx="-45" cy="-30" r="12" fill="none" stroke="white" stroke-width="2"/>
    <path d="M -50 -25 L -45 -20 L -35 -35" stroke="white" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    
    <circle cx="0" cy="-30" r="12" fill="none" stroke="white" stroke-width="2"/>
    <path d="M -5 -25 L 0 -20 L 10 -35" stroke="white" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    
    <circle cx="45" cy="-30" r="12" fill="none" stroke="white" stroke-width="2"/>
    <path d="M 40 -25 L 45 -20 L 55 -35" stroke="white" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    
    <!-- Text -->
    <text x="0" y="20" font-size="32" font-weight="bold" fill="white" text-anchor="middle" font-family="Arial, sans-serif">SBT</text>
  </g>
</svg>`;
  
  const maskIconPath = path.join(iconDir, 'icon-maskable.svg');
  fs.writeFileSync(maskIconPath, svg);
  console.log(`✅ ${maskIconPath} (SVG - Maskable)`);
  return maskIconPath;
}

/**
 * スクリーンショット用SVGを作成
 */
function createScreenshotSVG(isWide = false) {
  const width = isWide ? 1280 : 540;
  const height = isWide ? 720 : 720;
  
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="${width}" height="${height}" fill="white"/>
  
  <!-- Header -->
  <rect width="${width}" height="80" fill="url(#grad3)"/>
  <text x="${width/2}" y="55" font-size="48" font-weight="bold" fill="white" text-anchor="middle" font-family="Arial, sans-serif">SBT JPYC Pay</text>
  
  <!-- Content -->
  <g transform="translate(40, 120)">
    ${isWide ? `
      <!-- Two column layout for wide -->
      <rect width="${width/2 - 60}" height="500" rx="20" fill="#f3f4f6" stroke="#e5e7eb" stroke-width="2"/>
      <text x="${width/4 - 30}" y="50" font-size="28" font-weight="bold" fill="#1f2937" font-family="Arial, sans-serif">SBT管理</text>
      <rect x="10" y="70" width="${width/2 - 80}" height="60" rx="12" fill="white" stroke="#d1d5db" stroke-width="2"/>
      <text x="20" y="105" font-size="16" fill="#6b7280" font-family="Arial, sans-serif">テンプレート一覧</text>
      
      <rect x="${width/2 - 20}" y="0" width="${width/2 - 60}" height="500" rx="20" fill="#f3f4f6" stroke="#e5e7eb" stroke-width="2"/>
      <text x="${width - 40}" y="50" font-size="28" font-weight="bold" fill="#1f2937" font-family="Arial, sans-serif">QR決済</text>
      <rect x="${width/2}" y="70" width="${width/2 - 80}" height="60" rx="12" fill="white" stroke="#d1d5db" stroke-width="2"/>
    ` : `
      <!-- Single column layout for narrow -->
      <rect width="${width - 80}" height="500" rx="20" fill="#f3f4f6" stroke="#e5e7eb" stroke-width="2"/>
      <text x="${(width - 80)/2}" y="50" font-size="24" font-weight="bold" fill="#1f2937" text-anchor="middle" font-family="Arial, sans-serif">SBT管理画面</text>
      <rect x="20" y="80" width="${width - 120}" height="60" rx="12" fill="white" stroke="#d1d5db" stroke-width="2"/>
      <text x="40" y="115" font-size="14" fill="#6b7280" font-family="Arial, sans-serif">テンプレート・発行管理</text>
    `}
  </g>
  
  <!-- Gradient definition -->
  <defs>
    <linearGradient id="grad3" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#7c3aed;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#06b6d4;stop-opacity:1" />
    </linearGradient>
  </defs>
</svg>`;
  
  const suffix = isWide ? '-1280x720' : '-540x720';
  const screenshotPath = path.join(iconDir, `screenshot${suffix}.svg`);
  fs.writeFileSync(screenshotPath, svg);
  console.log(`✅ ${screenshotPath} (SVG - Screenshot)`);
  return screenshotPath;
}

/**
 * ショートカット用SVGを作成
 */
function createShortcutSVG(type = 'sbt') {
  const isSBT = type === 'sbt';
  const bgColor = isSBT ? '#7c3aed' : '#06b6d4';
  const icon = isSBT 
    ? '<text x="48" y="65" font-size="60" font-weight="bold" fill="white" text-anchor="middle" font-family="Arial, sans-serif">SBT</text>'
    : '<path d="M 48 30 L 60 40 L 48 50 L 48 30 M 48 50 L 36 40 L 48 30" stroke="white" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>';
  
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="96" height="96" viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">
  <rect width="96" height="96" rx="20" fill="${bgColor}"/>
  ${icon}
</svg>`;
  
  const shortcutPath = path.join(iconDir, `shortcut-${type}-96x96.svg`);
  fs.writeFileSync(shortcutPath, svg);
  console.log(`✅ ${shortcutPath} (SVG - Shortcut)`);
  return shortcutPath;
}

/**
 * メイン処理
 */
async function generateAll() {
  console.log('🎨 PWAアイコン生成スクリプト\n');
  
  console.log('📝 SVG生成中...');
  const mainSvg = createMainSVG();
  const maskableSvg = createMaskableSVG();
  const screenshotNarrowSvg = createScreenshotSVG(false);
  const screenshotWideSvg = createScreenshotSVG(true);
  const shortcutSbtSvg = createShortcutSVG('sbt');
  const shortcutPaymentSvg = createShortcutSVG('payment');
  
  console.log('\n📦 PNG変換中 (sharpで処理)...');
  
  try {
    // Main icons
    await generateIcon(mainSvg, path.join(iconDir, 'icon-192x192.png'), 192);
    await generateIcon(mainSvg, path.join(iconDir, 'icon-512x512.png'), 512);
    
    // Maskable icons
    await generateIcon(maskableSvg, path.join(iconDir, 'icon-192x192-maskable.png'), 192);
    await generateIcon(maskableSvg, path.join(iconDir, 'icon-512x512-maskable.png'), 512);
    
    // Screenshots
    await generateIcon(screenshotNarrowSvg, path.join(iconDir, 'screenshot-540x720.png'), undefined);
    await generateIcon(screenshotWideSvg, path.join(iconDir, 'screenshot-1280x720.png'), undefined);
    
    // Shortcuts
    await generateIcon(shortcutSbtSvg, path.join(iconDir, 'shortcut-sbt-96x96.png'), 96);
    await generateIcon(shortcutPaymentSvg, path.join(iconDir, 'shortcut-payment-96x96.png'), 96);
    
    console.log('\n✅ アイコン生成完了！');
    console.log('\n📋 生成されたファイル:');
    console.log('   - icon-192x192.png, icon-512x512.png');
    console.log('   - icon-192x192-maskable.png, icon-512x512-maskable.png');
    console.log('   - screenshot-540x720.png, screenshot-1280x720.png');
    console.log('   - shortcut-sbt-96x96.png, shortcut-payment-96x96.png');
    console.log('\n💡 これらのファイルは /public/icons に配置されます');
  } catch (error) {
    console.error('\n❌ PNG変換エラー:', error.message);
    console.log('\n⚠️ 手作業での対応方法:');
    console.log('1. SVGファイルは生成されました (/public/icons/*.svg)');
    console.log('2. 以下のオンラインツールでPNG変換してください:');
    console.log('   - https://cloudconvert.com/svg-to-png');
    console.log('   - https://svg2png.online.fr');
  }
}

generateAll().catch(console.error);
