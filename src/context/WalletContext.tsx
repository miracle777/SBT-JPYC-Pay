import React, { createContext, useContext, useState, useEffect } from 'react';
import { BrowserProvider } from 'ethers';
import { isMobileDevice, detectMetaMaskMobile, enhanceMobileWalletDetection } from '../utils/mobileWallet';

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
  supportedChains: Array<{ chainId: number; name: string; isTestnet: boolean }>;
  isPWA: boolean;
  isMetaMaskAvailable: boolean;
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
  
  // サポートされるチェーンの定義
  const supportedChains = [
    { chainId: 137, name: 'Polygon Mainnet', isTestnet: false },
    { chainId: 80002, name: 'Polygon Amoy Testnet', isTestnet: true },
  ];

  // PWA環境とMetaMaskの可用性をチェック
  useEffect(() => {
    const checkEnvironment = () => {
      // PWA環境の検出
      const isPWAMode = window.matchMedia('(display-mode: standalone)').matches 
        || (window.navigator as any).standalone === true
        || window.matchMedia('(display-mode: window-controls-overlay)').matches;
      
      setIsPWA(isPWAMode);

      // モバイル環境での検出を強化
      if (isMobileDevice()) {
        enhanceMobileWalletDetection();
        
        // MetaMaskモバイルの検出
        const metaMaskAvailable = detectMetaMaskMobile() || typeof window.ethereum !== 'undefined';
        setIsMetaMaskAvailable(metaMaskAvailable);
        
        // モバイル環境での遅延チェック
        setTimeout(() => {
          const delayedCheck = detectMetaMaskMobile() || typeof window.ethereum !== 'undefined';
          setIsMetaMaskAvailable(delayedCheck);
        }, 2000);
      } else {
        // デスクトップ環境での検出
        const metaMaskAvailable = typeof window.ethereum !== 'undefined' 
          && Boolean(window.ethereum.isMetaMask);
        setIsMetaMaskAvailable(metaMaskAvailable);
      }

      // PWAでMetaMaskが利用できない場合の警告
      if (isPWAMode && !window.ethereum) {
        console.warn('🔄 PWA環境: MetaMaskブラウザ拡張機能にアクセスできません');
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

    return () => {
      window.removeEventListener('ethereum#initialized', handleEthereumInitialized);
      standaloneQuery.removeListener(checkEnvironment);
    };
  }, []);

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
    // モバイル環境での検出強化
    if (isMobileDevice()) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1秒待機
      
      if (!window.ethereum && !detectMetaMaskMobile()) {
        if (isPWA) {
          throw new Error('PWA_NO_METAMASK_MOBILE');
        } else {
          throw new Error('NO_METAMASK_MOBILE');
        }
      }
    } else {
      // デスクトップ環境
      if (!window.ethereum) {
        if (isPWA) {
          throw new Error('PWA_NO_METAMASK');
        } else {
          alert('MetaMaskまたはWeb3互換のウォレットをインストールしてください');
          return;
        }
      }
    }

    setIsConnecting(true);
    try {
      // window.ethereumの存在を再確認
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

        const ethProvider = new BrowserProvider(window.ethereum);
        setProvider(ethProvider);

        localStorage.setItem('walletAddress', accounts[0]);
        localStorage.setItem('walletChainId', newChainId.toString());
      }
    } catch (error: any) {
      console.error('ウォレット接続エラー:', error);
      if (error.code !== 4001) {
        // ユーザーがキャンセルした場合以外はエラーを投げる
        if (isMobileDevice()) {
          throw new Error('MOBILE_CONNECTION_FAILED');
        } else if (isPWA) {
          throw new Error('PWA_CONNECTION_FAILED');
        } else {
          alert(`ウォレット接続エラー: ${error.message}`);
        }
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    setAddress(null);
    setChainId(null);
    setIsConnected(false);
    setProvider(null);
    localStorage.removeItem('walletAddress');
    localStorage.removeItem('walletChainId');
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
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: chainIdHex }],
      });
      setChainId(targetChainId);
      localStorage.setItem('walletChainId', targetChainId.toString());
    } catch (error: any) {
      // ネットワークが追加されていない場合のエラー処理
      if (error.code === 4902) {
        throw new Error('このネットワークは追加されていません');
      }
      throw error;
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
      }}
    >
      {children}
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
