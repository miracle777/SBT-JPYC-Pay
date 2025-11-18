import React, { createContext, useContext, useState, useEffect } from 'react';
import { BrowserProvider } from 'ethers';

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
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [hasMultipleAccounts, setHasMultipleAccounts] = useState(false);
  
  // サポートされるチェーンの定義
  const supportedChains = [
    { chainId: 137, name: 'Polygon Mainnet', isTestnet: false },
    { chainId: 80002, name: 'Polygon Amoy Testnet', isTestnet: true },
  ];

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
    if (!window.ethereum) {
      alert('MetaMaskまたはWeb3互換のウォレットをインストールしてください');
      return;
    }

    setIsConnecting(true);
    try {
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
        // ユーザーがキャンセルした場合以外はアラート表示
        alert(`ウォレット接続エラー: ${error.message}`);
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
