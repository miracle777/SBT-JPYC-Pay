/**
 * 標準的なウォレット接続プロバイダー
 * 複数のウォレットオプションを提供する標準的な接続方法
 */

import { BrowserProvider } from 'ethers';

export interface WalletProvider {
  id: string;
  name: string;
  icon: string;
  installed: boolean;
  mobile: boolean;
  desktop: boolean;
  rdns?: string;
}

export interface DetectedWallet {
  provider: any;
  info: WalletProvider;
}

/**
 * EIP-6963準拠のウォレット検出
 * 標準的なウォレット一覧画面を実現
 * モバイル環境ではMetaMask直接検出を優先
 */
export function detectWallets(): Promise<DetectedWallet[]> {
  return new Promise((resolve) => {
    const wallets: DetectedWallet[] = [];
    const detectedIds = new Set<string>(); // 重複排除用ID セット
    const isMobile = /Mobile|Android|iPhone|iPad/.test(navigator.userAgent);
    
    // ============================================
    // Step 1: window.ethereum直接確認（最優先）
    // ============================================
    if (window.ethereum) {
      console.log('✅ window.ethereum 検出:', {
        isMetaMask: window.ethereum.isMetaMask,
        isCoinbase: (window.ethereum as any).isCoinbaseWallet,
        hasProviders: !!(window.ethereum as any).providers
      });
      
      // 1-1: MetaMask直接
      if (window.ethereum.isMetaMask && !detectedIds.has('metamask')) {
        console.log('🦊 MetaMask (window.ethereum.isMetaMask) 検出');
        detectedIds.add('metamask');
        wallets.push({
          provider: window.ethereum,
          info: {
            id: 'metamask',
            name: 'MetaMask',
            icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzMiIGhlaWdodD0iMzMiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTMwLjA3IDIuOTNsLTYuNjQgNC45NC0xLjE0IDguOTRIMTAuNzFsLTEuMTQtOC45NC02LjY0LTQuOTRMMS45NSA5LjJWMjdoMjkuMVY5LjJsLTEtNi4yN1oiIGZpbGw9IiNmNjY1MjEiLz48L3N2Zz4=',
            installed: true,
            mobile: isMobile,
            desktop: !isMobile
          }
        });
      }
      
      // 1-2: Coinbase Wallet直接
      if ((window.ethereum as any).isCoinbaseWallet && !detectedIds.has('coinbase-wallet')) {
        console.log('🪙 Coinbase Wallet (window.ethereum.isCoinbaseWallet) 検出');
        detectedIds.add('coinbase-wallet');
        wallets.push({
          provider: window.ethereum,
          info: {
            id: 'coinbase-wallet',
            name: 'Coinbase Wallet',
            icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzMiIGhlaWdodD0iMzMiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMTYuNSIgY3k9IjE2LjUiIHI9IjE2LjUiIGZpbGw9IiMwMDUyZmYiLz48L3N2Zz4=',
            installed: true,
            mobile: isMobile,
            desktop: !isMobile
          }
        });
      }
      
      // 1-3: 複数プロバイダーがある場合
      if ((window.ethereum as any).providers && Array.isArray((window.ethereum as any).providers)) {
        console.log('📦 複数プロバイダー検出:', (window.ethereum as any).providers.length);
        
        for (const provider of (window.ethereum as any).providers) {
          // MetaMask: provider.rdns == 'io.metamask' の場合もある
          const isMetaMaskProvider = provider.isMetaMask || provider.rdns === 'io.metamask';
          if (isMetaMaskProvider && !detectedIds.has('metamask')) {
            console.log('🦊 MetaMask (providers[] または rdns) 検出');
            detectedIds.add('metamask');
            wallets.push({
              provider,
              info: {
                id: 'metamask',
                name: 'MetaMask',
                icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzMiIGhlaWdodD0iMzMiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTMwLjA3IDIuOTNsLTYuNjQgNC45NC0xLjE0IDguOTRIMTAuNzFsLTEuMTQtOC45NC02LjY0LTQuOTRMMS45NSA5LjJWMjdoMjkuMVY5LjJsLTEtNi4yN1oiIGZpbGw9IiNmNjY1MjEiLz48L3N2Zz4=',
                installed: true,
                mobile: isMobile,
                desktop: !isMobile
              }
            });
          }
          if ((provider as any).isCoinbaseWallet && !detectedIds.has('coinbase-wallet')) {
            console.log('🪙 Coinbase Wallet (providers[]) 検出');
            detectedIds.add('coinbase-wallet');
            wallets.push({
              provider,
              info: {
                id: 'coinbase-wallet',
                name: 'Coinbase Wallet',
                icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzMiIGhlaWdodD0iMzMiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMTYuNSIgY3k9IjE2LjUiIHI9IjE2LjUiIGZpbGw9IiMwMDUyZmYiLz48L3N2Zz4=',
                installed: true,
                mobile: isMobile,
                desktop: !isMobile
              }
            });
          }
        }
      }
    } else {
      console.log('⚠️ window.ethereum が見つかりません（MetaMask/ウォレット未インストール）');
    }
    
    // ============================================
    // Step 2: EIP-6963イベントリスナー
    // ============================================
    function onAnnouncement(event: any) {
      const { info, provider } = event.detail;
      console.log('🔍 EIP-6963 ウォレット検出:', info.name);
      
      // ウォレット名をID化（MetaMask, Coinbase Wallet など）
      let walletId = info.rdns || info.name.toLowerCase().replace(/\s+/g, '-');
      
      // 既に検出されているか確認（ID ベースで判定）
      if (!detectedIds.has(walletId)) {
        detectedIds.add(walletId);
        
        wallets.push({
          provider,
          info: {
            id: walletId,
            name: info.name,
            icon: info.icon,
            installed: true,
            mobile: isMobile,
            desktop: !isMobile,
            rdns: info.rdns
          }
        });
        console.log('✅ EIP-6963ウォレット追加:', info.name);
      } else {
        console.log('⊘ 重複排除: EIP-6963 ウォレット', info.name, 'はすでに検出済み');
      }
    }

    // EIP-6963ウォレット検出イベント
    window.addEventListener('eip6963:announceProvider', onAnnouncement);
    window.dispatchEvent(new Event('eip6963:requestProvider'));

    // ============================================
    // Step 3: タイムアウト処理
    // モバイルではより長い時間待つ（EIP-6963対応ウォレット対応）
    // ============================================
    const detectionTimeout = isMobile ? 2500 : 1500;

    // タイムアウト処理
    setTimeout(() => {
      window.removeEventListener('eip6963:announceProvider', onAnnouncement);
      
      console.log('✅ ウォレット検出完了:', {
        detected: wallets.length,
        wallets: wallets.map(w => ({
          name: w.info.name,
          id: w.info.id,
          installed: w.info.installed
        }))
      });
      
      resolve(wallets);
    }, detectionTimeout);
  });
}

