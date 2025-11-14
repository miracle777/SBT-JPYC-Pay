import { useState, useEffect, useCallback, useRef } from 'react';
import { ethers } from 'ethers';
import toast from 'react-hot-toast';
import { 
  WalletState, 
  ChainId, 
  WalletError,
  SUPPORTED_CHAINS 
} from '../types';
import { 
  formatEther,
  storage,
  getErrorMessage 
} from '../utils/helpers';
import { STORAGE_KEYS, DEFAULT_CHAIN_ID } from '../config';

interface UseWalletOptions {
  autoConnect?: boolean;
  requiredChainId?: ChainId;
}

export function useWallet(options: UseWalletOptions = {}) {
  const { autoConnect = true, requiredChainId = DEFAULT_CHAIN_ID } = options;
  
  const [walletState, setWalletState] = useState<WalletState>({
    isConnected: false,
    address: null,
    chainId: null,
    balance: '0',
    provider: null,
  });
  
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const providerRef = useRef<ethers.BrowserProvider | null>(null);

  // Ethereum provider availability check
  const isMetaMaskAvailable = useCallback(() => {
    return typeof window !== 'undefined' && 
           typeof window.ethereum !== 'undefined' && 
           window.ethereum.isMetaMask;
  }, []);

  // Get provider instance
  const getProvider = useCallback(() => {
    if (!window.ethereum) {
      throw new Error('MetaMask がインストールされていません');
    }
    
    if (!providerRef.current) {
      providerRef.current = new ethers.BrowserProvider(window.ethereum);
    }
    
    return providerRef.current;
  }, []);

  // Update balance
  const updateBalance = useCallback(async (address: string, provider: ethers.BrowserProvider) => {
    try {
      const balance = await provider.getBalance(address);
      setWalletState(prev => ({
        ...prev,
        balance: formatEther(balance),
      }));
    } catch (error) {
      console.warn('Failed to update balance:', error);
    }
  }, []);

  // Connect wallet
  const connectWallet = useCallback(async () => {
    if (!isMetaMaskAvailable()) {
      const error = 'MetaMask がインストールされていません。MetaMaskをインストールしてから再試行してください。';
      setError(error);
      toast.error(error);
      return false;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const provider = getProvider();
      
      // Request account access
      const accounts = await window.ethereum!.request({
        method: 'eth_requestAccounts',
      });

      if (!accounts || accounts.length === 0) {
        throw new Error('ウォレットアカウントが見つかりません');
      }

      const address = accounts[0];
      
      // Get network info
      const network = await provider.getNetwork();
      const chainId = Number(network.chainId);

      // Update wallet state
      setWalletState(prev => ({
        ...prev,
        isConnected: true,
        address,
        chainId,
        provider,
      }));

      // Update balance
      await updateBalance(address, provider);

      // Save connection state
      storage.set(STORAGE_KEYS.WALLET_CONNECTION, true);
      storage.set(STORAGE_KEYS.LAST_NETWORK, chainId);

      toast.success('ウォレットに接続しました');
      return true;

    } catch (error: any) {
      const message = getErrorMessage(error);
      setError(message);
      toast.error(`接続に失敗しました: ${message}`);
      return false;
    } finally {
      setIsConnecting(false);
    }
  }, [isMetaMaskAvailable, getProvider, updateBalance, requiredChainId]);

  // Disconnect wallet
  const disconnectWallet = useCallback(() => {
    setWalletState({
      isConnected: false,
      address: null,
      chainId: null,
      balance: '0',
      provider: null,
    });
    
    providerRef.current = null;
    setError(null);
    
    // Clear storage
    storage.remove(STORAGE_KEYS.WALLET_CONNECTION);
    
    toast.success('ウォレットを切断しました');
  }, []);

  // Switch network (simplified)
  const switchNetwork = useCallback(async (targetChainId: ChainId) => {
    if (!window.ethereum) {
      throw new Error('MetaMask がインストールされていません');
    }

    try {
      // Try to switch using hex chain ID
      const hexChainId = `0x${targetChainId.toString(16)}`;
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: hexChainId }],
      });

      toast.success(`ネットワークを切り替えました (Chain ID: ${targetChainId})`);
      return true;

    } catch (error: any) {
      const message = getErrorMessage(error);
      toast.error(`ネットワーク切り替えに失敗: ${message}`);
      throw error;
    }
  }, []);

  // Sign message
  const signMessage = useCallback(async (message: string): Promise<string> => {
    if (!walletState.isConnected || !walletState.provider) {
      throw new Error('ウォレットが接続されていません');
    }

    try {
      const signer = await walletState.provider.getSigner();
      const signature = await signer.signMessage(message);
      return signature;
    } catch (error) {
      const message = getErrorMessage(error);
      toast.error(`署名に失敗: ${message}`);
      throw error;
    }
  }, [walletState.isConnected, walletState.provider]);

  // Handle account change
  const handleAccountsChanged = useCallback((accounts: string[]) => {
    if (accounts.length === 0) {
      disconnectWallet();
    } else {
      const newAddress = accounts[0];
      setWalletState(prev => ({
        ...prev,
        address: newAddress,
      }));

      if (walletState.provider) {
        updateBalance(newAddress, walletState.provider);
      }
    }
  }, [disconnectWallet, updateBalance, walletState.provider]);

  // Handle chain change
  const handleChainChanged = useCallback((hexChainId: string) => {
    const chainId = parseInt(hexChainId, 16);
    setWalletState(prev => ({
      ...prev,
      chainId: chainId as ChainId,
    }));

    storage.set(STORAGE_KEYS.LAST_NETWORK, chainId);
    toast.success(`ネットワークが切り替わりました (Chain ID: ${chainId})`);
  }, []);

  // Handle disconnect
  const handleDisconnect = useCallback(() => {
    disconnectWallet();
  }, [disconnectWallet]);

  // Setup event listeners
  useEffect(() => {
    if (!window.ethereum) return;

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);
    window.ethereum.on('disconnect', handleDisconnect);

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
        window.ethereum.removeListener('disconnect', handleDisconnect);
      }
    };
  }, [handleAccountsChanged, handleChainChanged, handleDisconnect]);

  // Auto connect
  useEffect(() => {
    const attemptAutoConnect = async () => {
      if (!autoConnect || !isMetaMaskAvailable()) return;
      
      const wasConnected = storage.get<boolean>(STORAGE_KEYS.WALLET_CONNECTION);
      if (!wasConnected) return;

      try {
        const provider = getProvider();
        const accounts = await window.ethereum!.request({
          method: 'eth_accounts',
        });

        if (accounts && accounts.length > 0) {
          const address = accounts[0];
          const network = await provider.getNetwork();
          const chainId = Number(network.chainId);

          setWalletState({
            isConnected: true,
            address,
            chainId,
            balance: '0',
            provider,
          });

          await updateBalance(address, provider);
        }
      } catch (error) {
        console.warn('Auto connect failed:', error);
        storage.remove(STORAGE_KEYS.WALLET_CONNECTION);
      }
    };

    attemptAutoConnect();
  }, [autoConnect, isMetaMaskAvailable, getProvider, updateBalance]);

  return {
    // State
    ...walletState,
    isConnecting,
    error,
    isMetaMaskAvailable: isMetaMaskAvailable(),
    
    // Actions
    connectWallet,
    disconnectWallet,
    switchNetwork,
    signMessage,
    
    // Utils
    getProvider: walletState.provider ? () => walletState.provider : null,
    getSigner: walletState.provider ? () => walletState.provider!.getSigner() : null,
  };
}