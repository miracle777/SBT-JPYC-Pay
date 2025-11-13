import { ethers } from 'ethers';
import { ChainId, NetworkConfig, NETWORKS } from '../types';

/**
 * アドレスを短縮表示用にフォーマット
 */
export function formatAddress(address: string, length = 4): string {
  if (!address) return '';
  return `${address.slice(0, 2 + length)}...${address.slice(-length)}`;
}

/**
 * ETHの値を人間が読める形式にフォーマット
 */
export function formatEther(value: string | bigint, decimals = 4): string {
  return parseFloat(ethers.formatEther(value)).toFixed(decimals);
}

/**
 * 大きな数値をK、M、Bなどの単位付きでフォーマット
 */
export function formatNumber(num: number): string {
  if (num >= 1000000000) {
    return (num / 1000000000).toFixed(1) + 'B';
  }
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

/**
 * 日時を相対時間でフォーマット（例：「2時間前」）
 */
export function formatRelativeTime(date: Date | string | number): string {
  const now = new Date();
  const target = new Date(date);
  const diffMs = now.getTime() - target.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) {
    return 'たった今';
  } else if (diffMinutes < 60) {
    return `${diffMinutes}分前`;
  } else if (diffHours < 24) {
    return `${diffHours}時間前`;
  } else if (diffDays < 30) {
    return `${diffDays}日前`;
  } else {
    return target.toLocaleDateString('ja-JP');
  }
}

/**
 * ファイルサイズを人間が読める形式にフォーマット
 */
export function formatFileSize(bytes: number): string {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Ethereumアドレスの妥当性をチェック
 */
export function isValidAddress(address: string): boolean {
  try {
    return ethers.isAddress(address);
  } catch {
    return false;
  }
}

/**
 * プライベートキーからアドレスを取得
 */
export function getAddressFromPrivateKey(privateKey: string): string {
  try {
    const wallet = new ethers.Wallet(privateKey);
    return wallet.address;
  } catch {
    throw new Error('Invalid private key');
  }
}

/**
 * チェーンIDからネットワーク設定を取得
 */
export function getNetworkConfig(chainId: ChainId): NetworkConfig | null {
  return NETWORKS[chainId] || null;
}

/**
 * ネットワーク名からチェーンIDを取得
 */
export function getChainIdByName(networkName: string): ChainId | null {
  const entries = Object.entries(NETWORKS);
  const found = entries.find(([, config]) => 
    config.name.toLowerCase() === networkName.toLowerCase()
  );
  return found ? Number(found[0]) : null;
}

/**
 * ネットワークがサポートされているかチェック
 */
export function isSupportedNetwork(chainId: number): boolean {
  return chainId in NETWORKS;
}

/**
 * Hexチェーンフォーマットに変換（MetaMask用）
 */
export function toHexChainId(chainId: ChainId): string {
  return `0x${chainId.toString(16)}`;
}

/**
 * 十六進数文字列から数値に変換
 */
export function fromHexChainId(hexChainId: string): ChainId {
  return parseInt(hexChainId, 16);
}

/**
 * トランザクションハッシュの妥当性をチェック
 */
export function isValidTxHash(hash: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(hash);
}

/**
 * ガス価格をGweiでフォーマット
 */
export function formatGasPrice(gasPriceWei: bigint): string {
  const gweiValue = Number(gasPriceWei) / 1e9;
  return `${gweiValue.toFixed(2)} Gwei`;
}

/**
 * Wei単位の値をGweiに変換
 */
export function weiToGwei(wei: bigint): number {
  return Number(wei) / 1e9;
}

/**
 * Gwei単位の値をWeiに変換
 */
export function gweiToWei(gwei: number): bigint {
  return BigInt(Math.round(gwei * 1e9));
}

/**
 * パーセンテージを計算
 */
export function calculatePercentage(current: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((current / total) * 100);
}

/**
 * 配列をランダムにシャッフル
 */
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * ディープコピー
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * デバウンス関数
 */
export function debounce<T extends (...args: any[]) => void>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

/**
 * スロットル関数
 */
export function throttle<T extends (...args: any[]) => void>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      func(...args);
    }
  };
}

/**
 * LocalStorageの安全な操作
 */
export const storage = {
  get<T>(key: string, defaultValue?: T): T | null {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue || null;
    } catch {
      return defaultValue || null;
    }
  },

  set<T>(key: string, value: T): boolean {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  },

  remove(key: string): boolean {
    try {
      localStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  },

  clear(): boolean {
    try {
      localStorage.clear();
      return true;
    } catch {
      return false;
    }
  },
};

/**
 * URLの妥当性をチェック
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * メールアドレスの妥当性をチェック
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * 文字列を安全にトランケート
 */
export function truncateString(str: string, maxLength: number, suffix = '...'): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - suffix.length) + suffix;
}

/**
 * クエリパラメータをパース
 */
export function parseQueryParams(search: string): Record<string, string> {
  const params = new URLSearchParams(search);
  const result: Record<string, string> = {};
  params.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}

/**
 * オブジェクトをクエリストリングに変換
 */
export function objectToQueryString(obj: Record<string, any>): string {
  const params = new URLSearchParams();
  Object.entries(obj).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      params.append(key, String(value));
    }
  });
  return params.toString();
}

/**
 * カラーコードの妥当性をチェック
 */
export function isValidColor(color: string): boolean {
  const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  return hexColorRegex.test(color);
}

/**
 * エラーメッセージを安全に取得
 */
export function getErrorMessage(error: any): string {
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  if (error?.message) return error.message;
  if (error?.reason) return error.reason;
  return 'Unknown error occurred';
}

/**
 * プロミスにタイムアウトを追加
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Timeout')), timeoutMs)
  );
  return Promise.race([promise, timeout]);
}

/**
 * 再試行可能な関数実行
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt === maxAttempts) {
        throw lastError;
      }
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }
  
  throw lastError!;
}