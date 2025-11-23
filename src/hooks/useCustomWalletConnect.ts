// WalletConnect接続の問題解決用カスタムフック
import { useCallback } from 'react';
import { useConnect } from 'wagmi';
import toast from 'react-hot-toast';

export const useCustomWalletConnect = () => {
  const { connect, connectors, isPending } = useConnect();

  const connectWithTimeout = useCallback(async (connectorId: string, timeout = 15000) => {
    return new Promise((resolve, reject) => {
      const connector = connectors.find(c => c.id === connectorId);
      if (!connector) {
        reject(new Error(`Connector ${connectorId} not found`));
        return;
      }

      let isCompleted = false;
      
      // タイムアウト設定
      const timeoutId = setTimeout(() => {
        if (!isCompleted) {
          isCompleted = true;
          toast.error('接続がタイムアウトしました。再試行してください。');
          reject(new Error('Connection timeout'));
        }
      }, timeout);

      // 接続試行
      try {
        connect({ connector }, {
          onSuccess: (data) => {
            if (!isCompleted) {
              isCompleted = true;
              clearTimeout(timeoutId);
              toast.success('ウォレットに接続しました');
              resolve(data);
            }
          },
          onError: (error) => {
            if (!isCompleted) {
              isCompleted = true;
              clearTimeout(timeoutId);
              console.error('Wallet connection error:', error);
              toast.error(`接続エラー: ${error.message}`);
              reject(error);
            }
          }
        });
      } catch (error) {
        if (!isCompleted) {
          isCompleted = true;
          clearTimeout(timeoutId);
          reject(error);
        }
      }
    });
  }, [connect, connectors]);

  const connectMetaMask = useCallback(() => {
    const metaMaskConnector = connectors.find(c => c.name?.toLowerCase().includes('metamask'));
    if (metaMaskConnector) {
      return connectWithTimeout(metaMaskConnector.id, 10000);
    }
    throw new Error('MetaMask connector not found');
  }, [connectors, connectWithTimeout]);

  const connectWalletConnect = useCallback(() => {
    const wcConnector = connectors.find(c => c.name?.toLowerCase().includes('walletconnect'));
    if (wcConnector) {
      return connectWithTimeout(wcConnector.id, 20000);
    }
    throw new Error('WalletConnect connector not found');
  }, [connectors, connectWithTimeout]);

  return {
    connectWithTimeout,
    connectMetaMask,
    connectWalletConnect,
    isLoading: isPending,
    connectors,
  };
};