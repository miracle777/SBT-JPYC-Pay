export interface Network {
  id: number;
  name: string;
  displayName: string;
  rpcUrl: string;
  chainId: number;
  currencySymbol: string;
  blockExplorerUrl: string;
  isTestnet: boolean;
  backupRpcUrls?: string[];
}

export interface Currency {
  symbol: string;
  name: string;
  decimals: number;
  contractAddress: Record<number, string>; // chainId -> address
}

export const NETWORKS: Record<string, Network> = {
  // Polygon
  POLYGON_MAINNET: {
    id: 137,
    name: 'polygon-mainnet',
    displayName: 'Polygon Mainnet',
    rpcUrl: 'https://polygon-mainnet.infura.io/v3/',
    chainId: 137,
    currencySymbol: 'POL',
    blockExplorerUrl: 'https://polygonscan.com',
    isTestnet: false,
  },
  POLYGON_AMOY: {
    id: 80002,
    name: 'polygon-amoy',
    displayName: 'Polygon Amoy (Testnet)',
    rpcUrl: 'https://rpc-amoy.polygon.technology',
    chainId: 80002,
    currencySymbol: 'POL',
    blockExplorerUrl: 'https://amoy.polygonscan.com',
    isTestnet: true,
    // バックアップRPCエンドポイント
    backupRpcUrls: [
      'https://polygon-amoy-bor-rpc.publicnode.com',
      'https://polygon-amoy.drpc.org',
      'https://rpc.ankr.com/polygon_amoy'
    ],
  },

  // Ethereum
  ETHEREUM_MAINNET: {
    id: 1,
    name: 'ethereum-mainnet',
    displayName: 'Ethereum Mainnet',
    rpcUrl: 'https://mainnet.infura.io/v3/',
    chainId: 1,
    currencySymbol: 'ETH',
    blockExplorerUrl: 'https://etherscan.io',
    isTestnet: false,
  },
  ETHEREUM_SEPOLIA: {
    id: 11155111,
    name: 'ethereum-sepolia',
    displayName: 'Ethereum Sepolia (Testnet)',
    rpcUrl: 'https://sepolia.infura.io/v3/',
    chainId: 11155111,
    currencySymbol: 'SepoliaETH',
    blockExplorerUrl: 'https://sepolia.etherscan.io',
    isTestnet: true,
  },

  // Avalanche
  AVALANCHE_MAINNET: {
    id: 43114,
    name: 'avalanche-mainnet',
    displayName: 'Avalanche C-Chain Mainnet',
    rpcUrl: 'https://avalanche-mainnet.infura.io/v3/',
    chainId: 43114,
    currencySymbol: 'AVAX',
    blockExplorerUrl: 'https://snowtrace.io',
    isTestnet: false,
  },
  AVALANCHE_FUJI: {
    id: 43113,
    name: 'avalanche-fuji',
    displayName: 'Avalanche Fuji Testnet',
    rpcUrl: 'https://api.avax-test.network/ext/bc/C/rpc',
    chainId: 43113,
    currencySymbol: 'AVAX',
    blockExplorerUrl: 'https://subnets-test.avax.network/c-chain',
    isTestnet: true,
  },
};

export const JPYC: Currency = {
  symbol: 'JPYC',
  name: 'Japanese Yen Coin',
  decimals: 18,
  contractAddress: {
    // Mainnet
    [NETWORKS.POLYGON_MAINNET.chainId]: '0xE7C3D8C9a439feDe00D2600032D5dB0Be71C3c29',
    [NETWORKS.ETHEREUM_MAINNET.chainId]: '0xE7C3D8C9a439feDe00D2600032D5dB0Be71C3c29',
    [NETWORKS.AVALANCHE_MAINNET.chainId]: '0xE7C3D8C9a439feDe00D2600032D5dB0Be71C3c29',
    // Testnet
    [NETWORKS.POLYGON_AMOY.chainId]: '0xE7C3D8C9a439feDe00D2600032D5dB0Be71C3c29',
    [NETWORKS.ETHEREUM_SEPOLIA.chainId]: '0x431D5dfF03120AFA4bDf332c61A6e1766eF37BDB',
    [NETWORKS.AVALANCHE_FUJI.chainId]: '0xE7C3D8C9a439feDe00D2600032D5dB0Be71C3c29',
  },
};

