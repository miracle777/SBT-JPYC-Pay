// Biconomy Account Abstraction を使ったガスレス決済

import { createSmartAccountClient, PaymasterMode } from '@biconomy/account';
import { ethers } from 'ethers';
import { getBiconomyConfig } from '../config/biconomy';

/**
 * ガスレストランザクションを送信
 * 店舗側がガス代を負担する
 */
export async function sendGaslessTransaction(
  customerAddress: string,
  shopAddress: string,
  jpycContractAddress: string,
  amount: string,
  chainId: number,
  shopPrivateKey: string
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    const { bundlerUrl, paymasterUrl } = getBiconomyConfig(chainId);
    
    if (!bundlerUrl || !paymasterUrl) {
      throw new Error('Biconomy設定が不足しています。ダッシュボードでAPI Keyを取得してください。');
    }

    // 店舗側のウォレットを作成（ガス代支払い用）
    const provider = new ethers.providers.JsonRpcProvider(getRpcUrl(chainId));
    const shopWallet = new ethers.Wallet(shopPrivateKey, provider);

    // Biconomy Smart Accountを初期化
    const smartAccount = await createSmartAccountClient({
      signer: shopWallet,
      bundlerUrl,
      biconomyPaymasterApiKey: paymasterUrl.split('/').pop() || '',
      chainId,
    });

    // JPYCトークン送金のトランザクションデータを作成
    const jpycInterface = new ethers.utils.Interface([
      'function transfer(address to, uint256 amount) returns (bool)',
    ]);

    const transferData = jpycInterface.encodeFunctionData('transfer', [
      shopAddress, // 受取先（店舗）
      amount, // 金額
    ]);

    const transaction = {
      to: jpycContractAddress,
      data: transferData,
    };

    // ガスレストランザクションを送信
    const userOpResponse = await smartAccount.sendTransaction(transaction, {
      paymasterServiceData: { mode: PaymasterMode.SPONSORED },
    });

    const { transactionHash } = await userOpResponse.waitForTxHash();
    console.log('✅ ガスレストランザクション成功:', transactionHash);

    return {
      success: true,
      txHash: transactionHash,
    };
  } catch (error) {
    console.error('❌ ガスレストランザクション失敗:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '不明なエラー',
    };
  }
}

/**
 * チェーンIDからRPC URLを取得
 */
function getRpcUrl(chainId: number): string {
  const rpcUrls: Record<number, string> = {
    137: 'https://polygon-rpc.com',
    80002: 'https://rpc-amoy.polygon.technology',
    11155111: 'https://sepolia.infura.io/v3/YOUR_INFURA_KEY',
  };

  return rpcUrls[chainId] || '';
}

/**
 * 顧客側: 署名付きメッセージを作成（ガス代不要）
 * この署名を店舗に送信し、店舗側でトランザクションを実行
 */
export async function createGaslessPaymentSignature(
  customerSigner: ethers.Signer,
  shopAddress: string,
  amount: string,
  jpycContractAddress: string,
  nonce: number
): Promise<{ signature: string; message: any }> {
  const message = {
    from: await customerSigner.getAddress(),
    to: shopAddress,
    amount,
    tokenContract: jpycContractAddress,
    nonce,
    timestamp: Date.now(),
  };

  const signature = await customerSigner.signMessage(JSON.stringify(message));

  return {
    signature,
    message,
  };
}

/**
 * ガスレス決済の利用可能性をチェック
 */
export function isGaslessAvailable(chainId: number): boolean {
  const { bundlerUrl, paymasterUrl } = getBiconomyConfig(chainId);
  return Boolean(bundlerUrl && paymasterUrl && !paymasterUrl.includes('YOUR_'));
}
