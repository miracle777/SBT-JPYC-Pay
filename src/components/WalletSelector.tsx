import React, { useState } from 'react';
import { ChevronDown, Wallet, RefreshCw, Network, Monitor, TestTube, AlertTriangle } from 'lucide-react';
import { useAccount, useSwitchChain, useDisconnect } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import toast from 'react-hot-toast';

interface WalletSelectorProps {
  title?: string;
  showChainSelector?: boolean;
  onNetworkChange?: (chainId: number) => void;
}

const WalletSelector: React.FC<WalletSelectorProps> = ({
  title = "ウォレット & ネットワーク",
  showChainSelector = true,
  onNetworkChange
}) => {
  // RainbowKitのウォレット情報を使用
  const { address, chainId, isConnected } = useAccount();
  const { switchChain } = useSwitchChain();
  const { disconnect } = useDisconnect();

  // サポートされるチェーンの簡単な定義
  const supportedChains = [
    { chainId: 137, name: 'Polygon Mainnet', isTestnet: false, category: 'Polygon' },
    { chainId: 80002, name: 'Polygon Amoy Testnet', isTestnet: true, category: 'Polygon' },
    { chainId: 1, name: 'Ethereum Mainnet', isTestnet: false, category: 'Ethereum' },
    { chainId: 11155111, name: 'Ethereum Sepolia Testnet', isTestnet: true, category: 'Ethereum' },
  ];

  const [isExpanded, setIsExpanded] = useState(false); // デフォルトで閉じる
  const [isSwitchingChain, setIsSwitchingChain] = useState(false);

  const currentChain = supportedChains.find(chain => chain.chainId === chainId);

  const handleChainSwitch = async (targetChainId: number) => {
    if (targetChainId === chainId) return;
    
    setIsSwitchingChain(true);
    try {
      // RainbowKitのswitchChainを使用
      if (switchChain && isConnected) {
        await switchChain({ chainId: targetChainId });
        console.log(`✅ RainbowKit経由でネットワーク切り替え成功: ${targetChainId}`);
      }
      
      toast.success(`✅ ネットワークを ${supportedChains.find(c => c.chainId === targetChainId)?.name} に切り替えました`);
      if (onNetworkChange) {
        onNetworkChange(targetChainId);
      }
    } catch (error: any) {
      console.error('ネットワーク切り替えエラー:', error);
      toast.error(`❌ ネットワーク切り替え失敗: ${error.message || 'Unknown error'}`);
    } finally {
      setIsSwitchingChain(false);
    }
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const getNetworkStatusColor = (isTestnet: boolean) => {
    return isTestnet ? 'text-orange-600 bg-orange-100' : 'text-green-600 bg-green-100';
  };

  const handleWalletConnect = () => {
    // RainbowKitのConnectButtonを使用するため、この関数は簡略化
    console.log('📱 ウォレット接続が要求されました');
  };

  return (
    <div className="bg-white border-2 border-gray-300 rounded-lg shadow-md hover:shadow-lg transition-shadow">
      <div 
        className="p-5 cursor-pointer hover:bg-gray-50 transition-colors" 
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <Wallet className="w-6 h-6 text-indigo-600" />
              <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            </div>
            {isConnected && (
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-600">接続中</span>
              </div>
            )}
          </div>
          <ChevronDown 
            className={`w-4 h-4 text-gray-500 transition-transform ${
              isExpanded ? 'rotate-180' : ''
            }`} 
          />
        </div>

        {/* コンパクト表示 */}
        {isConnected && !isExpanded && (
          <div className="mt-2 text-sm">
            <div className="flex items-center space-x-4">
              <span className="text-gray-600">
                🔐 {formatAddress(address!)}
              </span>
              {currentChain && (
                <span className={`px-2 py-1 rounded text-xs font-medium ${getNetworkStatusColor(currentChain.isTestnet)}`}>
                  {currentChain.isTestnet ? '🧪' : '🏢'} {currentChain.name}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 詳細表示 */}
      {isExpanded && (
        <div className="border-t border-gray-200 p-4 space-y-4">
          {!isConnected ? (
            <div className="space-y-3">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium mb-1">⚠️ ウォレットが接続されていません</p>
                    <p>SBT発行やネットワーク切り替えには MetaMask などのウォレット接続が必要です。</p>
                  </div>
                </div>
              </div>
              {/* RainbowKitのConnectButtonを使用 */}
              <ConnectButton.Custom>
                {({ openConnectModal }) => (
                  <button
                    onClick={openConnectModal}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition flex items-center justify-center space-x-2"
                  >
                    <Wallet className="w-4 h-4" />
                    <span>ウォレットを選択</span>
                  </button>
                )}
              </ConnectButton.Custom>
            </div>
          ) : (
            <div className="space-y-4">
              {/* ウォレット情報 */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <h4 className="font-medium text-gray-900 mb-2 flex items-center space-x-2">
                  <Wallet className="w-4 h-4" />
                  <span>接続中のウォレット</span>
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">アドレス:</span>
                    <span className="font-mono text-gray-900">{formatAddress(address!)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">フルアドレス:</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(address!);
                        toast.success('📋 アドレスをコピーしました');
                      }}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-mono"
                      title="クリックしてコピー"
                    >
                      {address}
                    </button>
                  </div>
                </div>
                
                <div className="mt-3 flex space-x-2">
                  <button
                    onClick={() => {
                      disconnect();
                      console.log('✅ ウォレット切断');
                    }}
                    className="flex-1 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-medium py-2 px-3 rounded transition"
                  >
                    切断
                  </button>
                </div>
              </div>

              {/* ネットワーク情報 & 切り替え */}
              {showChainSelector && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <h4 className="font-medium text-gray-900 mb-3 flex items-center space-x-2">
                    <Network className="w-4 h-4" />
                    <span>ネットワーク選択</span>
                  </h4>
                  
                  {currentChain && (
                    <div className="mb-3 p-2 bg-white border border-blue-200 rounded">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className={`w-2 h-2 rounded-full ${currentChain.isTestnet ? 'bg-orange-500' : 'bg-green-500'}`}></span>
                          <span className="text-sm font-medium">現在: {currentChain.name}</span>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getNetworkStatusColor(currentChain.isTestnet)}`}>
                          {currentChain.isTestnet ? (
                            <>
                              <TestTube className="w-3 h-3 inline mr-1" />
                              テスト用
                            </>
                          ) : (
                            <>
                              <Monitor className="w-3 h-3 inline mr-1" />
                              本番用
                            </>
                          )}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    {/* ネットワークをカテゴリ別にグループ化 */}
                    {Object.entries(
                      supportedChains.reduce((groups, chain) => {
                        const category = (chain as any).category || 'その他';
                        if (!groups[category]) groups[category] = [];
                        groups[category].push(chain);
                        return groups;
                      }, {} as Record<string, typeof supportedChains>)
                    ).map(([category, chains]) => (
                      <div key={category} className="space-y-2">
                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-1">
                          {category} Networks
                        </div>
                        <div className="space-y-2">
                          {chains.map((chain) => (
                            <button
                              key={chain.chainId}
                              onClick={() => handleChainSwitch(chain.chainId)}
                              disabled={isSwitchingChain || chain.chainId === chainId}
                              className={`w-full p-3 text-left rounded-lg border-2 transition ${
                                chain.chainId === chainId
                                  ? 'border-indigo-500 bg-indigo-50 text-indigo-900'
                                  : 'border-gray-200 bg-white hover:border-gray-300 text-gray-900'
                              } disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  <div className={`w-3 h-3 rounded-full ${chain.isTestnet ? 'bg-orange-500' : 'bg-green-500'}`}></div>
                                  <div>
                                    <div className="font-medium text-sm">{chain.name}</div>
                                    <div className="text-xs text-gray-600">Chain ID: {chain.chainId}</div>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  {chain.isTestnet ? (
                                    <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full font-medium">
                                      🧪 テスト
                                    </span>
                                  ) : (
                                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-medium">
                                      🏢 本番
                                    </span>
                                  )}
                                  {chain.chainId === chainId && (
                                    <span className="text-xs text-indigo-600 font-medium">✓ 接続中</span>
                                  )}
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {isSwitchingChain && (
                    <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800 flex items-center space-x-2">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      <span>ネットワークを切り替えています... MetaMaskで確認してください</span>
                    </div>
                  )}
                </div>
              )}

              {/* 注意事項 */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <h5 className="font-medium text-gray-900 text-sm mb-2">💡 ネットワーク選択ガイド</h5>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>• <strong>Polygon</strong>: 低手数料でJPYC SBTに最適化</li>
                  <li>• <strong>Ethereum</strong>: 最も普及している主要チェーン</li>
                  <li>• <strong>Avalanche</strong>: 高速で低手数料のネットワーク</li>
                  <li>• <strong>Arbitrum/Optimism</strong>: Ethereumレイヤー2ソリューション</li>
                  <li>• <strong>🧪テストネット</strong>: 開発・テスト用（本番前の確認に使用）</li>
                  <li>• ネットワーク未追加の場合は自動でMetaMaskに追加されます</li>
                </ul>
              </div>

              {/* ブラウザ環境でない場合の説明 */}
              {!window.ethereum && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <h5 className="font-medium text-red-900 text-sm mb-2">⚠️ MetaMaskが検出されません</h5>
                  <div className="text-xs text-red-800 space-y-1">
                    <p>モバイルアプリやPWAをご利用の場合:</p>
                    <ul className="list-disc list-inside space-y-1 mt-1">
                      <li>MetaMaskアプリ内ブラウザでアクセスしてください</li>
                      <li>または、デスクトップブラウザをご利用ください</li>
                    </ul>
                    <a
                      href="https://metamask.io/download/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-1 text-red-600 hover:text-red-800 font-medium mt-2"
                    >
                      <span>🔗 MetaMaskをダウンロード</span>
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WalletSelector;