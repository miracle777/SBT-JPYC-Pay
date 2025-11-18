/**
 * 店舗設定管理ユーティリティ
 */

import { DEFAULT_SHOP_INFO } from '../config/shop';

export interface RankThresholds {
  bronzeMin: number;
  silverMin: number;
  goldMin: number;
  platinumMin: number;
}

export interface ShopSettings {
  name: string;
  id: string;
  category: string;
  description: string;
  rankThresholds?: RankThresholds;
}

/**
 * デフォルトのランク閾値
 */
export const DEFAULT_RANK_THRESHOLDS: RankThresholds = {
  bronzeMin: 1,
  silverMin: 10,
  goldMin: 20,
  platinumMin: 50,
};

/**
 * 店舗設定をローカルストレージから取得
 */
export function getShopSettings(): ShopSettings {
  try {
    const saved = localStorage.getItem('shop-info');
    if (saved) {
      const config = JSON.parse(saved);
      return {
        name: config.name || DEFAULT_SHOP_INFO.name,
        id: config.id || generateNewShopId(), // デフォルトのshop-001を使わず、新しいIDを生成
        category: config.category || '',
        description: config.description || '',
        rankThresholds: config.rankThresholds || DEFAULT_RANK_THRESHOLDS,
      };
    }
  } catch (error) {
    console.warn('店舗設定読み込みエラー:', error);
  }

  // デフォルト値を返す際も新しいIDを生成
  const newShopId = generateNewShopId();
  const defaultSettings: ShopSettings = {
    name: DEFAULT_SHOP_INFO.name,
    id: newShopId,
    category: '',
    description: '',
    rankThresholds: DEFAULT_RANK_THRESHOLDS,
  };

  // 自動的に保存してしまう
  saveShopSettings(defaultSettings);
  
  return defaultSettings;
}

/**
 * 新しい店舗IDを生成
 */
export function generateNewShopId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 8);
  return `shop-${timestamp}-${random}`;
}

/**
 * 店舗設定をローカルストレージに保存
 */
export function saveShopSettings(settings: ShopSettings): boolean {
  try {
    localStorage.setItem('shop-info', JSON.stringify(settings));
    console.log('✅ 店舗設定保存完了:', settings);
    return true;
  } catch (error) {
    console.error('店舗設定保存エラー:', error);
    return false;
  }
}

/**
 * SBTランクを決定
 * 必要訪問回数に応じてランクを自動設定
 * @param requiredVisits 必要訪問回数
 * @param shopSettings 店舗設定（ランク閾値を含む）
 */
export function getSBTRank(
  requiredVisits: number,
  shopSettings?: ShopSettings
): 'bronze' | 'silver' | 'gold' | 'platinum' {
  const thresholds = shopSettings?.rankThresholds || DEFAULT_RANK_THRESHOLDS;
  
  if (requiredVisits >= thresholds.platinumMin) return 'platinum';
  if (requiredVisits >= thresholds.goldMin) return 'gold';
  if (requiredVisits >= thresholds.silverMin) return 'silver';
  return 'bronze';
}

/**
 * SBTの特典リストを生成
 * テンプレートの報酬説明から特典配列を作成
 */
export function generateBenefits(rewardDescription: string): string[] {
  if (!rewardDescription.trim()) {
    return ['特典なし'];
  }

  // カンマ、改行、「・」などで区切って配列にする
  const benefits = rewardDescription
    .split(/[,、\n・]/)
    .map(item => item.trim())
    .filter(item => item.length > 0);

  return benefits.length > 0 ? benefits : [rewardDescription];
}