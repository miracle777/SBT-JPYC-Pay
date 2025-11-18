/**
 * 標準的なウォレット接続プロバイダー
 * ネイティブ eth_requestAccounts を使用して、ブラウザの標準ウォレット選択UIを表示
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
 * ブラウザネイティブの eth_requestAccounts を使用して接続
 * これが本来の標準的な接続方法（スクリーンショットの UI と同じ）
 */
export async function connectWithNativeWallet(): Promise<{
  success: boolean;
  provider?: BrowserProvider;
  address?: string;
  chainId?: number;
  error?: string;
}> {
  try {
    console.log('🔌 ネイティブウォレット接続開始（eth_requestAccounts）');
    console.log('📱 environment:', {
      isMobile: /Mobile|Android|iPhone|iPad/.test(navigator.userAgent),
      hasEthereum: !!window.ethereum,
      userAgent: navigator.userAgent.substring(0, 100)
    });

    if (!window.ethereum) {
      console.error('❌ window.ethereum が存在しません');
      throw new Error('ウォレットがインストールされていません');
    }

    console.log('✅ window.ethereum が見つかりました');

    // これが本来の方法：eth_requestAccounts を呼び出すと、
    // ブラウザが自動的に「MetaMask / Rainbow / Base Account / WalletConnect」
    // などの接続UI を表示してくれる
    console.log('🔄 eth_requestAccounts を呼び出し中...');
    
    // タイムアウト処理を追加（10秒）
    const accountsPromise = window.ethereum.request({
      method: 'eth_requestAccounts'
    }) as Promise<string[]>;

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error('接続タイムアウト（10秒以上かかっています）'));
      }, 10000);
    });

    const accounts = await Promise.race([accountsPromise, timeoutPromise]);

    if (!accounts || accounts.length === 0) {
      console.error('❌ アカウントが取得できません');
      throw new Error('アカウントが見つかりません');
    }

    console.log('✅ アカウント取得成功:', accounts[0]);

    // チェーンID取得
    console.log('🔄 チェーンID取得中...');
    const chainIdHex = await window.ethereum.request({
      method: 'eth_chainId'
    }) as string;
    const chainId = parseInt(chainIdHex, 16);

    console.log('✅ チェーンID取得成功:', chainId);

    // ethers.js プロバイダー作成
    const ethersProvider = new BrowserProvider(window.ethereum);

    console.log('✅ ウォレット接続成功:', accounts[0]);

    return {
      success: true,
      provider: ethersProvider,
      address: accounts[0],
      chainId
    };

  } catch (error: any) {
    console.error('❌ ウォレット接続エラー:', {
      message: error?.message,
      code: error?.code,
      name: error?.name,
      fullError: error
    });

    let errorMessage = 'ウォレット接続に失敗しました';

    if (error.code === 4001 || error.message?.includes('rejected')) {
      errorMessage = 'ユーザーによって接続がキャンセルされました';
    } else if (error.code === -32002) {
      errorMessage = '既に接続リクエストが処理中です';
    } else if (error.message?.includes('タイムアウト')) {
      errorMessage = 'ウォレット接続がタイムアウトしました（10秒以上）。ウォレットアプリを確認してください';
    } else if (error.message?.includes('インストール')) {
      errorMessage = 'ウォレットがインストールされていません';
    }

    return {
      success: false,
      error: errorMessage
    };
  }
}
/**
 * 特定のウォレットで接続（互換性のため）
 * 実際には eth_requestAccounts を使用すること
 */
export async function connectWithWallet(wallet: DetectedWallet): Promise<{
  success: boolean;
  provider?: BrowserProvider;
  address?: string;
  chainId?: number;
  error?: string;
}> {
  return connectWithNativeWallet();
}


/**
 * 推奨ウォレットの取得（フォールバック用）
 */
export function getRecommendedWallets(): WalletProvider[] {
  const isMobile = /Mobile|Android|iPhone|iPad/.test(navigator.userAgent);
  
  return [
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
}