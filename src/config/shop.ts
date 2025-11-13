export interface ShopInfo {
  id: string;
  name: string;
  address: string;
  chainId: number; // 本番ネットワークのチェーンID
  logoUrl: string;
  description: string;
}

// 店舗情報（現在はモック、将来的にはSupabaseから取得）
export const DEFAULT_SHOP_INFO: ShopInfo = {
  id: 'shop-001',
  name: 'SBT JPYC Pay Demo Store',
  address: 'Tokyo, Japan',
  chainId: 137, // Polygon Mainnet
  logoUrl: 'https://via.placeholder.com/100?text=Shop',
  description: 'デモンストレーション用の店舗',
};

export const getShopInfo = (): ShopInfo => {
  // 将来的には、Supabaseから取得するようにする
  return DEFAULT_SHOP_INFO;
};

/**
 * ウォレットアドレスを取得
 * 将来的にはSupabaseの店舗テーブルから、ログイン中の店舗のアドレスを取得する
 * @param walletAddress - 接続中のウォレットアドレス
 * @returns 店舗のウォレットアドレス
 */
export const getShopWalletAddress = (walletAddress?: string | null): string => {
  // 接続中のウォレットを使用する場合
  if (walletAddress) {
    return walletAddress;
  }

  // 環境変数から取得
  const envAddress = import.meta.env.VITE_SHOP_WALLET_ADDRESS;
  if (envAddress) {
    return envAddress;
  }

  // デフォルト値を返さない（ハードコードを避ける）
  return '';
};
