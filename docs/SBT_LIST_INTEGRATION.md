# SBT 一覧表示実装ガイド（React）

> スマホアプリで SBT スタンプカードを表示するための完全実装ガイド

## 📋 目次

1. [概要](#概要)
2. [契約情報](#契約情報)
3. [セットアップ](#セットアップ)
4. [実装方法](#実装方法)
5. [コンポーネント例](#コンポーネント例)
6. [トラブルシューティング](#トラブルシューティング)

---

## 概要

このガイドでは、以下の機能を実装します：

✅ ユーザーが保有する全 SBT の一覧表示  
✅ 複数ショップの SBT に対応  
✅ 来店回数（スタンプ数）の表示  
✅ ショップ情報の表示  
✅ IPFS メタデータの取得と画像表示  
✅ Polygon MainNet / Amoy Testnet 対応  

---

## 契約情報

### SBT コントラクトアドレス

| ネットワーク | チェーンID | アドレス | ステータス |
|-----------|----------|---------|---------|
| **Polygon MainNet** | `137` | `0x0000000000000000000000000000000000000000` | ⏳ 近日デプロイ予定 |
| **Polygon Amoy (Testnet)** | `80002` | `0x6b39d1F8a9799aB3E1Ea047052e831186106DD8E` | ✅ デプロイ済み |
| **Ethereum Sepolia** | `11155111` | `0x96FFdC8495742e1F0b0819dc1cB4548Bf3AD23A4` | ✅ デプロイ済み |

### RPC エンドポイント

```typescript
const RPC_URLS = {
  137: 'https://polygon-rpc.com', // MainNet
  80002: 'https://rpc-amoy.polygon.technology', // Amoy
  11155111: 'https://sepolia.infura.io/v3/{YOUR_INFURA_KEY}', // Sepolia
};
```

### IPFS ゲートウェイ

```typescript
const IPFS_GATEWAY = 'https://gateway.pinata.cloud/ipfs/';
```

---

## セットアップ

### 1. 必要なライブラリをインストール

```bash
npm install ethers axios
# または
yarn add ethers axios
```

### 2. 環境変数の設定

`.env` ファイルを作成：

```env
# RPC エンドポイント（オプション、デフォルトを使用しない場合）
REACT_APP_RPC_URL_POLYGON=https://rpc-amoy.polygon.technology
REACT_APP_RPC_URL_ETHEREUM=https://sepolia.infura.io/v3/YOUR_KEY

# IPFS ゲートウェイ
REACT_APP_IPFS_GATEWAY=https://gateway.pinata.cloud/ipfs/
```

---

## 実装方法

### ステップ 1: スマートコントラクト ABI を定義

`src/config/sbtAbi.ts` を作成：

```typescript
// スマートコントラクト ABI（重要な関数のみ）
export const SBT_ABI = [
  // ユーザーが持つ SBT 数を取得
  {
    inputs: [{ internalType: 'address', name: 'owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  // 特定のインデックスの tokenId を取得
  {
    inputs: [
      { internalType: 'address', name: 'owner', type: 'address' },
      { internalType: 'uint256', name: 'index', type: 'uint256' },
    ],
    name: 'tokenOfOwnerByIndex',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  // tokenURI（IPFS メタデータ）を取得
  {
    inputs: [{ internalType: 'uint256', name: 'tokenId', type: 'uint256' }],
    name: 'tokenURI',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  // tokenId がどのショップのものかを取得
  {
    inputs: [{ internalType: 'uint256', name: 'tokenId', type: 'uint256' }],
    name: 'shopIdOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  // ショップ情報を取得
  {
    inputs: [{ internalType: 'uint256', name: 'shopId', type: 'uint256' }],
    name: 'getShopInfo',
    outputs: [
      {
        components: [
          { internalType: 'string', name: 'name', type: 'string' },
          { internalType: 'string', name: 'description', type: 'string' },
          { internalType: 'address', name: 'owner', type: 'address' },
          { internalType: 'uint256', name: 'requiredVisits', type: 'uint256' },
          { internalType: 'bool', name: 'active', type: 'bool' },
          { internalType: 'uint256', name: 'createdAt', type: 'uint256' },
        ],
        internalType: 'struct JpycStampSBT.ShopInfo',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  // ショップごとのユーザー保有数を取得
  {
    inputs: [
      { internalType: 'address', name: 'user', type: 'address' },
      { internalType: 'uint256', name: 'shopId', type: 'uint256' },
    ],
    name: 'balanceOfShop',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
];
```

### ステップ 2: 設定ファイルを作成

`src/config/sbtConfig.ts` を作成：

```typescript
export const SBT_CONFIG = {
  contracts: {
    137: {
      address: '0x0000000000000000000000000000000000000000', // MainNet (未デプロイ)
      network: 'Polygon MainNet',
      rpcUrl: 'https://polygon-rpc.com',
      explorerUrl: 'https://polygonscan.com',
    },
    80002: {
      address: '0x6b39d1F8a9799aB3E1Ea047052e831186106DD8E', // Amoy
      network: 'Polygon Amoy (Testnet)',
      rpcUrl: 'https://rpc-amoy.polygon.technology',
      explorerUrl: 'https://amoy.polygonscan.com',
    },
    11155111: {
      address: '0x96FFdC8495742e1F0b0819dc1cB4548Bf3AD23A4', // Sepolia
      network: 'Ethereum Sepolia',
      rpcUrl: 'https://sepolia.infura.io/v3/',
      explorerUrl: 'https://sepolia.etherscan.io',
    },
  },
  ipfs: {
    gateway: process.env.REACT_APP_IPFS_GATEWAY || 'https://gateway.pinata.cloud/ipfs/',
  },
};
```

### ステップ 3: SBT 取得ユーティリティを作成

`src/services/sbtService.ts` を作成：

```typescript
import { ethers } from 'ethers';
import axios from 'axios';
import { SBT_ABI } from '../config/sbtAbi';
import { SBT_CONFIG } from '../config/sbtConfig';

interface SBTMetadata {
  name: string;
  description: string;
  image: string;
  attributes?: Array<{
    trait_type: string;
    value: string | number;
  }>;
}

interface SBT {
  tokenId: string;
  shopId: number;
  shopName: string;
  tokenURI: string;
  metadata: SBTMetadata;
  visits: number; // 来店回数
  requiredVisits: number; // 必要来店回数
  imageUrl: string; // IPFS ゲートウェイ経由の画像URL
}

interface ShopInfo {
  name: string;
  description: string;
  owner: string;
  requiredVisits: number;
  active: boolean;
  createdAt: number;
}

/**
 * IPFS からメタデータを取得
 */
async function fetchIPFSMetadata(ipfsHash: string): Promise<SBTMetadata> {
  try {
    const cid = ipfsHash.replace('ipfs://', '');
    const url = `${SBT_CONFIG.ipfs.gateway}${cid}`;
    const response = await axios.get<SBTMetadata>(url);
    return response.data;
  } catch (error) {
    console.error('IPFS メタデータ取得エラー:', error);
    throw new Error('IPFS メタデータの取得に失敗しました');
  }
}

/**
 * ユーザーが保有する全 SBT を取得
 */
export async function getUserSBTs(
  userAddress: string,
  chainId: 137 | 80002 | 11155111 = 80002
): Promise<SBT[]> {
  try {
    if (!userAddress) {
      throw new Error('ユーザーアドレスが指定されていません');
    }

    const config = SBT_CONFIG.contracts[chainId];
    if (!config) {
      throw new Error(`未対応のチェーンID: ${chainId}`);
    }

    // プロバイダーを初期化
    const provider = new ethers.JsonRpcProvider(config.rpcUrl);

    // コントラクトインスタンスを作成
    const contract = new ethers.Contract(config.address, SBT_ABI, provider);

    // ユーザーが保有する SBT 数を取得
    const balance = await contract.balanceOf(userAddress);
    const sbtCount = parseInt(balance.toString());

    if (sbtCount === 0) {
      return [];
    }

    const sbts: SBT[] = [];

    // 各 SBT のメタデータを取得
    for (let i = 0; i < sbtCount; i++) {
      try {
        // tokenId を取得
        const tokenId = await contract.tokenOfOwnerByIndex(userAddress, i);
        const tokenIdStr = tokenId.toString();

        // tokenURI（IPFS）を取得
        const tokenURI = await contract.tokenURI(tokenId);

        // shopId を取得
        const shopId = await contract.shopIdOf(tokenId);
        const shopIdNum = parseInt(shopId.toString());

        // ショップ情報を取得
        const shopInfo = (await contract.getShopInfo(shopIdNum)) as ShopInfo;

        // IPFS からメタデータを取得
        const metadata = await fetchIPFSMetadata(tokenURI);

        // 来店回数を取得（メタデータの Attributes から）
        const visitAttribute = metadata.attributes?.find(
          (attr) => attr.trait_type === 'Visits'
        );
        const visits = visitAttribute ? parseInt(visitAttribute.value.toString()) : 0;

        // 画像URL を生成
        const imageCid = metadata.image.replace('ipfs://', '');
        const imageUrl = `${SBT_CONFIG.ipfs.gateway}${imageCid}`;

        sbts.push({
          tokenId: tokenIdStr,
          shopId: shopIdNum,
          shopName: shopInfo.name,
          tokenURI,
          metadata,
          visits,
          requiredVisits: parseInt(shopInfo.requiredVisits.toString()),
          imageUrl,
        });
      } catch (error) {
        console.error(`SBT ${i} の取得エラー:`, error);
        // エラーのあった SBT はスキップして続行
      }
    }

    return sbts;
  } catch (error) {
    console.error('ユーザー SBT 取得エラー:', error);
    throw error;
  }
}

/**
 * 特定ショップの SBT のみを取得
 */
export async function getUserSBTsByShop(
  userAddress: string,
  shopId: number,
  chainId: 137 | 80002 | 11155111 = 80002
): Promise<SBT[]> {
  const allSBTs = await getUserSBTs(userAddress, chainId);
  return allSBTs.filter((sbt) => sbt.shopId === shopId);
}

/**
 * ショップごとに SBT をグループ化
 */
export async function getUserSBTsByShops(
  userAddress: string,
  chainId: 137 | 80002 | 11155111 = 80002
): Promise<Map<number, SBT[]>> {
  const allSBTs = await getUserSBTs(userAddress, chainId);
  const grouped = new Map<number, SBT[]>();

  for (const sbt of allSBTs) {
    if (!grouped.has(sbt.shopId)) {
      grouped.set(sbt.shopId, []);
    }
    grouped.get(sbt.shopId)!.push(sbt);
  }

  return grouped;
}

/**
 * ショップ情報を取得
 */
export async function getShopInfo(
  shopId: number,
  chainId: 137 | 80002 | 11155111 = 80002
): Promise<ShopInfo> {
  try {
    const config = SBT_CONFIG.contracts[chainId];
    if (!config) {
      throw new Error(`未対応のチェーンID: ${chainId}`);
    }

    const provider = new ethers.JsonRpcProvider(config.rpcUrl);
    const contract = new ethers.Contract(config.address, SBT_ABI, provider);

    const shopInfo = (await contract.getShopInfo(shopId)) as ShopInfo;
    return shopInfo;
  } catch (error) {
    console.error(`ショップ情報取得エラー (Shop ${shopId}):`, error);
    throw error;
  }
}
```

---

## コンポーネント例

### コンポーネント 1: SBT カード（単体表示）

`src/components/SBTCard.tsx`:

```typescript
import React from 'react';
import { SBT } from '../services/sbtService';

interface SBTCardProps {
  sbt: SBT;
  onClick?: () => void;
}

export const SBTCard: React.FC<SBTCardProps> = ({ sbt, onClick }) => {
  // プログレスバーの計算
  const progressPercent = (sbt.visits / sbt.requiredVisits) * 100;

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg shadow-md p-4 cursor-pointer hover:shadow-lg transition-shadow"
    >
      {/* 画像 */}
      <div className="w-full h-40 bg-gray-200 rounded-md overflow-hidden mb-3">
        <img
          src={sbt.imageUrl}
          alt={sbt.metadata.name}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.src = '/placeholder.png'; // フォールバック画像
          }}
        />
      </div>

      {/* SBT 情報 */}
      <h3 className="font-bold text-lg mb-1">{sbt.metadata.name}</h3>
      <p className="text-sm text-gray-600 mb-3">{sbt.shopName}</p>

      {/* 来店回数表示 */}
      <div className="mb-3">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-700">来店回数</span>
          <span className="font-bold text-purple-600">
            {sbt.visits} / {sbt.requiredVisits}
          </span>
        </div>
        <div className="w-full bg-gray-300 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-purple-500 to-purple-600 h-2 rounded-full transition-all"
            style={{ width: `${Math.min(progressPercent, 100)}%` }}
          />
        </div>
      </div>

      {/* ステータス */}
      {sbt.visits >= sbt.requiredVisits ? (
        <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-bold">
          ✅ 報酬獲得条件達成
        </div>
      ) : (
        <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-bold">
          🎯 進行中
        </div>
      )}

      {/* Token ID */}
      <p className="text-xs text-gray-500 mt-3 font-mono">ID: {sbt.tokenId}</p>
    </div>
  );
};
```

### コンポーネント 2: SBT 一覧（グリッド表示）

`src/components/SBTList.tsx`:

```typescript
import React, { useState, useEffect } from 'react';
import { getUserSBTs, SBT } from '../services/sbtService';
import { SBTCard } from './SBTCard';

interface SBTListProps {
  userAddress: string;
  chainId?: 137 | 80002 | 11155111;
  onSelectSBT?: (sbt: SBT) => void;
}

export const SBTList: React.FC<SBTListProps> = ({
  userAddress,
  chainId = 80002,
  onSelectSBT,
}) => {
  const [sbts, setSBTs] = useState<SBT[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSBTs = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getUserSBTs(userAddress, chainId);
        setSBTs(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'SBT の取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    if (userAddress) {
      fetchSBTs();
    }
  }, [userAddress, chainId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        ⚠️ エラー: {error}
      </div>
    );
  }

  if (sbts.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-8 text-center text-gray-500">
        <p className="text-lg">まだ SBT を取得していません</p>
        <p className="text-sm mt-2">お店でお買い物すると SBT を獲得できます</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {sbts.map((sbt) => (
        <SBTCard
          key={sbt.tokenId}
          sbt={sbt}
          onClick={() => onSelectSBT?.(sbt)}
        />
      ))}
    </div>
  );
};
```

### コンポーネント 3: ショップ別タブ表示

`src/components/SBTListByShops.tsx`:

```typescript
import React, { useState, useEffect } from 'react';
import { getUserSBTsByShops, SBT, getShopInfo, ShopInfo } from '../services/sbtService';
import { SBTCard } from './SBTCard';

interface SBTListByShopsProps {
  userAddress: string;
  chainId?: 137 | 80002 | 11155111;
}

export const SBTListByShops: React.FC<SBTListByShopsProps> = ({
  userAddress,
  chainId = 80002,
}) => {
  const [sbtsByShop, setSBTsByShop] = useState<Map<number, SBT[]>>(new Map());
  const [shopInfos, setShopInfos] = useState<Map<number, ShopInfo>>(new Map());
  const [selectedShopId, setSelectedShopId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSBTs = async () => {
      try {
        setLoading(true);
        setError(null);

        const grouped = await getUserSBTsByShops(userAddress, chainId);
        setSBTsByShop(grouped);

        // 各ショップの情報を取得
        const infos = new Map<number, ShopInfo>();
        for (const shopId of grouped.keys()) {
          try {
            const info = await getShopInfo(shopId, chainId);
            infos.set(shopId, info);
          } catch (err) {
            console.warn(`ショップ ${shopId} の情報取得失敗:`, err);
          }
        }
        setShopInfos(infos);

        // 最初のショップを選択
        if (grouped.size > 0) {
          setSelectedShopId(Array.from(grouped.keys())[0]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'SBT の取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    if (userAddress) {
      fetchSBTs();
    }
  }, [userAddress, chainId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
        ⚠️ エラー: {error}
      </div>
    );
  }

  if (sbtsByShop.size === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-8 text-center text-gray-500">
        <p className="text-lg">まだ SBT を取得していません</p>
      </div>
    );
  }

  const shopIds = Array.from(sbtsByShop.keys());
  const selectedSBTs = selectedShopId ? sbtsByShop.get(selectedShopId) || [] : [];

  return (
    <div className="space-y-6">
      {/* ショップタブ */}
      <div className="flex overflow-x-auto gap-2 pb-2">
        {shopIds.map((shopId) => {
          const shopInfo = shopInfos.get(shopId);
          const count = sbtsByShop.get(shopId)?.length || 0;
          const isSelected = selectedShopId === shopId;

          return (
            <button
              key={shopId}
              onClick={() => setSelectedShopId(shopId)}
              className={`flex-shrink-0 px-4 py-2 rounded-full font-medium whitespace-nowrap transition-all ${
                isSelected
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {shopInfo?.name || `ショップ ${shopId}`}
              <span className="ml-2 bg-white bg-opacity-30 rounded-full px-2 py-0.5 text-sm">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ショップ情報 */}
      {selectedShopId && shopInfos.has(selectedShopId) && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-bold text-lg mb-2">
            {shopInfos.get(selectedShopId)?.name}
          </h3>
          <p className="text-sm text-gray-700">
            {shopInfos.get(selectedShopId)?.description}
          </p>
        </div>
      )}

      {/* SBT グリッド */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {selectedSBTs.map((sbt) => (
          <SBTCard key={sbt.tokenId} sbt={sbt} />
        ))}
      </div>
    </div>
  );
};
```

### 使用例

`src/pages/SBTListPage.tsx`:

```typescript
import React, { useState, useEffect } from 'react';
import { SBTListByShops } from '../components/SBTListByShops';

export const SBTListPage: React.FC = () => {
  const [userAddress, setUserAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<137 | 80002 | 11155111>(80002);

  // MetaMask からウォレットアドレスを取得
  useEffect(() => {
    const connectWallet = async () => {
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({
            method: 'eth_requestAccounts',
          });
          setUserAddress(accounts[0]);

          // チェーンID を取得
          const chainIdHex = await window.ethereum.request({
            method: 'eth_chainId',
          });
          const cId = parseInt(chainIdHex, 16) as 137 | 80002 | 11155111;
          setChainId(cId);
        } catch (error) {
          console.error('ウォレット接続エラー:', error);
        }
      }
    };

    connectWallet();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white p-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">📱 マイ SBT</h1>
        <p className="text-gray-600 mb-8">
          あなたが集めたスタンプカード一覧
        </p>

        {userAddress ? (
          <SBTListByShops userAddress={userAddress} chainId={chainId} />
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <p className="text-yellow-800">
              MetaMask に接続してください
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
```

---

## トラブルシューティング

### Q: "CORS エラー" が出る

**A:** IPFS ゲートウェイが CORS をブロックしている可能性があります。

```typescript
// フォールバック用ゲートウェイを複数用意
const IPFS_GATEWAYS = [
  'https://gateway.pinata.cloud/ipfs/',
  'https://cloudflare-ipfs.com/ipfs/',
  'https://gateway.ipfs.io/ipfs/',
];

async function fetchIPFSMetadataWithFallback(
  ipfsHash: string
): Promise<SBTMetadata> {
  for (const gateway of IPFS_GATEWAYS) {
    try {
      const cid = ipfsHash.replace('ipfs://', '');
      const response = await axios.get(`${gateway}${cid}`);
      return response.data;
    } catch (error) {
      continue; // 次のゲートウェイを試す
    }
  }
  throw new Error('全てのIPFSゲートウェイでの取得に失敗しました');
}
```

### Q: "コントラクトアドレスが不正" というエラー

**A:** チェーンID を確認してください。

```typescript
// チェーンID が 80002 (Amoy) であることを確認
const isValidChain = [137, 80002, 11155111].includes(chainId);
```

### Q: "画像が表示されない"

**A:** IPFS hash を確認してください。

```typescript
// IPFS URL の形式を確認
// 正：ipfs://Qm...
// 誤：https://gateway.../Qm...

const imageCid = metadata.image.replace('ipfs://', '');
```

### Q: "ガス代が高い"

**A:** テストネット（Amoy）で開発し、本番環境（Mainnet）に移行する際に mainnet に切り替えてください。

```typescript
// テスト環境
const chainId = 80002; // Amoy

// 本番環境（切り替え時）
const chainId = 137; // Polygon Mainnet
```

---

## 参考資料

- [ethers.js ドキュメント](https://docs.ethers.org/)
- [IPFS について](https://ipfs.io/)
- [Polygon Amoy テストネット](https://polygon.technology/blog/introducing-the-amoy-testnet-for-polygon)
- [スマートコントラクト ABI](./contracts/JpycStampSBT.sol)
