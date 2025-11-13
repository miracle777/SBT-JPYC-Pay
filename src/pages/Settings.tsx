import React, { useState } from 'react';
import { Settings as SettingsIcon, Save, Copy, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import { NETWORKS } from '../config/networks';
import { DEFAULT_SHOP_INFO, getShopWalletAddress } from '../config/shop';
import { useWallet } from '../context/WalletContext';

const Settings: React.FC = () => {
  const { address: walletAddress, chainId: currentChainId } = useWallet();
  const [shopInfo, setShopInfo] = useState({
    name: DEFAULT_SHOP_INFO.name,
    id: DEFAULT_SHOP_INFO.id,
  });

  const shopWalletAddress = getShopWalletAddress(walletAddress);
  const currentNetwork = Object.values(NETWORKS).find(n => n.chainId === currentChainId);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label}をコピーしました`);
  };

  const handleSave = () => {
    toast.success('設定を保存しました');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* ヘッダー */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="flex items-center space-x-4 mb-2">
            <SettingsIcon className="w-8 h-8 text-indigo-600" />
            <h1 className="text-2xl font-bold text-gray-900">設定</h1>
          </div>
          <p className="text-gray-600">店舗情報・セキュリティ・ネットワーク設定</p>
        </div>

        {/* 店舗情報 */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-lg font-bold text-gray-900 mb-6">店舗情報</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">店舗名</label>
              <input
                type="text"
                value={shopInfo.name}
                onChange={(e) => setShopInfo({ ...shopInfo, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">店舗ID</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={shopInfo.id}
                  disabled
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                />
                <button
                  onClick={() => copyToClipboard(shopInfo.id, '店舗ID')}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
            <button
              onClick={handleSave}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition duration-200 flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" /> 保存
            </button>
          </div>
        </div>

        {/* ウォレット情報 */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-lg font-bold text-gray-900 mb-6">ウォレット情報</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">接続状態</label>
              <div className={`p-3 rounded-lg ${walletAddress ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
                <p className={`text-sm font-semibold ${walletAddress ? 'text-green-800' : 'text-yellow-800'}`}>
                  {walletAddress ? '✓ ウォレット接続済み' : '⚠ ウォレット未接続'}
                </p>
              </div>
            </div>

            {walletAddress && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ユーザーウォレットアドレス（支払い元）</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={walletAddress}
                      disabled
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 font-mono text-sm"
                    />
                    <button
                      onClick={() => copyToClipboard(walletAddress, 'ウォレットアドレス')}
                      className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    このアドレスが支払い元となり、SBT発行時に記録されます
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">店舗受取ウォレットアドレス</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={shopWalletAddress || '未設定'}
                      disabled
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 font-mono text-sm"
                    />
                    {shopWalletAddress && (
                      <button
                        onClick={() => copyToClipboard(shopWalletAddress, '店舗受取アドレス')}
                        className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    JPYC決済の受取アドレスです
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ネットワーク情報 */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-lg font-bold text-gray-900 mb-6">ネットワーク情報</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">現在のネットワーク</label>
              <div className={`p-4 rounded-lg border ${currentNetwork ? 'bg-blue-50 border-blue-200' : 'bg-yellow-50 border-yellow-200'}`}>
                <p className={`font-semibold ${currentNetwork ? 'text-blue-900' : 'text-yellow-900'}`}>
                  {currentNetwork?.displayName || 'ネットワーク未接続'}
                </p>
                {currentNetwork && (
                  <>
                    <p className="text-sm text-blue-700 mt-2">Chain ID: {currentNetwork.chainId}</p>
                    <p className="text-sm text-blue-700">RPC: {currentNetwork.rpcUrl}</p>
                    {currentNetwork.isTestnet && (
                      <p className="text-sm text-orange-600 font-semibold mt-2">⚠ テストネット</p>
                    )}
                  </>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">利用可能なネットワーク</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.values(NETWORKS).map((network) => (
                  <div
                    key={network.chainId}
                    className={`p-3 rounded-lg border ${
                      network.chainId === currentChainId
                        ? 'bg-indigo-50 border-indigo-200'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">{network.displayName}</p>
                        <p className="text-xs text-gray-600">Chain ID: {network.chainId}</p>
                      </div>
                      {network.chainId === currentChainId && (
                        <span className="px-2 py-1 bg-indigo-600 text-white text-xs font-semibold rounded">
                          接続中
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 開発者情報 */}
        <div className="bg-gray-100 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">開発者向け情報</h3>
          <div className="bg-white rounded-lg p-4 font-mono text-xs text-gray-600 overflow-x-auto">
            <p>Wallet: {walletAddress || 'Not connected'}</p>
            <p>ChainId: {currentChainId || 'Not connected'}</p>
            <p>Shop ID: {shopInfo.id}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
