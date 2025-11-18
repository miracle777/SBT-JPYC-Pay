/**
 * スマートフォン環境でのMetaMask接続を改善するユーティリティ
 */

/**
 * モバイルブラウザの種類を特定
 */
export interface MobileBrowserInfo {
  isIOS: boolean;
  isAndroid: boolean;
  isSafari: boolean;
  isChrome: boolean;
  isInAppBrowser: boolean;
  browserName: string;
}

/**
 * 詳細なモバイル環境情報の取得
 */
export function getMobileBrowserInfo(): MobileBrowserInfo {
  const userAgent = navigator.userAgent;
  
  return {
    isIOS: /iPad|iPhone|iPod/.test(userAgent),
    isAndroid: /Android/i.test(userAgent),
    isSafari: /Safari/i.test(userAgent) && !/Chrome/i.test(userAgent),
    isChrome: /Chrome/i.test(userAgent),
    isInAppBrowser: /FBAN|FBAV|Instagram|Twitter|Line|Snapchat/i.test(userAgent),
    browserName: getBrowserName(userAgent)
  };
}

function getBrowserName(userAgent: string): string {
  if (userAgent.includes('FBAN') || userAgent.includes('FBAV')) return 'Facebook';
  if (userAgent.includes('Instagram')) return 'Instagram';
  if (userAgent.includes('Twitter')) return 'Twitter';
  if (userAgent.includes('Line')) return 'LINE';
  if (userAgent.includes('Chrome')) return 'Chrome';
  if (userAgent.includes('Safari')) return 'Safari';
  if (userAgent.includes('Samsung')) return 'Samsung Browser';
  return 'Unknown';
}

/**
 * MetaMaskアプリの検出（改良版）
 */
export function detectMetaMaskWithRetry(): Promise<boolean> {
  return new Promise((resolve) => {
    let attempts = 0;
    const maxAttempts = 10;
    
    const checkMetaMask = () => {
      attempts++;
      
      // 基本的な window.ethereum の存在確認
      if (window.ethereum) {
        const ethereum = window.ethereum as any;
        
        // MetaMask の特徴的なプロパティをチェック
        const hasMetaMaskProperties = Boolean(
          ethereum.isMetaMask ||
          ethereum._metamask ||
          ethereum.providers?.some((p: any) => p.isMetaMask)
        );
        
        if (hasMetaMaskProperties) {
          console.log('✅ MetaMask detected on attempt', attempts);
          resolve(true);
          return;
        }
      }
      
      // 最大試行回数に達した場合
      if (attempts >= maxAttempts) {
        console.log('❌ MetaMask not detected after', maxAttempts, 'attempts');
        resolve(false);
        return;
      }
      
      // 500ms後に再試行
      setTimeout(checkMetaMask, 500);
    };
    
    checkMetaMask();
  });
}

/**
 * MetaMaskアプリを開くためのURL生成（改良版）
 */
export function createMetaMaskDeepLink(): string {
  const browserInfo = getMobileBrowserInfo();
  const currentUrl = window.location.href;
  const cleanUrl = currentUrl.split('#')[0].split('?')[0]; // フラグメントとクエリを除去
  
  if (browserInfo.isIOS) {
    // iOS用のUniversal Link
    return `https://metamask.app.link/dapp/${cleanUrl.replace(/^https?:\/\//, '')}`;
  } else if (browserInfo.isAndroid) {
    // Android用のIntent Link（フォールバック付き）
    const encodedUrl = encodeURIComponent(currentUrl);
    return `intent://dapp/${cleanUrl.replace(/^https?:\/\//, '')}/#Intent;scheme=metamask;package=io.metamask;S.browser_fallback_url=https://metamask.app.link/dapp/${encodedUrl};end`;
  }
  
  // フォールバック: Universal Link
  return `https://metamask.app.link/dapp/${cleanUrl.replace(/^https?:\/\//, '')}`;
}

/**
 * アプリ内ブラウザでの外部ブラウザ起動URL
 */
