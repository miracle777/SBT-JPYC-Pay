import React, { useState, useEffect } from 'react';
import { X, ExternalLink, Smartphone, Monitor } from 'lucide-react';
import { DetectedWallet, WalletProvider, detectWallets, connectWithWallet, getRecommendedWallets } from '../utils/standardWalletConnect';

interface StandardWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onWalletSelect: (result: {
    success: boolean;
    provider?: any;
    address?: string;
    chainId?: number;
    error?: string;
    walletName?: string;
  }) => void;
}

export const StandardWalletModal: React.FC<StandardWalletModalProps> = ({
  isOpen,
  onClose,
  onWalletSelect
}) => {
  const [detectedWallets, setDetectedWallets] = useState<DetectedWallet[]>([]);
  const [recommendedWallets, setRecommendedWallets] = useState<WalletProvider[]>([]);
  const [isConnecting, setIsConnecting] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadWallets();
    }
  }, [isOpen]);

  const loadWallets = async () => {
    setIsLoading(true);
    try {
      console.log('🔍 ウォレット検出開始...');
      
      const detected = await detectWallets();
      const recommended = getRecommendedWallets();
      
      console.log('📱 検出されたウォレット:', detected.length, 'つ');
      console.log('💡 推奨ウォレット:', recommended.length, 'つ');
      
      // MetaMaskが検出された場合は先頭に配置
      const sortedDetected = detected.sort((a, b) => {
        if (a.info.name.includes('MetaMask')) return -1;
        if (b.info.name.includes('MetaMask')) return 1;
        return 0;
      });
      
      setDetectedWallets(sortedDetected);
      setRecommendedWallets(recommended);
      
    } catch (error) {
      console.error('❌ ウォレット検出エラー:', error);
      // エラー時もデフォルトウォレットを表示
      setRecommendedWallets(getRecommendedWallets());
    } finally {
      setIsLoading(false);
    }
  };

  const handleWalletClick = async (wallet: DetectedWallet | WalletProvider) => {
    const walletId = 'provider' in wallet ? wallet.info.id : wallet.id;
    const walletName = 'provider' in wallet ? wallet.info.name : wallet.name;
    
    console.log(`🔌 ウォレット選択:`, walletName, 'ID:', walletId);
    
    setIsConnecting(walletId);
    
    try {
      let result;
      
      if ('provider' in wallet) {
        // 検出されたウォレット
        console.log('✅ 検出済みウォレットで接続開始');
        result = await connectWithWallet(wallet);
      } else {
        // 推奨ウォレット（未インストール）
        console.log('📥 推奨ウォレット処理:', wallet.id);
        if (wallet.id === 'walletconnect') {
          const mockDetected: DetectedWallet = {
            provider: null,
            info: wallet
          };
          result = await connectWithWallet(mockDetected);
        } else {
          // インストールページに誘導
          const installUrl = getWalletInstallUrl(wallet.id);
          console.log('🌐 インストールURLに誘導:', installUrl);
          window.open(installUrl, '_blank');
          setIsConnecting(null);
          return;
        }
      }
      
      const finalResult = {
        ...result,
        walletName
      };
      
      console.log('🎯 接続結果:', finalResult);
      onWalletSelect(finalResult);
      
      if (result.success) {
        onClose();
      }
    } catch (error) {
      console.error('❌ ウォレット接続エラー:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      onWalletSelect({
        success: false,
        error: `${walletName}の接続に失敗しました: ${errorMessage}`,
        walletName
      });
    } finally {
      setIsConnecting(null);
    }
  };

  const getWalletInstallUrl = (walletId: string): string => {
    const isMobile = /Mobile|Android|iPhone|iPad/.test(navigator.userAgent);
    const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
    
    switch (walletId) {
      case 'metamask':
        if (isMobile) {
          return isIOS 
            ? 'https://apps.apple.com/app/metamask/id1438144202'
            : 'https://play.google.com/store/apps/details?id=io.metamask';
        }
        return 'https://metamask.io/download/';
        
      case 'coinbase-wallet':
        if (isMobile) {
          return isIOS
            ? 'https://apps.apple.com/app/coinbase-wallet/id1278383455'
            : 'https://play.google.com/store/apps/details?id=org.toshi';
        }
        return 'https://wallet.coinbase.com/';
        
      default:
        return 'https://ethereum.org/wallets/';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">ウォレットを選択</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 max-h-[calc(90vh-100px)] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">ウォレットを検出中...</span>
            </div>
          ) : (
            <>
              {/* インストール済みウォレット */}
              {detectedWallets.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                    利用可能なウォレット
                  </h3>
                  <div className="space-y-2">
                    {detectedWallets.map((wallet) => (
                      <WalletOption
                        key={wallet.info.id}
                        wallet={wallet}
                        isConnecting={isConnecting === wallet.info.id}
                        onClick={() => handleWalletClick(wallet)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* 推奨ウォレット（未インストール） */}
              {recommendedWallets
                .filter(recommended => !detectedWallets.find(detected => 
                  detected.info.name.toLowerCase().includes(recommended.name.toLowerCase()) ||
                  recommended.name.toLowerCase().includes(detected.info.name.toLowerCase())
                )).length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                    <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                    その他のオプション
                  </h3>
                  <div className="space-y-2">
                    {recommendedWallets
                      .filter(recommended => !detectedWallets.find(detected => 
                        detected.info.name.toLowerCase().includes(recommended.name.toLowerCase()) ||
                        recommended.name.toLowerCase().includes(detected.info.name.toLowerCase())
                      ))
                      .map((wallet) => (
                        <WalletOption
                          key={wallet.id}
                          wallet={wallet}
                          isConnecting={isConnecting === wallet.id}
                          onClick={() => handleWalletClick(wallet)}
                          showInstallHint={wallet.id !== 'walletconnect'}
                        />
                      ))}
                  </div>
                </div>
              )}

              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  💡 <strong>初めてご利用の方:</strong><br />
                  MetaMaskが最も一般的なウォレットです。モバイルではWalletConnectで複数のウォレットに対応しています。
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

interface WalletOptionProps {
  wallet: DetectedWallet | WalletProvider;
  isConnecting: boolean;
  onClick: () => void;
  showInstallHint?: boolean;
}

const WalletOption: React.FC<WalletOptionProps> = ({ 
  wallet, 
  isConnecting, 
  onClick, 
  showInstallHint = false 
}) => {
  const info = 'provider' in wallet ? wallet.info : wallet;
  const isMobile = /Mobile|Android|iPhone|iPad/.test(navigator.userAgent);
  
  return (
    <button
      onClick={onClick}
      disabled={isConnecting}
      className={`
        w-full flex items-center justify-between p-4 rounded-lg border transition-all
        ${isConnecting 
          ? 'bg-gray-100 border-gray-200 cursor-not-allowed' 
          : 'hover:bg-gray-50 border-gray-200 hover:border-blue-300'
        }
      `}
    >
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
          <img 
            src={info.icon} 
            alt={info.name}
            className="w-8 h-8"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.nextElementSibling?.setAttribute('style', 'display: block');
            }}
          />
          <div className="w-8 h-8 bg-gray-300 rounded hidden"></div>
        </div>
        
        <div className="text-left">
          <div className="font-medium text-gray-900">{info.name}</div>
          <div className="text-sm text-gray-500 flex items-center space-x-2">
            {info.mobile && <Smartphone className="w-3 h-3" />}
            {info.desktop && <Monitor className="w-3 h-3" />}
            {showInstallHint && (
              <span className="text-blue-600">インストールが必要</span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        {showInstallHint && (
          <ExternalLink className="w-4 h-4 text-gray-400" />
        )}
        {isConnecting && (
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        )}
      </div>
    </button>
  );
};

export default StandardWalletModal;