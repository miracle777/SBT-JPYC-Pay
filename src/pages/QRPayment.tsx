import React, { useState } from 'react';
import { QrCode, Download, Copy, Trash2, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

interface PaymentSession {
  id: string;
  amount: number;
  currency: string;
  qrCode: string;
  status: 'pending' | 'completed' | 'expired';
  createdAt: string;
  expiresAt: string;
}

const QRPayment: React.FC = () => {
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('JPYC');
  const [paymentSessions, setPaymentSessions] = useState<PaymentSession[]>([
    {
      id: '001',
      amount: 1000,
      currency: 'JPYC',
      qrCode: 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=jpyc:payment:001',
      status: 'completed',
      createdAt: '2025-11-14 10:30',
      expiresAt: '2025-11-14 11:30',
    },
    {
      id: '002',
      amount: 5000,
      currency: 'JPYC',
      qrCode: 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=jpyc:payment:002',
      status: 'pending',
      createdAt: '2025-11-14 11:00',
      expiresAt: '2025-11-14 12:00',
    },
  ]);
  const [showQR, setShowQR] = useState<string | null>(null);

  const generateQRCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('有効な金額を入力してください');
      return;
    }

    const paymentId = `PAY${Date.now()}`;
    const newSession: PaymentSession = {
      id: paymentId,
      amount: parseFloat(amount),
      currency,
      qrCode: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=jpyc:payment:${paymentId}`,
      status: 'pending',
      createdAt: new Date().toLocaleString('ja-JP'),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toLocaleString('ja-JP'),
    };

    setPaymentSessions([newSession, ...paymentSessions]);
    setAmount('');
    toast.success('QRコードを生成しました');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('コピーしました');
  };

  const downloadQR = (url: string, id: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `payment-qr-${id}.png`;
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

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-6">
            <QrCode className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">QR決済</h1>
          </div>
          <p className="text-gray-600">JPYC対応のQRコード決済を生成・管理します</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 生成フォーム */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">QRコード生成</h2>
              <form onSubmit={generateQRCode} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">金額</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="例: 10000"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="JPYC">JPYC</option>
                      <option value="JPY">JPY</option>
                      <option value="USD">USD</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition duration-200"
                >
                  QRコード生成
                </button>
              </form>

              {/* 統計情報 */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-4">統計</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">総生成数</span>
                    <span className="font-bold text-gray-900">{paymentSessions.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">完了</span>
                    <span className="font-bold text-green-600">
                      {paymentSessions.filter((s) => s.status === 'completed').length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">待機中</span>
                    <span className="font-bold text-yellow-600">
                      {paymentSessions.filter((s) => s.status === 'pending').length}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 支払いセッション一覧 */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">支払いセッション</h2>
              <div className="space-y-4">
                {paymentSessions.map((session) => (
                  <div
                    key={session.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition duration-200"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-bold text-gray-900">ID: {session.id}</h3>
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
                            <p className="text-gray-600">作成日時</p>
                            <p className="font-semibold text-gray-900">{session.createdAt}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">有効期限</p>
                            <p className="font-semibold text-gray-900">{session.expiresAt}</p>
                          </div>
                        </div>
                      </div>

                      {/* QRコード表示 */}
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
                          onClick={() => downloadQR(session.qrCode, session.id)}
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
                      <div className="mt-4 pt-4 border-t border-gray-200 flex justify-center">
                        <img
                          src={session.qrCode}
                          alt={`Payment QR ${session.id}`}
                          className="w-48 h-48 rounded-lg shadow-md"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRPayment;
