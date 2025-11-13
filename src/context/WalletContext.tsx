import React, { createContext, useContext, useState, useEffect } from 'react';

export interface WalletContextType {
  address: string | null;
  chainId: number | null;
  isConnected: boolean;
  isConnecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  switchChain: (chainId: number) => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  // ローカルストレージから接続情報を復元
  useEffect(() => {
    const savedAddress = localStorage.getItem('walletAddress');
    const savedChainId = localStorage.getItem('walletChainId');
    if (savedAddress) {
      setAddress(savedAddress);
      setChainId(savedChainId ? parseInt(savedChainId) : null);
      setIsConnected(true);
    }
  }, []);

  const connect = async () => {
    setIsConnecting(true);
    try {
      // Web3Modalの実装は後続で追加
      console.log('ウォレット接続処理を実行します');
    } catch (error) {
      console.error('ウォレット接続エラー:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    setAddress(null);
    setChainId(null);
    setIsConnected(false);
    localStorage.removeItem('walletAddress');
    localStorage.removeItem('walletChainId');
  };

  const switchChain = async (targetChainId: number) => {
    try {
      if (window.ethereum) {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainHexId: `0x${targetChainId.toString(16)}` }],
        });
        setChainId(targetChainId);
        localStorage.setItem('walletChainId', targetChainId.toString());
      }
    } catch (error) {
      console.error('チェーン切り替えエラー:', error);
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
        connect,
        disconnect,
        switchChain,
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

// グローバル型定義
declare global {
  interface Window {
    ethereum?: any;
  }
}
