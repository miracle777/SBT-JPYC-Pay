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

    // Provider と Signer を取得
    const provider = new BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();

    // 現在のネットワークを確認
    const network = await provider.getNetwork();
    // provider.getNetwork().chainId は number 型なので比較は数値で行う
    if (network.chainId !== chainId) {
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
        abiFunctions: Object.keys(contract.interface.functions),
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
