import React from 'react';
import { useWallet } from '../context/WalletContext';

export const PWAWalletCacheManager: React.FC = () => {
  const { clearCache, forceReset, isConnected, address } = useWallet();
  const isPWA = window.matchMedia('(display-mode: standalone)').matches;

  if (!isPWA) {
    return null; // PWA環境でのみ表示
  }

  const handleClearCache = async () => {
    if (confirm('ウォレットキャッシュをクリアします。現在の接続は解除されます。よろしいですか？')) {
      await clearCache();
      alert('キャッシュをクリアしました。新しいウォレットで接続してください。');
    }
  };

  const handleForceReset = async () => {
    if (confirm('PWAを完全にリセットします。ページがリロードされます。よろしいですか？')) {
      await forceReset();
    }
  };

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3">
      <div className="flex items-center space-x-2">
        <span className="text-lg">📱</span>
        <h3 className="font-medium text-amber-900">PWA キャッシュ管理</h3>
      </div>

      <div className="space-y-2 text-sm">
        <p className="text-amber-700">
          PWA環境でウォレット接続に問題がある場合、キャッシュをクリアしてください。
        </p>

        {isConnected && address && (
          <div className="bg-amber-100 rounded p-2">
            <p className="text-amber-800">
              <strong>現在接続中:</strong> {address.substring(0, 6)}...{address.substring(38)}
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <button
          onClick={handleClearCache}
          className="flex-1 bg-amber-600 text-white py-2 px-4 rounded hover:bg-amber-700 transition-colors text-sm"
        >
          🧹 キャッシュクリア
        </button>
        
        <button
          onClick={handleForceReset}
          className="flex-1 bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700 transition-colors text-sm"
        >
          🔄 完全リセット
        </button>
      </div>

      <div className="text-xs text-amber-600">
        <p>💡 <strong>ヒント:</strong></p>
        <ul className="list-disc list-inside space-y-1 mt-1">
          <li>新しいウォレットに接続できない場合は「キャッシュクリア」</li>
          <li>接続が不安定な場合は「完全リセット」を試してください</li>
        </ul>
      </div>
    </div>
  );
};

export default PWAWalletCacheManager;