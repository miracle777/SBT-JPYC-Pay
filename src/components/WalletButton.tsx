import React from 'react';
import { Wallet, LogOut } from 'lucide-react';
import toast from 'react-hot-toast';
import { useWallet } from '../context/WalletContext';
import { connectWithNativeWallet } from '../utils/standardWalletConnect';

export const WalletButton: React.FC = () => {
  const { 
    address, 
    isConnected, 
    isConnecting, 
    disconnect,
    setConnecting,
    login
  } = useWallet();

  const handleConnect = async () => {
    console.log('🔗 WalletButton - ネイティブウォレット接続開始');
    setConnecting(true);
    
    try {
      const result = await connectWithNativeWallet();
      
      if (result.success && result.address) {
        // WalletContext に接続情報を登録
        login(result.address, result.provider!, result.chainId || 1);
        toast.success('ウォレットを接続しました');
      } else {
        toast.error(result.error || 'ウォレット接続に失敗しました');
      }
    } catch (error) {
      console.error('接続エラー:', error);
      toast.error('ウォレット接続エラー');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = () => {
    disconnect();
    toast.success('ウォレットを切断しました');
  };

  const shortAddress = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '';

  return (
    <div>
      {isConnected && address ? (
        <div className="flex items-center gap-2">
          <div className="px-3 py-2 bg-blue-100 text-blue-800 rounded-lg text-sm font-semibold flex items-center gap-2">
            <Wallet className="w-4 h-4" />
            {shortAddress}
          </div>
          <button
            onClick={handleDisconnect}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
            title="切断"
          >
            <LogOut className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      ) : (
        <button
          onClick={handleConnect}
          disabled={isConnecting}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold rounded-lg transition duration-200"
        >
          <Wallet className="w-5 h-5" />
          {isConnecting ? '接続中...' : 'ウォレットを接続'}
        </button>
      )}
    </div>
  );
};
