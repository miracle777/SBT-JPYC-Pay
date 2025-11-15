import { Contract, BrowserProvider, parseUnits } from 'ethers';
import { NETWORKS } from '../config/networks';
import { GAS_PRICES } from '../config/index';

/**
 * ガス推定結果の型定義
 */
export interface GasEstimate {
  estimatedGas: bigint; // ガスユニット
  gasPrice: bigint; // Wei単位のガス価格
  totalGasCost: bigint; // Wei単位（ガスユニット × ガス価格）
  totalGasCostPOL: string; // POL単位（表示用）
  gasLimit: bigint; // トランザクション実行時に使用するガスリミット
  displayGasPrice: string; // Gwei単位（表示用）
}

/**
 * ネットワークのガス価格を取得
 * @param chainId チェーンID
 * @param provider ethers.jsプロバイダー
 * @returns ガス価格（Wei単位）
 */
export async function getNetworkGasPrice(
  chainId: number,
  provider: BrowserProvider
): Promise<bigint> {
  try {
    // 最初からデフォルト値で対応（RPC互換性の問題を回避）
    // PolygonネットワークではfeeDataが信頼できない場合が多いため、
    // チェーンIDベースのデフォルト値を直接使用
    const defaultGwei = GAS_PRICES[chainId as keyof typeof GAS_PRICES]?.standard || 35;
    console.log(`📊 ガス価格（デフォルト）: ${defaultGwei} Gwei (Chain ${chainId})`);
    return parseUnits(defaultGwei.toString(), 'gwei');
  } catch (error) {
    console.warn(`ガス価格取得エラー: ${error}`);
    // 最終的なフォールバック
    return parseUnits('35', 'gwei');
  }
}

/**
 * ERC20トークン転送のガス消費を推定
 * @param contract ERC20コントラクトインスタンス
 * @param fromAddress 送信者アドレス
 * @param toAddress 受信者アドレス
 * @param amount トークン量（wei単位）
 * @param gasPrice ガス価格（wei単位）
 * @returns ガス推定結果
 */
export async function estimateERC20TransferGas(
  contract: Contract,
  fromAddress: string,
  toAddress: string,
  amount: bigint,
  gasPrice: bigint,
  chainId: number
): Promise<GasEstimate> {
  try {
    // ガスを推定
    const estimatedGas = await contract.transfer.estimateGas(toAddress, amount, {
      from: fromAddress,
    });

    // ガスリミット = 推定ガス × 1.2（安全マージン）
    const gasLimit = (estimatedGas * BigInt(120)) / BigInt(100);
    
    // 総ガスコスト計算
    const totalGasCost = estimatedGas * gasPrice;
    
    // POL単位での表示用（18デシマル）
    const totalGasCostPOL = formatGasCostPOL(totalGasCost);
    
    // ガス価格をGwei単位で表示用に変換
    const displayGasPrice = formatGasPriceGwei(gasPrice);
    
    return {
      estimatedGas,
      gasPrice,
      totalGasCost,
      totalGasCostPOL,
      gasLimit,
      displayGasPrice,
    };
  } catch (error) {
    console.error('Gas estimation error:', error);
    
    // フォールバック：デフォルト値を使用
    const defaultGasUnits = BigInt(65000); // 標準的なERC20転送
    const gasLimit = (defaultGasUnits * BigInt(120)) / BigInt(100);
    const totalGasCost = defaultGasUnits * gasPrice;
    
    return {
      estimatedGas: defaultGasUnits,
      gasPrice,
      totalGasCost,
      totalGasCostPOL: formatGasCostPOL(totalGasCost),
      gasLimit,
      displayGasPrice: formatGasPriceGwei(gasPrice),
    };
  }
}

/**
 * SBT Mint（ERC721）のガス消費を推定
 * @param contract SBTコントラクトインスタンス
 * @param toAddress SBT受信者アドレス
 * @param gasPrice ガス価格（wei単位）
 * @param chainId チェーンID
 * @returns ガス推定結果
 */
