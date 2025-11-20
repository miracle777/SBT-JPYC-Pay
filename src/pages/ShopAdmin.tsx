import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Store, 
  Plus, 
  Edit2, 
  Trash2, 
  CheckCircle, 
  XCircle,
  ArrowLeft,
  Shield,
  AlertCircle,
  Key,
  Users,
  Settings
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAccount } from 'wagmi';
import { registerShop, getShopInfo, getContractOwner } from '../utils/sbtMinting';
import { getSBTContractAddress } from '../config/contracts';
import { getShopSettings } from '../utils/shopSettings';

/**
 * ショップ管理画面（コントラクトオーナー専用）
 * BASIC認証で保護される管理画面
 */
const ShopAdmin: React.FC = () => {
  const navigate = useNavigate();
  const { address: walletAddress, chainId } = useAccount();
  
  const [isContractOwner, setIsContractOwner] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(true); // デモ版: 認証不要
  const [authPassword, setAuthPassword] = useState('');
  
  // ショップリスト
  const [shops, setShops] = useState<any[]>([]);
  const [showAddShop, setShowAddShop] = useState(false);
  
  // 新規ショップフォーム
  const [newShop, setNewShop] = useState({
    shopId: '',
    name: '',
    description: '',
    ownerAddress: ''
  });

  // 簡易的なBASIC認証（本番では環境変数から取得）
  const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'admin123';

  // 認証チェック
  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (authPassword === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      sessionStorage.setItem('shop-admin-auth', 'true');
      toast.success('🔓 認証成功');
    } else {
      toast.error('❌ パスワードが正しくありません');
    }
  };

  // セッション確認
  useEffect(() => {
    const authSession = sessionStorage.getItem('shop-admin-auth');
    if (authSession === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  // コントラクトオーナーチェック
  useEffect(() => {
    const checkOwner = async () => {
      if (!walletAddress || !chainId) {
        setIsLoading(false);
        return;
      }

      try {
        const ownerResult = await getContractOwner(chainId);
        if (ownerResult.owner && walletAddress) {
          const isOwner = ownerResult.owner.toLowerCase() === walletAddress.toLowerCase();
          setIsContractOwner(isOwner);
        }
      } catch (error) {
        console.error('Owner check error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkOwner();
  }, [walletAddress, chainId]);

  // ショップリスト読み込み
  useEffect(() => {
    if (!isAuthenticated || !chainId) return;

    const loadShops = async () => {
      const shopList = [];
      // ショップID 1〜10 を確認
      for (let i = 1; i <= 10; i++) {
        try {
          const result = await getShopInfo(i, chainId);
          if (result.shopInfo) {
            shopList.push({
              shopId: i,
              ...result.shopInfo
            });
          }
        } catch (error) {
          // ショップが存在しない場合はスキップ
        }
      }
      setShops(shopList);
    };

    loadShops();
  }, [isAuthenticated, chainId]);

  // 設定画面の情報から自動入力
  const loadFromSettings = () => {
    const settings = getShopSettings();
    setNewShop({
      shopId: '1', // デフォルトでショップID 1
      name: settings.name || '',
      description: settings.description || '',
      ownerAddress: walletAddress || '' // 自分のウォレットアドレス
    });
    toast.success('✅ 設定画面の情報を読み込みました');
  };

  // ショップ登録
  const handleRegisterShop = async () => {
    if (!chainId) {
      toast.error('ウォレットを接続してください');
      return;
    }

    if (!newShop.shopId || !newShop.name || !newShop.ownerAddress) {
      toast.error('必須項目を入力してください');
      return;
    }

    const shopId = parseInt(newShop.shopId);
    if (isNaN(shopId) || shopId < 1) {
      toast.error('ショップIDは1以上の数値を入力してください');
      return;
    }

    setIsLoading(true);
    try {
      const result = await registerShop({
        shopId,
        shopName: newShop.name,
        description: newShop.description || `${newShop.name}のSBTシステム`,
        shopOwnerAddress: newShop.ownerAddress,
        requiredVisits: 10, // デフォルト値（SBT発行時に動的に設定される）
        chainId
      });

      if (result.success) {
        toast.success(`✅ ショップ "${newShop.name}" を登録しました`);
        setShowAddShop(false);
        setNewShop({
          shopId: '',
          name: '',
          description: '',
          ownerAddress: ''
        });
        
        // リストを再読み込み
        setTimeout(() => window.location.reload(), 2000);
      } else {
        toast.error(result.error || 'ショップ登録に失敗しました');
      }
    } catch (error: any) {
      toast.error(`エラー: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // デモ版: 認証画面をスキップ（コメントアウト）
  /*
  // 認証画面
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center px-4">
        <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <Shield className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">ショップ管理画面</h1>
            <p className="text-sm text-gray-600">コントラクトオーナー専用</p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Key className="w-4 h-4 inline mr-1" />
                管理者パスワード
              </label>
              <input
                type="password"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="パスワードを入力"
                autoFocus
              />
            </div>

            <button
              type="submit"
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
            >
              🔓 ログイン
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <button
              onClick={() => navigate('/sbt-management')}
              className="w-full flex items-center justify-center gap-2 text-gray-600 hover:text-gray-900 text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              SBT管理画面に戻る
            </button>
          </div>
        </div>
      </div>
    );
  }
  */

  // 権限なし画面
  if (!isContractOwner && !isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-50 border-2 border-red-300 rounded-lg p-6">
            <div className="flex gap-3">
              <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h2 className="text-xl font-bold text-red-900 mb-2">⚠️ アクセス権限がありません</h2>
                <p className="text-red-800 mb-4">
                  この管理画面にアクセスするには、コントラクトオーナーのウォレットで接続する必要があります。
                </p>
                <div className="bg-white rounded p-3 text-sm mb-4">
                  <p className="text-gray-600 mb-1">現在のウォレット:</p>
                  <p className="font-mono text-gray-900">{walletAddress || '未接続'}</p>
                </div>
                <button
                  onClick={() => navigate('/sbt-management')}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
                >
                  <ArrowLeft className="w-4 h-4" />
                  戻る
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // メイン画面
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* ⚠️ 重要な注意事項バナー */}
        <div className="mb-6 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-lg shadow-lg p-6">
          <div className="flex items-start gap-4">
            <Shield className="w-8 h-8 flex-shrink-0 mt-1" />
            <div>
              <h2 className="text-xl font-bold mb-2">🔐 コントラクトオーナー専用管理画面</h2>
              <p className="text-sm opacity-90 mb-3">
                この画面はスマートコントラクトのオーナーのみがアクセス可能な総合管理画面です。
              </p>
              <div className="bg-white/10 backdrop-blur rounded p-3 text-sm">
                <p className="font-semibold mb-2">⚠️ 本番運用での重要な注意:</p>
                <ul className="space-y-1 text-xs opacity-90">
                  <li>• この画面は<strong className="text-yellow-300">非公開ページ</strong>として運用してください</li>
                  <li>• URL直接アクセス、外部リンク掲載は厳禁</li>
                  <li>• 総合管理者のみが使用可能</li>
                  <li>• 他の店舗をショップオーナーとして登録する機能を提供</li>
                  <li>• <strong className="text-yellow-300">※現在はデモ版のため、開発・検証目的で公開中</strong></li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* ヘッダー */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/sbt-management')}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>SBT管理画面に戻る</span>
          </button>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Store className="w-8 h-8 text-blue-600" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">ショップ管理</h1>
                  <p className="text-sm text-gray-600">コントラクトオーナー専用 - 総合管理</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                  <Shield className="w-3 h-3 inline mr-1" />
                  オーナー認証済み
                </span>
                <button
                  onClick={() => {
                    sessionStorage.removeItem('shop-admin-auth');
                    setIsAuthenticated(false);
                  }}
                  className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-xs"
                >
                  ログアウト
                </button>
              </div>
            </div>

            <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-300 rounded-lg p-4">
              <p className="text-sm text-gray-800 mb-2">
                <strong>💡 この画面でできること:</strong>
              </p>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• 他の店舗をショップオーナーとして登録</li>
                <li>• 登録されたショップオーナーは、自分のショップIDでSBTを発行可能</li>
                <li>• 各ショップの利用状況と統計の確認</li>
                <li>• ショップの有効化/無効化の管理</li>
              </ul>
              <p className="text-xs text-gray-600 mt-3 pt-3 border-t border-gray-300">
                <strong>ℹ️ ヒント:</strong> 自分自身をショップオーナーとして登録する場合は、
                「設定画面から読み込み」ボタンで店舗情報を自動入力できます。
              </p>
            </div>
          </div>
        </div>

        {/* ショップ統計 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Store className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">登録済みショップ</p>
                <p className="text-2xl font-bold text-gray-900">{shops.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">有効なショップ</p>
                <p className="text-2xl font-bold text-gray-900">
                  {shops.filter(s => s.active).length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">ショップオーナー</p>
                <p className="text-2xl font-bold text-gray-900">
                  {new Set(shops.map(s => s.owner)).size}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 新規ショップ登録 */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setShowAddShop(!showAddShop)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
            >
              <Plus className="w-5 h-5" />
              新しいショップを登録
            </button>

            {/* 設定画面から読み込みボタン */}
            <button
              onClick={loadFromSettings}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition"
            >
              <Settings className="w-5 h-5" />
              設定画面から読み込み
            </button>
          </div>

          {showAddShop && (
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-4">新規ショップ登録</h3>
              
              <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4">
                <p className="text-sm text-blue-800">
                  💡 <strong>ヒント:</strong> 「設定画面から読み込み」ボタンで、/settings で登録した店舗情報を自動入力できます。
                </p>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ショップID *
                  </label>
                  <input
                    type="number"
                    value={newShop.shopId}
                    onChange={(e) => setNewShop({...newShop, shopId: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="1"
                    min="1"
                  />
                  <p className="text-xs text-gray-500 mt-1">1以上の数値（重複不可）</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ショップ名 *
                  </label>
                  <input
                    type="text"
                    value={newShop.name}
                    onChange={(e) => setNewShop({...newShop, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="例: カフェ ABC"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    説明
                  </label>
                  <textarea
                    value={newShop.description}
                    onChange={(e) => setNewShop({...newShop, description: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={2}
                    placeholder="ショップの説明（オプション）"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ショップオーナーアドレス *
                  </label>
                  <input
                    type="text"
                    value={newShop.ownerAddress}
                    onChange={(e) => setNewShop({...newShop, ownerAddress: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                    placeholder="0x..."
                  />
                  <p className="text-xs text-gray-500 mt-1">このアドレスがSBTを発行できるようになります</p>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded p-3">
                  <p className="text-xs text-gray-600">
                    <strong>ℹ️ 注意:</strong> 必要利用回数はSBT発行時にテンプレートごとに動的に設定されます。
                    ショップ登録時には設定不要です。
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleRegisterShop}
                    disabled={isLoading}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:bg-gray-400"
                  >
                    {isLoading ? '登録中...' : '✅ 登録する'}
                  </button>
                  <button
                    onClick={() => setShowAddShop(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition"
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ショップリスト */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">登録済みショップ一覧</h2>
          
          {shops.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Store className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>まだショップが登録されていません</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {shops.map((shop) => (
                <div key={shop.shopId} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">{shop.name}</h3>
                      <p className="text-sm text-gray-600">ショップID: {shop.shopId}</p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      shop.active 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {shop.active ? '有効' : '無効'}
                    </span>
                  </div>
                  
                  {shop.description && (
                    <p className="text-sm text-gray-600 mb-3">{shop.description}</p>
                  )}
                  
                  <div className="bg-gray-50 rounded p-2 text-xs">
                    <p className="text-gray-600 mb-1">オーナー:</p>
                    <p className="font-mono text-gray-900 break-all">{shop.owner}</p>
                  </div>
                  
                  <div className="mt-3 text-xs text-gray-500">
                    必要利用回数: {shop.requiredVisits}回
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* JPYC免責事項 */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="bg-gray-50 rounded-lg p-4 text-xs text-gray-600">
            <p className="mb-2">※ 本プログラムは、JPYC株式会社による公式コンテンツではありません。</p>
            <p className="mb-2">※ 「JPYC」は、JPYC株式会社の提供するステーブルコインです。</p>
            <p>※ JPYC及びJPYCロゴは、JPYC株式会社の登録商標です。</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShopAdmin;
