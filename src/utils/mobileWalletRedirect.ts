/**
 * モバイル環境でのウォレットリダイレクト処理
 * MetaMaskアプリ内ブラウザやデフォルトブラウザでの接続をサポート
 */

export interface MobileRedirectOptions {
  isMobile: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isMetaMaskBrowser: boolean;
}

/**
 * モバイル環境情報を取得
 */
export function getMobileEnvironment(): MobileRedirectOptions {
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const isMobile = /Mobile|Android|iPhone|iPad|iPod/.test(userAgent);
  const isIOS = /iPhone|iPad|iPod/.test(userAgent);
  const isAndroid = /Android/.test(userAgent);
  const isMetaMaskBrowser = /MetaMaskMobile|MobileWallet/.test(userAgent);

  return {
    isMobile,
    isIOS,
    isAndroid,
    isMetaMaskBrowser,
  };
}

/**
 * MetaMaskアプリ内ブラウザでの表示判定
 */
export function isInMetaMaskBrowser(): boolean {
  return !!(
    typeof window !== 'undefined' &&
    window.ethereum &&
    (window.ethereum as any).isMetaMask &&
    /MetaMaskMobile|MobileWallet/.test(navigator.userAgent)
  );
}

/**
 * MetaMaskアプリ内ブラウザでDAppをリダイレクト
 * MetaMask内ブラウザで利用可能
 */
export function redirectToMetaMaskDapp(url: string): void {
  const env = getMobileEnvironment();
  
  if (env.isMobile) {
    if (env.isIOS) {
      // iOS: metamask:// または custom scheme を使用
      const dappUrl = `metamask://dapp/${encodeURIComponent(url)}`;
      const deepLink = `https://metamask.app.link/dapp/${encodeURIComponent(url)}`;
      
      console.log('🦊 iOS MetaMask リダイレクト:', deepLink);
      
      // まず deep link を試す
      window.location.href = deepLink;
      
      // フォールバック
      setTimeout(() => {
        window.open(url, '_self');
      }, 1500);
    } else if (env.isAndroid) {
      // Android: content:// スキーム
      const deepLink = `https://metamask.app.link/dapp/${encodeURIComponent(url)}`;
      
      console.log('🦊 Android MetaMask リダイレクト:', deepLink);
      window.location.href = deepLink;
    }
  }
}

/**
 * ウォレット検出の遅延処理（モバイル用）
 * モバイルでのウォレット検出は遅延する傾向があるため、待機時間を与える
 */
export async function waitForWalletDetection(
  timeout: number = 3000
): Promise<boolean> {
  return new Promise((resolve) => {
    let resolved = false;

    // ethereum オブジェクトの存在確認
    const checkEthereum = () => {
      if (typeof window !== 'undefined' && window.ethereum) {
        if (!resolved) {
          resolved = true;
          clearInterval(intervalId);
          clearTimeout(timeoutId);
          resolve(true);
        }
      }
    };

    // 最初の確認
    checkEthereum();

    // 100ms ごとにチェック
    const intervalId = setInterval(checkEthereum, 100);

    // タイムアウト
    const timeoutId = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        clearInterval(intervalId);
        resolve(false);
      }
    }, timeout);
  });
}

/**
 * window.ethereum が存在するか確認
 */
export function isEthereumAvailable(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.ethereum !== 'undefined' &&
    window.ethereum !== null
  );
}

/**
 * MetaMask がインストール/検出されているか確認
 */
export function isMetaMaskDetected(): boolean {
  return (
    isEthereumAvailable() &&
    !!(window.ethereum as any).isMetaMask
  );
}

/**
 * MetaMask へのダイレクト接続を試みる
 */
export async function attemptDirectMetaMaskConnection(): Promise<{
  success: boolean;
  accounts?: string[];
  error?: string;
}> {
  const env = getMobileEnvironment();
  
  if (!isMetaMaskDetected()) {
    console.log('🔍 MetaMask が見つかりません');
    return {
      success: false,
      error: 'MetaMask が検出されていません'
    };
  }

  try {
    console.log('🔌 MetaMask への直接接続を試行...');
    
    const accounts = await (window.ethereum as any).request({
      method: 'eth_requestAccounts'
    });

    if (accounts && accounts.length > 0) {
      console.log('✅ MetaMask 接続成功:', accounts[0]);
      return {
        success: true,
        accounts
      };
    } else {
      throw new Error('アカウントが見つかりません');
    }
  } catch (error: any) {
    const errorMessage = error.message || String(error);
    console.error('❌ MetaMask 接続失敗:', errorMessage);
    
    return {
      success: false,
      error: errorMessage
    };
  }
}

/**
 * モバイル環境での推奨ウォレットオーダーを取得
 */
export function getMobileWalletOrder(): string[] {
  const env = getMobileEnvironment();

  if (env.isIOS) {
    // iOS: MetaMask, WalletConnect が最優先
    return ['metamask', 'walletconnect', 'coinbase-wallet'];
  } else if (env.isAndroid) {
    // Android: MetaMask, WalletConnect が最優先
    return ['metamask', 'walletconnect', 'coinbase-wallet'];
  }

  // Desktop
  return ['metamask', 'coinbase-wallet', 'walletconnect'];
}

/**
 * ウォレット検出の詳細情報をログ出力
 */
export function logWalletDetectionDebug(): void {
  const env = getMobileEnvironment();
  
  console.group('📱 ウォレット検出デバッグ情報');
  
  console.log('環境情報:', {
    isMobile: env.isMobile,
    isIOS: env.isIOS,
    isAndroid: env.isAndroid,
    isMetaMaskBrowser: env.isMetaMaskBrowser,
    userAgent: navigator.userAgent
  });
  
  console.log('window.ethereum 状態:', {
    exists: isEthereumAvailable(),
    isMetaMask: isMetaMaskDetected(),
    providers: (window as any).ethereum?.providers?.length || 0
  });
  
  if (isEthereumAvailable()) {
    const eth = window.ethereum as any;
    console.log('詳細情報:', {
      chainId: eth.chainId,
      isConnected: eth.isConnected?.() || 'N/A',
      selectedAddress: eth.selectedAddress,
      isDappBrowser: isInMetaMaskBrowser()
    });
  }
  
  console.groupEnd();
}

export default {
  getMobileEnvironment,
  isInMetaMaskBrowser,
  redirectToMetaMaskDapp,
  waitForWalletDetection,
  isEthereumAvailable,
  isMetaMaskDetected,
  attemptDirectMetaMaskConnection,
  getMobileWalletOrder,
  logWalletDetectionDebug,
};