/**
 * 特定のウォレットで接続
 */
export async function connectWithWallet(wallet: DetectedWallet): Promise<{
  success: boolean;
  provider?: BrowserProvider;
  address?: string;
  chainId?: number;
  error?: string;
}> {
  try {
    console.log(`🔌 ${wallet.info.name} での接続開始`);

    // WalletConnectの場合は専用の処理
    if (wallet.info.id === 'walletconnect') {
      return await connectWithWalletConnect();
    }

    // 通常のウォレット接続
    if (!wallet.provider) {
      throw new Error(`${wallet.info.name} プロバイダーが見つかりません`);
    }

    // アカウント接続要求
    try {
      const accounts = await wallet.provider.request({
        method: 'eth_requestAccounts'
      });

      if (!accounts || accounts.length === 0) {
        throw new Error('アカウントが見つかりません');
      }

      // チェーンID取得
      const chainIdHex = await wallet.provider.request({
        method: 'eth_chainId'
      });
      const chainId = parseInt(chainIdHex, 16);

      // ethers.js プロバイダー作成
      const ethersProvider = new BrowserProvider(wallet.provider);

      console.log(`✅ ${wallet.info.name} 接続成功:`, accounts[0]);

      return {
        success: true,
        provider: ethersProvider,
        address: accounts[0],
        chainId,
      };
    } catch (requestError: any) {
      // ウォレットプロバイダーのrequestメソッド呼び出し失敗
      throw requestError;
    }

  } catch (error: any) {
    console.error(`❌ ${wallet.info.name} 接続エラー:`, error);
    
    let errorMessage = `${wallet.info.name} の接続に失敗しました`;
    
    if (error.code === 4001 || error.message?.includes('rejected')) {
      errorMessage = 'ユーザーによって接続がキャンセルされました';
    } else if (error.code === -32002) {
      errorMessage = '既に接続リクエストが処理中です';
    } else if (error.message?.includes('User rejected')) {
      errorMessage = 'ユーザーによって接続がキャンセルされました';
    }

    return {
      success: false,
      error: errorMessage
    };
  }
}

