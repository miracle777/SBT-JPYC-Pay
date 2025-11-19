export const JPYC_STAMP_SBT_ABI = [
  // Constructor
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "owner_",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  // Events
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "approved",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      }
    ],
    "name": "Approval",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "operator",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "bool",
        "name": "approved",
        "type": "bool"
      }
    ],
    "name": "ApprovalForAll",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "previousOwner",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "newOwner",
        "type": "address"
      }
    ],
    "name": "OwnershipTransferred",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "shopId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "tokenURI",
        "type": "string"
      }
    ],
    "name": "SBTMinted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "shopId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "name",
        "type": "string"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "owner",
        "type": "address"
      }
    ],
    "name": "ShopRegistered",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "shopId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "name",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "requiredVisits",
        "type": "uint256"
      }
    ],
    "name": "ShopUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "from",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      }
    ],
    "name": "Transfer",
    "type": "event"
  },
  // Functions
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "approve",
    "outputs": [],
    "stateMutability": "pure",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      }
    ],
    "name": "balanceOf",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "user",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "shopId",
        "type": "uint256"
      }
    ],
    "name": "balanceOfShop",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address[]",
        "name": "recipients",
        "type": "address[]"
      },
      {
        "internalType": "uint256",
        "name": "shopId",
        "type": "uint256"
      },
      {
        "internalType": "string[]",
        "name": "tokenURIs_",
        "type": "string[]"
      }
    ],
    "name": "batchMintSBT",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      }
    ],
    "name": "burn",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "shopId",
        "type": "uint256"
      }
    ],
    "name": "deactivateShop",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "getApproved",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "pure",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "shopId",
        "type": "uint256"
      }
    ],
    "name": "getShopInfo",
    "outputs": [
      {
        "components": [
          {
            "internalType": "string",
            "name": "name",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "description",
            "type": "string"
          },
          {
            "internalType": "address",
            "name": "owner",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "requiredVisits",
            "type": "uint256"
          },
          {
            "internalType": "bool",
            "name": "active",
            "type": "bool"
          },
          {
            "internalType": "uint256",
            "name": "createdAt",
            "type": "uint256"
          }
        ],
        "internalType": "struct JpycStampSBT.ShopInfo",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "isApprovedForAll",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "pure",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "shopId",
        "type": "uint256"
      }
    ],
    "name": "isActiveShop",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "shopId",
        "type": "uint256"
      },
      {
        "internalType": "string",
        "name": "tokenURI_",
        "type": "string"
      }
    ],
    "name": "mintSBT",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "name",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      }
    ],
    "name": "ownerOf",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "shopId",
        "type": "uint256"
      },
      {
        "internalType": "string",
        "name": "name",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "description",
        "type": "string"
      },
      {
        "internalType": "address",
        "name": "shopOwner",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "requiredVisits",
        "type": "uint256"
      }
    ],
    "name": "registerShop",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "renounceOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "from",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      }
    ],
    "name": "safeTransferFrom",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "from",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      },
      {
        "internalType": "bytes",
        "name": "data",
        "type": "bytes"
      }
    ],
    "name": "safeTransferFrom",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      },
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "name": "setApprovalForAll",
    "outputs": [],
    "stateMutability": "pure",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      }
    ],
    "name": "shopIdOf",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes4",
        "name": "interfaceId",
        "type": "bytes4"
      }
    ],
    "name": "supportsInterface",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "symbol",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      }
    ],
    "name": "tokenURI",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalSupply",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "shopId",
        "type": "uint256"
      }
    ],
    "name": "totalSupplyOfShop",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "from",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      }
    ],
    "name": "transferFrom",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "newOwner",
        "type": "address"
      }
    ],
    "name": "transferOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "shopId",
        "type": "uint256"
      },
      {
        "internalType": "string",
        "name": "name",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "description",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "requiredVisits",
        "type": "uint256"
      }
    ],
    "name": "updateShop",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

