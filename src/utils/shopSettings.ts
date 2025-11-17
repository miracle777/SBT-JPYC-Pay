/**
 * 店舗設定管理ユーティリティ
 */

import { DEFAULT_SHOP_INFO } from '../config/shop';

export interface ShopSettings {
  name: string;
  id: string;
  category: string;
  description: string;
}

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
        id: config.id || DEFAULT_SHOP_INFO.id,
        category: config.category || '',
        description: config.description || '',
      };
    }
  } catch (error) {
    console.warn('店舗設定読み込みエラー:', error);
  }

  // デフォルト値を返す
  return {
    name: DEFAULT_SHOP_INFO.name,
    id: DEFAULT_SHOP_INFO.id,
    category: '',
    description: '',
  };
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
 */
export function getSBTRank(requiredVisits: number): 'bronze' | 'silver' | 'gold' | 'platinum' {
  if (requiredVisits >= 50) return 'platinum';
  if (requiredVisits >= 20) return 'gold';
  if (requiredVisits >= 10) return 'silver';
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