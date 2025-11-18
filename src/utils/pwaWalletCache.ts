/**
 * PWA環境でのウォレットキャッシュ管理ユーティリティ
 */

export interface CacheState {
  localStorage: boolean;
  sessionStorage: boolean;
  indexedDB: boolean;
  webStorage: boolean;
  serviceWorker: boolean;
  metamaskState: boolean;
}

/**
 * PWAでのウォレットキャッシュを完全にクリア
 */
export async function clearAllWalletCache(): Promise<CacheState> {
  console.group('🧹 PWAウォレットキャッシュクリア開始');
  
  const state: CacheState = {
    localStorage: false,
    sessionStorage: false,
    indexedDB: false,
    webStorage: false,
    serviceWorker: false,
    metamaskState: false
  };

  try {
    // 1. LocalStorageのクリア
    console.log('📦 LocalStorage クリア中...');
    const walletKeys = [
      'walletAddress',
      'walletChainId', 
      'lastConnectionStrategy',
      'walletConnected',
      'metamask.selectedAddress',
      'metamask.isConnected',
      'ethereum.selectedAddress',
      'ethereum.accounts',
      'web3.currentAccount',
      'wallet.currentAccount'
    ];
    
    walletKeys.forEach(key => {
      localStorage.removeItem(key);
    });
    
    // PWA関連のストレージもクリア
    const pwaKeys = [
      'pwa.wallet.state',
      'pwa.connection.cache',
      'wallet.pwa.cache'
    ];
    
    pwaKeys.forEach(key => {
      localStorage.removeItem(key);
    });
    
    state.localStorage = true;
    console.log('✅ LocalStorage クリア完了');

    // 2. SessionStorageのクリア
    console.log('🔄 SessionStorage クリア中...');
    walletKeys.forEach(key => {
      sessionStorage.removeItem(key);
    });
    state.sessionStorage = true;
    console.log('✅ SessionStorage クリア完了');

    // 3. IndexedDBのクリア（ウォレット関連のみ）
    console.log('🗄️ IndexedDB ウォレットデータクリア中...');
    try {
      const databases = await indexedDB.databases();
      for (const db of databases) {
        if (db.name && (
          db.name.includes('wallet') || 
          db.name.includes('metamask') || 
          db.name.includes('ethereum') ||
          db.name.includes('web3')
        )) {
          indexedDB.deleteDatabase(db.name);
          console.log(`🗑️ 削除: ${db.name}`);
        }
      }
      state.indexedDB = true;
    } catch (error) {
      console.warn('⚠️ IndexedDB クリアでエラー:', error);
    }
    console.log('✅ IndexedDB クリア完了');

    // 4. WebStorageのクリア（より包括的）
    console.log('💾 WebStorage 包括的クリア中...');
    try {
      // すべてのキーをスキャンしてウォレット関連を削除
      const allKeys = Object.keys(localStorage);
      allKeys.forEach(key => {
        const lowerKey = key.toLowerCase();
        if (lowerKey.includes('wallet') || 
            lowerKey.includes('metamask') || 
            lowerKey.includes('ethereum') ||
            lowerKey.includes('web3') ||
            lowerKey.includes('account') ||
            lowerKey.includes('address')) {
          localStorage.removeItem(key);
          console.log(`🧹 削除: ${key}`);
        }
      });
      state.webStorage = true;
    } catch (error) {
      console.warn('⚠️ WebStorage クリアでエラー:', error);
    }
    console.log('✅ WebStorage クリア完了');

    // 5. Service Workerキャッシュのクリア
    console.log('🔧 Service Worker キャッシュクリア中...');
    try {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        // Service Workerにウォレットキャッシュクリアを指示
        navigator.serviceWorker.controller.postMessage({
          type: 'CLEAR_WALLET_CACHE'
        });
        
        // キャッシュAPIを直接操作
        if ('caches' in window) {
          const cacheNames = await caches.keys();
          await Promise.all(
            cacheNames.map(async (cacheName) => {
              if (cacheName.includes('wallet') || 
                  cacheName.includes('ethereum') || 
                  cacheName.includes('web3')) {
                await caches.delete(cacheName);
                console.log(`🗑️ キャッシュ削除: ${cacheName}`);
              }
            })
          );
        }
        state.serviceWorker = true;
      }
    } catch (error) {
      console.warn('⚠️ Service Worker キャッシュクリアでエラー:', error);
    }
    console.log('✅ Service Worker キャッシュクリア完了');

    // 6. MetaMask状態のリセット
    console.log('🦊 MetaMask状態リセット中...');
    try {
      if (window.ethereum) {
        // MetaMaskの内部状態をリセット
        try {
          await window.ethereum.request({
            method: 'wallet_requestPermissions',
            params: [{ eth_accounts: {} }]
          });
        } catch (error) {
          // ユーザーがキャンセルした場合は無視
          console.log('MetaMask権限リセット（ユーザーキャンセル）');
        }
        
        // イベントリスナーをクリア
        try {
          const events = ['accountsChanged', 'chainChanged', 'connect', 'disconnect'];
          events.forEach(event => {
            try {
              (window.ethereum as any).removeAllListeners?.(event);
            } catch (e) {
              console.log(`${event} リスナークリアをスキップ`);
            }
          });
        } catch (error) {
          console.log('イベントリスナークリアをスキップ');
        }
        
        state.metamaskState = true;
      }
    } catch (error) {
      console.warn('⚠️ MetaMask状態リセットでエラー:', error);
    }
    console.log('✅ MetaMask状態リセット完了');

  } catch (error) {
    console.error('❌ ウォレットキャッシュクリアエラー:', error);
  }

  console.groupEnd();
  console.log('🎯 PWAウォレットキャッシュクリア結果:', state);
  
  return state;
}

/**
 * ページリロードを伴う完全なウォレットリセット
 */
export async function forceWalletReset(): Promise<void> {
  console.log('🔄 強制ウォレットリセット開始');
  
  // キャッシュクリア
  await clearAllWalletCache();
  
  // PWA環境での特別な処理
  if (window.matchMedia('(display-mode: standalone)').matches) {
    console.log('📱 PWA環境での強制リセット');
    
    // Service Workerの更新を強制
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      await registration.update();
    }
    
    // 少し待ってからリロード
    setTimeout(() => {
      window.location.reload();
    }, 500);
  } else {
    // 通常のブラウザ環境
    window.location.reload();
  }
}

/**
 * ウォレット切り替え前の準備
 */
export async function prepareForWalletSwitch(): Promise<void> {
  console.log('🔀 ウォレット切り替え準備');
  
  // 現在の接続状態を保存（デバッグ用）
  const currentState = {
    address: localStorage.getItem('walletAddress'),
    chainId: localStorage.getItem('walletChainId'),
    strategy: localStorage.getItem('lastConnectionStrategy'),
    timestamp: new Date().toISOString()
  };
  
  console.log('📊 切り替え前の状態:', currentState);
  
  // キャッシュクリア
  await clearAllWalletCache();
  
  console.log('✅ ウォレット切り替え準備完了');
}

/**
 * PWA環境での新しいウォレット接続の確認
 */
export function verifyNewWalletConnection(newAddress: string): boolean {
  const cachedAddress = localStorage.getItem('walletAddress');
  
  if (cachedAddress && cachedAddress !== newAddress) {
    console.warn('⚠️ キャッシュされたウォレットと新しいウォレットが異なります');
    console.log('🔄 キャッシュ:', cachedAddress);
    console.log('🆕 新規:', newAddress);
    return false;
  }
  
  return true;
}