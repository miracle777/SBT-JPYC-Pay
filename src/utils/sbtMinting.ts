/**
 * SBT Minting ユーティリティ
 * スマートコントラクトとの連携でSBTを発行
 */

import { BrowserProvider, Contract, parseUnits, JsonRpcProvider } from 'ethers';
import { getSBTContractAddress, JPYC_STAMP_SBT_ABI } from '../config/contracts';
import { NETWORKS } from '../config/networks';
import { canMintSBT, createSignerFromPrivateKey, getSavedPrivateKey } from './privateKeyManager';
import toast from 'react-hot-toast';

export interface MintSBTParams {
  recipientAddress: string; // SBT受け取るユーザーアドレス
  shopId: number;           // ショップID
  tokenURI: string;         // metadata URI (ipfs://...)
  chainId: number;          // チェーンID
}

export interface MintSBTResult {
  success: boolean;
  transactionHash?: string;
  tokenId?: string;
  error?: string;
}

/**
 * SBT を発行する（ブロックチェーンに記録）
 */
export async function mintSBT(params: MintSBTParams): Promise<MintSBTResult> {
  try {
    const { recipientAddress, shopId, tokenURI, chainId } = params;

    // 秘密鍵の確認
    const mintCheck = canMintSBT();
    if (!mintCheck.canMint) {
      return {
        success: false,
        error: mintCheck.reason || 'SBT発行権限がありません',
      };
    }

    // バリデーション
    if (!recipientAddress || !recipientAddress.startsWith('0x')) {
      return {
        success: false,
        error: '無効なウォレットアドレスです',
      };
    }

    if (recipientAddress.length !== 42) {
      return {
        success: false,
        error: 'ウォレットアドレスの形式が不正です（42文字必要）',
      };
    }

    if (!tokenURI || !tokenURI.startsWith('ipfs://')) {
      return {
        success: false,
        error: 'tokenURI は ipfs:// で始まる必要があります',
      };
    }

    if (shopId < 1) {
      return {
        success: false,
        error: 'ショップID は 1 以上である必要があります',
      };
    }

    // SBT コントラクトアドレスを取得
    const contractAddress = getSBTContractAddress(chainId);
    if (!contractAddress || contractAddress === '0x0000000000000000000000000000000000000000') {
      return {
        success: false,
        error: `チェーンID ${chainId} の SBT コントラクトがまだデプロイされていません`,
      };
    }

    // ネットワーク情報を取得
    const network = Object.values(NETWORKS).find(n => n.chainId === chainId);
    if (!network) {
      return {
        success: false,
        error: `サポートされていないチェーンID: ${chainId}`,
      };
    }

    // 保存された秘密鍵を取得
    const privateKey = getSavedPrivateKey();
    if (!privateKey) {
      return {
        success: false,
        error: '秘密鍵が設定されていません。設定画面で秘密鍵を入力してください。',
      };
    }

    // JsonRpcProvider を使用（秘密鍵での署名のため）
    const provider = new JsonRpcProvider(network.rpcUrl);

    // 秘密鍵から署名者を作成
    const signer = createSignerFromPrivateKey(privateKey, provider);
    if (!signer) {
      return {
        success: false,
        error: '秘密鍵が無効です。設定画面で正しい秘密鍵を設定してください。',
      };
    }

    console.log('🔑 SBT発行者アドレス:', await signer.getAddress());

    // コントラクトインスタンスを作成
    const contract = new Contract(
      contractAddress,
      JPYC_STAMP_SBT_ABI,
      signer
    );

    // ABI に期待した関数があるか確認
    if (typeof (contract as any).mintSBT !== 'function') {
      console.error('Contract does not expose mintSBT:', {
        contractAddress,
        abiFunctions: Object.keys((contract.interface as any).functions || {}),
      });
      return {
        success: false,
        error: `コントラクトに 'mintSBT' 関数が見つかりません。アドレス (${contractAddress}) と ABI を確認してください。`,
      };
    }

    // SBT を mint
    console.log('🎖️ SBT Minting 開始', {
      to: recipientAddress,
      shopId,
      tokenURI,
      minter: await signer.getAddress(),
    });

    // 事前チェック: provider.call を使って eth_call（静的実行）を行い、revert理由を取得
    try {
      const signerAddress = await signer.getAddress();
      const callData = contract.interface.encodeFunctionData('mintSBT', [recipientAddress, shopId, tokenURI]);
      await provider.call({ to: contractAddress, data: callData, from: signerAddress });
    } catch (callError: any) {
      console.error('provider.call (static) failed (revert reason):', callError);
      const reason = callError?.reason || callError?.message || JSON.stringify(callError);
      return {
        success: false,
        error: `スマートコントラクトの呼び出しが失敗しました: ${reason}`,
      };
    }

    // ガス推定とトランザクション実行
    let receipt: any = null;
    try {
      const gasEstimate = await contract.mintSBT.estimateGas(recipientAddress, shopId, tokenURI);
      const gasLimit = gasEstimate * 120n / 100n; // 20% マージン追加
      
      console.log('💡 ガス推定:', gasEstimate.toString(), '→ 制限:', gasLimit.toString());

      const tx = await contract.mintSBT(recipientAddress, shopId, tokenURI, {
        gasLimit: gasLimit,
      });

      console.log('⏳ トランザクション送信:', tx.hash);
      
      // トランザクション完了を待機
      receipt = await tx.wait();

    } catch (gasError: any) {
      console.error('ガス推定エラー:', gasError);
      
    // RPC接続エラーの場合はリトライを試行
      if (gasError.code === 'UNKNOWN_ERROR' || gasError.message?.includes('Internal JSON-RPC error')) {
      console.log('🔄 RPC接続エラーを検出、リトライを試行します...');
      
      // 最初に簡易トランザクションでネットワーク接続をテスト
      try {
        const signerAddress = await signer.getAddress();
        const balance = await provider.getBalance(signerAddress);
        console.log('💰 ウォレット残高確認:', balance.toString());
      } catch (networkError) {
        console.error('⚠️ ネットワーク接続に問題があります:', networkError);
        return {
          success: false,
          error: 'Polygon Amoyネットワークへの接続に問題があります。MetaMaskのネットワーク設定を確認してください。',
        };
      }        try {
          // 3秒待機後にリトライ（より長い待機時間）
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          // より低いガス制限でリトライ
          const retryTx = await contract.mintSBT(recipientAddress, shopId, tokenURI, {
            gasLimit: BigInt(250000), // さらに低いガス制限
            gasPrice: undefined, // ガス価格を自動設定に
          });
          console.log('⏳ リトライトランザクション送信:', retryTx.hash);
          receipt = await retryTx.wait();
        } catch (retryError: any) {
          console.error('❌ リトライ実行エラー:', retryError);
          
          // 最後の手段: ユーザー手動でのトランザクション実行を推奨
          return {
            success: false,
            error: `🌐 Polygon Amoyネットワークの接続が不安定です

📋 解決方法:
1️⃣ 設定画面でRPCエンドポイントを変更
2️⃣ MetaMaskを再起動  
3️⃣ 数分後に再試行

💾 重要: SBTデータはローカルに保存済み
ネットワーク接続が安定すれば、いつでもブロックチェーンに記録できます。

🔧 詳細: 設定画面の「ネットワーク情報」セクションをご確認ください。`,
          };
        }
      } else {
        // ガス推定失敗時はデフォルト値で再試行
        try {
          const tx = await contract.mintSBT(recipientAddress, shopId, tokenURI);
          console.log('⏳ トランザクション送信 (デフォルトガス):', tx.hash);
          receipt = await tx.wait();
        } catch (fallbackError: any) {
          console.error('❌ フォールバック実行エラー:', fallbackError);
          let errorMessage = 'SBT 発行に失敗しました';
          
          if (fallbackError.code === 'ACTION_REJECTED') {
            errorMessage = 'トランザクションが拒否されました';
          } else if (fallbackError.code === 'INSUFFICIENT_FUNDS') {
            errorMessage = 'ガス代が不足しています';
          } else if (fallbackError.reason) {
            errorMessage = fallbackError.reason;
          }
          
          return { success: false, error: errorMessage };
        }
      }
    }

    if (receipt?.status === 0) {
      return {
        success: false,
        error: 'トランザクションが失敗しました',
      };
    }

    console.log('✅ SBT Minting 完了', receipt?.transactionHash);

    return {
      success: true,
      transactionHash: receipt?.transactionHash || receipt?.hash,
      tokenId: receipt?.logs?.[0]?.topics?.[3] ? parseInt(receipt.logs[0].topics[3], 16).toString() : undefined,
    };
  } catch (error: any) {
    console.error('❌ SBT Minting エラー:', error);

    let errorMessage = 'SBT 発行に失敗しました';

    if (error.code === 'ACTION_REJECTED') {
      errorMessage = 'トランザクションが拒否されました';
    } else if (error.code === 'INSUFFICIENT_FUNDS') {
      errorMessage = 'ガス代が不足しています';
    } else if (error.code === 'UNKNOWN_ERROR' && error.message?.includes('Internal JSON-RPC error')) {
      errorMessage = 'ネットワークエラーが発生しました。再度お試しください。';
    } else if (error.reason) {
      errorMessage = error.reason;
    } else if (error.message) {
      errorMessage = error.message;
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * SBT トランザクションの状態を確認
 */
export async function checkSBTTransactionStatus(
  transactionHash: string,
  chainId: number
): Promise<{
  status: 'pending' | 'success' | 'failed';
  blockNumber?: number;
  gasUsed?: string;
  error?: string;
}> {
  try {
    // ネットワーク情報を取得
    const network = Object.values(NETWORKS).find(n => n.chainId === chainId);
    if (!network) {
      return {
        status: 'failed',
        error: `サポートされていないチェーンID: ${chainId}`,
      };
    }

    // JsonRpcProvider を使用
    const provider = new JsonRpcProvider(network.rpcUrl);
    
    // トランザクションレシートを取得
    const receipt = await provider.getTransactionReceipt(transactionHash);

    if (!receipt) {
      return {
        status: 'pending',
      };
    }

    if (receipt.status === 0) {
      return {
        status: 'failed',
        blockNumber: receipt.blockNumber,
      };
    }

    return {
      status: 'success',
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed?.toString(),
    };
  } catch (error: any) {
    console.error('トランザクション確認エラー:', error);
    return {
      status: 'failed',
      error: error.message,
    };
  }
}

/**
 * Polygonscan / Etherscan などのエクスプローラー URL を生成
 */
export function getBlockExplorerUrl(
  transactionHash: string,
  chainId: number
): string {
  const explorers: Record<number, string> = {
    // Polygon
    137: 'https://polygonscan.com/tx/',
    80002: 'https://amoy.polygonscan.com/tx/',
    // Ethereum
    1: 'https://etherscan.io/tx/',
    11155111: 'https://sepolia.etherscan.io/tx/',
    // Avalanche
    43114: 'https://snowtrace.io/tx/',
    43113: 'https://subnets-test.avax.network/c-chain/tx/',
  };

  const baseUrl = explorers[chainId] || 'https://polygonscan.com/tx/';
  return baseUrl + transactionHash;
}

/**
 * コントラクトオーナーを取得する
 */
export async function getContractOwner(
  chainId: number
): Promise<{ owner: string; error?: string }> {
  try {
    // ネットワーク情報を取得
    const network = Object.values(NETWORKS).find(n => n.chainId === chainId);
    if (!network) {
      return { owner: '', error: `サポートされていないチェーンID: ${chainId}` };
    }

    const provider = new JsonRpcProvider(network.rpcUrl);
    const contractAddress = getSBTContractAddress(chainId);

    if (!contractAddress || contractAddress === '0x0000000000000000000000000000000000000000') {
      return { owner: '', error: `チェーンID ${chainId} のコントラクトが見つかりません` };
    }

    const contract = new Contract(
      contractAddress,
      JPYC_STAMP_SBT_ABI,
      provider
    );

    const owner = await contract.owner();
    console.log(`✅ コントラクトオーナー (Chain ${chainId}):`, owner);

    return { owner };
  } catch (error: any) {
    console.error('コントラクトオーナー取得エラー:', error);
    return { owner: '', error: error.message };
  }
}

/**
 * ショップ情報を取得する
 */
export async function getShopInfo(
  shopId: number, 
  chainId: number
): Promise<{
  success?: boolean;
  shopInfo?: {
    name: string;
    owner: string;
    active: boolean;
  };
  name?: string;
  owner?: string;
  active?: boolean;
  error?: string;
}> {
  try {
    // ネットワーク情報を取得
    const network = Object.values(NETWORKS).find(n => n.chainId === chainId);
    if (!network) {
      return { error: `サポートされていないチェーンID: ${chainId}` };
    }

    const provider = new JsonRpcProvider(network.rpcUrl);
    const contractAddress = getSBTContractAddress(chainId);

    if (!contractAddress || contractAddress === '0x0000000000000000000000000000000000000000') {
      return { error: `チェーンID ${chainId} のコントラクトが見つかりません` };
    }

    const contract = new Contract(
      contractAddress,
      JPYC_STAMP_SBT_ABI,
      provider
    );

    const shopInfo = await contract.getShopInfo(shopId);
    console.log(`✅ ショップ情報 (Shop ${shopId}):`, shopInfo);

    // ethers.js v6の構造体は配列型でもアクセス可能なため、プロパティ名でアクセス
    const name = typeof shopInfo.name === 'string' ? shopInfo.name : (shopInfo[0] || '');
    const owner = shopInfo.owner && shopInfo.owner.toString ? shopInfo.owner.toString() : (shopInfo[2] || '');
    const active = typeof shopInfo.active === 'boolean' ? shopInfo.active : (shopInfo[4] || false);

    console.log(`ショップ詳細 (Shop ${shopId}): name=${name}, owner=${owner}, active=${active}`);

    // ショップが正常に取得できた場合
    if (name && owner && owner !== '0x0000000000000000000000000000000000000000') {
      return {
        success: true,
        shopInfo: {
          name,
          owner,
          active,
        },
        name,
        owner,
        active,
      };
    } else {
      return { error: 'Shop not found' };
    }
  } catch (error: any) {
    console.error('ショップ情報取得エラー:', error);
    
    // "Shop not found" エラーの場合は、実際に未登録として扱う
    if (error.message?.includes('Shop not found')) {
      return { error: 'Shop not found' };
    }
    
    return { error: error.message };
  }
}

/**
 * ショップを登録する（コントラクトオーナー権限で実行）
 */
export async function registerShop(params: {
  shopId: number;
  shopName: string;
  description: string;
  shopOwnerAddress: string;
  requiredVisits?: number;
  chainId: number;
}): Promise<{
  success: boolean;
  transactionHash?: string;
  error?: string;
}> {
  try {
    const { shopId, shopName, description, shopOwnerAddress, requiredVisits = 1, chainId } = params;

    // 秘密鍵の確認
    const mintCheck = canMintSBT();
    if (!mintCheck.canMint) {
      return {
        success: false,
        error: mintCheck.reason || 'ショップ登録権限がありません',
      };
    }

    // バリデーション
    if (!shopOwnerAddress.startsWith('0x') || shopOwnerAddress.length !== 42) {
      return {
        success: false,
        error: 'ショップオーナーアドレスの形式が不正です',
      };
    }

    // ネットワーク情報を取得
    const network = Object.values(NETWORKS).find(n => n.chainId === chainId);
    if (!network) {
      return {
        success: false,
        error: `サポートされていないチェーンID: ${chainId}`,
      };
    }

    // 保存された秘密鍵を取得
    const privateKey = getSavedPrivateKey();
    if (!privateKey) {
      return {
        success: false,
        error: '秘密鍵が設定されていません。設定画面で秘密鍵を入力してください。',
      };
    }

    // JsonRpcProvider を使用
    const provider = new JsonRpcProvider(network.rpcUrl);

    // 秘密鍵から署名者を作成
    const signer = createSignerFromPrivateKey(privateKey, provider);
    if (!signer) {
      return {
        success: false,
        error: '秘密鍵が無効です。設定画面で正しい秘密鍵を設定してください。',
      };
    }

    const signerAddress = await signer.getAddress();

    // コントラクトアドレスを取得
    const contractAddress = getSBTContractAddress(chainId);
    if (!contractAddress || contractAddress === '0x0000000000000000000000000000000000000000') {
      return {
        success: false,
        error: `チェーンID ${chainId} のコントラクトが見つかりません`,
      };
    }

    // コントラクトインスタンスを作成
    const contract = new Contract(
      contractAddress,
      JPYC_STAMP_SBT_ABI,
      signer
    );

    // オーナーであるか確認
    const owner = await contract.owner();
    if (owner.toLowerCase() !== signerAddress.toLowerCase()) {
      return {
        success: false,
        error: `ショップ登録権限がありません。現在のアカウント: ${signerAddress}、コントラクトオーナー: ${owner}`,
      };
    }

    console.log('📝 ショップ登録開始:', {
      shopId,
      shopName,
      shopOwnerAddress,
      requiredVisits,
    });

    // ショップを登録
    const tx = await contract.registerShop(
      shopId,
      shopName,
      description,
      shopOwnerAddress,
      requiredVisits
    );

    console.log('⏳ トランザクション送信:', tx.hash);

    // トランザクション完了を待機
    const receipt = await tx.wait();

    if (receipt?.status === 0) {
      return {
        success: false,
        error: 'ショップ登録トランザクションが失敗しました',
      };
    }

    console.log('✅ ショップ登録完了:', receipt?.transactionHash);

    return {
      success: true,
      transactionHash: receipt?.transactionHash || tx.hash,
    };
  } catch (error: any) {
    console.error('❌ ショップ登録エラー:', error);

    let errorMessage = 'ショップ登録に失敗しました';

    if (error.code === 'ACTION_REJECTED') {
      errorMessage = 'トランザクションが拒否されました';
    } else if (error.reason) {
      errorMessage = error.reason;
    } else if (error.message) {
      errorMessage = error.message;
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}
