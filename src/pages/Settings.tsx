import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, Copy, ExternalLink, Download, Upload, Eye, EyeOff, CheckCircle, AlertCircle, Key } from 'lucide-react';
import toast from 'react-hot-toast';
import { NETWORKS } from '../config/networks';
import { DEFAULT_SHOP_INFO, getShopWalletAddress } from '../config/shop';
import { useWallet } from '../context/WalletContext';
import { sbtStorage } from '../utils/storage';
import { pinataService } from '../utils/pinata';

const Settings: React.FC = () => {
  const { address: walletAddress, chainId: currentChainId } = useWallet();
  const [shopInfo, setShopInfo] = useState({
    name: DEFAULT_SHOP_INFO.name,
    id: DEFAULT_SHOP_INFO.id,
  });

  // 🔐 Pinata設定の状態管理
  const [pinataConfig, setPinataConfig] = useState({
    apiKey: '',
    secretKey: '',
    jwt: '',
  });
  const [showApiKey, setShowApiKey] = useState(false);
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [showJwt, setShowJwt] = useState(false);
  const [pinataConnectionStatus, setPinataConnectionStatus] = useState<'unknown' | 'testing' | 'success' | 'failed'>('unknown');
  const [isTestingPinata, setIsTestingPinata] = useState(false);

  const shopWalletAddress = getShopWalletAddress(walletAddress);
  const currentNetwork = Object.values(NETWORKS).find(n => n.chainId === currentChainId);

  // 🔄 Pinata設定をローカルストレージから読み込み
  useEffect(() => {
    const loadPinataConfig = () => {
      try {
        const saved = localStorage.getItem('pinata-config');
        if (saved) {
          const config = JSON.parse(saved);
          setPinataConfig({
            apiKey: config.apiKey || '',
            secretKey: config.secretKey || '',
            jwt: config.jwt || '',
          });
          
          // 設定があれば自動テスト（静かに）
          if (config.apiKey && config.secretKey) {
            testPinataConnection(config, true);
          }
        }
      } catch (error) {
        console.warn('Pinata設定読み込みエラー:', error);
      }
    };

    loadPinataConfig();
  }, []);

  // 🧪 Pinata接続テスト
  const testPinataConnection = async (config = pinataConfig, silent = false) => {
    if (!config.apiKey || !config.secretKey) {
      if (!silent) {
        toast.error('APIキーとSecret Keyを入力してください');
      }
      return;
    }

    setIsTestingPinata(true);
    setPinataConnectionStatus('testing');

    try {
      // 一時的に設定を更新してテスト
      const originalConfig = { ...pinataService };
      pinataService.apiKey = config.apiKey;
      pinataService.secretKey = config.secretKey;
      if (config.jwt) {
        pinataService.jwt = config.jwt;
      }

      const result = await pinataService.testConnection();
      
      if (result.success) {
        setPinataConnectionStatus('success');
        if (!silent) {
          toast.success('✅ Pinata接続成功！');
        }
      } else {
        setPinataConnectionStatus('failed');
        if (!silent) {
          toast.error(`❌ Pinata接続失敗：${result.message}`);
        }
      }
    } catch (error: any) {
      console.error('Pinata接続テストエラー:', error);
      setPinataConnectionStatus('failed');
      if (!silent) {
        toast.error(`❌ Pinata接続失敗: ${error.message}`);
      }
    } finally {
      setIsTestingPinata(false);
    }
  };

  // 💾 Pinata設定保存
  const savePinataConfig = () => {
    try {
      localStorage.setItem('pinata-config', JSON.stringify(pinataConfig));
      
      // pinataServiceインスタンスを更新
      pinataService.apiKey = pinataConfig.apiKey;
      pinataService.secretKey = pinataConfig.secretKey;
      if (pinataConfig.jwt) {
        pinataService.jwt = pinataConfig.jwt;
      }
      
      toast.success('✅ Pinata設定を保存しました');
      
      // 保存後、自動テスト
      if (pinataConfig.apiKey && pinataConfig.secretKey) {
        setTimeout(() => testPinataConnection(), 500);
      }
    } catch (error) {
      console.error('Pinata設定保存エラー:', error);
      toast.error('❌ 設定保存に失敗しました');
    }
  };

  // 🗑️ Pinata設定クリア
  const clearPinataConfig = () => {
    setPinataConfig({ apiKey: '', secretKey: '', jwt: '' });
    localStorage.removeItem('pinata-config');
    setPinataConnectionStatus('unknown');
    toast.success('🧹 Pinata設定をクリアしました');
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label}をコピーしました`);
  };

  const handleSave = () => {
    toast.success('設定を保存しました');
  };

  // エクスポート機能
  const handleExport = async () => {
    try {
      const data = await sbtStorage.exportData();
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sbt-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`✅ バックアップ完了: ${data.templates.length} テンプレート、${data.sbts.length} SBT`);
    } catch (error) {
      console.error('エクスポートエラー:', error);
      toast.error('バックアップに失敗しました');
    }
  };

  // インポート機能
  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      // バリデーション
      if (!data.templates || !data.sbts || !Array.isArray(data.templates) || !Array.isArray(data.sbts)) {
        throw new Error('無効なバックアップファイル形式です');
      }

      await sbtStorage.importData(data);
      toast.success(`✅ リストア完了: ${data.templates.length} テンプレート、${data.sbts.length} SBT`);
      
      // ページ再読み込み（データ反映）
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      console.error('インポートエラー:', error);
      toast.error(error instanceof Error ? error.message : 'リストアに失敗しました');
    }
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

            {/* RPC接続トラブルシューティング - Polygon Amoyの場合のみ表示 */}
            {currentChainId === 80002 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                  <h3 className="font-bold text-amber-900">⚠️ RPC接続が不安定な場合の解決方法</h3>
                </div>
                
                <div className="space-y-4">
                  <p className="text-sm text-gray-700">
                    <strong>Internal JSON-RPC error</strong> が発生する場合、MetaMaskのRPCエンドポイントを変更してください：
                  </p>
                  
                  <div className="bg-white rounded-lg p-4 border">
                    <h4 className="font-semibold text-gray-900 mb-3">🔄 推奨RPCエンドポイント（優先順）</h4>
                    <div className="space-y-2 font-mono text-sm">
                      <div className="flex items-center justify-between bg-green-50 p-2 rounded border border-green-200">
                        <span className="text-green-800">https://polygon-amoy-bor-rpc.publicnode.com</span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText('https://polygon-amoy-bor-rpc.publicnode.com');
                            toast.success('📋 RPCアドレスをコピーしました');
                          }}
                          className="text-green-600 hover:text-green-800"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between bg-blue-50 p-2 rounded border border-blue-200">
                        <span className="text-blue-800">https://rpc.ankr.com/polygon_amoy</span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText('https://rpc.ankr.com/polygon_amoy');
                            toast.success('📋 RPCアドレスをコピーしました');
                          }}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 rounded p-3 border border-blue-200">
                    <h4 className="font-semibold text-blue-900 mb-2">📝 MetaMask設定変更手順</h4>
                    <ol className="text-sm text-blue-800 space-y-1">
                      <li>1. MetaMask → ネットワーク → 「ネットワークを編集」</li>
                      <li>2. 「RPC URL」を上記の推奨アドレスに変更</li>
                      <li>3. 「保存」をクリック</li>
                      <li>4. MetaMaskを一度閉じて再度開く</li>
                      <li>5. SBT記録を再試行</li>
                    </ol>
                  </div>
                  
                  <div className="bg-green-50 rounded p-3 border border-green-200">
                    <p className="text-sm text-green-800">
                      💡 <strong>重要:</strong> SBTデータは既にローカルストレージに保存されています。
                      ネットワーク接続の問題が解決されれば、ブロックチェーンへの記録が可能になります。
                    </p>
                  </div>
                </div>
              </div>
            )}

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

        {/* 🔐 IPFS/Pinata設定 */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="flex items-center gap-3 mb-6">
            <Key className="w-6 h-6 text-purple-600" />
            <h2 className="text-lg font-bold text-gray-900">IPFS / Pinata 設定</h2>
            {pinataConnectionStatus === 'success' && <CheckCircle className="w-5 h-5 text-green-600" />}
            {pinataConnectionStatus === 'failed' && <AlertCircle className="w-5 h-5 text-red-600" />}
          </div>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-yellow-800">
              <span className="font-semibold">🔒 セキュリティ重要:</span> これらのAPIキーはブラウザのローカルストレージに保存されます。
              他人と共有しないでください。本番環境では各自でPinataアカウントを作成し、専用のAPIキーを使用してください。
            </p>
          </div>

          {/* 接続状態表示 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">接続状態</label>
            <div className={`p-3 rounded-lg border ${
              pinataConnectionStatus === 'success' ? 'bg-green-50 border-green-200' : 
              pinataConnectionStatus === 'failed' ? 'bg-red-50 border-red-200' :
              pinataConnectionStatus === 'testing' ? 'bg-blue-50 border-blue-200' :
              'bg-gray-50 border-gray-200'
            }`}>
              <p className={`text-sm font-semibold ${
                pinataConnectionStatus === 'success' ? 'text-green-800' : 
                pinataConnectionStatus === 'failed' ? 'text-red-800' :
                pinataConnectionStatus === 'testing' ? 'text-blue-800' :
                'text-gray-800'
              }`}>
                {pinataConnectionStatus === 'success' && '✅ Pinata接続成功'}
                {pinataConnectionStatus === 'failed' && '❌ Pinata接続失敗'}
                {pinataConnectionStatus === 'testing' && '🔄 Pinata接続テスト中...'}
                {pinataConnectionStatus === 'unknown' && '❓ 接続未確認'}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {/* API Key */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pinata API Key</label>
              <div className="flex gap-2">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={pinataConfig.apiKey}
                  onChange={(e) => setPinataConfig({ ...pinataConfig, apiKey: e.target.value })}
                  placeholder="Pinata API Keyを入力"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition"
                >
                  {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Secret Key */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pinata Secret Key</label>
              <div className="flex gap-2">
                <input
                  type={showSecretKey ? 'text' : 'password'}
                  value={pinataConfig.secretKey}
                  onChange={(e) => setPinataConfig({ ...pinataConfig, secretKey: e.target.value })}
                  placeholder="Pinata Secret Keyを入力"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowSecretKey(!showSecretKey)}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition"
                >
                  {showSecretKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* JWT（オプション） */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pinata JWT（オプション）</label>
              <div className="flex gap-2">
                <input
                  type={showJwt ? 'text' : 'password'}
                  value={pinataConfig.jwt}
                  onChange={(e) => setPinataConfig({ ...pinataConfig, jwt: e.target.value })}
                  placeholder="Pinata JWT（高度な機能用）"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowJwt(!showJwt)}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition"
                >
                  {showJwt ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                JWTは高度なPinata機能で必要です。通常はAPI Key + Secret Keyで十分です。
              </p>
            </div>

            {/* ボタン */}
            <div className="flex gap-3">
              <button
                onClick={savePinataConfig}
                disabled={!pinataConfig.apiKey || !pinataConfig.secretKey}
                className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded-lg transition duration-200 flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                設定を保存
              </button>
              <button
                onClick={() => testPinataConnection()}
                disabled={isTestingPinata || !pinataConfig.apiKey || !pinataConfig.secretKey}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded-lg transition duration-200 flex items-center justify-center gap-2"
              >
                {isTestingPinata ? (
                  <>🔄 テスト中...</>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    接続テスト
                  </>
                )}
              </button>
              <button
                onClick={clearPinataConfig}
                className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition duration-200"
              >
                クリア
              </button>
            </div>

            {/* Pinata情報リンク */}
            <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
              <p className="text-sm text-purple-800 mb-2">
                <span className="font-semibold">💡 Pinata API Key取得方法:</span>
              </p>
              <ol className="text-xs text-purple-700 space-y-1 list-decimal list-inside">
                <li>Pinata.cloud にアカウント登録</li>
                <li>ダッシュボード → API Keys</li>
                <li>「New Key」でAPI Key作成</li>
                <li>Scope: 「pinFileToIPFS」を有効化</li>
                <li>API KeyとSecret Keyを上記に入力</li>
              </ol>
              <a 
                href="https://app.pinata.cloud/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-purple-600 hover:text-purple-800 font-semibold text-sm mt-2"
              >
                <ExternalLink className="w-3 h-3" />
                Pinata.cloud を開く
              </a>
            </div>
          </div>
        </div>

        {/* データ管理（バックアップ・復元） */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-lg font-bold text-gray-900 mb-6">📦 データ管理</h2>
          <p className="text-gray-600 mb-6">テンプレートと SBT 発行履歴をバックアップ・復元します</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* エクスポート */}
            <div className="border-2 border-green-200 rounded-lg p-6 bg-green-50">
              <div className="flex items-center gap-3 mb-4">
                <Download className="w-6 h-6 text-green-600" />
                <h3 className="font-bold text-green-900">バックアップ</h3>
              </div>
              <p className="text-sm text-gray-700 mb-4">
                すべてのテンプレートと SBT 発行データを JSON ファイルとして保存
              </p>
              <button
                onClick={handleExport}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition duration-200 flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                バックアップをダウンロード
              </button>
              <p className="text-xs text-gray-600 mt-3 border-t border-green-200 pt-3">
                💡 定期的にバックアップしておくことをお勧めします
              </p>
            </div>

            {/* インポート */}
            <div className="border-2 border-blue-200 rounded-lg p-6 bg-blue-50">
              <div className="flex items-center gap-3 mb-4">
                <Upload className="w-6 h-6 text-blue-600" />
                <h3 className="font-bold text-blue-900">復元</h3>
              </div>
              <p className="text-sm text-gray-700 mb-4">
                バックアップファイルから データを復元
              </p>
              <label className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition duration-200 flex items-center justify-center gap-2 cursor-pointer">
                <Upload className="w-4 h-4" />
                ファイルを選択
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  className="hidden"
                />
              </label>
              <p className="text-xs text-gray-600 mt-3 border-t border-blue-200 pt-3">
                ⚠️ 復元後、ページが自動的に再読み込みされます
              </p>
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