export function createExternalBrowserUrl(): string {
  const currentUrl = window.location.href;
  const browserInfo = getMobileBrowserInfo();
  
  if (browserInfo.isIOS) {
    // iOS Safari で開く
    return `x-safari-https://${currentUrl.replace(/^https?:\/\//, '')}`;
  } else if (browserInfo.isAndroid) {
    // Android Chrome で開く
    return `googlechrome://${currentUrl.replace(/^https?:\/\//, '')}`;
  }
  
  return currentUrl;
}

/**
 * MetaMaskアプリのインストール確認
 */
export async function checkMetaMaskAppInstalled(): Promise<boolean> {
  const browserInfo = getMobileBrowserInfo();
  
  // iOS App Store スキームをテスト
  if (browserInfo.isIOS) {
    try {
      const testLink = 'metamask://';
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = testLink;
      document.body.appendChild(iframe);
      
      // 少し待ってからiframeを削除
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
      
      return true; // iOS では正確な検出が困難なため、常に true
    } catch {
      return false;
    }
  }
  
  // Android では package manager で確認（制限あり）
  return false; // Webからは正確な確認が困難
}

/**
 * ユーザーフレンドリーな接続ガイダンス
 */
export function getConnectionGuidance(): {
  title: string;
  steps: string[];
  fallback: string;
} {
  const browserInfo = getMobileBrowserInfo();
  
  if (browserInfo.isInAppBrowser) {
    return {
      title: 'アプリ内ブラウザでは接続できません',
      steps: [
        '下の「外部ブラウザで開く」をタップ',
        'Safari または Chrome で開く',
        'MetaMask接続ボタンをタップ'
      ],
      fallback: '外部ブラウザで開く'
    };
  }
  
  if (browserInfo.isIOS) {
    return {
      title: 'iOS Safari での接続方法',
      steps: [
        'MetaMaskアプリがインストール済みか確認',
        '「MetaMaskアプリで開く」をタップ',
        'MetaMaskアプリで接続を承認',
        'Safariに自動で戻ります'
      ],
      fallback: 'MetaMaskアプリをインストール'
    };
  }
  
  if (browserInfo.isAndroid) {
    return {
      title: 'Android での接続方法',
      steps: [
        'MetaMaskアプリがインストール済みか確認',
        '「MetaMaskアプリで開く」をタップ',
        'アプリ選択でMetaMaskを選択',
        '接続を承認後、ブラウザに戻る'
      ],
      fallback: 'MetaMaskアプリをインストール'
    };
  }
  
  return {
    title: 'ウォレット接続',
    steps: [
      'MetaMaskアプリをインストール',
      'ブラウザでアプリを開く',
      'ウォレット接続をタップ'
    ],
    fallback: 'ヘルプを確認'
  };
}

/**
 * 接続の待機と確認
 */
export function waitForConnection(timeoutMs: number = 30000): Promise<boolean> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    
    const checkConnection = async () => {
      // タイムアウトチェック
      if (Date.now() - startTime > timeoutMs) {
        resolve(false);
        return;
      }
      
      try {
        // window.ethereum の存在確認
        if (window.ethereum) {
          const ethereum = window.ethereum as any;
          
          // アカウントが既に接続されているかチェック
          const accounts = await ethereum.request({ method: 'eth_accounts' });
          if (accounts && accounts.length > 0) {
            resolve(true);
            return;
          }
        }
      } catch (error) {
        console.warn('Connection check failed:', error);
      }
      
      // 1秒後に再チェック
      setTimeout(checkConnection, 1000);
    };
    
    checkConnection();
  });
}

/**
 * デバッグ情報の収集
 */
export function collectDebugInfo(): object {
  const browserInfo = getMobileBrowserInfo();
  
  return {
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    browserInfo,
    hasEthereum: typeof window.ethereum !== 'undefined',
    ethereumInfo: window.ethereum ? {
      isMetaMask: (window.ethereum as any).isMetaMask,
      isConnected: (window.ethereum as any).isConnected?.() || false,
      chainId: (window.ethereum as any).chainId,
      selectedAddress: (window.ethereum as any).selectedAddress
    } : null,
    url: window.location.href,
    referrer: document.referrer,
    standalone: (window.navigator as any).standalone,
    displayMode: window.matchMedia('(display-mode: standalone)').matches ? 'standalone' : 'browser'
  };
}