// JPYC開発用コントラクトアドレス（複数対応）
// テストネットワークでは公式と独自テスト用アドレスの両方に対応
export const JPYC_DEV_CONTRACTS: Record<number, string[]> = {
  // Testnet - 複数のJPYCコントラクトに対応
  [NETWORKS.ETHEREUM_SEPOLIA.chainId]: [
    '0xd3eF95d29A198868241FE374A999fc25F6152253',
    '0x431D5dfF03120AFA4bDf332c61A6e1766eF37BDB',
  ],
  // Polygon Amoy - 公式アドレスと独自テスト用アドレス
  [NETWORKS.POLYGON_AMOY.chainId]: [
    '0xE7C3D8C9a439feDe00D2600032D5dB0Be71C3c29', // 公式テスト用
    '0xcD54D62DF66f54AB3788CA17aD90d402eCD8D34a', // 独自テスト用（お客様提供）
  ],
  // Avalanche Fuji - 公式アドレスと独自テスト用アドレス
  [NETWORKS.AVALANCHE_FUJI.chainId]: [
    '0xE7C3D8C9a439feDe00D2600032D5dB0Be71C3c29', // 公式テスト用
    '0xeAB2AF47cbc02CDD73d106CA15884cAB541F5345', // 独自テスト用（お客様提供）
  ],
  // Mainnet - 単一の公式アドレス
  [NETWORKS.POLYGON_MAINNET.chainId]: ['0xE7C3D8C9a439feDe00D2600032D5dB0Be71C3c29'],
  [NETWORKS.ETHEREUM_MAINNET.chainId]: ['0xE7C3D8C9a439feDe00D2600032D5dB0Be71C3c29'],
  [NETWORKS.AVALANCHE_MAINNET.chainId]: ['0xE7C3D8C9a439feDe00D2600032D5dB0Be71C3c29'],
};

// JPYCアドレスのタイプを定義
export type JpycAddressType = 'official' | 'custom-test';

// JPYCアドレスのメタデータを取得する関数
export const getJpycContractMeta = (chainId: number, address: string): { type: JpycAddressType; label: string; description: string; symbol: string; decimals: number; debugNote?: string } => {
  const network = getNetworkByChainId(chainId);
  const isMainnet = !network?.isTestnet;
  
  // メインネットでは全て公式として扱う
  if (isMainnet) {
    return {
      type: 'official',
      label: '公式JPYC',
      description: 'JPYC公式コントラクト',
      symbol: 'JPYC',
      decimals: 18
    };
  }
  
  // テストネットでのアドレス判定
  const officialAddress = JPYC.contractAddress[chainId];
  if (address === officialAddress) {
    return {
      type: 'official',
      label: '公式テスト用JPYC',
      description: 'JPYC公式のテストネットワーク用コントラクト',
      symbol: 'JPYC',
      decimals: 18
    };
  }
  
  // 独自テスト用アドレスの場合
  if (chainId === NETWORKS.AVALANCHE_FUJI.chainId && address === '0xeAB2AF47cbc02CDD73d106CA15884cAB541F5345') {
    return {
      type: 'custom-test',
      label: 'テスト用tJPYC (Fuji)',
      description: '独自デプロイされたテスト用JPYCトークン (Avalanche Fuji)',
      symbol: 'tJPYC',
      decimals: 18,
      debugNote: '⚠️ デバッグ用トークン: このトークンは開発者が独自にミントしたもので、他のユーザーは使用できません'
    };
  }
  
  if (chainId === NETWORKS.POLYGON_AMOY.chainId && address === '0xcD54D62DF66f54AB3788CA17aD90d402eCD8D34a') {
    return {
      type: 'custom-test',
      label: 'テスト用tJPYC (Amoy)',
      description: '独自デプロイされたテスト用JPYCトークン (Polygon Amoy)',
      symbol: 'tJPYC',
      decimals: 18,
      debugNote: '⚠️ デバッグ用トークン: このトークンは開発者が独自にミントしたもので、他のユーザーは使用できません'
    };
  }
  
  // その他のアドレス
  return {
    type: 'custom-test',
    label: 'カスタムJPYC',
    description: 'カスタムJPYCトークンコントラクト',
    symbol: 'JPYC',
    decimals: 18
  };
};

export const getNetworkByChainId = (chainId: number): Network | undefined => {
  return Object.values(NETWORKS).find((net) => net.chainId === chainId);
};

export const getContractAddress = (chainId: number, currency: Currency = JPYC): string => {
  return currency.contractAddress[chainId] || '';
};

// 複数のJPYCコントラクトアドレスを取得（開発用）
export const getJpycContracts = (chainId: number): string[] => {
  return JPYC_DEV_CONTRACTS[chainId] || [getContractAddress(chainId, JPYC)];
};
