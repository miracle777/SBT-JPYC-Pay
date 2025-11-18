import React, { createContext, useContext, useState, useEffect } from 'react';
import { BrowserProvider } from 'ethers';
import { detectMetaMaskWithRetry } from '../utils/smartphoneWallet';
import { getMobileBrowserInfo } from '../utils/smartphoneWallet';
import { detectPWAWalletAvailability } from '../utils/pwaWalletHandler';
import { BrowserRedirectGuide } from '../components/BrowserRedirectGuide';
import { analyzeMetaMaskConnectionFlow, implementRootSolution } from '../utils/walletConnectionAnalysis';
import { clearAllWalletCache, prepareForWalletSwitch, verifyNewWalletConnection, forceWalletReset } from '../utils/pwaWalletCache';
import { StandardWalletModal } from '../components/StandardWalletModal';
import { 
  connectWalletInPWA, 
  getPWAWalletCompatibilityInfo,
  monitorPWAWalletState 
} from '../utils/pwaWalletHandler';
import { NETWORKS } from '../config/networks';
import { NETWORK_PARAMS } from '../utils/networkParams';

export interface WalletContextType {
  address: string | null;
  chainId: number | null;
  isConnected: boolean;
  isConnecting: boolean;
  provider: BrowserProvider | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  switchChain: (chainId: number) => Promise<void>;
  switchAccount: () => Promise<void>;
  hasMultipleAccounts: boolean;
  supportedChains: Array<{ chainId: number; name: string; isTestnet: boolean; category?: string }>;
  isPWA: boolean;
  isMetaMaskAvailable: boolean;
  pwaWalletInfo: {
    title: string;
    message: string;
    solutions: string[];
    isCompatible: boolean;
  };
  lastConnectionStrategy: string | null;
  showBrowserRedirect: boolean;
  pendingConnection: boolean;
  forceConnect: () => Promise<void>;
  closeBrowserRedirect: () => void;
  clearCache: () => Promise<void>;
  forceReset: () => Promise<void>;
  showWalletModal: boolean;
  openWalletModal: () => void;
  closeWalletModal: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [hasMultipleAccounts, setHasMultipleAccounts] = useState(false);
  const [isPWA, setIsPWA] = useState(false);
  const [isMetaMaskAvailable, setIsMetaMaskAvailable] = useState(false);
  const [pwaWalletInfo, setPwaWalletInfo] = useState(getPWAWalletCompatibilityInfo());
  const [lastConnectionStrategy, setLastConnectionStrategy] = useState<string | null>(null);
  const [showBrowserRedirect, setShowBrowserRedirect] = useState(false);
  const [pendingConnection, setPendingConnection] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  
  // サポートされるチェーンの定義 - 豊富なネットワーク選択肢
  const supportedChains = [
    // Polygon Networks
    { chainId: 137, name: 'Polygon Mainnet', isTestnet: false, category: 'Polygon' },
    { chainId: 80002, name: 'Polygon Amoy Testnet', isTestnet: true, category: 'Polygon' },
    
    // Ethereum Networks  
    { chainId: 1, name: 'Ethereum Mainnet', isTestnet: false, category: 'Ethereum' },
    { chainId: 11155111, name: 'Ethereum Sepolia Testnet', isTestnet: true, category: 'Ethereum' },
    
    // Avalanche Networks
    { chainId: 43114, name: 'Avalanche C-Chain Mainnet', isTestnet: false, category: 'Avalanche' },
    { chainId: 43113, name: 'Avalanche Fuji Testnet', isTestnet: true, category: 'Avalanche' },
    
    // Other Popular Networks (optional)
    { chainId: 56, name: 'BNB Smart Chain', isTestnet: false, category: 'BSC' },
    { chainId: 97, name: 'BNB Smart Chain Testnet', isTestnet: true, category: 'BSC' },
    { chainId: 42161, name: 'Arbitrum One', isTestnet: false, category: 'Arbitrum' },
    { chainId: 421614, name: 'Arbitrum Sepolia Testnet', isTestnet: true, category: 'Arbitrum' },
    { chainId: 10, name: 'Optimism', isTestnet: false, category: 'Optimism' },
    { chainId: 11155420, name: 'Optimism Sepolia Testnet', isTestnet: true, category: 'Optimism' },
  ];

