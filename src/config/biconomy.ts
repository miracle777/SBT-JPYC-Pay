// Biconomy Account Abstraction 設定
// ガスレストランザクション用

export const BICONOMY_CONFIG = {
  // Biconomy Bundler URL (各ネットワーク用)
  bundlerUrls: {
    // Polygon Mainnet
    137: 'https://bundler.biconomy.io/api/v2/137/nJPK7B3ru.dd7f7861-190d-41bd-af80-6877f74b8f44',
    // Polygon Amoy Testnet
    80002: 'https://bundler.biconomy.io/api/v2/80002/nJPK7B3ru.dd7f7861-190d-41bd-af80-6877f74b8f44',
    // Ethereum Sepolia Testnet
    11155111: 'https://bundler.biconomy.io/api/v2/11155111/nJPK7B3ru.dd7f7861-190d-41bd-af80-6877f74b8f44',
  },
  
  // Biconomy Paymaster URL (ガス代支払い用)
  paymasterUrls: {
    // Polygon Mainnet
    137: 'https://paymaster.biconomy.io/api/v1/137/YOUR_PAYMASTER_KEY',
    // Polygon Amoy Testnet
    80002: 'https://paymaster.biconomy.io/api/v1/80002/YOUR_PAYMASTER_KEY',
    // Ethereum Sepolia Testnet
    11155111: 'https://paymaster.biconomy.io/api/v1/11155111/YOUR_PAYMASTER_KEY',
  },
};

// 環境変数から読み込む
export const getBiconomyConfig = (chainId: number) => {
  const bundlerUrl = import.meta.env[`VITE_BICONOMY_BUNDLER_URL_${chainId}`];
  const paymasterKey = import.meta.env[`VITE_BICONOMY_PAYMASTER_KEY_${chainId}`];
  
  return {
    bundlerUrl: bundlerUrl || null,
    paymasterKey: paymasterKey || null,
  };
};

/**
 * Biconomy設定手順:
 * 
 * 1. Biconomy Dashboard にアクセス: https://dashboard.biconomy.io/
 * 2. アカウント作成 (無料)
 * 3. 新しいプロジェクトを作成
 * 4. Paymasterを有効化
 * 5. API Keyを取得
 * 6. .env.local ファイルに以下を追加:
 *    VITE_BICONOMY_BUNDLER_URL_137=https://bundler.biconomy.io/api/v2/137/YOUR_KEY
 *    VITE_BICONOMY_PAYMASTER_URL_137=https://paymaster.biconomy.io/api/v1/137/YOUR_KEY
 *    (テストネット用も同様)
 * 
 * 無料プラン制限:
 * - 月間 10,000 トランザクション
 * - テストネット: 無制限
 */
