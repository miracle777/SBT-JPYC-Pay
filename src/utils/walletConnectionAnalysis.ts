/**
 * MetaMaskアプリ内ブラウザが使用される根本原因の分析
 */

export interface ConnectionAnalysis {
  isMetaMaskInAppBrowser: boolean;
  connectionTrigger: 'USER_CLICK' | 'DEEPLINK' | 'QR_CODE' | 'UNKNOWN';
  browserContext: 'PWA' | 'NATIVE_BROWSER' | 'IN_APP_BROWSER';
  reasons: string[];
  solutions: string[];
}

/**
 * なぜMetaMaskアプリ内ブラウザが使用されるかを分析
 */
export function analyzeMetaMaskConnectionFlow(): ConnectionAnalysis {
  const userAgent = navigator.userAgent;
  const isMetaMaskInApp = /MetaMask/i.test(userAgent);
  const isPWA = window.matchMedia('(display-mode: standalone)').matches;
  
  console.group('🔍 MetaMask接続フロー分析');
  console.log('User Agent:', userAgent);
  console.log('PWA モード:', isPWA);
  console.log('MetaMaskアプリ内:', isMetaMaskInApp);
  console.log('Referrer:', document.referrer);
  console.log('URL:', window.location.href);
  
  const reasons: string[] = [];
  const solutions: string[] = [];
  let connectionTrigger: 'USER_CLICK' | 'DEEPLINK' | 'QR_CODE' | 'UNKNOWN' = 'UNKNOWN';
  let browserContext: 'PWA' | 'NATIVE_BROWSER' | 'IN_APP_BROWSER' = 'NATIVE_BROWSER';

  // 1. PWA環境の分析
  if (isPWA) {
    browserContext = 'PWA';
    reasons.push('PWAモードでの実行（スタンドアローンモード）');
    
    if (isMetaMaskInApp) {
      reasons.push('PWA内でMetaMaskアプリ内ブラウザが起動された');
      reasons.push('これは通常、PWAのディープリンク処理によるもの');
      solutions.push('PWAのディープリンク設定を見直す');
      solutions.push('manifest.jsonの"start_url"と"scope"を確認');
    }
  }

  // 2. MetaMaskアプリ内ブラウザの検出
  if (isMetaMaskInApp) {
    browserContext = 'IN_APP_BROWSER';
    reasons.push('MetaMaskアプリ内ブラウザで実行中');

    // ディープリンクによる起動の可能性
    if (document.referrer.includes('metamask') || window.location.href.includes('metamask')) {
      connectionTrigger = 'DEEPLINK';
      reasons.push('MetaMaskディープリンクによる起動');
      solutions.push('ディープリンクURLを修正してネイティブブラウザを指定');
    }

    // QRコードスキャンによる起動の可能性
    if (userAgent.includes('Mobile') && !document.referrer) {
      connectionTrigger = 'QR_CODE';
      reasons.push('QRコードスキャンによるMetaMaskアプリ内ブラウザ起動');
      solutions.push('QRコードに含まれるURLを修正');
      solutions.push('MetaMask以外のQRコードリーダーの使用を推奨');
    }
  }

  // 3. WalletConnect/ディープリンクの問題
  if (window.location.protocol === 'https:' && window.location.href.includes('wc=')) {
    connectionTrigger = 'DEEPLINK';
    reasons.push('WalletConnectディープリンクが原因の可能性');
    solutions.push('WalletConnectの設定を見直し、ブラウザ優先に設定');
  }

  // 4. PWAのmanifest.json設定問題
  if (isPWA) {
    reasons.push('PWA設定がMetaMaskアプリとの連携を引き起こしている可能性');
    solutions.push('manifest.jsonの"start_url"をルートパスに設定');
    solutions.push('"scope"を適切に制限');
    solutions.push('ディープリンクハンドラーを無効化');
  }

  console.log('分析結果 - 原因:', reasons);
  console.log('分析結果 - 解決策:', solutions);
  console.groupEnd();

  return {
    isMetaMaskInAppBrowser: isMetaMaskInApp,
    connectionTrigger,
    browserContext,
    reasons,
    solutions
  };
}

/**
 * MetaMaskディープリンクの無効化
 */
export function preventMetaMaskDeepLink() {
  // PWAでのディープリンク処理を無効化
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'DISABLE_METAMASK_DEEPLINK'
    });
  }

  // MetaMaskディープリンクの傍受
  window.addEventListener('beforeunload', (event) => {
    const href = window.location.href;
    if (href.includes('metamask://') || href.includes('ethereum:')) {
      event.preventDefault();
      console.warn('🚫 MetaMaskディープリンクをブロックしました');
      return false;
    }
  });
}

/**
 * PWA設定の問題を修正
 */
export function fixPWAConfiguration(): Promise<void> {
  return new Promise((resolve) => {
    // manifest.jsonの動的修正
    const manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
    if (manifestLink) {
      fetch(manifestLink.href)
        .then(response => response.json())
        .then(manifest => {
          console.log('🔧 現在のmanifest.json:', manifest);
          
          // 問題のある設定をチェック
          const issues: string[] = [];
          
          if (manifest.start_url && manifest.start_url !== '/') {
            issues.push(`start_url: "${manifest.start_url}" → "/" に修正を推奨`);
          }
          
          if (manifest.scope && manifest.scope !== '/') {
            issues.push(`scope: "${manifest.scope}" → "/" に修正を推奨`);
          }
          
          if (manifest.protocol_handlers) {
            issues.push('protocol_handlers が設定されています - 削除を推奨');
          }
          
          console.log('PWA設定の問題点:', issues);
          resolve();
        })
        .catch(error => {
          console.error('manifest.json の読み込みエラー:', error);
          resolve();
        });
    } else {
      resolve();
    }
  });
}

/**
 * 根本的解決策の実装
 */
export async function implementRootSolution(): Promise<void> {
  console.group('🛠️ 根本的解決策の実装');
  
  const analysis = analyzeMetaMaskConnectionFlow();
  
  // 1. PWA設定の修正
  await fixPWAConfiguration();
  
  // 2. ディープリンクの無効化
  preventMetaMaskDeepLink();
  
  // 3. ブラウザ環境の強制設定
  if (analysis.isMetaMaskInAppBrowser) {
    console.log('🌐 ネイティブブラウザへの移行を強制実行');
    
    // ネイティブブラウザでのURLを構築
    const currentUrl = window.location.href;
    const cleanUrl = currentUrl.split('?')[0]; // クエリパラメータを除去
    
    // SafariまたはChromeで開く
    if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
      window.location.href = `x-web-search://?${cleanUrl}`;
    } else if (/Android/i.test(navigator.userAgent)) {
      window.location.href = `googlechrome://${cleanUrl.replace(/^https?:\/\//, '')}`;
    }
  }
  
  console.groupEnd();
}