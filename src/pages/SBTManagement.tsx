import React, { useState, useEffect } from 'react';
import { Award, Plus, Edit2, Trash2, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { useWallet } from '../context/WalletContext';

interface SBTTemplate {
  id: string;
  name: string;
  description: string;
  maxStamps: number;
  rewardDescription: string;
  imageUrl: string;
  createdAt: string;
  status: 'active' | 'inactive';
}

interface IssuedSBT {
  id: string;
  templateId: string;
  templateName: string;
  recipientAddress: string;
  currentStamps: number;
  maxStamps: number;
  issuedAt: string;
  status: 'active' | 'redeemed';
  sourcePaymentId?: string; // 発行元のQR決済セッションID
  transactionHash?: string; // 決済トランザクションハッシュ
}

const SBTManagement: React.FC = () => {
  const { address: walletAddress } = useWallet();
  const [templates, setTemplates] = useState<SBTTemplate[]>([
    {
      id: 'template-001',
      name: 'コーヒーカード',
      description: '10杯でコーヒー1杯無料',
      maxStamps: 10,
      rewardDescription: 'コーヒー1杯無料',
      imageUrl: 'https://via.placeholder.com/100?text=Coffee',
      createdAt: '2025-11-01',
      status: 'active',
    },
    {
      id: 'template-002',
      name: 'ランチセット',
      description: '5回利用でデザート付き',
      maxStamps: 5,
      rewardDescription: 'デザート1品',
      imageUrl: 'https://via.placeholder.com/100?text=Lunch',
      createdAt: '2025-11-05',
      status: 'active',
    },
  ]);

  const [issuedSBTs, setIssuedSBTs] = useState<IssuedSBT[]>([
    {
      id: 'sbt-001',
      templateId: 'template-001',
      templateName: 'コーヒーカード',
      recipientAddress: '0x742d...8f4c',
      currentStamps: 7,
      maxStamps: 10,
      issuedAt: '2025-11-10',
      status: 'active',
    },
    {
      id: 'sbt-002',
      templateId: 'template-002',
      templateName: 'ランチセット',
      recipientAddress: '0x1a2b...3f4g',
      currentStamps: 5,
      maxStamps: 5,
      issuedAt: '2025-11-08',
      status: 'redeemed',
    },
  ]);

  const [newTemplate, setNewTemplate] = useState({
    name: '',
    description: '',
    maxStamps: 10,
    rewardDescription: '',
  });

  const [newIssuance, setNewIssuance] = useState({
    templateId: templates[0]?.id || '',
    recipientAddress: '',
  });

  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [showIssuanceForm, setShowIssuanceForm] = useState(false);
  const [completedPayments, setCompletedPayments] = useState<any[]>([]);

  // LocalStorage から完了した支払いセッションを読み込み
  useEffect(() => {
    const saved = localStorage.getItem('completedPaymentSessions');
    if (saved) {
      try {
        setCompletedPayments(JSON.parse(saved));
      } catch (error) {
        console.error('Failed to load completed payments:', error);
      }
    }
  }, []);

  // completedPayments を監視して、LocalStorage の変更を反映
  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem('completedPaymentSessions');
      if (saved) {
        try {
          setCompletedPayments(JSON.parse(saved));
        } catch (error) {
          console.error('Failed to load completed payments:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const addTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTemplate.name || !newTemplate.description) {
      toast.error('必須項目を入力してください');
      return;
    }

    const template: SBTTemplate = {
      id: `template-${Date.now()}`,
      name: newTemplate.name,
      description: newTemplate.description,
      maxStamps: newTemplate.maxStamps,
      rewardDescription: newTemplate.rewardDescription,
      imageUrl: `https://via.placeholder.com/100?text=${encodeURIComponent(newTemplate.name)}`,
      createdAt: new Date().toISOString().split('T')[0],
      status: 'active',
    };

    setTemplates([template, ...templates]);
    setNewTemplate({ name: '', description: '', maxStamps: 10, rewardDescription: '' });
    setShowTemplateForm(false);
    toast.success('テンプレートを作成しました');
  };

  const deleteTemplate = (id: string) => {
    setTemplates(templates.filter((t) => t.id !== id));
    toast.success('テンプレートを削除しました');
  };

  const issueSBT = (e: React.FormEvent, selectedPaymentId?: string) => {
    e.preventDefault();

    const template = templates.find((t) => t.id === newIssuance.templateId);
    if (!template) {
      toast.error('テンプレートが見つかりません');
      return;
    }

    // 完了した支払いセッションから支払者アドレスを取得、またはウォレットアドレスを使用
    let recipientAddress = '';
    let sourcePaymentId = undefined;
    let transactionHash = undefined;

    if (selectedPaymentId) {
      // 支払いセッションから発行する場合
      const payment = completedPayments.find((p) => p.id === selectedPaymentId);
      if (!payment || !payment.payerAddress) {
        toast.error('支払者アドレスが見つかりません');
        return;
      }
      recipientAddress = payment.payerAddress;
      sourcePaymentId = payment.id;
      transactionHash = payment.transactionHash;
    } else {
      // 手動発行の場合
      if (!walletAddress) {
        toast.error('ウォレットを接続してください');
        return;
      }
      recipientAddress = walletAddress;
    }

    const sbt: IssuedSBT = {
      id: `sbt-${Date.now()}`,
      templateId: template.id,
      templateName: template.name,
      recipientAddress,
      currentStamps: 0,
      maxStamps: template.maxStamps,
      issuedAt: new Date().toISOString().split('T')[0],
      status: 'active',
      sourcePaymentId,
      transactionHash,
    };

    setIssuedSBTs([sbt, ...issuedSBTs]);
    setNewIssuance({ templateId: templates[0]?.id || '', recipientAddress: '' });
    setShowIssuanceForm(false);
    toast.success(`SBTを${recipientAddress.slice(0, 6)}...${recipientAddress.slice(-4)}に発行しました`);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-6">
            <Award className="w-8 h-8 text-purple-600" />
            <h1 className="text-3xl font-bold text-gray-900">SBT管理</h1>
          </div>
          <p className="text-gray-600">スタンプカードテンプレートの作成・管理と発行</p>
        </div>

        {/* テンプレート管理 */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">テンプレート</h2>
            <button
              onClick={() => setShowTemplateForm(!showTemplateForm)}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg transition duration-200"
            >
              <Plus className="w-5 h-5" />
              新規作成
            </button>
          </div>

          {showTemplateForm && (
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <form onSubmit={addTemplate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">テンプレート名</label>
                  <input
                    type="text"
                    value={newTemplate.name}
                    onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                    placeholder="例: コーヒーカード"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">説明</label>
                  <input
                    type="text"
                    value={newTemplate.description}
                    onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                    placeholder="例: 10杯でコーヒー1杯無料"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">最大スタンプ数</label>
                    <input
                      type="number"
                      value={newTemplate.maxStamps}
                      onChange={(e) => setNewTemplate({ ...newTemplate, maxStamps: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">報酬内容</label>
                    <input
                      type="text"
                      value={newTemplate.rewardDescription}
                      onChange={(e) => setNewTemplate({ ...newTemplate, rewardDescription: e.target.value })}
                      placeholder="例: コーヒー1杯無料"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg transition duration-200"
                  >
                    作成
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowTemplateForm(false)}
                    className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg transition duration-200"
                  >
                    キャンセル
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template) => (
              <div key={template.id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition duration-200">
                <div className="h-32 bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center">
                  <img src={template.imageUrl} alt={template.name} className="h-24 w-24 object-cover rounded" />
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-gray-900 mb-2">{template.name}</h3>
                  <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                  <div className="mb-3 text-sm">
                    <p className="text-gray-700">
                      <span className="font-semibold">最大スタンプ:</span> {template.maxStamps}個
                    </p>
                    <p className="text-gray-700">
                      <span className="font-semibold">報酬:</span> {template.rewardDescription}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button className="flex-1 p-2 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-lg transition flex items-center justify-center gap-2">
                      <Edit2 className="w-4 h-4" />
                      編集
                    </button>
                    <button
                      onClick={() => deleteTemplate(template.id)}
                      className="flex-1 p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition flex items-center justify-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      削除
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 完了した支払いセッション一覧 */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">支払い完了一覧</h2>
          {completedPayments.length === 0 ? (
            <div className="bg-white rounded-xl shadow-lg p-8 text-center">
              <p className="text-gray-500">完了した支払いセッションはありません</p>
            </div>
          ) : (
            <div className="space-y-4">
              {completedPayments.map((payment) => (
                <div key={payment.id} className="bg-white rounded-xl shadow-lg p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 mb-2">{payment.amount} {payment.currency} - {payment.chainName}</h3>
                      <p className="text-sm text-gray-600 mb-2">決済日: {payment.detectedAt}</p>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-600">支払者アドレス</p>
                        <p className="text-xs font-mono text-gray-700 break-all mt-1">
                          {payment.payerAddress}
                        </p>
                      </div>
                    </div>
                    <div className="ml-4">
                      <select
                        defaultValue=""
                        onChange={(e) => {
                          if (e.target.value) {
                            const event = new Event('submit') as any;
                            issueSBT(event, payment.id);
                            e.target.value = ''; // リセット
                          }
                        }}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 text-sm"
                      >
                        <option value="">SBT発行...</option>
                        {templates.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SBT発行 */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">SBT発行</h2>
            <button
              onClick={() => setShowIssuanceForm(!showIssuanceForm)}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg transition duration-200"
            >
              <Send className="w-5 h-5" />
              新規発行
            </button>
          </div>

          {showIssuanceForm && (
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <form onSubmit={issueSBT} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">テンプレート選択</label>
                  <select
                    value={newIssuance.templateId}
                    onChange={(e) => setNewIssuance({ ...newIssuance, templateId: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  >
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">支払い元ウォレットアドレス</label>
                  <input
                    type="text"
                    value={walletAddress || ''}
                    disabled
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {walletAddress 
                      ? 'ウォレットから接続されているアドレスが自動的に使用されます'
                      : 'ウォレットを接続してください'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={!walletAddress}
                    className={`flex-1 font-bold py-2 px-4 rounded-lg transition duration-200 ${
                      walletAddress
                        ? 'bg-purple-600 hover:bg-purple-700 text-white'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    発行
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowIssuanceForm(false)}
                    className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg transition duration-200"
                  >
                    キャンセル
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="space-y-4">
            {issuedSBTs.map((sbt) => (
              <div key={sbt.id} className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition duration-200">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 mb-1">{sbt.templateName}</h3>
                    <p className="text-sm text-gray-600">ID: {sbt.id}</p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      sbt.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {sbt.status === 'active' ? '有効' : '報酬獲得'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-600">ウォレット</p>
                    <p className="font-semibold text-gray-900">{sbt.recipientAddress}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">スタンプ進捗</p>
                    <p className="font-semibold text-gray-900">
                      {sbt.currentStamps} / {sbt.maxStamps}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">発行日</p>
                    <p className="font-semibold text-gray-900">{sbt.issuedAt}</p>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-purple-600 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${(sbt.currentStamps / sbt.maxStamps) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SBTManagement;
