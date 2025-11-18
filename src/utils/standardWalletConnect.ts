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
 */
export function detectWallets(): Promise<DetectedWallet[]> {
  return new Promise((resolve) => {
    const wallets: DetectedWallet[] = [];
    
    // EIP-6963イベントリスナー
    function onAnnouncement(event: any) {
      const { info, provider } = event.detail;
      console.log('🔍 ウォレット検出:', info.name);
      
      wallets.push({
        provider,
        info: {
          id: info.uuid || info.rdns || info.name,
          name: info.name,
          icon: info.icon,
          installed: true,
          mobile: /Mobile|Android|iPhone|iPad/.test(navigator.userAgent),
          desktop: !/Mobile|Android|iPhone|iPad/.test(navigator.userAgent),
          rdns: info.rdns
        }
      });
    }

    // EIP-6963ウォレット検出イベント
    window.addEventListener('eip6963:announceProvider', onAnnouncement);
    window.dispatchEvent(new Event('eip6963:requestProvider'));

    // モバイル環境での追加検出時間
    const detectionTimeout = /Mobile|Android|iPhone|iPad/.test(navigator.userAgent) ? 1000 : 500;

    // 既知のウォレットも追加（フォールバック）
    setTimeout(() => {
      const isMobile = /Mobile|Android|iPhone|iPad/.test(navigator.userAgent);
      
      // MetaMaskの検出（複数の方式）
      if (!wallets.find(w => w.info.name.includes('MetaMask'))) {
        let metaMaskProvider = null;
        let metaMaskInstalled = false;
        
        // 1. 標準的なwindow.ethereum
        if (window.ethereum?.isMetaMask) {
          metaMaskProvider = window.ethereum;
          metaMaskInstalled = true;
        }
        // 2. 複数プロバイダーがある場合
        else if ((window as any).ethereum?.providers) {
          const metaMask = (window as any).ethereum.providers.find((p: any) => p.isMetaMask);
          if (metaMask) {
            metaMaskProvider = metaMask;
            metaMaskInstalled = true;
          }
        }
        // 3. 直接MetaMaskオブジェクト
        else if ((window as any).ethereum && (window as any).ethereum._metamask) {
          metaMaskProvider = (window as any).ethereum;
          metaMaskInstalled = true;
        }
        
        if (metaMaskInstalled && metaMaskProvider) {
          console.log('🦊 MetaMask検出成功 (レガシー方式)');
          wallets.unshift({ // 先頭に追加
            provider: metaMaskProvider,
            info: {
              id: 'metamask-legacy',
              name: 'MetaMask',
              icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzMiIGhlaWdodD0iMzMiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTMwLjA3IDIuOTNsLTYuNjQgNC45NC0xLjE0IDguOTRIMTAuNzFsLTEuMTQtOC45NC02LjY0LTQuOTRMMS45NSA5LjJWMjdoMjkuMVY5LjJsLTEtNi4yN1oiIGZpbGw9IiNmNjY1MjEiLz48L3N2Zz4=',
              installed: true,
              mobile: isMobile,
              desktop: !isMobile
            }
          });
        } else {
          console.log('🦊 MetaMaskが見つかりません - インストールオプションを表示');
        }
      }

      // WalletConnectは常に利用可能
      wallets.push({
        provider: null, // WalletConnectは後で初期化
        info: {
          id: 'walletconnect',
          name: 'WalletConnect',
          icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzMiIGhlaWdodD0iMzMiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTguNSAxMS41YzQuNjctNC42NyAxMi4yNi00LjY3IDE2LjkzIDBsLjU3LjU3YS4yLjIgMCAwIDEgMCAuMjhMODcgMTQuMjNhLjEuMSAwIDAgMS0uMTQgMGwtLjYyLS42MmMtMy42LTMuNi05LjQzLTMuNi0xMy4wMyAwbC0uNjYuNjZhLjEuMSAwIDAgMS0uMTQgMEw4LjUgMTEuNWEuMi4yIDAgMCAxIDAtLjI4eiIgZmlsbD0iIzM5OTZmZiIvPjwvc3ZnPg==',
          installed: true,
          mobile: true,
          desktop: true
        }
      });

      // Coinbase Wallet
      if ((window as any).coinbaseWalletExtension || (window as any).ethereum?.isCoinbaseWallet) {
        wallets.push({
          provider: (window as any).coinbaseWalletExtension || window.ethereum,
          info: {
            id: 'coinbase-wallet',
            name: 'Coinbase Wallet',
            icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzMiIGhlaWdodD0iMzMiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMTYuNSIgY3k9IjE2LjUiIHI9IjE2LjUiIGZpbGw9IiMwMDUyZmYiLz48L3N2Zz4=',
            installed: true,
            mobile: /Mobile|Android|iPhone|iPad/.test(navigator.userAgent),
            desktop: !/Mobile|Android|iPhone|iPad/.test(navigator.userAgent)
          }
        });
      }

      window.removeEventListener('eip6963:announceProvider', onAnnouncement);
      
      console.log('📋 検出されたウォレット一覧:', wallets.map(w => w.info.name));
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

  } catch (error: any) {
    console.error(`❌ ${wallet.info.name} 接続エラー:`, error);
    
    let errorMessage = `${wallet.info.name} の接続に失敗しました`;
    
    if (error.code === 4001) {
      errorMessage = 'ユーザーによって接続がキャンセルされました';
    } else if (error.code === -32002) {
      errorMessage = '既に接続リクエストが処理中です';
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
  
  return [
    {
      id: 'metamask',
      name: 'MetaMask',
      icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzMiIGhlaWdodD0iMzMiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTMwLjA3IDIuOTNsLTYuNjQgNC45NC0xLjE0IDguOTRIMTAuNzFsLTEuMTQtOC45NC02LjY0LTQuOTRMMS45NSA5LjJWMjdoMjkuMVY5LjJsLTEtNi4yN1oiIGZpbGw9IiNmNjY1MjEiLz48L3N2Zz4=',
      installed: false,
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
      installed: false,
      mobile: isMobile,
      desktop: !isMobile
    }
  ];
}