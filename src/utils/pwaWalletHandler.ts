/**
 * PWA環境でのウォレット接続を処理するユーティリティ
 * MetaMask + PWA の互換性問題を解決
 */

export interface PWAWalletDetectionResult {
  isMetaMaskAvailable: boolean;
  isStandaloneMode: boolean;
  shouldUseDeeplink: boolean;
  fallbackRequired: boolean;
  isMetaMaskBrowser: boolean;
  errorType?: 'PWA_INJECTION_FAILED' | 'STANDALONE_RESTRICTION' | 'MOBILE_PWA_LIMIT';
}

export interface WalletConnectionStrategy {
  method: 'DIRECT' | 'DEEPLINK' | 'WALLETCONNECT' | 'BROWSER_REDIRECT';
  reason: string;
  action: () => Promise<void>;
}

/**
 * MetaMaskアプリ内ブラウザかどうかを検出
 */
function isMetaMaskInAppBrowser(): boolean {
  const userAgent = navigator.userAgent.toLowerCase();
  
  // MetaMaskアプリ内ブラウザの特徴的なユーザーエージェント文字列をチェック
  return (
    userAgent.includes('metamask') ||
    (window as any).ethereum?.isMetaMask === true && (
      userAgent.includes('mobile') ||
      userAgent.includes('android') ||
      userAgent.includes('iphone')
    )
  );
}

/**
 * PWA環境でのウォレット可用性を検出
 */
export async function detectPWAWalletAvailability(): Promise<PWAWalletDetectionResult> {
  const isStandaloneMode = 
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    window.matchMedia('(display-mode: window-controls-overlay)').matches;

  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const isMetaMaskBrowser = isMetaMaskInAppBrowser();
  
  // 複数回の検出試行
  let isMetaMaskAvailable = false;
  
  // 1. 即座に確認
  if (typeof window.ethereum !== 'undefined') {
    isMetaMaskAvailable = Boolean(window.ethereum.isMetaMask);
  }
  
  // 2. 遅延検出（PWAでは注入が遅れる場合がある）
  if (!isMetaMaskAvailable && isStandaloneMode) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    if (typeof window.ethereum !== 'undefined') {
      isMetaMaskAvailable = Boolean(window.ethereum.isMetaMask);
    }
  }

  // 3. ethereum#initializedイベントを待機
  if (!isMetaMaskAvailable) {
    try {
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Timeout waiting for ethereum initialization'));
        }, 3000);

        const handleInitialized = () => {
          clearTimeout(timeout);
          window.removeEventListener('ethereum#initialized', handleInitialized);
          resolve();
        };

        window.addEventListener('ethereum#initialized', handleInitialized);
        
        // すでに利用可能な場合は即座に解決
        if (typeof window.ethereum !== 'undefined') {
          clearTimeout(timeout);
          window.removeEventListener('ethereum#initialized', handleInitialized);
          resolve();
        }
      });
      
      isMetaMaskAvailable = typeof window.ethereum !== 'undefined' && Boolean(window.ethereum.isMetaMask);
    } catch {
      // タイムアウトしても続行
    }
  }

  const result: PWAWalletDetectionResult = {
    isMetaMaskAvailable,
    isStandaloneMode,
    shouldUseDeeplink: isMobile && isStandaloneMode && !isMetaMaskAvailable,
    fallbackRequired: isStandaloneMode && !isMetaMaskAvailable,
    isMetaMaskBrowser,
  };

  // エラータイプの判定
  if (isStandaloneMode && !isMetaMaskAvailable) {
    if (isMobile) {
      result.errorType = 'MOBILE_PWA_LIMIT';
    } else {
      result.errorType = 'STANDALONE_RESTRICTION';
    }
  } else if (!isMetaMaskAvailable) {
    result.errorType = 'PWA_INJECTION_FAILED';
  }

  return result;
}

/**
 * PWA環境に応じた最適な接続戦略を決定
 */
export async function determineBestConnectionStrategy(): Promise<WalletConnectionStrategy> {
  const detection = await detectPWAWalletAvailability();
  
  // 1. 直接接続が可能な場合
  if (detection.isMetaMaskAvailable) {
    return {
      method: 'DIRECT',
      reason: 'MetaMask is available for direct connection',
      action: async () => {
        await window.ethereum!.request({ method: 'eth_requestAccounts' });
      }
    };
  }

  // 2. モバイルPWA + MetaMaskアプリでディープリンクを使用
  if (detection.shouldUseDeeplink) {
    return {
      method: 'DEEPLINK',
      reason: 'PWA standalone mode on mobile, using deeplink to MetaMask app',
      action: async () => {
        const currentUrl = encodeURIComponent(window.location.href);
        const deeplink = `https://metamask.app.link/dapp/${window.location.hostname}?redirect=${currentUrl}`;
        window.location.href = deeplink;
      }
    };
  }

  // 3. ブラウザでの再オープンを促す
  if (detection.isStandaloneMode) {
    return {
      method: 'BROWSER_REDIRECT',
      reason: 'PWA standalone mode detected, redirecting to browser',
      action: async () => {
        const url = window.location.href.replace(/\?.*/, '') + '?fromPWA=true';
        if (confirm('ウォレット接続にはブラウザでの操作が必要です。ブラウザで開き直しますか？')) {
          window.open(url, '_blank');
        }
      }
    };
  }

  // 4. フォールバック: WalletConnect等の提案
  return {
    method: 'WALLETCONNECT',
    reason: 'MetaMask not available, suggesting alternative wallet connection',
    action: async () => {
      throw new Error('FALLBACK_REQUIRED');
    }
  };
}

