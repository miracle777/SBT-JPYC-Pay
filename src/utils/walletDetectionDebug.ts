/**
 * ウォレット検出デバッグユーティリティ
 * モバイル環境での問題を診断
 */

export function enableWalletDebugMode() {
  // ウィンドウオブジェクトへのアクセスをログ
  const originalLog = console.log;
  const logs: string[] = [];
  
  console.log = function(...args: any[]) {
    originalLog(...args);
    logs.push(new Date().toISOString() + ' ' + args.map(a => 
      typeof a === 'object' ? JSON.stringify(a) : String(a)
    ).join(' '));
  };
  
  // グローバルウィンドウのチェック
  const diagnostics = {
    userAgent: navigator.userAgent,
    isMobile: /Mobile|Android|iPhone|iPad/.test(navigator.userAgent),
    hasEthereum: !!window.ethereum,
    ethereumType: window.ethereum ? typeof window.ethereum : 'undefined',
    metamaskDetection: {
      isMetaMask: window.ethereum?.isMetaMask || false,
      hasProviders: !!((window as any).ethereum?.providers),
      providersCount: (window as any).ethereum?.providers?.length || 0,
      _metamask: !!((window as any).ethereum?._metamask),
      chainId: (window as any).ethereum?.chainId || 'undefined',
      networkVersion: (window as any).ethereum?.networkVersion || 'undefined'
    },
    otherWallets: {
      coinbase: !!((window as any).coinbaseWalletExtension),
      walletConnect: !!(window as any).WalletConnect
    },
    performance: {
      timestamp: Date.now(),
      documentReady: document.readyState
    }
  };
  
  // デバッグ情報をウィンドウオブジェクトに追加
  (window as any).__walletDebug = {
    diagnostics,
    logs,
    testMetaMaskConnection: async () => {
      try {
        if (!window.ethereum) {
          return { error: 'window.ethereumが存在しません' };
        }
        const accounts = await window.ethereum!.request({ method: 'eth_accounts' });
        return { success: true, accounts };
      } catch (error) {
        return { error: error instanceof Error ? error.message : String(error) };
      }
    },
    getFullDiagnostics: () => diagnostics
  };
  
  console.log('🔧 [デバッグモード有効]', diagnostics);
  
  return diagnostics;
}

/**
 * モバイルブラウザのスクリーンショットを取得
 */
export async function captureScreenDebug() {
  return {
    timestamp: new Date().toISOString(),
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
      dpi: window.devicePixelRatio
    },
    screen: {
      width: window.screen.width,
      height: window.screen.height
    },
    userAgent: navigator.userAgent
  };
}

/**
 * ネットワーク接続チェック
 */
export async function checkNetworkConnectivity() {
  const checks = {
    online: navigator.onLine,
    timestamp: Date.now(),
    rpc: null as any,
    dns: null as any
  };
  
  try {
    // RPC接続テスト
    const rpcResponse = await fetch('https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_chainId',
        params: [],
        id: 1
      })
    });
    checks.rpc = {
      status: rpcResponse.status,
      ok: rpcResponse.ok
    };
  } catch (error) {
    checks.rpc = { error: error instanceof Error ? error.message : String(error) };
  }
  
  console.log('🌐 [ネットワーク診断]', checks);
  return checks;
}
