/**
 * Google Analytics 4 (GA4) トラッキング実装
 * PWA特有のイベントとメトリクスを追跡
 */

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
  }
}

// Google Analytics Measurement ID (環境変数から取得)
const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID || '';

/**
 * Google Analytics初期化
 */
export const initializeAnalytics = (): void => {
  if (!GA_MEASUREMENT_ID) {
    console.warn('⚠️ Google Analytics Measurement ID が設定されていません');
    console.log('💡 .envファイルにVITE_GA_MEASUREMENT_ID=G-XXXXXXXXXXを設定してください');
    return;
  }

  // GAスクリプトが既に読み込まれている場合はスキップ
  if (window.gtag) {
    console.log('✅ Google Analytics already initialized with ID:', GA_MEASUREMENT_ID);
    return;
  }

  console.log('🚀 Initializing Google Analytics with ID:', GA_MEASUREMENT_ID);

  // デバッグ用: ブラウザコンソールから確認できるようにグローバルに公開
  try {
    (window as any).__GA_MEASUREMENT_ID = GA_MEASUREMENT_ID;
    (window as any).__GA_DEBUG = true;
  } catch (e) {
    // ignore
  }

  // dataLayerの初期化
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag(...args: any[]) {
    window.dataLayer?.push(args);
    // デバッグ用: GA呼び出しをログ出力
    if ((window as any).__GA_DEBUG) {
      console.log('📊 GA call:', args);
    }
  };

  // 初期化フラグ（デバッグ用）と簡易テスト送信関数を公開
  try {
    (window as any).__GA_INITIALIZED = true;
    (window as any).__GA_send_test_event = () => {
      if (window.gtag) {
        window.gtag('event', 'debug_test_event', { 
          debug_mode: true, 
          source: 'manual_console',
          timestamp: Date.now() 
        });
        console.log('📨 GA debug test event sent');
      } else {
        console.warn('⚠️ window.gtag is not available');
      }
    };
  } catch (e) {
    // ignore
  }

  // GA初期化
  window.gtag('js', new Date());
  window.gtag('config', GA_MEASUREMENT_ID, {
    send_page_view: false, // 手動でページビューを送信
    app_name: 'SBT masaru21 Pay(仮)',
    app_version: '1.0.0',
    debug_mode: true, // 常にデバッグモード有効
    allow_google_signals: true,
    allow_ad_personalization_signals: false,
    cookie_flags: 'SameSite=None;Secure',
  });

  // GAスクリプトの動的読み込み
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  
  // スクリプト読み込み完了時の処理
  script.onload = () => {
    console.log('✅ Google Analytics script loaded successfully');
    
    // データ送信確認のためのテストイベント
    setTimeout(() => {
      window.gtag?.('event', 'ga_initialization', {
        event_category: 'System',
        event_label: 'GA Script Loaded',
        custom_parameter_1: 'initialization_test',
        timestamp: Date.now(),
        debug_mode: true
      });
      console.log('📊 GA: Initialization test event sent');
      
      // 追加の確認用イベント
      window.gtag?.('event', 'debug_test_manual', {
        event_category: 'Debug',
        event_label: 'Manual Debug Test',
        test_value: 'verification_123',
        timestamp: Date.now()
      });
      console.log('🔍 GA: Manual debug event sent');
    }, 1000);
    
    // 初期ページビューを明示的に送信（遅延実行で確実に送信）
    setTimeout(() => {
      window.gtag?.('event', 'page_view', {
        page_title: document.title,
        page_location: window.location.href,
        page_path: window.location.pathname,
        custom_parameter_2: 'manual_page_view'
      });
      console.log('📊 GA: Manual page_view event sent');
    }, 1500);
  };
  
  script.onerror = (error) => {
    console.error('❌ Failed to load Google Analytics script:', error);
  };
  
  document.head.appendChild(script);

  console.log('✅ Google Analytics initialized:', GA_MEASUREMENT_ID);
};

/**
 * PWAインストールイベントの追跡
 */
export const trackPWAInstall = (): void => {
  if (!window.gtag || !GA_MEASUREMENT_ID) return;

  window.gtag('event', 'pwa_install', {
    event_category: 'PWA',
    event_label: 'App Installed',
    value: 1,
  });

  console.log('📊 GA Event: PWA Install');
};

/**
 * PWA起動イベントの追跡
 */
export const trackPWALaunch = (displayMode: string): void => {
  if (!window.gtag || !GA_MEASUREMENT_ID) return;

  window.gtag('event', 'pwa_launch', {
    event_category: 'PWA',
    event_label: 'App Launch',
    display_mode: displayMode,
  });

  console.log('📊 GA Event: PWA Launch -', displayMode);
};

/**
 * ページビューの追跡
 */
export const trackPageView = (pagePath: string, pageTitle?: string): void => {
  if (!window.gtag || !GA_MEASUREMENT_ID) return;

  window.gtag('event', 'page_view', {
    page_path: pagePath,
    page_title: pageTitle || document.title,
  });

  console.log('📊 GA PageView:', pagePath);
};

