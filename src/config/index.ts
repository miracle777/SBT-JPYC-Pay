import { NetworkConfig, SUPPORTED_CHAINS } from '../types';

// ========================================
// Network Configurations
// ========================================

export const NETWORKS: Record<number, NetworkConfig> = {
  [SUPPORTED_CHAINS.ETHEREUM]: {
    chainId: SUPPORTED_CHAINS.ETHEREUM,
    name: 'Ethereum Mainnet',
    rpcUrl: 'https://eth-mainnet.alchemyapi.io/v2/demo',
    blockExplorerUrl: 'https://etherscan.io',
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18,
    },
    jpycAddress: '0xE7C3D8C9a439feDe00D2600032D5dB0Be71C3c29',
  },
  [SUPPORTED_CHAINS.POLYGON]: {
    chainId: SUPPORTED_CHAINS.POLYGON,
    name: 'Polygon',
    rpcUrl: 'https://polygon-rpc.com',
    blockExplorerUrl: 'https://polygonscan.com',
    nativeCurrency: {
      name: 'Polygon',
      symbol: 'MATIC',
      decimals: 18,
    },
    jpycAddress: '0xE7C3D8C9a439feDe00D2600032D5dB0Be71C3c29',
  },
  [SUPPORTED_CHAINS.AVALANCHE]: {
    chainId: SUPPORTED_CHAINS.AVALANCHE,
    name: 'Avalanche',
    rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
    blockExplorerUrl: 'https://snowtrace.io',
    nativeCurrency: {
      name: 'Avalanche',
      symbol: 'AVAX',
      decimals: 18,
    },
    jpycAddress: '0xE7C3D8C9a439feDe00D2600032D5dB0Be71C3c29',
  },
  // テストネット
  [SUPPORTED_CHAINS.SEPOLIA]: {
    chainId: SUPPORTED_CHAINS.SEPOLIA,
    name: 'Sepolia',
    rpcUrl: 'https://sepolia.infura.io/v3/demo',
    blockExplorerUrl: 'https://sepolia.etherscan.io',
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18,
    },
  },
  [SUPPORTED_CHAINS.POLYGON_MUMBAI]: {
    chainId: SUPPORTED_CHAINS.POLYGON_MUMBAI,
    name: 'Polygon Mumbai',
    rpcUrl: 'https://rpc-mumbai.maticvigil.com',
    blockExplorerUrl: 'https://mumbai.polygonscan.com',
    nativeCurrency: {
      name: 'Polygon',
      symbol: 'MATIC',
      decimals: 18,
    },
  },
  [SUPPORTED_CHAINS.AVALANCHE_FUJI]: {
    chainId: SUPPORTED_CHAINS.AVALANCHE_FUJI,
    name: 'Avalanche Fuji',
    rpcUrl: 'https://api.avax-test.network/ext/bc/C/rpc',
    blockExplorerUrl: 'https://testnet.snowtrace.io',
    nativeCurrency: {
      name: 'Avalanche',
      symbol: 'AVAX',
      decimals: 18,
    },
  },
};

// ========================================
// Default Network (Polygon)
// ========================================

export const DEFAULT_CHAIN_ID = SUPPORTED_CHAINS.POLYGON;
export const DEFAULT_NETWORK = NETWORKS[DEFAULT_CHAIN_ID];

// ========================================
// Contract Addresses (per network)
// ========================================

export const CONTRACTS = {
  [SUPPORTED_CHAINS.ETHEREUM]: {
    JPYC_STAMP_SBT: '0x0000000000000000000000000000000000000000', // Deploy後に更新
  },
  [SUPPORTED_CHAINS.POLYGON]: {
    JPYC_STAMP_SBT: '0x0000000000000000000000000000000000000000', // Deploy後に更新
  },
  [SUPPORTED_CHAINS.AVALANCHE]: {
    JPYC_STAMP_SBT: '0x0000000000000000000000000000000000000000', // Deploy後に更新
  },
  // テストネット
  [SUPPORTED_CHAINS.SEPOLIA]: {
    JPYC_STAMP_SBT: '0x0000000000000000000000000000000000000000',
  },
  [SUPPORTED_CHAINS.POLYGON_MUMBAI]: {
    JPYC_STAMP_SBT: '0x0000000000000000000000000000000000000000',
  },
  [SUPPORTED_CHAINS.AVALANCHE_FUJI]: {
    JPYC_STAMP_SBT: '0x0000000000000000000000000000000000000000',
  },
};

// ========================================
// Application Configuration
// ========================================

