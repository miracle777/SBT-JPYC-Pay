export interface ShopInfo {
  id: string;
  name: string;
  address: string;
  walletAddress: string;
  chainId: number; // 本番ネットワークのチェーンID
  logoUrl: string;
  description: string;
}

// 店舗情報（現在はモック、将来的にはSupabaseから取得）
export const SHOP_INFO: ShopInfo = {
  id: 'shop-001',
  name: 'SBT JPYC Pay Demo Store',
  address: 'Tokyo, Japan',
  walletAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f8f5C8',
  chainId: 137, // Polygon Mainnet
  logoUrl: 'https://via.placeholder.com/100?text=Shop',
  description: 'デモンストレーション用の店舗',
};

export const getShopInfo = (): ShopInfo => {
  // 将来的には、Supabaseから取得するようにする
  return SHOP_INFO;
};
