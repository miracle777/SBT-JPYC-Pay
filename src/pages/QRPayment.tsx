import React, { useState, useEffect } from 'react';
import { QrCode, Download, Copy, Trash2, Eye, EyeOff, AlertCircle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { NETWORKS, JPYC, getContractAddress } from '../config/networks';
import { DEFAULT_SHOP_INFO, getShopWalletAddress } from '../config/shop';
import { createPaymentPayload, encodePaymentPayload } from '../types/payment';
import { useWallet } from '../context/WalletContext';
import QRCodeDisplay from '../components/QRCodeDisplay';

interface PaymentSession {
  id: string;
  amount: number;
  currency: string;
  chainId: number;
  chainName: string;
  qrCodeData: string;
  status: 'pending' | 'completed' | 'expired';
  createdAt: string;
  expiresAt: string;
  expiresAtTimestamp: number;
  timeRemainingSeconds?: number;
}

const QRPayment: React.FC = () => {
  const { address: walletAddress, chainId: currentChainId } = useWallet();
  const [amount, setAmount] = useState('');
  const [selectedChainForPayment, setSelectedChainForPayment] = useState(
    Object.values(NETWORKS)[0].chainId
  );
  const [paymentSessions, setPaymentSessions] = useState<PaymentSession[]>([]);
  const [expiryTimeMinutes, setExpiryTimeMinutes] = useState(15); // デフォルト15分

  const shopWalletAddress = getShopWalletAddress(walletAddress);
  const paymentNetwork = Object.values(NETWORKS).find(
    (net) => net.chainId === selectedChainForPayment
  );
  const paymentContractAddress = getContractAddress(
    selectedChainForPayment,
    JPYC
  );

  const isNetworkMismatch =
    currentChainId && currentChainId !== selectedChainForPayment;

  // 有効期限チェックと時間更新
  useEffect(() => {
    const interval = setInterval(() => {
      setPaymentSessions((prev) =>
        prev.map((session) => {
          const now = Math.floor(Date.now() / 1000);
          const timeRemaining = session.expiresAtTimestamp - now;
          const newStatus =
            timeRemaining <= 0
              ? ('expired' as const)
              : session.status;
          return {
            ...session,
            status: newStatus,
            timeRemainingSeconds: Math.max(0, timeRemaining),
          };
        })
      );
    }, 1000); // 1秒ごとに更新

    return () => clearInterval(interval);
  }, []);

  const generateQRCode = (e: React.FormEvent) => {
    e.preventDefault();

    if (!amount || parseFloat(amount) <= 0) {
      toast.error('有効な金額を入力してください');
      return;
    }

    if (!shopWalletAddress) {
      toast.error('ウォレットアドレスが設定されていません');
      return;
    }

    if (!paymentNetwork) {
      toast.error('ネットワークを選択してください');
      return;
    }

    if (!paymentContractAddress) {
      toast.error('このネットワークのコントラクトアドレスが見つかりません');
      return;
    }

    try {
      const paymentId = `PAY${Date.now()}`;
      const expiresAtTimestamp = Math.floor(Date.now() / 1000) + expiryTimeMinutes * 60;

      // Wei単位に変換（18小数点）
      const amountInWei = (parseFloat(amount) * 1e18).toString();

      const payload = createPaymentPayload(
        DEFAULT_SHOP_INFO.id,
        DEFAULT_SHOP_INFO.name,
        shopWalletAddress,
        amountInWei,
        selectedChainForPayment,
        paymentContractAddress,
        expiresAtTimestamp,
        paymentId,
        `Payment from ${DEFAULT_SHOP_INFO.name}`
      );

      const encodedPayload = encodePaymentPayload(payload);

      const newSession: PaymentSession = {
        id: paymentId,
        amount: parseFloat(amount),
        currency: 'JPYC',
        chainId: selectedChainForPayment,
        chainName: paymentNetwork.displayName,
        qrCodeData: encodedPayload,
        status: 'pending',
        createdAt: new Date().toLocaleString('ja-JP'),
        expiresAt: new Date(expiresAtTimestamp * 1000).toLocaleString('ja-JP'),
        expiresAtTimestamp,
        timeRemainingSeconds: expiryTimeMinutes * 60,
      };

      setPaymentSessions([newSession, ...paymentSessions]);
      setAmount('');
      toast.success('QRコードを生成しました');
    } catch (error) {
      console.error('QRコード生成エラー:', error);
      toast.error('QRコード生成に失敗しました');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('コピーしました');
  };

  const downloadQR = (paymentId: string) => {
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
      paymentId
    )}`;
    const link = document.createElement('a');
    link.href = qrCodeUrl;
    link.download = `payment-qr-${paymentId}.png`;
    link.click();
    toast.success('QRコードをダウンロードしました');
  };

  const deleteSession = (id: string) => {
    setPaymentSessions(paymentSessions.filter((s) => s.id !== id));
    toast.success('削除しました');
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: '待機中' },
      completed: { bg: 'bg-green-100', text: 'text-green-800', label: '完了' },
      expired: { bg: 'bg-red-100', text: 'text-red-800', label: '期限切れ' },
    };
    const s = statusMap[status as keyof typeof statusMap];
    return <span className={`px-3 py-1 rounded-full text-sm font-medium ${s.bg} ${s.text}`}>{s.label}</span>;
  };

  const networkList = Object.values(NETWORKS);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-6">
          <div className="flex items-center space-x-4 mb-4">
            <QrCode className="w-8 h-8 text-blue-600" />
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">QR決済</h1>
          </div>
          <p className="text-sm md:text-base text-gray-600">JPYC対応のQRコード決済を生成・管理します</p>
        </div>

        {/* メインコンテナ: QRコード表示エリアが最優先 */}
        <div className="space-y-4">
          {/* QRコード表示エリア（上部） */}
          <div className="bg-white rounded-xl shadow-lg p-4 md:p-8">
            <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-6 text-center">
              現在のQRコード
            </h2>
            
            {paymentSessions.length === 0 || !paymentSessions.some(s => s.status === 'pending') ? (
              <div className="text-center py-12">
                <QrCode className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">まだQRコードを生成していません</p>
                <p className="text-xs text-gray-400">下の「設定」でQRコードを生成してください</p>
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-4">
                {paymentSessions
                  .filter(s => s.status === 'pending')
                  .slice(0, 1)
                  .map((session) => (
                    <div key={session.id} className="w-full">
                      {/* 決済情報 */}
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-4 mb-4">
                        <div className="grid grid-cols-3 gap-2 text-center mb-3">
                          <div>
                            <p className="text-xs text-gray-600">金額</p>
                            <p className="text-lg md:text-xl font-bold text-blue-600">{session.amount}</p>
                            <p className="text-xs text-gray-600">JPYC</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">ネットワーク</p>
                            <p className="text-sm font-semibold text-gray-900">{session.chainName.split(' ')[0]}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">残り時間</p>
                            <p className={`text-lg font-bold ${
                              (session.timeRemainingSeconds || 0) < 300
                                ? 'text-red-600'
                                : 'text-green-600'
                            }`}>
                              {Math.floor((session.timeRemainingSeconds || 0) / 60)}:{String((session.timeRemainingSeconds || 0) % 60).padStart(2, '0')}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      {/* QRコード表示 */}
                      <div className="flex flex-col items-center">
                        <div style={{
                          display: 'flex',
                          justifyContent: 'center',
                          padding: '1rem',
                          background: 'white',
                          borderRadius: '0.5rem',
                          border: '2px solid #e5e7eb',
                        }}>
                          <QRCodeDisplay
                            data={session.qrCodeData}
                            size={280}
                            errorCorrectionLevel="H"
                            onDownload={(type) => {
                              toast.success(`QRコードを${type === 'png' ? 'PNG' : 'SVG'}でダウンロードしました`);
                            }}
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-3 text-center">
                          スマートフォンでスキャンしてください
                        </p>
                      </div>

                      {/* 操作ボタン */}
                      <div className="flex gap-2 mt-4 flex-wrap justify-center">
                        <button
                          onClick={() => copyToClipboard(session.id)}
                          className="flex items-center gap-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-lg transition"
                        >
                          <Copy className="w-4 h-4" /> ID
                        </button>
                        <button
                          onClick={() => downloadQR(session.id)}
                          className="flex items-center gap-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-lg transition"
                        >
                          <Download className="w-4 h-4" /> DL
                        </button>
                        <button
                          onClick={() => {
                            setPaymentSessions(prev => 
                              prev.map(s => s.id === session.id ? { ...s, status: 'completed' } : s)
                            );
                            toast.success('決済完了として記録しました');
                          }}
                          className="flex items-center gap-1 px-3 py-2 bg-green-500 hover:bg-green-600 text-white text-sm rounded-lg transition"
                        >
                          ✓ 決済完了
                        </button>
                        <button
                          onClick={() => deleteSession(session.id)}
                          className="flex items-center gap-1 px-3 py-2 bg-red-100 hover:bg-red-200 text-red-600 text-sm rounded-lg transition"
                        >
                          <Trash2 className="w-4 h-4" /> 削除
                        </button>
                      </div>

                      {/* ペイロード情報 */}
                      <div className="bg-gray-50 p-3 rounded-lg mt-4">
                        <p className="text-xs text-gray-600 mb-2">ペイロード:</p>
                        <p className="text-xs text-gray-500 break-all font-mono">
                          {session.qrCodeData.substring(0, 80)}...
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* 設定エリア（下部） */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 生成フォーム */}
            <div className="md:col-span-2">
              <div className="bg-white rounded-xl shadow-lg p-4 md:p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">設定</h2>
                <form onSubmit={generateQRCode} className="space-y-3">
                  {/* 支払い用ネットワーク選択 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      支払いネットワーク
                    </label>
                    <select
                      value={selectedChainForPayment}
                      onChange={(e) =>
                        setSelectedChainForPayment(parseInt(e.target.value))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    >
                      {Object.values(NETWORKS).map((network) => (
                        <option key={network.chainId} value={network.chainId}>
                          {network.displayName} {network.isTestnet ? '(T)' : ''}
                        </option>
                      ))}
                    </select>
                    {paymentNetwork && (
                      <p className="text-xs text-gray-500 mt-1">
                        ChainID: {paymentNetwork.chainId}
                      </p>
                    )}
                  </div>

                  {/* ネットワーク不一致警告 */}
                  {isNetworkMismatch && (
                    <div className="p-2 bg-orange-50 border border-orange-200 rounded-lg flex gap-2">
                      <AlertCircle className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
                      <div className="text-xs text-orange-700">
                        <p className="font-semibold">ネットワーク不一致</p>
                        <p>ウォレット: {Object.values(NETWORKS).find(n => n.chainId === currentChainId)?.displayName}</p>
                        <p>QR: {paymentNetwork?.displayName}</p>
                      </div>
                    </div>
                  )}

                  {/* 金額入力 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      金額 (JPYC)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="例: 100"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                  </div>

                  {/* 有効期限設定 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <Clock className="w-3 h-3 inline mr-1" />
                      有効期限
                    </label>
                    <select
                      value={expiryTimeMinutes}
                      onChange={(e) => setExpiryTimeMinutes(parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    >
                      <option value={5}>5分</option>
                      <option value={10}>10分</option>
                      <option value={15}>15分</option>
                      <option value={30}>30分</option>
                      <option value={60}>60分</option>
                    </select>
                  </div>

                  {/* 生成ボタン */}
                  <button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition duration-200 text-sm"
                  >
                    QRコード生成
                  </button>
                </form>
              </div>
            </div>

            {/* 統計情報 */}
            <div className="bg-white rounded-xl shadow-lg p-4 md:p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">統計</h2>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-gray-600 text-xs">総生成数</p>
                  <p className="text-2xl font-bold text-gray-900">{paymentSessions.length}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-xs">完了</p>
                  <p className="text-2xl font-bold text-green-600">
                    {paymentSessions.filter((s) => s.status === 'completed').length}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600 text-xs">待機中</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {paymentSessions.filter((s) => s.status === 'pending').length}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600 text-xs">期限切れ</p>
                  <p className="text-2xl font-bold text-red-600">
                    {paymentSessions.filter((s) => s.status === 'expired').length}
                  </p>
                </div>
              </div>

              {/* 店舗情報 */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-2 text-sm">店舗情報</h3>
                <div className="space-y-2 text-xs">
                  <div>
                    <p className="text-gray-600">店舗名</p>
                    <p className="font-semibold text-gray-900 truncate">{DEFAULT_SHOP_INFO.name}</p>
                  </div>
                  {shopWalletAddress && shopWalletAddress !== '0x0000000000000000000000000000000000000000' && (
                    <div>
                      <p className="text-gray-600">アドレス</p>
                      <p className="font-mono text-gray-900 break-all text-xs">
                        {shopWalletAddress.slice(0, 6)}...{shopWalletAddress.slice(-4)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* セッション履歴 */}
          <div className="bg-white rounded-xl shadow-lg p-4 md:p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">セッション履歴</h2>
            {paymentSessions.length === 0 ? (
              <p className="text-gray-500 text-sm">セッションはまだありません</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-gray-200">
                    <tr>
                      <th className="text-left py-2 px-2 font-semibold text-gray-700">ID</th>
                      <th className="text-left py-2 px-2 font-semibold text-gray-700">金額</th>
                      <th className="text-left py-2 px-2 font-semibold text-gray-700">ネットワーク</th>
                      <th className="text-left py-2 px-2 font-semibold text-gray-700">作成時刻</th>
                      <th className="text-left py-2 px-2 font-semibold text-gray-700">状態</th>
                      <th className="text-left py-2 px-2 font-semibold text-gray-700">残り時間</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentSessions.map((session) => (
                      <tr key={session.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2 px-2 font-mono text-xs text-gray-600">{session.id.slice(-8)}</td>
                        <td className="py-2 px-2 font-semibold text-gray-900">{session.amount}</td>
                        <td className="py-2 px-2 text-gray-600">{session.chainName.split(' ')[0]}</td>
                        <td className="py-2 px-2 text-xs text-gray-600">{session.createdAt.split(' ')[1]}</td>
                        <td className="py-2 px-2">{getStatusBadge(session.status)}</td>
                        <td className="py-2 px-2">
                          <span className={`text-xs font-semibold ${
                            session.status === 'expired'
                              ? 'text-red-600'
                              : session.timeRemainingSeconds && session.timeRemainingSeconds < 300
                              ? 'text-orange-600'
                              : 'text-gray-600'
                          }`}>
                            {session.status === 'expired' 
                              ? '期限切れ'
                              : session.timeRemainingSeconds
                              ? `${Math.floor(session.timeRemainingSeconds / 60)}:${String(session.timeRemainingSeconds % 60).padStart(2, '0')}`
                              : '-'
                            }
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRPayment;
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6 sticky top-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">
                QRコード生成
              </h2>
              <form onSubmit={generateQRCode} className="space-y-4">
                {/* 支払い用ネットワーク選択 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    支払いネットワーク
                  </label>
                  <select
                    value={selectedChainForPayment}
                    onChange={(e) =>
                      setSelectedChainForPayment(parseInt(e.target.value))
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {Object.values(NETWORKS).map((network) => (
                      <option key={network.chainId} value={network.chainId}>
                        {network.displayName}{' '}
                        {network.isTestnet ? '(テスト)' : ''}
                      </option>
                    ))}
                  </select>
                  {paymentNetwork && (
                    <p className="text-xs text-gray-500 mt-1">
                      ChainID: {paymentNetwork.chainId}
                    </p>
                  )}
                </div>

                {/* ネットワーク不一致警告 */}
                {isNetworkMismatch && (
                  <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg flex gap-2">
                    <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-orange-700">
                      <p className="font-semibold">ネットワーク不一致</p>
                      <p className="text-xs mt-1">
                        ウォレットが接続している:{' '}
                        {Object.values(NETWORKS).find(
                          (n) => n.chainId === currentChainId
                        )?.displayName || `ChainID: ${currentChainId}`}
                      </p>
                      <p className="text-xs mt-1">
                        QR支払い用: {paymentNetwork?.displayName}
                      </p>
                    </div>
                  </div>
                )}

                {/* 金額入力 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    金額 (JPYC)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="例: 100"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <div className="px-3 py-2 bg-gray-100 rounded-lg flex items-center font-semibold text-gray-700">
                      JPYC
                    </div>
                  </div>
                </div>

                {/* 有効期限設定 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Clock className="w-4 h-4 inline mr-1" />
                    有効期限
                  </label>
                  <select
                    value={expiryTimeMinutes}
                    onChange={(e) => setExpiryTimeMinutes(parseInt(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value={5}>5分</option>
                    <option value={10}>10分</option>
                    <option value={15}>15分</option>
                    <option value={30}>30分</option>
                    <option value={60}>60分</option>
                  </select>
                </div>

                {/* 生成ボタン */}
                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition duration-200"
                >
                  QRコード生成
                </button>
              </form>

              {/* 店舗情報 */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-4">店舗情報</h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-gray-600">店舗名</p>
                    <p className="font-semibold text-gray-900 break-all">
                      {DEFAULT_SHOP_INFO.name}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">受け取りアドレス</p>
                    {shopWalletAddress &&
                    shopWalletAddress !==
                      '0x0000000000000000000000000000000000000000' ? (
                      <p className="font-mono text-xs text-gray-900 break-all">
                        {shopWalletAddress}
                      </p>
                    ) : (
                      <p className="text-xs text-orange-600 font-semibold">
                        ℹ️ ウォレット未接続（デモモード）
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-gray-600">コントラクトアドレス</p>
                    <p className="font-mono text-xs text-gray-900 break-all">
                      {paymentContractAddress || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              {/* 統計情報 */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-4">統計</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">総生成数</span>
                    <span className="font-bold text-gray-900">
                      {paymentSessions.length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">完了</span>
                    <span className="font-bold text-green-600">
                      {paymentSessions.filter((s) => s.status === 'completed')
                        .length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">待機中</span>
                    <span className="font-bold text-yellow-600">
                      {paymentSessions.filter((s) => s.status === 'pending')
                        .length}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 支払いセッション一覧 */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">
                支払いセッション
              </h2>
              {paymentSessions.length === 0 ? (
                <div className="text-center py-12">
                  <QrCode className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">
                    QRコードをまだ生成していません
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {paymentSessions.map((session) => (
                    <div
                      key={session.id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition duration-200"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-bold text-gray-900">
                              ID: {session.id}
                            </h3>
                            {getStatusBadge(session.status)}
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-gray-600">金額</p>
                              <p className="font-semibold text-gray-900">
                                {session.amount} {session.currency}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-600">ネットワーク</p>
                              <p className="font-semibold text-gray-900">
                                {session.chainName}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-600">作成日時</p>
                              <p className="font-semibold text-gray-900 text-xs">
                                {session.createdAt}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-600">有効期限</p>
                              <p className={`font-semibold text-xs ${
                                session.status === 'expired'
                                  ? 'text-red-600'
                                  : session.timeRemainingSeconds && session.timeRemainingSeconds < 300
                                  ? 'text-orange-600'
                                  : 'text-gray-900'
                              }`}>
                                {session.status === 'expired' ? (
                                  '期限切れ'
                                ) : session.timeRemainingSeconds ? (
                                  `残り ${Math.floor(session.timeRemainingSeconds / 60)}分 ${session.timeRemainingSeconds % 60}秒`
                                ) : (
                                  session.expiresAt
                                )}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* アクションボタン */}
                        <div className="flex flex-col items-end gap-2">
                          <button
                            onClick={() =>
                              setShowQR(showQR === session.id ? null : session.id)
                            }
                            className="p-2 hover:bg-gray-100 rounded-lg transition"
                            title="QRコード表示"
                          >
                            {showQR === session.id ? (
                              <EyeOff className="w-5 h-5 text-gray-600" />
                            ) : (
                              <Eye className="w-5 h-5 text-gray-600" />
                            )}
                          </button>
                          <button
                            onClick={() => copyToClipboard(session.id)}
                            className="p-2 hover:bg-gray-100 rounded-lg transition"
                            title="IDをコピー"
                          >
                            <Copy className="w-5 h-5 text-gray-600" />
                          </button>
                          <button
                            onClick={() => downloadQR(session.id)}
                            className="p-2 hover:bg-gray-100 rounded-lg transition"
                            title="ダウンロード"
                          >
                            <Download className="w-5 h-5 text-gray-600" />
                          </button>
                          <button
                            onClick={() => deleteSession(session.id)}
                            className="p-2 hover:bg-red-100 rounded-lg transition"
                            title="削除"
                          >
                            <Trash2 className="w-5 h-5 text-red-600" />
                          </button>
                        </div>
                      </div>

                      {/* QRコード表示エリア */}
                      {showQR === session.id && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          {session.status === 'expired' ? (
                            <div className="text-center py-8">
                              <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
                              <p className="text-lg font-semibold text-red-600 mb-2">
                                QRコード期限切れ
                              </p>
                              <p className="text-sm text-gray-600">
                                このQRコードの有効期限が切れました。新しいQRコードを生成してください。
                              </p>
                            </div>
                          ) : (
                            <div className="text-center">
                              <div className="mb-6">
                                <p className="text-sm font-semibold text-gray-900 mb-4">
                                  QRコード
                                </p>
                                <div style={{
                                  display: 'flex',
                                  justifyContent: 'center',
                                  padding: '1.5rem',
                                  background: '#f9fafb',
                                  borderRadius: '0.5rem',
                                  border: '2px solid #e5e7eb',
                                }}>
                                  <QRCodeDisplay
                                    data={session.qrCodeData}
                                    size={400}
                                    errorCorrectionLevel="H"
                                    onDownload={(type) => {
                                      toast.success(`QRコードを${type === 'png' ? 'PNG' : 'SVG'}でダウンロードしました`);
                                    }}
                                  />
                                </div>
                              </div>
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                                <p className="text-xs text-blue-700 font-semibold mb-2">
                                  💡 支払い方法
                                </p>
                                <p className="text-xs text-blue-600 mb-3">
                                  このQRコードをスキャンして、{session.amount} JPYC を {session.chainName} で支払ってください
                                </p>
                                <p className="text-xs text-blue-500 font-semibold">
                                  残り時間: {Math.floor((session.timeRemainingSeconds || 0) / 60)}分 {(session.timeRemainingSeconds || 0) % 60}秒
                                </p>
                              </div>
                      {/* ペイロード情報 */}
                      <div className="bg-gray-50 p-3 rounded-lg mt-4">
                        <p className="text-xs text-gray-600 mb-2">ペイロード:</p>
                        <p className="text-xs text-gray-500 break-all font-mono">
                          {session.qrCodeData.substring(0, 80)}...
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRPayment;
