/**
 * SBT Minting ユーティリティ
 * スマートコントラクトとの連携でSBTを発行
 */

import { BrowserProvider, Contract, parseUnits } from 'ethers';
import { SBT_CONTRACT_ADDRESS, JPYC_STAMP_SBT_ABI } from '../config/contracts';
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
    // MetaMask が利用可能か確認
    if (!window.ethereum) {
      return {
        success: false,
        error: 'MetaMask がインストールされていません',
      };
    }

    // 自動でウォレットを指定チェーンに切り替える（必要なら追加）
    const ensureNetwork = async (targetChainId: number): Promise<{ ok: true } | { ok: false; error: string }> => {
      try {
        const hex = '0x' + targetChainId.toString(16);
        // 現在の chainId を確認
        const currentHex = (window.ethereum as any)?.chainId as string | undefined;
        const current = currentHex ? parseInt(currentHex, 16) : undefined;
        if (current === targetChainId) return { ok: true };

        // 試行: 切替
        await (window.ethereum as any).request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: hex }],
        });

        return { ok: true };
      } catch (switchError: any) {
        // 4902: chain not found in wallet -> add chain
        if (switchError && (switchError.code === 4902 || (switchError.message && switchError.message.includes('Unrecognized chain')))) {
          try {
            // 代表的なネットワーク情報（Amoy を想定）。他チェーンは必要に応じて拡張。
            const chainParams: Record<number, any> = {
              80002: {
                chainId: '0x13882',
                chainName: 'Polygon Amoy (Testnet)',
                rpcUrls: ['https://rpc-amoy.polygon.technology'],
                nativeCurrency: { name: 'POL', symbol: 'POL', decimals: 18 },
                blockExplorerUrls: ['https://amoy.polygonscan.com'],
              },
              11155111: {
                chainId: '0xa3d6f7',
                chainName: 'Sepolia',
                rpcUrls: ['https://sepolia.infura.io/v3/'],
                nativeCurrency: { name: 'SepoliaETH', symbol: 'ETH', decimals: 18 },
                blockExplorerUrls: ['https://sepolia.etherscan.io'],
              },
            };

            const params = chainParams[targetChainId];
            if (!params) {
              return { ok: false, error: `ウォレットにチェーン ${targetChainId} を追加する情報がありません` };
            }

            await (window.ethereum as any).request({
              method: 'wallet_addEthereumChain',
              params: [params],
            });

            // 追加後に切替再試行
            await (window.ethereum as any).request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: params.chainId }],
            });

            return { ok: true };
          } catch (addError: any) {
            if (addError && addError.code === 4001) {
              return { ok: false, error: 'ユーザーがネットワーク追加を拒否しました' };
            }
            return { ok: false, error: addError?.message || String(addError) };
          }
        }

        if (switchError && switchError.code === 4001) {
          return { ok: false, error: 'ユーザーがネットワーク切替を拒否しました' };
        }

        return { ok: false, error: switchError?.message || String(switchError) };
      }
    };

    const { recipientAddress, shopId, tokenURI, chainId } = params;

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
    const contractAddress = SBT_CONTRACT_ADDRESS[chainId];
    if (!contractAddress || contractAddress === '0x0000000000000000000000000000000000000000') {
      return {
        success: false,
        error: `チェーンID ${chainId} の SBT コントラクトがまだデプロイされていません`,
      };
    }

    // 自動でウォレットを指定チェーンに切り替え（必要なら追加）
    const ensure = await ensureNetwork(chainId);
    if (!ensure.ok) {
      return { success: false, error: ensure.error };
    }

    // Provider と Signer を取得
    const provider = new BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();

    // 現在のネットワークを確認
    let network;
    try {
      network = await provider.getNetwork();
    } catch (networkError) {
      console.warn('ネットワーク取得エラー（続行）:', networkError);
      // network 取得失敗した場合は続行（後で検証）
    }

    // provider.getNetwork().chainId は number または bigint 型なので比較は慎重に行う
    if (network && Number(network.chainId) !== chainId) {
      return {
        success: false,
        error: `ネットワークが一致していません。Chain ID ${chainId} に切り替えてください`,
      };
    }

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
    });

    // 事前チェック: provider.call を使って eth_call（静的実行）を行い、revert理由を取得
    try {
      const callData = contract.interface.encodeFunctionData('mintSBT', [recipientAddress, shopId, tokenURI]);
      await provider.call({ to: contractAddress, data: callData });
    } catch (callError: any) {
      console.error('provider.call (static) failed (revert reason):', callError);
      const reason = callError?.reason || callError?.message || JSON.stringify(callError);
      return {
        success: false,
        error: `スマートコントラクトの呼び出しが失敗しました: ${reason}`,
      };
    }

    const tx = await contract.mintSBT(recipientAddress, shopId, tokenURI);

    console.log('⏳ トランザクション送信:', tx.hash);
    
    // トランザクション完了を待機
    const receipt = await tx.wait();

    if (receipt?.status === 0) {
      return {
        success: false,
        error: 'トランザクションが失敗しました',
      };
    }

    console.log('✅ SBT Minting 完了', receipt?.transactionHash);

    return {
      success: true,
      transactionHash: receipt?.transactionHash || tx.hash,
      tokenId: receipt?.events?.[0]?.args?.tokenId?.toString(),
    };
  } catch (error: any) {
    console.error('❌ SBT Minting エラー:', error);

    let errorMessage = 'SBT 発行に失敗しました';

    if (error.code === 'ACTION_REJECTED') {
      errorMessage = 'トランザクションが拒否されました';
    } else if (error.code === 'INSUFFICIENT_FUNDS') {
      errorMessage = 'ガス代が不足しています';
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
    if (!window.ethereum) {
      return {
        status: 'failed',
        error: 'MetaMask がインストールされていません',
      };
    }

    const provider = new BrowserProvider(window.ethereum);
    
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
    if (!window.ethereum) {
      return { owner: '', error: 'MetaMask がインストールされていません' };
    }

    const provider = new BrowserProvider(window.ethereum);
    const contractAddress = SBT_CONTRACT_ADDRESS[chainId];

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
  name?: string;
  owner?: string;
  active?: boolean;
  error?: string;
}> {
  try {
    if (!window.ethereum) {
      return { error: 'MetaMask がインストールされていません' };
    }

    const provider = new BrowserProvider(window.ethereum);
    const contractAddress = SBT_CONTRACT_ADDRESS[chainId];

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

    return {
      name: shopInfo.name,
      owner: shopInfo.owner,
      active: shopInfo.active,
    };
  } catch (error: any) {
    console.error('ショップ情報取得エラー:', error);
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
    if (!window.ethereum) {
      return {
        success: false,
        error: 'MetaMask がインストールされていません',
      };
    }

    const { shopId, shopName, description, shopOwnerAddress, requiredVisits = 1, chainId } = params;

    // バリデーション
    if (!shopOwnerAddress.startsWith('0x') || shopOwnerAddress.length !== 42) {
      return {
        success: false,
        error: 'ショップオーナーアドレスの形式が不正です',
      };
    }

    // Provider と Signer を取得
    const provider = new BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const signerAddress = await signer.getAddress();

    // コントラクトアドレスを取得
    const contractAddress = SBT_CONTRACT_ADDRESS[chainId];
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