export async function estimateSBTMintGas(
  contract: Contract,
  toAddress: string,
  gasPrice: bigint,
  chainId: number
): Promise<GasEstimate> {
  try {
    // SBT Mintトランザクション用のガスを推定
    // safeMintまたはmint関数を想定
    let estimatedGas: bigint;
    
    try {
      estimatedGas = await contract.safeMint.estimateGas(toAddress);
    } catch {
      try {
        estimatedGas = await contract.mint.estimateGas(toAddress);
      } catch {
        // どちらも失敗した場合はデフォルト値
        estimatedGas = BigInt(150000);
      }
    }
    
    // ガスリミット = 推定ガス × 1.3（SBTはより大きなマージンが必要）
    const gasLimit = (estimatedGas * BigInt(130)) / BigInt(100);
    
    // 総ガスコスト計算
    const totalGasCost = estimatedGas * gasPrice;
    
    // POL単位での表示用
    const totalGasCostPOL = formatGasCostPOL(totalGasCost);
    
    // ガス価格をGwei単位で表示用に変換
    const displayGasPrice = formatGasPriceGwei(gasPrice);
    
    return {
      estimatedGas,
      gasPrice,
      totalGasCost,
      totalGasCostPOL,
      gasLimit,
      displayGasPrice,
    };
  } catch (error) {
    console.error('SBT mint gas estimation error:', error);
    
    // フォールバック：SBT Mintはガスを多く消費
    const defaultGasUnits = BigInt(200000);
    const gasLimit = (defaultGasUnits * BigInt(130)) / BigInt(100);
    const totalGasCost = defaultGasUnits * gasPrice;
    
    return {
      estimatedGas: defaultGasUnits,
      gasPrice,
      totalGasCost,
      totalGasCostPOL: formatGasCostPOL(totalGasCost),
      gasLimit,
      displayGasPrice: formatGasPriceGwei(gasPrice),
    };
  }
}

/**
 * ガスコストをPOL単位でフォーマット（18デシマル考慮）
 */
export function formatGasCostPOL(gasCostWei: bigint): string {
  const polValue = Number(gasCostWei) / 1e18;
  
  if (polValue < 0.0001) {
    return polValue.toExponential(4);
  }
  
  if (polValue < 1) {
    return polValue.toFixed(8);
  }
  
  if (polValue < 1000) {
    return polValue.toFixed(6);
  }
  
  return polValue.toFixed(2);
}

/**
 * ガス価格をGwei単位でフォーマット
 */
export function formatGasPriceGwei(gasPriceWei: bigint): string {
  const gweiValue = Number(gasPriceWei) / 1e9;
  return gweiValue.toFixed(2);
}

/**
 * 複合トランザクション（支払い + SBT発行）のガス消費を推定
 * @param jpycContract JPYC ERC20コントラクト
 * @param sbtContract SBTコントラクト
 * @param payerAddress 支払者アドレス
 * @param recipientAddress SBT受信者アドレス
 * @param shopWalletAddress 店舗受取ウォレット
 * @param paymentAmount 支払い額（wei単位）
 * @param gasPrice ガス価格（wei単位）
 * @param chainId チェーンID
 * @returns トータルガス推定結果
 */
export async function estimateCombinedTransactionGas(
  jpycContract: Contract,
  sbtContract: Contract,
  payerAddress: string,
  recipientAddress: string,
  shopWalletAddress: string,
  paymentAmount: bigint,
  gasPrice: bigint,
  chainId: number
): Promise<{
  jpycTransferGas: GasEstimate;
  sbtMintGas: GasEstimate;
  totalGasCostPOL: string;
  estimatedTotalGasUnits: bigint;
}> {
  const jpycTransferGas = await estimateERC20TransferGas(
    jpycContract,
    payerAddress,
    shopWalletAddress,
    paymentAmount,
    gasPrice,
    chainId
  );

  const sbtMintGas = await estimateSBTMintGas(
    sbtContract,
    recipientAddress,
    gasPrice,
    chainId
  );

  // 合計（トランザクション実行するため両者のガスリミットを加算）
  const totalGasUnits = jpycTransferGas.gasLimit + sbtMintGas.gasLimit;
  const totalGasCost = totalGasUnits * gasPrice;
  const totalGasCostPOL = formatGasCostPOL(totalGasCost);

  return {
    jpycTransferGas,
    sbtMintGas,
    totalGasCostPOL,
    estimatedTotalGasUnits: totalGasUnits,
  };
}

/**
 * POLを必要とするかチェック
 * @param walletBalancePOL ウォレットのPOL残高（wei単位）
 * @param requiredGasWei 必要なガス代（wei単位）
 * @returns 不足額（不足がない場合は0）
 */
export function checkGasBalance(
  walletBalancePOL: bigint,
  requiredGasWei: bigint
): {
  hasSufficientGas: boolean;
  shortfallPOL?: string;
} {
  if (walletBalancePOL >= requiredGasWei) {
    return {
      hasSufficientGas: true,
    };
  }

  const shortfallWei = requiredGasWei - walletBalancePOL;
  const shortfallPOL = formatGasCostPOL(shortfallWei);

  return {
    hasSufficientGas: false,
    shortfallPOL,
  };
}

/**
 * 現在のネットワークが安価か判断（Polygon）
 */
export function isLowCostNetwork(chainId: number): boolean {
  // Polygon Mainnet (137) と Amoy (80002) は低コスト
  return chainId === 137 || chainId === 80002;
}