/**
 * WalletConnect接続処理
 */
async function connectWithWalletConnect(): Promise<{
  success: boolean;
  provider?: BrowserProvider;
  address?: string;
  chainId?: number;
  error?: string;
}> {
  try {
    console.log('🌐 WalletConnect 接続開始');

    // 動的インポートでWalletConnectを読み込み
    const { EthereumProvider } = await import('@walletconnect/ethereum-provider');
    
    const provider = await EthereumProvider.init({
      projectId: process.env.VITE_WALLETCONNECT_PROJECT_ID || 'demo-project-id',
      chains: [1, 137, 43114], // Ethereum, Polygon, Avalanche
      showQrModal: true
    });

    // 接続
    await provider.connect();
    const accounts = provider.accounts;
    
    if (!accounts || accounts.length === 0) {
      throw new Error('WalletConnect: アカウントが見つかりません');
    }

    const ethersProvider = new BrowserProvider(provider as any);
    
    console.log('✅ WalletConnect 接続成功:', accounts[0]);

    return {
      success: true,
      provider: ethersProvider,
      address: accounts[0],
      chainId: provider.chainId,
    };

  } catch (error: any) {
    console.error('❌ WalletConnect 接続エラー:', error);
    
    return {
      success: false,
      error: 'WalletConnect接続に失敗しました'
    };
  }
}

/**
 * 推奨ウォレットの取得
 */
export function getRecommendedWallets(): WalletProvider[] {
  const isMobile = /Mobile|Android|iPhone|iPad/.test(navigator.userAgent);
  
  const recommended: WalletProvider[] = [
    {
      id: 'metamask',
      name: 'MetaMask',
      icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzMiIGhlaWdodD0iMzMiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTMwLjA3IDIuOTNsLTYuNjQgNC45NC0xLjE0IDguOTRIMTAuNzFsLTEuMTQtOC45NC02LjY0LTQuOTRMMS45NSA5LjJWMjdoMjkuMVY5LjJsLTEtNi4yN1oiIGZpbGw9IiNmNjY1MjEiLz48L3N2Zz4=',
      installed: !!window.ethereum?.isMetaMask,
      mobile: isMobile,
      desktop: !isMobile
    },
    {
      id: 'walletconnect',
      name: 'WalletConnect',
      icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzMiIGhlaWdodD0iMzMiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTguNSAxMS41YzQuNjctNC42NyAxMi4yNi00LjY3IDE2LjkzIDBsLjU3LjU3YS4yLjIgMCAwIDEgMCAuMjhMODcgMTQuMjNhLjEuMSAwIDAgMS0uMTQgMGwtLjYyLS42MmMtMy42LTMuNi05LjQzLTMuNi0xMy4wMyAwbC0uNjYuNjZhLjEuMSAwIDAgMS0uMTQgMEw4LjUgMTEuNWEuMi4yIDAgMCAxIDAtLjI4eiIgZmlsbD0iIzM5OTZmZiIvPjwvc3ZnPg==',
      installed: true,
      mobile: true,
      desktop: true
    },
    {
      id: 'coinbase-wallet',
      name: 'Coinbase Wallet',
      icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzMiIGhlaWdodD0iMzMiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMTYuNSIgY3k9IjE2LjUiIHI9IjE2LjUiIGZpbGw9IiMwMDUyZmYiLz48L3N2Zz4=',
      installed: !!(window.ethereum as any)?.isCoinbaseWallet,
      mobile: isMobile,
      desktop: !isMobile
    }
  ];
  
  // インストール済みのものを先に配置
  return recommended.sort((a, b) => (b.installed ? 1 : 0) - (a.installed ? 1 : 0));
}