/**
 * PWAでのMetaMask接続を安全に実行
 */
export async function connectWalletInPWA(): Promise<{
  success: boolean;
  address?: string;
  chainId?: number;
  strategy: string;
  error?: string;
}> {
  try {
    const strategy = await determineBestConnectionStrategy();
    
    console.log(`🔄 PWA Wallet Connection Strategy: ${strategy.method}`);
    console.log(`📝 Reason: ${strategy.reason}`);
    
    if (strategy.method === 'WALLETCONNECT') {
      return {
        success: false,
        strategy: strategy.method,
        error: 'MetaMask not available in PWA environment'
      };
    }
    
    await strategy.action();
    
    // 直接接続の場合は結果を取得
    if (strategy.method === 'DIRECT') {
      const accounts = await window.ethereum!.request({ method: 'eth_accounts' });
      const chainIdHex = await window.ethereum!.request({ method: 'eth_chainId' });
      
      return {
        success: true,
        address: accounts[0],
        chainId: parseInt(chainIdHex, 16),
        strategy: strategy.method
      };
    }
    
    return {
      success: true,
      strategy: strategy.method
    };
    
  } catch (error: any) {
    console.error('PWA wallet connection error:', error);
    return {
      success: false,
      strategy: 'ERROR',
      error: error.message
    };
  }
}

/**
 * PWA環境でのウォレット状態を継続的に監視
 */
export function monitorPWAWalletState(
  onStateChange: (state: { connected: boolean; address?: string; error?: string }) => void
): () => void {
  let isMonitoring = true;
  
  const checkState = async () => {
    if (!isMonitoring) return;
    
    try {
      if (typeof window.ethereum !== 'undefined') {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        onStateChange({
          connected: accounts && accounts.length > 0,
          address: accounts[0]
        });
      } else {
        onStateChange({
          connected: false,
          error: 'Ethereum provider not available'
        });
      }
    } catch (error: any) {
      onStateChange({
        connected: false,
        error: error.message
      });
    }
    
    // 5秒間隔でチェック
    setTimeout(checkState, 5000);
  };
  
  checkState();
  
  return () => {
    isMonitoring = false;
  };
}

/**
 * PWA + MetaMask の互換性情報を表示用に整理
 */
export function getPWAWalletCompatibilityInfo(): {
  title: string;
  message: string;
  solutions: string[];
  isCompatible: boolean;
} {
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const hasMetaMask = typeof window.ethereum !== 'undefined';
  const isMetaMaskBrowser = isMetaMaskInAppBrowser();
  
  // MetaMaskアプリ内ブラウザの場合の特別な処理
  if (isMetaMaskBrowser) {
    if (hasMetaMask) {
      return {
        title: '✅ MetaMaskアプリ内ブラウザ',
        message: 'MetaMaskアプリ内ブラウザで動作中です。ウォレット機能は完全に利用できます。',
        solutions: [],
        isCompatible: true
      };
    } else {
      return {
        title: '🔄 MetaMaskアプリ内ブラウザ（初期化中）',
        message: 'MetaMask環境を初期化しています。少し待ってから再度お試しください。',
        solutions: [
          'ページを再読み込みする',
          'MetaMaskアプリを再起動する'
        ],
        isCompatible: true
      };
    }
  }
  
  if (isStandalone && !hasMetaMask) {
    if (isMobile) {
      return {
        title: '🔄 モバイルPWA環境',
        message: 'スタンドアロンモードではMetaMask拡張機能にアクセスできません。',
        solutions: [
          'MetaMaskアプリ内ブラウザで開く',
          'ブラウザで直接アプリを開く',
          'WalletConnect対応ウォレットを使用'
        ],
        isCompatible: false
      };
    } else {
      return {
        title: '⚠️ デスクトップPWA環境',
        message: 'PWAスタンドアロンモードではブラウザ拡張機能が制限されます。',
        solutions: [
          'ブラウザで直接アプリを開く',
          'MetaMaskブラウザ内でアクセス',
          'Web3互換ブラウザを使用'
        ],
        isCompatible: false
      };
    }
  }
  
  return {
    title: '✅ 互換性OK',
    message: 'ウォレット接続が正常に利用できます。',
    solutions: [],
    isCompatible: true
  };
}