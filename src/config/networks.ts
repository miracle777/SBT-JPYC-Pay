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
// Sepoliaでは2つのJPYCコントラクトが存在するため、配列で管理
export const JPYC_DEV_CONTRACTS: Record<number, string[]> = {
  // Testnet - 複数のJPYCコントラクトに対応
  [NETWORKS.ETHEREUM_SEPOLIA.chainId]: [
    '0xd3eF95d29A198868241FE374A999fc25F6152253',
    '0x431D5dfF03120AFA4bDf332c61A6e1766eF37BDB',
  ],
  // 他のネットワークは単一アドレス
  [NETWORKS.POLYGON_AMOY.chainId]: ['0xE7C3D8C9a439feDe00D2600032D5dB0Be71C3c29'],
  [NETWORKS.POLYGON_MAINNET.chainId]: ['0xE7C3D8C9a439feDe00D2600032D5dB0Be71C3c29'],
  [NETWORKS.ETHEREUM_MAINNET.chainId]: ['0xE7C3D8C9a439feDe00D2600032D5dB0Be71C3c29'],
  [NETWORKS.AVALANCHE_MAINNET.chainId]: ['0xE7C3D8C9a439feDe00D2600032D5dB0Be71C3c29'],
  [NETWORKS.AVALANCHE_FUJI.chainId]: ['0xE7C3D8C9a439feDe00D2600032D5dB0Be71C3c29'],
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