// JPYC Prepaid トークンコントラクトアドレス（ERC20）
// 最新の公式アドレス（全チェーン共通）
export const JPYC_TOKEN_ADDRESS: Record<number, string> = {
  // Mainnet - 公式デプロイ済み
  137: '0xE7C3D8C9a439feDe00D2600032D5dB0Be71C3c29',   // Polygon Mainnet
  1: '0xE7C3D8C9a439feDe00D2600032D5dB0Be71C3c29',     // Ethereum Mainnet
  43114: '0xE7C3D8C9a439feDe00D2600032D5dB0Be71C3c29', // Avalanche C-Chain
  // Testnet - テストネットは現在使用中のアドレスを維持
  80002: '0x431D5dfF03120AFA4bDf332c61A6e1766eF37BDB', // Polygon Amoy - 使用中のテスト用アドレス
  11155111: '0x0000000000000000000000000000000000000000', // Ethereum Sepolia
  43113: '0x0000000000000000000000000000000000000000', // Avalanche Fuji
};

// カスタムテストネットワーク用JPYCアドレス（お客様独自のトークン）
export const CUSTOM_TEST_JPYC_ADDRESSES: Record<number, string[]> = {
  43113: ['0xeAB2AF47cbc02CDD73d106CA15884cAB541F5345'], // Avalanche Fuji - お客様のテスト用JPYC
  80002: ['0xcD54D62DF66f54AB3788CA17aD90d402eCD8D34a'], // Polygon Amoy - お客様のテスト用JPYC
};

// JPYCアドレス設定タイプ
export type JpycAddressType = 'official' | 'test';

// JPYCアドレス設定の表示名
export const JPYC_ADDRESS_TYPE_LABELS: Record<JpycAddressType, string> = {
  official: '公式JPYC',
  test: 'テスト用JPYC（カスタム）'
};

// SBT スタンプシステムコントラクトアドレス
export const SBT_CONTRACT_ADDRESS: Record<number, string> = {
  // Mainnet - 本番環境用（新規格コントラクト - デプロイ済み ✅）
  137: '0x26C55F745c5BF80475C2D024F9F07ce56E308039', // Polygon Mainnet - 新規格デプロイ完了 2025/01/20 ✅
  1: '0x0000000000000000000000000000000000000000',   // Ethereum Mainnet - デプロイ待ち
  43114: '0x0000000000000000000000000000000000000000', // Avalanche - デプロイ待ち
  // Testnet - テスト環境用（デプロイ済み）
  80002: '0x6b39d1F8a9799aB3E1Ea047052e831186106DD8E', // Polygon Amoy - テスト用デプロイ済み ✅
  11155111: '0x96FFdC8495742e1F0b0819dc1cB4548Bf3AD23A4', // Ethereum Sepolia - テスト用デプロイ済み
  43113: '0x0000000000000000000000000000000000000000', // Avalanche Fuji - デプロイ待ち
};

// チェーンIDに応じたSBTコントラクトアドレスを取得
export const getSBTContractAddress = (chainId: number): string => {
  return SBT_CONTRACT_ADDRESS[chainId] || '';
};

// 利用可能なJPYCアドレス（公式 + カスタムテスト用）を取得
export const getAvailableJpycAddresses = (chainId: number): { address: string; type: JpycAddressType; label: string }[] => {
  const addresses: { address: string; type: JpycAddressType; label: string }[] = [];
  
  // 公式JPYCアドレス
  const officialAddress = JPYC_TOKEN_ADDRESS[chainId];
  if (officialAddress && officialAddress !== '0x0000000000000000000000000000000000000000') {
    addresses.push({
      address: officialAddress,
      type: 'official',
      label: JPYC_ADDRESS_TYPE_LABELS.official
    });
  }
  
  // カスタムテスト用JPYCアドレス
  const customAddresses = CUSTOM_TEST_JPYC_ADDRESSES[chainId] || [];
  customAddresses.forEach((address, index) => {
    addresses.push({
      address,
      type: 'test',
      label: `${JPYC_ADDRESS_TYPE_LABELS.test}${customAddresses.length > 1 ? ` (${index + 1})` : ''}`
    });
  });
  
  return addresses;
};

// サポートされているネットワークのチェック
export const isSupportedNetwork = (chainId: number): boolean => {
  return chainId === 137 || chainId === 80002; // Polygon Mainnet & Amoy Testnet
};