  // PWA環境とMetaMaskの可用性をチェック
  useEffect(() => {
    const checkEnvironment = async () => {
      // PWA環境の検出
      const isPWAMode = window.matchMedia('(display-mode: standalone)').matches 
        || (window.navigator as any).standalone === true
        || window.matchMedia('(display-mode: window-controls-overlay)').matches;
      
      setIsPWA(isPWAMode);

      // PWA互換性情報を更新
      const compatInfo = getPWAWalletCompatibilityInfo();
      setPwaWalletInfo(compatInfo);

      // モバイル環境での検出を強化
      const browserInfo = getMobileBrowserInfo();
      if (browserInfo.isIOS || browserInfo.isAndroid) {
        // モバイル環境での MetaMask 検出
        const metaMaskAvailable = await detectMetaMaskWithRetry();
        setIsMetaMaskAvailable(metaMaskAvailable);
      } else {
        // デスクトップ環境での検出
        const metaMaskAvailable = typeof window.ethereum !== 'undefined' 
          && Boolean(window.ethereum.isMetaMask);
        setIsMetaMaskAvailable(metaMaskAvailable);
      }

      // PWAでMetaMaskが利用できない場合の警告
      if (isPWAMode && !window.ethereum) {
        console.warn('🔄 PWA環境: MetaMaskブラウザ拡張機能にアクセスできません');
        console.info('💡 解決策:', compatInfo.solutions);
      }
    };

    checkEnvironment();

    // ethereum#initializedイベントのリスナー追加（モバイル対応）
    const handleEthereumInitialized = () => {
      checkEnvironment();
    };

    window.addEventListener('ethereum#initialized', handleEthereumInitialized);

    // display-modeの変更を監視
    const standaloneQuery = window.matchMedia('(display-mode: standalone)');
    standaloneQuery.addListener(checkEnvironment);

    // PWA環境でのウォレット状態監視を開始
    let stopMonitoring: (() => void) | null = null;
    
    if (isPWA) {
      stopMonitoring = monitorPWAWalletState((state) => {
        if (state.connected && state.address && !isConnected) {
          // PWA環境で新しい接続が検出された場合
          console.log('🔄 PWA: ウォレット接続が検出されました', state.address);
          setAddress(state.address);
          setIsConnected(true);
        } else if (!state.connected && isConnected) {
          // 接続が失われた場合
          console.log('⚠️ PWA: ウォレット接続が切断されました');
        }
      });
    }

    return () => {
      window.removeEventListener('ethereum#initialized', handleEthereumInitialized);
      standaloneQuery.removeListener(checkEnvironment);
      if (stopMonitoring) {
        stopMonitoring();
      }
    };
  }, [isPWA, isConnected]);

  // ローカルストレージから接続情報を復元
  useEffect(() => {
    const savedAddress = localStorage.getItem('walletAddress');
    
    if (savedAddress && window.ethereum) {
      // 自動再接続を試みる
      checkConnection();
    }
  }, []);