export const APP_CONFIG = {
  name: 'SBT JPYC Pay',
  version: '1.0.0',
  description: 'SBTスタンプカード発行・QR決済管理システム',
  url: typeof window !== 'undefined' ? window.location.origin : '',
  social: {
    github: 'https://github.com/miracle777/SBT-JPYC-Pay',
  },
};

// ========================================
// Pinata Configuration
// ========================================

export const PINATA_CONFIG = {
  apiKey: import.meta.env.VITE_PINATA_API_KEY || '',
  apiSecret: import.meta.env.VITE_PINATA_API_SECRET || '',
  jwt: import.meta.env.VITE_PINATA_JWT || '',
  baseUrl: 'https://api.pinata.cloud',
  gateway: 'https://gateway.pinata.cloud/ipfs',
  // 日本語ファイル名対応のため代替ゲートウェイも設定
  alternativeGateways: [
    'https://ipfs.io/ipfs',
    'https://cloudflare-ipfs.com/ipfs',
    'https://dweb.link/ipfs',
  ],
};

// ========================================
// WalletConnect Configuration  
// ========================================

export const WALLETCONNECT_CONFIG = {
  projectId: import.meta.env.VITE_WALLET_CONNECT_PROJECT_ID || '',
  chains: [
    SUPPORTED_CHAINS.ETHEREUM,
    SUPPORTED_CHAINS.POLYGON,
    SUPPORTED_CHAINS.AVALANCHE,
  ],
  showQrModal: true,
  qrModalOptions: {
    themeMode: 'light' as const,
    themeVariables: {
      '--wcm-z-index': '9999',
    },
  },
};

// ========================================
// Local Storage Keys
// ========================================

export const STORAGE_KEYS = {
  WALLET_CONNECTION: 'jpyc-sbt-wallet-connected',
  LAST_NETWORK: 'jpyc-sbt-last-network',
  SHOP_SETTINGS: 'jpyc-sbt-shop-settings',
  STAMP_CARDS: 'jpyc-sbt-stamp-cards',
  USER_PREFERENCES: 'jpyc-sbt-user-preferences',
} as const;

// ========================================
// API Configuration
// ========================================

export const API_CONFIG = {
  timeout: 30000, // 30 seconds
  retries: 3,
  retryDelay: 1000, // 1 second
};

// ========================================
// UI Configuration
// ========================================

export const UI_CONFIG = {
  animations: {
    duration: {
      fast: 150,
      normal: 300,
      slow: 500,
    },
  },
  breakpoints: {
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
  },
  qrCode: {
    size: 300,
    margin: 2,
    errorCorrectionLevel: 'M' as const,
    colorDark: '#000000',
    colorLight: '#ffffff',
  },
  toast: {
    position: 'top-center' as const,
    duration: {
      success: 3000,
      error: 5000,
      warning: 4000,
      info: 3000,
    },
  },
} as const;

// ========================================
// Feature Flags
// ========================================

export const FEATURES = {
  ENABLE_TESTNET: import.meta.env.MODE !== 'production',
  ENABLE_DEBUG_LOGS: import.meta.env.MODE === 'development',
  ENABLE_ANALYTICS: import.meta.env.MODE === 'production',
  ENABLE_PWA: true,
  ENABLE_NOTIFICATIONS: true,
} as const;

// ========================================
// Gas Price Configuration (in Gwei)
// ========================================

export const GAS_PRICES = {
  [SUPPORTED_CHAINS.ETHEREUM]: {
    slow: 20,
    standard: 25,
    fast: 30,
  },
  [SUPPORTED_CHAINS.POLYGON]: {
    slow: 30,
    standard: 35,
    fast: 40,
  },
  [SUPPORTED_CHAINS.AVALANCHE]: {
    slow: 25,
    standard: 30,
    fast: 35,
  },
} as const;

// ========================================
// Validation Rules
// ========================================

export const VALIDATION = {
  shop: {
    name: {
      minLength: 2,
      maxLength: 50,
    },
    description: {
      maxLength: 200,
    },
    requiredVisits: {
      min: 1,
      max: 100,
    },
  },
  sbt: {
    metadata: {
      name: {
        maxLength: 100,
      },
      description: {
        maxLength: 500,
      },
    },
  },
  address: {
    pattern: /^0x[a-fA-F0-9]{40}$/,
  },
  file: {
    image: {
      maxSize: 10 * 1024 * 1024, // 10MB
      allowedTypes: ['image/png', 'image/jpg', 'image/jpeg', 'image/svg+xml'],
    },
  },
} as const;