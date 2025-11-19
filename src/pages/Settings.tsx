import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, Copy, ExternalLink, Download, Upload, Eye, EyeOff, CheckCircle, AlertCircle, Key, Shield, Server } from 'lucide-react';
import toast from 'react-hot-toast';
import { NETWORKS } from '../config/networks';
import { DEFAULT_SHOP_INFO, getShopWalletAddress, getShopInfo } from '../config/shop';
import { useWallet } from '../context/WalletContext';
import { useAccount, useSwitchChain } from 'wagmi'; // RainbowKitのフックを追加
import { sbtStorage } from '../utils/storage';
import { pinataService } from '../utils/pinata';
import { generateNewShopId, DEFAULT_RANK_THRESHOLDS, type RankThresholds } from '../utils/shopSettings';
import { registerShop } from '../utils/sbtMinting';
import { getSBTContractAddress } from '../config/contracts';
import WalletSelector from '../components/WalletSelector';
import StorageCompatibilityChecker from '../components/StorageCompatibilityChecker';
import { PWAWalletCacheManager } from '../components/PWAWalletCacheManager';

const Settings: React.FC = () => {
  // RainbowKitのウォレット情報を優先的に使用
  const { address: rainbowAddress, chainId: rainbowChainId } = useAccount();
  const { switchChain } = useSwitchChain();
  
  // 独自のWalletContextもフォールバックとして保持
  const { address: contextAddress, chainId: contextChainId } = useWallet();
  
  // RainbowKitの情報を優先、なければWalletContextを使用
  const walletAddress = rainbowAddress || contextAddress;
  const currentChainId = rainbowChainId || contextChainId;
  
  const [shopInfo, setShopInfo] = useState({
    name: '',
    id: '',
    category: '',
    description: '',
    ownerAddress: '', // ショップオーナーアドレス
  });

  // 🎖️ ランク設定の状態管理
  const [rankThresholds, setRankThresholds] = useState<RankThresholds>(DEFAULT_RANK_THRESHOLDS);

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

  // 🏪 ショップオーナー登録の状態管理
  const [selectedNetworkForShop, setSelectedNetworkForShop] = useState(80002); // デフォルトはAmoy
  const [isRegisteringShop, setIsRegisteringShop] = useState(false);
  const [shopRegistrationStatus, setShopRegistrationStatus] = useState<{
    registered: boolean;
    shopId?: number;
    message?: string;
  }>({ registered: false });

  const shopWalletAddress = getShopWalletAddress(walletAddress);
  const currentNetwork = Object.values(NETWORKS).find(n => n.chainId === currentChainId);

  // 🔄 設定をローカルストレージから読み込み
  useEffect(() => {
    const loadConfigs = () => {
      // 店舗情報読み込み
      try {
        const savedShopInfo = localStorage.getItem('shop-info');
        if (savedShopInfo) {
          const shop = JSON.parse(savedShopInfo);
          setShopInfo({
            name: shop.name || '',
            id: shop.id || '',
            category: shop.category || '',
            description: shop.description || '',
            ownerAddress: shop.ownerAddress || '',
          });
          // ランク設定も読み込み
          if (shop.rankThresholds) {
            setRankThresholds(shop.rankThresholds);
          }
        } else {
          // 初回設定時はUUIDベースの店舗IDを発行
          const newShopId = generateNewShopId();
          setShopInfo(prev => ({ ...prev, id: newShopId }));
        }
      } catch (error) {
        console.warn('店舗情報読み込みエラー:', error);
        // エラー時は新規発行
        const newShopId = generateNewShopId();
        setShopInfo(prev => ({ ...prev, id: newShopId }));
      }

      // Pinata設定読み込み
      try {
        const savedPinata = localStorage.getItem('pinata-config');
        if (savedPinata) {
          const config = JSON.parse(savedPinata);
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

      // 店舗設定読み込み
      try {
        const savedShop = localStorage.getItem('shop-info');
        if (savedShop) {
          const config = JSON.parse(savedShop);
          setShopInfo({
            name: config.name || DEFAULT_SHOP_INFO.name,
            id: config.id || DEFAULT_SHOP_INFO.id,
            category: config.category || '',
            description: config.description || '',
            ownerAddress: config.ownerAddress || '',
          });
          console.log('✅ 店舗設定読み込み完了:', config);
        }
      } catch (error) {
        console.warn('店舗設定読み込みエラー:', error);
      }
    };

    loadConfigs();
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
    try {
      // 店舗名の必須チェック
      if (!shopInfo.name.trim()) {
        toast.error('店舗名を入力してください');
        return;
      }

      // 店舗IDが空の場合の警告（PWAインストール時に自動生成）
      if (!shopInfo.id.trim()) {
        toast.error('店舗IDが生成されていません。PWAをインストールしてください。');
        return;
      }

      // オーナーアドレスのバリデーション
      if (shopInfo.ownerAddress && !shopInfo.ownerAddress.startsWith('0x')) {
        toast.error('オーナーアドレスは0xで始まる必要があります');
        return;
      }

      if (shopInfo.ownerAddress && shopInfo.ownerAddress.length !== 42) {
        toast.error('オーナーアドレスは42文字である必要があります');
        return;
      }

      // 店舗設定を保存（ランク設定含む）
      const shopData = {
        ...shopInfo,
        name: shopInfo.name.trim(),
        category: shopInfo.category.trim(),
        description: shopInfo.description.trim(),
        ownerAddress: shopInfo.ownerAddress.trim(),
        rankThresholds: rankThresholds,
        // コントラクトアドレス情報も保存（参照用）
        contractAddresses: {
          amoy: getSBTContractAddress(80002),
          mainnet: getSBTContractAddress(137),
        },
        updatedAt: new Date().toISOString(),
      };
      
      localStorage.setItem('shop-info', JSON.stringify(shopData));
      console.log('✅ 店舗設定保存完了:', shopData);
      toast.success('設定を保存しました（オーナー情報・ランク設定含む）');
    } catch (error) {
      console.error('設定保存エラー:', error);
      toast.error('設定の保存に失敗しました');
    }
  };

  // 🏪 ショップオーナー登録関数
  const handleRegisterShop = async () => {
    if (!walletAddress) {
      toast.error('ウォレットを接続してください');
      return;
    }

    if (!shopInfo.name.trim()) {
      toast.error('まず店舗情報を保存してください');
      return;
    }

    if (!shopInfo.ownerAddress.trim()) {
      toast.error('ショップオーナーアドレスを設定してください');
      return;
    }

    const contractAddress = getSBTContractAddress(selectedNetworkForShop);
    if (!contractAddress || contractAddress === '0x0000000000000000000000000000000000000000') {
      toast.error(`選択したネットワーク(Chain ${selectedNetworkForShop})にはコントラクトがデプロイされていません`);
      return;
    }

    try {
      setIsRegisteringShop(true);
      setShopRegistrationStatus({ registered: false, message: '登録中...' });

      // 設定したオーナーアドレスでショップID 1 を登録
      const result = await registerShop({
        shopId: 1,
        shopName: shopInfo.name,
        description: shopInfo.description || `${shopInfo.name}のスタンプカード`,
        shopOwnerAddress: shopInfo.ownerAddress, // 設定画面で登録したアドレス
        requiredVisits: 10, // デフォルト10回
        chainId: selectedNetworkForShop,
      });

      if (result.success) {
        setShopRegistrationStatus({
          registered: true,
          shopId: 1,
          message: `ショップオーナーとして登録完了！`
        });
        toast.success(`🎉 ショップオーナー登録完了！\nオーナー: ${shopInfo.ownerAddress.slice(0, 10)}...\nこのアドレスでSBTを発行できます。\nTx: ${result.transactionHash?.substring(0, 10)}...`, {
          duration: 8000
        });
      } else {
        setShopRegistrationStatus({
          registered: false,
          message: result.error || '登録失敗'
        });
        toast.error(result.error || 'ショップ登録に失敗しました');
      }
    } catch (error: any) {
      console.error('ショップ登録エラー:', error);
      setShopRegistrationStatus({
        registered: false,
        message: error.message || '登録エラー'
      });
      toast.error(`ショップ登録エラー: ${error.message}`);
    } finally {
      setIsRegisteringShop(false);
    }
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
          
          {/* ウェブ版利用者向け説明 */}
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <h3 className="font-semibold text-amber-900 mb-2">📝 初回設定が必要です</h3>
            <ul className="text-sm text-amber-800 space-y-1">
              <li>• <strong>店舗名</strong>: SBTスタンプカードに表示される店舗名（必須）</li>
              <li>• <strong>店舗ID</strong>: PWAインストール時に自動発行されます（ウェブ版も同様）</li>
              <li>• <strong>ショップオーナーアドレス</strong>: SBT発行権限を持つウォレットアドレス（必須）</li>
              <li>• <strong>データ保存</strong>: ブラウザのローカルストレージに保存されます</li>
              <li>• <strong>バックアップ推奨</strong>: 設定完了後はデータエクスポートをお勧めします</li>
            </ul>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                店舗名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={shopInfo.name}
                onChange={(e) => setShopInfo({ ...shopInfo, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="例: 本格コーヒー店 カフェドパリ / ファミリーマート佐藤 / 美容室ハナコ"
                maxLength={50}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                SBTカードに表示される店舗名を入力してください（最大50文字）
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">店舗カテゴリ</label>
              <input
                type="text"
                value={shopInfo.category}
                onChange={(e) => setShopInfo({ ...shopInfo, category: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="例: カフェ・飲食、小売店、サービス業"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">店舗説明</label>
              <textarea
                value={shopInfo.description}
                onChange={(e) => setShopInfo({ ...shopInfo, description: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                rows={3}
                placeholder="例: 地域密着型のコーヒーショップです"
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
              <p className="text-xs text-gray-500 mt-1">
                UUIDベースで生成されたSBT記録用の一意ショップID。ウェブ・アプリともPWAインストール時に自動発行。
              </p>
            </div>

            {/* ショップオーナーアドレス */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ショップオーナーアドレス <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={shopInfo.ownerAddress}
                  onChange={(e) => setShopInfo({ ...shopInfo, ownerAddress: e.target.value })}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-sm"
                  placeholder="0x..."
                />
                <button
                  type="button"
                  onClick={() => {
                    if (walletAddress) {
                      setShopInfo({ ...shopInfo, ownerAddress: walletAddress });
                      toast.success('接続中のウォレットアドレスを設定しました');
                    } else {
                      toast.error('ウォレットを接続してください');
                    }
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition text-sm whitespace-nowrap"
                >
                  現在のウォレット
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                このアドレスでSBTを発行できます。通常は店舗オーナーのウォレットアドレスを設定してください。
              </p>
              {walletAddress && (
                <p className="text-xs text-indigo-600 mt-1">
                  💡 接続中のウォレット: {walletAddress.slice(0, 10)}...{walletAddress.slice(-8)}
                </p>
              )}
            </div>

            {/* ユーザー登録不要のメリット・注意事項 */}
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">👤 ユーザー登録不要のPWAアプリ</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• <strong>メリット</strong>: 個人情報不要、即座利用開始、ウォレットで認証</li>
                <li>• <strong>注意</strong>: アプリ削除時に店舗データも消失（バックアップ推奨）</li>
              <li>• <strong>UUID管理</strong>: PWAインストール時のみ発行で無駄なID墜加を防止（ウェブ版も同様）</li>
              </ul>
            </div>

            <button
              onClick={handleSave}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition duration-200 flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" /> 保存
            </button>
          </div>
        </div>

        {/* 🎖️ SBTランク設定 */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-lg font-bold text-gray-900 mb-6">🎖️ SBTランク設定</h2>
          
          <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <h3 className="font-semibold text-purple-900 mb-2">📊 ランク自動判定について</h3>
            <p className="text-sm text-purple-800 mb-2">
              スタンプカードの必要訪問回数に応じて、SBTのランク（Bronze/Silver/Gold/Platinum）が自動的に決定されます。
            </p>
            <p className="text-sm text-purple-800">
              例: 必要訪問回数が15回の場合 → Silverランク（10回以上20回未満）
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                🥉 ブロンズ（最小訪問回数）
              </label>
              <input
                type="number"
                min="1"
                value={rankThresholds.bronzeMin}
                onChange={(e) => setRankThresholds({ ...rankThresholds, bronzeMin: parseInt(e.target.value) || 1 })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">デフォルト: 1回</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                🥈 シルバー（最小訪問回数）
              </label>
              <input
                type="number"
                min="1"
                value={rankThresholds.silverMin}
                onChange={(e) => setRankThresholds({ ...rankThresholds, silverMin: parseInt(e.target.value) || 10 })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">デフォルト: 10回</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                🥇 ゴールド（最小訪問回数）
              </label>
              <input
                type="number"
                min="1"
                value={rankThresholds.goldMin}
                onChange={(e) => setRankThresholds({ ...rankThresholds, goldMin: parseInt(e.target.value) || 20 })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">デフォルト: 20回</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                💎 プラチナ（最小訪問回数）
              </label>
              <input
                type="number"
                min="1"
                value={rankThresholds.platinumMin}
                onChange={(e) => setRankThresholds({ ...rankThresholds, platinumMin: parseInt(e.target.value) || 50 })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">デフォルト: 50回</p>
            </div>
          </div>

          <div className="mt-6 p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-sm font-semibold text-gray-700 mb-2">現在の設定:</p>
            <div className="text-xs text-gray-600 space-y-1">
              <p>• 🥉 ブロンズ: {rankThresholds.bronzeMin}～{rankThresholds.silverMin - 1}回</p>
              <p>• 🥈 シルバー: {rankThresholds.silverMin}～{rankThresholds.goldMin - 1}回</p>
              <p>• 🥇 ゴールド: {rankThresholds.goldMin}～{rankThresholds.platinumMin - 1}回</p>
              <p>• 💎 プラチナ: {rankThresholds.platinumMin}回以上</p>
            </div>
          </div>

          <button
            onClick={handleSave}
            className="w-full mt-4 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg transition duration-200 flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" /> ランク設定を保存
          </button>
        </div>

        {/* SBTコントラクト情報 */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="flex items-center gap-3 mb-6">
            <Server className="w-6 h-6 text-indigo-600" />
            <h2 className="text-lg font-bold text-gray-900">SBT コントラクト情報</h2>
          </div>
          
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-indigo-800 mb-2">
              <span className="font-semibold">📍 1つのコントラクトで複数ショップ管理</span>
            </p>
            <p className="text-xs text-indigo-700">
              このアプリでは、1つのSBTコントラクトアドレスで複数のお店のスタンプカードを管理します。
              各ショップは「ショップID」で区別され、ショップオーナーは自分のショップのSBTのみ発行できます。
            </p>
          </div>

          <div className="space-y-4">
            {/* Polygon Amoy Testnet */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-900">🧪 Polygon Amoy (Testnet)</h3>
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">テスト用</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={getSBTContractAddress(80002)}
                  disabled
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 font-mono text-sm"
                />
                <button
                  onClick={() => copyToClipboard(getSBTContractAddress(80002), 'Amoyコントラクトアドレス')}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <a
                  href={`https://amoy.polygonscan.com/address/${getSBTContractAddress(80002)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition flex items-center gap-1"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span className="text-sm">確認</span>
                </a>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Chain ID: 80002 | デプロイ済み ✅
              </p>
            </div>

            {/* Polygon Mainnet */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-900">🌐 Polygon Mainnet (本番)</h3>
                <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">本番環境</span>
              </div>
              {getSBTContractAddress(137) === '0x0000000000000000000000000000000000000000' ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-sm text-yellow-800 font-semibold mb-1">⚠️ 未デプロイ</p>
                  <p className="text-xs text-yellow-700">
                    本番環境用のコントラクトはまだデプロイされていません。
                    デプロイ後、contracts.ts を更新してください。
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={getSBTContractAddress(137)}
                      disabled
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 font-mono text-sm"
                    />
                    <button
                      onClick={() => copyToClipboard(getSBTContractAddress(137), 'Mainnetコントラクトアドレス')}
                      className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <a
                      href={`https://polygonscan.com/address/${getSBTContractAddress(137)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition flex items-center gap-1"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span className="text-sm">確認</span>
                    </a>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Chain ID: 137 | デプロイ済み ✅
                  </p>
                </>
              )}
            </div>
          </div>

          <div className="mt-6 p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-xs text-gray-600">
              💡 <strong>ヒント:</strong> ユーザーがMetaMaskでSBTを表示するには、このコントラクトアドレスが必要です。
              OpenSeaなどのNFTマーケットプレイスでも、このアドレスからSBTを検索できます。
            </p>
          </div>
        </div>

        {/* ウォレット & ネットワーク情報 */}
        <WalletSelector
          title="ウォレット & ネットワーク設定"
          showChainSelector={true}
        />

        {/* PWAキャッシュ管理 */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-lg font-bold text-gray-900 mb-6">PWA キャッシュ管理</h2>
          <div className="mb-4">
            <p className="text-sm text-gray-600">
              PWA環境でウォレット接続に問題がある場合、キャッシュをクリアして解決できます。
            </p>
          </div>
          <PWAWalletCacheManager />
        </div>

        {/* ストレージ互換性チェック */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-lg font-bold text-gray-900 mb-6">ストレージ互換性</h2>
          <div className="mb-4">
            <p className="text-sm text-gray-600">
              PWAとブラウザ間でのデータ共有状況を確認し、必要に応じて対処方法を提案します。
            </p>
          </div>
          <StorageCompatibilityChecker />
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

        {/* 🚨 SBT発行のセキュリティに関する重要な注意事項 */}
        <div className="bg-white rounded-xl shadow-lg p-8 border-l-4 border-blue-500">
          <div className="flex items-center gap-3 mb-6">
            <AlertCircle className="w-6 h-6 text-blue-600" />
            <h2 className="text-lg font-bold text-gray-900">🛡️ SBT発行のセキュリティについて</h2>
          </div>
          
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">📱 現在のデモ実装</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• MetaMaskを使用したフロントエンド署名</li>
                <li>• ユーザーがSBT発行の都度トランザクションを承認</li>
                <li>• 秘密鍵はユーザーのMetaMaskが安全に管理</li>
                <li>• プロトタイプ・デモ・テスト目的に適している</li>
              </ul>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-green-900 mb-2">🏢 本番環境での推奨構成</h3>
              <ul className="text-sm text-green-800 space-y-1">
                <li>• <strong>サーバーサイドAPI:</strong> Node.js、Python等でSBT発行API作成</li>
                <li>• <strong>環境変数管理:</strong> サーバー上で秘密鍵を暗号化して保存</li>
                <li>• <strong>認証システム:</strong> JWT、OAuth等でAPI保護</li>
                <li>• <strong>監査ログ:</strong> すべてのSBT発行を記録</li>
                <li>• <strong>レート制限:</strong> 不正な大量発行を防止</li>
                <li>• <strong>権限管理:</strong> ロールベースアクセス制御</li>
              </ul>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="font-semibold text-yellow-900 mb-2">⚠️ フロントエンドでの秘密鍵管理の危険性</h3>
              <ul className="text-sm text-yellow-800 space-y-1">
                <li>• ブラウザのローカルストレージは暗号化されていない</li>
                <li>• JavaScript コードから秘密鍵が読み取り可能</li>
                <li>• ブラウザ拡張機能からのアクセス可能性</li>
                <li>• デバッグツールでの秘密鍵の可視化</li>
                <li>• XSS攻撃による秘密鍵の流出リスク</li>
              </ul>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">💡 本番移行時の検討事項</h3>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• ユーザビリティ vs セキュリティのバランス</li>
                <li>• 署名頻度の最適化（バッチ処理等）</li>
                <li>• オフチェーン署名の活用</li>
                <li>• マルチシグウォレットの導入</li>
                <li>• ハードウェアウォレット対応</li>
              </ul>
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