/**
 * カスタムイベントの追跡
 */
export const trackEvent = (
  eventName: string,
  parameters?: Record<string, any>
): void => {
  if (!window.gtag || !GA_MEASUREMENT_ID) return;

  window.gtag('event', eventName, parameters);

  console.log('📊 GA Event:', eventName, parameters);
};

/**
 * オンライン/オフライン状態の追跡
 */
export const trackOnlineStatus = (isOnline: boolean): void => {
  if (!window.gtag || !GA_MEASUREMENT_ID) return;

  window.gtag('event', isOnline ? 'online' : 'offline', {
    event_category: 'Network',
    event_label: isOnline ? 'Online' : 'Offline',
  });

  console.log('📊 GA Network Status:', isOnline ? 'Online' : 'Offline');
};

/**
 * SBT発行イベントの追跡
 */
export const trackSBTIssuance = (templateName: string): void => {
  if (!window.gtag || !GA_MEASUREMENT_ID) return;

  window.gtag('event', 'sbt_issuance', {
    event_category: 'SBT',
    event_label: 'SBT Issued',
    template_name: templateName,
  });

  console.log('📊 GA Event: SBT Issuance -', templateName);
};

/**
 * QR決済イベントの追跡
 */
export const trackQRPayment = (amount: number, currency: string = 'JPYC'): void => {
  if (!window.gtag || !GA_MEASUREMENT_ID) return;

  window.gtag('event', 'qr_payment', {
    event_category: 'Payment',
    event_label: 'QR Payment',
    currency: currency,
    value: amount,
  });

  console.log('📊 GA Event: QR Payment -', amount, currency);
};

/**
 * エラートラッキング
 */
export const trackError = (
  errorMessage: string,
  errorType: string = 'generic'
): void => {
  if (!window.gtag || !GA_MEASUREMENT_ID) return;

  window.gtag('event', 'exception', {
    description: errorMessage,
    fatal: false,
    error_type: errorType,
  });

  console.log('📊 GA Error:', errorType, errorMessage);
};

/**
 * Service Worker更新イベントの追跡
 */
export const trackSWUpdate = (): void => {
  if (!window.gtag || !GA_MEASUREMENT_ID) return;

  window.gtag('event', 'sw_update', {
    event_category: 'PWA',
    event_label: 'Service Worker Updated',
  });

  console.log('📊 GA Event: Service Worker Update');
};

/**
 * PWAディスプレイモードの検出
 */
export const getPWADisplayMode = (): string => {
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  const isFullscreen = window.matchMedia('(display-mode: fullscreen)').matches;
  const isMinimalUI = window.matchMedia('(display-mode: minimal-ui)').matches;

  if (isFullscreen) return 'fullscreen';
  if (isStandalone) return 'standalone';
  if (isMinimalUI) return 'minimal-ui';
  
  // iOS PWA検出
  if ((window.navigator as any).standalone) return 'standalone-ios';
  
  return 'browser';
};

/**
 * PWA使用状況の自動追跡設定
 */
export const setupPWATracking = (): void => {
  // ディスプレイモードの検出と追跡
  const displayMode = getPWADisplayMode();
  trackPWALaunch(displayMode);

  // オンライン/オフライン状態の監視
  window.addEventListener('online', () => trackOnlineStatus(true));
  window.addEventListener('offline', () => trackOnlineStatus(false));

  // PWAインストールイベントの監視
  window.addEventListener('appinstalled', () => trackPWAInstall());

  // ページ遷移の追跡（SPA用）
  let lastPath = location.pathname;
  const observer = new MutationObserver(() => {
    if (location.pathname !== lastPath) {
      lastPath = location.pathname;
      trackPageView(location.pathname);
    }
  });

  observer.observe(document.querySelector('#root') || document.body, {
    childList: true,
    subtree: true,
  });

  // 定期的なハートビートイベント（GA接続確認）
  let heartbeatCount = 0;
  setInterval(() => {
    heartbeatCount++;
    if (heartbeatCount <= 5) { // 最初の5回のみ
      trackEvent('heartbeat', {
        event_category: 'System',
        event_label: 'Connection Test',
        count: heartbeatCount,
        timestamp: Date.now()
      });
      console.log(`💓 GA Heartbeat ${heartbeatCount} sent`);
    }
  }, 30000); // 30秒間隔

  // ユーザーエンゲージメント追跡
  let engagementStartTime = Date.now();
  window.addEventListener('beforeunload', () => {
    const sessionDuration = Date.now() - engagementStartTime;
    trackEvent('session_end', {
      event_category: 'Engagement',
      event_label: 'Session Duration',
      value: Math.round(sessionDuration / 1000), // 秒単位
      session_duration: sessionDuration
    });
  });

  console.log('✅ PWA Tracking setup complete');
};
