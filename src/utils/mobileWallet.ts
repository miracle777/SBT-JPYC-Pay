/**
 * モバイル環境でのウォレット検出とDeepLink処理
 */

export interface MobileWalletInfo {
  name: string;
  installed: boolean;
  universal: string;
  deepLink: string;
  package?: string;
}

export const MOBILE_WALLETS: MobileWalletInfo[] = [
  {
    name: 'MetaMask',
    installed: false,
    universal: 'https://metamask.app.link/dapp/',
    deepLink: 'metamask://dapp/',
    package: 'io.metamask'
  },
  {
    name: 'Trust Wallet',
    installed: false,
    universal: 'https://link.trustwallet.com/open_url?coin_id=60&url=',
    deepLink: 'trust://open_url?coin_id=60&url='
  },
  {
    name: 'Rainbow',
    installed: false,
    universal: 'https://rainbow.app/',
    deepLink: 'rainbow://dapp/'
  },
  {
    name: 'HashPack',
    installed: false,
    universal: 'https://wallet.hashpack.app/',
    deepLink: 'hashpack://connect/',
    package: 'app.hashpack.wallet'
  }
];

/**
 * モバイル環境の検出
 */
export function isMobileDevice(): boolean {
  return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * iOS環境の検出
 */
export function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

/**
 * Android環境の検出
 */
export function isAndroid(): boolean {
  return /Android/i.test(navigator.userAgent);
}

/**
 * MetaMaskモバイルアプリの検出（拡張版）
 */
export function detectMetaMaskMobile(): boolean {
  if (typeof window.ethereum === 'undefined') {
    return false;
  }

  // MetaMask固有のプロパティをチェック
  const ethereum = window.ethereum as any;
  
  // 複数の検出方法を試行
  const checks = [
    ethereum.isMetaMask === true,
    ethereum._metamask !== undefined,
    ethereum.selectedAddress !== undefined,
    ethereum.providers?.some((p: any) => p.isMetaMask),
    ethereum.providerMap?.has('MetaMask'),
    navigator.userAgent.includes('MetaMaskMobile')
  ];

  return checks.some(check => check === true);
}

/**
 * HashPack Walletの検出
 */
export function detectHashPackWallet(): boolean {
  if (typeof window.ethereum === 'undefined') {
    return false;
  }

  // HashPack固有のプロパティをチェック
  const ethereum = window.ethereum as any;
  
  // HashPack検出方法
  const checks = [
    ethereum.isHashPack === true,
    ethereum._hashpack !== undefined,
    ethereum.providers?.some((p: any) => p.isHashPack),
    ethereum.providerMap?.has('HashPack'),
    navigator.userAgent.includes('HashPack'),
    (window as any).hashpack !== undefined
  ];

  return checks.some(check => check === true);
}

/**
 * Hedera/HashPack専用ネットワークチェック
 */
export function isHederaNetwork(chainId?: number): boolean {
  // Hedera Mainnet: 295, Hedera Testnet: 296
  return chainId === 295 || chainId === 296;
}

/**
 * モバイルウォレットへのDeepLink生成
 */
export function generateMobileWalletLink(walletInfo: MobileWalletInfo, dappUrl: string): string {
  const encodedUrl = encodeURIComponent(dappUrl);
  
  // モバイル環境に応じたリンク生成
  if (isIOS()) {
    // iOSはUniversal Linkを優先
    return walletInfo.universal + encodedUrl;
  } else if (isAndroid()) {
    // AndroidはDeepLinkを試行、フォールバックでUniversal Link
    return walletInfo.deepLink + encodedUrl;
  }
  
  return walletInfo.universal + encodedUrl;
}

/**
 * MetaMaskモバイル向けの接続URL生成
 */
export function getMetaMaskMobileConnectUrl(): string {
  const currentUrl = window.location.href;
  const baseUrl = window.location.origin + window.location.pathname;
  
  if (isIOS()) {
    return `https://metamask.app.link/dapp/${baseUrl}`;
  } else {
    return `https://metamask.app.link/dapp/${baseUrl}`;
  }
}

/**
 * ウォレット接続の待機（モバイル用）
 */
export async function waitForWalletConnection(maxWaitMs: number = 10000): Promise<boolean> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWaitMs) {
    if (window.ethereum && detectMetaMaskMobile()) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  return false;
}

/**
 * モバイルブラウザでのウォレット検出の改善
 */
export function enhanceMobileWalletDetection(): void {
  // モバイル環境でのwndow.ethereumの遅延読み込みに対応
  if (isMobileDevice() && !window.ethereum) {
    // 少し待ってから再チェック
    setTimeout(() => {
      if (window.ethereum) {
        window.dispatchEvent(new Event('ethereum#initialized'));
      }
    }, 1000);
  }
}

/**
 * WalletConnectのQRコード表示用情報
 */
export interface WalletConnectInfo {
  qrCode: string;
  uri: string;
  supported: boolean;
}

/**
 * WalletConnect対応の準備
 */
export function prepareWalletConnect(): WalletConnectInfo {
  // 将来のWalletConnect実装用のプレースホルダー
  return {
    qrCode: '',
    uri: '',
    supported: false
  };
}