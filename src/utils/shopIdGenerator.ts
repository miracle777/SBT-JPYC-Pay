/**
 * ショップID生成ユーティリティ
 * サーバーなしでショップIDを一意に生成するための関数群
 */

import { v4 as uuidv4 } from 'uuid';

/**
 * UUID v4 を 32bit の整数に変換（0-4294967295）
 * 衝突確率：16進数 32桁中ランダムに選ばれた値なので、かなり低い
 */
export function generateUniqueShopId(): number {
  // UUID v4 を生成
  const uuid = uuidv4();
  
  // UUID の最初の 8 文字を16進数として取得
  const hexPart = uuid.replace(/-/g, '').substring(0, 8);
  
  // 32bit の符号なし整数に変換（0 ～ 4,294,967,295）
  const shopId = parseInt(hexPart, 16);
  
  // 0 や 1 は予約される可能性があるので、1000 以上にする
  return Math.max(shopId, 1000);
}

/**
 * タイムスタンプベースのショップID生成
 * より連続性がある ID が必要な場合に使用
 * 形式: タイムスタンプ(ms) + ランダム(3桁)
 */
export function generateShopIdFromTimestamp(): number {
  const timestamp = Date.now(); // ミリ秒単位のタイムスタンプ
  const random = Math.floor(Math.random() * 1000); // 0-999 のランダム数
  
  // タイムスタンプとランダム値を組み合わせ
  const combined = (timestamp % 10000000000) * 1000 + random;
  
  return combined;
}

/**
 * ウォレットアドレスとタイムスタンプから決定的に生成
 * 同じウォレット + 日時 で同じID が生成される（再現性がある）
 */
export function generateShopIdFromAddress(
  walletAddress: string,
  timestamp: number = Date.now()
): number {
  // ウォレットアドレスのハッシュを計算（簡易版）
  let hash = 0;
  for (let i = 0; i < walletAddress.length; i++) {
    const char = walletAddress.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // 32bit 整数に変換
  }
  
  // タイムスタンプとハッシュを組み合わせ
  const combined = Math.abs(hash ^ (timestamp >> 10));
  
  // 1000 以上のIを確保
  return Math.max(combined, 1000);
}

/**
 * 複数のショップID候補から衝突を避ける ID を選択
 * ローカルストレージに保存されたIDと比較して未使用の ID を返す
 */
export function generateNonConflictingShopId(
  existingTemplates: Array<{ id: string; shopId?: number }>
): number {
  // 既存のショップIDを収集
  const existingIds = new Set<number>();
  
  // 予約済みのショップID（初期テンプレート用）
  existingIds.add(1); // スタンプカード
  existingIds.add(2); // マイルストーン達成
  existingIds.add(3); // キャンペーン記念
  
  // localStorage に保存された使用済みショップIDを確認
  try {
    const usedShopIds = JSON.parse(localStorage.getItem('used-shop-ids') || '[]');
    for (const id of usedShopIds) {
      if (typeof id === 'number') {
        existingIds.add(id);
      }
    }
  } catch (error) {
    console.warn('使用済みショップID取得エラー:', error);
  }
  
  // localStorage に保存されたテンプレートのショップID を確認
  try {
    const saved = localStorage.getItem('sbt-templates');
    if (saved) {
      const templates = JSON.parse(saved);
      for (const template of templates) {
        if (template.shopId) {
          existingIds.add(template.shopId);
        }
      }
    }
  } catch (error) {
    console.warn('localStorage からのショップID 取得エラー:', error);
  }

  // 既存のテンプレートから取得
  for (const template of existingTemplates) {
    if (template.shopId) {
      existingIds.add(template.shopId);
    }
  }

  // 衝突していない ID を見つけるまでループ
  let shopId: number;
  let attempts = 0;
  const maxAttempts = 100;

  do {
    shopId = generateUniqueShopId();
    attempts++;

    if (attempts >= maxAttempts) {
      // 万が一100回で見つからなかった場合は、タイムスタンプ方式に切り替え
      shopId = generateShopIdFromTimestamp();
      break;
    }
  } while (existingIds.has(shopId));

  console.log(`🆔 新規ショップID生成: ${shopId} (既存ID数: ${existingIds.size})`);
  return shopId;
}

/**
 * ショップID の検証
 */
export function validateShopId(shopId: any): boolean {
  if (typeof shopId !== 'number') {
    return false;
  }
  
  // 正の整数かつ 1000 以上
  return Number.isInteger(shopId) && shopId >= 1000 && shopId <= 4294967295;
}

/**
 * ショップID を 16 進数の短縮形で表現（表示用）
 */
export function formatShopIdAsHex(shopId: number): string {
  return '0x' + shopId.toString(16).toUpperCase().padStart(8, '0');
}

/**
 * ショップID をQRコード規格に合わせた形式で生成
 * 例：SHOP-80002-12345678
 */
export function formatShopIdForQR(shopId: number, chainId: number = 80002): string {
  return `SHOP-${chainId}-${shopId}`;
}