  // アカウント変更を監視
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnect();
      } else if (accounts[0] !== address) {
        setAddress(accounts[0]);
        localStorage.setItem('walletAddress', accounts[0]);
      }
    };

    const handleChainChanged = (chainIdHex: string) => {
      const newChainId = parseInt(chainIdHex, 16);
      setChainId(newChainId);
      localStorage.setItem('walletChainId', newChainId.toString());
      window.location.reload();
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, [address]);

  const checkConnection = async () => {
    if (!window.ethereum) return;

    try {
      const accounts = await window.ethereum.request({
        method: 'eth_accounts',
      });

      if (accounts && accounts.length > 0) {
        const chainIdHex = await window.ethereum.request({
          method: 'eth_chainId',
        });
        const newChainId = parseInt(chainIdHex, 16);

        setAddress(accounts[0]);
        setChainId(newChainId);
        setIsConnected(true);

        const ethProvider = new BrowserProvider(window.ethereum);
        setProvider(ethProvider);

        localStorage.setItem('walletAddress', accounts[0]);
        localStorage.setItem('walletChainId', newChainId.toString());
      }
    } catch (error) {
      console.error('接続確認エラー:', error);
    }
  };

  const connect = async () => {
    if (isConnecting) return;

    console.log('🔗 標準ウォレット接続開始');
    
    // 標準ウォレット選択モーダルを表示
    setShowWalletModal(true);
  };

  const handleWalletSelect = async (result: {
    success: boolean;
    provider?: any;
    address?: string;
    chainId?: number;
    error?: string;
    walletName?: string;
  }) => {
    setIsConnecting(true);
    
    try {
      if (result.success && result.address && result.chainId && result.provider) {
        console.log(`✅ ${result.walletName} 接続成功:`, result.address);
        
        // PWA環境でのキャッシュ検証
        if (window.matchMedia('(display-mode: standalone)').matches) {
          const isValidConnection = verifyNewWalletConnection(result.address);
          if (!isValidConnection) {
            console.warn('⚠️ キャッシュされたウォレットとの不整合を検出');
            await prepareForWalletSwitch();
          }
        }
        
        // 状態更新
        setAddress(result.address);
        setChainId(result.chainId);
        setIsConnected(true);
        setProvider(result.provider);
        setLastConnectionStrategy(result.walletName?.toUpperCase() || 'STANDARD');
        
        // ローカルストレージに保存
        localStorage.setItem('walletAddress', result.address);
        localStorage.setItem('walletChainId', result.chainId.toString());
        localStorage.setItem('lastConnectionStrategy', result.walletName || 'STANDARD');
        
        console.log('✅ 標準ウォレット接続完了');
        
      } else {
        console.error('❌ ウォレット接続エラー:', result.error);
        alert(result.error || 'ウォレット接続に失敗しました');
      }
    } catch (error) {
      console.error('❌ ウォレット接続処理エラー:', error);
      alert('ウォレット接続の処理中にエラーが発生しました');
    } finally {
      setIsConnecting(false);
      setShowWalletModal(false);
    }
  };

  const forceConnect = async () => {
    console.log('🔒 強制接続開始（MetaMaskアプリ内ブラウザ）');
    setShowBrowserRedirect(false);
    setPendingConnection(false);
    setIsConnecting(true);

    try {
      if (!window.ethereum) {
        throw new Error('WALLET_NOT_AVAILABLE');
      }

      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      if (accounts && accounts.length > 0) {
        const chainIdHex = await window.ethereum.request({
          method: 'eth_chainId',
        });
        const newChainId = parseInt(chainIdHex, 16);

        setAddress(accounts[0]);
        setChainId(newChainId);
        setIsConnected(true);
        setLastConnectionStrategy('METAMASK_IN_APP');

        const ethProvider = new BrowserProvider(window.ethereum);
        setProvider(ethProvider);

        localStorage.setItem('walletAddress', accounts[0]);
        localStorage.setItem('walletChainId', newChainId.toString());
        
        console.log('✅ 強制接続完了');
      }
    } catch (error: any) {
      console.error('❌ 強制接続エラー:', error);
      alert(`接続エラー: ${error.message}`);
    } finally {
      setIsConnecting(false);
    }
  };

  const closeBrowserRedirect = () => {
    setShowBrowserRedirect(false);
    setPendingConnection(false);
  };

  const disconnect = async () => {
    console.log('🔌 ウォレット接続解除開始');
    
    // PWA環境での完全なキャッシュクリア
    if (window.matchMedia('(display-mode: standalone)').matches) {
      console.log('📱 PWA環境 - 完全キャッシュクリア実行');
      await clearAllWalletCache();
    }
    
    // 状態のリセット
    setAddress(null);
    setChainId(null);
    setIsConnected(false);
    setProvider(null);
    setLastConnectionStrategy(null);
    setShowBrowserRedirect(false);
    setPendingConnection(false);
    
    // ローカルストレージのクリア
    localStorage.removeItem('walletAddress');
    localStorage.removeItem('walletChainId');
    localStorage.removeItem('lastConnectionStrategy');
    
    // MetaMaskイベントリスナーのクリア
    if (window.ethereum) {
      try {
        window.ethereum.removeListener?.('accountsChanged', () => {});
        window.ethereum.removeListener?.('chainChanged', () => {});
      } catch (error) {
        console.warn('⚠️ イベントリスナークリアエラー:', error);
      }
    }
    
    console.log('✅ ウォレット接続解除完了');
  };

  const openWalletModal = () => {
    setShowWalletModal(true);
  };

  const closeWalletModal = () => {
    setShowWalletModal(false);
  };

  const clearCache = async () => {
    console.log('🧹 手動キャッシュクリア開始');
    await clearAllWalletCache();
    console.log('✅ 手動キャッシュクリア完了');
  };

  const forceReset = async () => {
    console.log('🔄 強制リセット開始');
    await forceWalletReset();
  };

  const switchAccount = async () => {
    if (!window.ethereum) {
      throw new Error('ウォレットが接続されていません');
    }

    try {
      // MetaMaskのアカウント選択ダイアログを表示
      await window.ethereum.request({
        method: 'wallet_requestPermissions',
        params: [{ eth_accounts: {} }],
      });
      
      // 新しいアカウント情報を取得
      const accounts = await window.ethereum.request({
        method: 'eth_accounts',
      });
      
      if (accounts && accounts.length > 0) {
        setAddress(accounts[0]);
        setHasMultipleAccounts(accounts.length > 1);
        localStorage.setItem('walletAddress', accounts[0]);
      }
    } catch (error: any) {
      if (error.code !== 4001) {
        throw new Error(`アカウント切り替えエラー: ${error.message}`);
      }
    }
  };

  const switchChain = async (targetChainId: number) => {
    if (!window.ethereum) {
      throw new Error('Ethereum プロバイダーが利用できません');
    }

    try {
      const chainIdHex = `0x${targetChainId.toString(16)}`;
      
      // まず既存のネットワークに切り替えを試行
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: chainIdHex }],
      });
      
      setChainId(targetChainId);
      localStorage.setItem('walletChainId', targetChainId.toString());
      
    } catch (error: any) {
      // ネットワークが追加されていない場合の処理
      if (error.code === 4902) {
        const networkParam = NETWORK_PARAMS[targetChainId];
        
        if (!networkParam) {
          throw new Error(`ネットワーク ChainID ${targetChainId} の設定が見つかりません`);
        }
        
        try {
          // ネットワークを自動追加
          console.log(`🌐 ネットワーク追加を試行: ${networkParam.chainName}`);
          
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [networkParam],
          });
          
          // 追加成功後に切り替え
          setChainId(targetChainId);
          localStorage.setItem('walletChainId', targetChainId.toString());
          
          console.log(`✅ ネットワーク追加・切り替え成功: ${networkParam.chainName}`);
          
        } catch (addError: any) {
          console.error('ネットワーク追加エラー:', addError);
          throw new Error(`ネットワーク追加に失敗しました: ${networkParam.chainName}`);
        }
      } else {
        console.error('ネットワーク切り替えエラー:', error);
        throw new Error(`ネットワーク切り替えに失敗しました (Code: ${error.code})`);
      }
    }
  };

  return (
    <WalletContext.Provider
      value={{
        address,
        chainId,
        isConnected,
        isConnecting,
        provider,
        connect,
        disconnect,
        switchChain,
        switchAccount,
        hasMultipleAccounts,
        supportedChains,
        isPWA,
        isMetaMaskAvailable,
        pwaWalletInfo,
        lastConnectionStrategy,
        showBrowserRedirect,
        pendingConnection,
        forceConnect,
        closeBrowserRedirect,
        clearCache,
        forceReset,
        showWalletModal,
        openWalletModal,
        closeWalletModal,
      }}
    >
      {children}
      
      <StandardWalletModal
        isOpen={showWalletModal}
        onClose={closeWalletModal}
        onWalletSelect={handleWalletSelect}
      />
    </WalletContext.Provider>
  );
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};
