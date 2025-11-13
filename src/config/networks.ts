export interface Network {
  id: number;
  name: string;
  displayName: string;
  rpcUrl: string;
  chainId: number;
  currencySymbol: string;
  blockExplorerUrl: string;
  isTestnet: boolean;
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
    currencySymbol: 'MATIC',
    blockExplorerUrl: 'https://polygonscan.com',
    isTestnet: false,
  },
  POLYGON_AMOY: {
    id: 80002,
    name: 'polygon-amoy',
    displayName: 'Polygon Amoy (Testnet)',
    rpcUrl: 'https://rpc-amoy.polygon.technology',
    chainId: 80002,
    currencySymbol: 'MATIC',
    blockExplorerUrl: 'https://amoy.polygonscan.com',
    isTestnet: true,
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
};

export const JPYC: Currency = {
  symbol: 'JPYC',
  name: 'Japanese Yen Coin',
  decimals: 18,
  contractAddress: {
    // Mainnet
    [NETWORKS.POLYGON_MAINNET.chainId]: '0x6ae7dda427d54fcb3e5b88e0bae5f5c8c5f5c8c8',
    [NETWORKS.ETHEREUM_MAINNET.chainId]: '0x431D5dfF03120AFA4bDf332c61A6e1766eF37BDB',
    // Testnet
    [NETWORKS.POLYGON_AMOY.chainId]: '0x8ca1d8dabaa60231af875599558beb0a5aedd52b',
    [NETWORKS.ETHEREUM_SEPOLIA.chainId]: '0x431D5dfF03120AFA4bDf332c61A6e1766eF37BDB',
  },
};

export const getNetworkByChainId = (chainId: number): Network | undefined => {
  return Object.values(NETWORKS).find((net) => net.chainId === chainId);
};

export const getContractAddress = (chainId: number, currency: Currency = JPYC): string => {
  return currency.contractAddress[chainId] || '';
};
