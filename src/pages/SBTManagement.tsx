import React, { useState, useEffect } from 'react';
import { Award, Plus, Edit2, Trash2, Send, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import { useWallet } from '../context/WalletContext';
import { sbtStorage } from '../utils/storage';
import { mintSBT, getBlockExplorerUrl } from '../utils/sbtMinting';
import { NETWORKS } from '../config/networks';
import SBTCard from '../components/SBTCard';

type IssuePattern = 'per_payment' | 'after_count' | 'time_period' | 'period_range';

interface SBTTemplate {
  id: string;
  name: string;
  description: string;
  issuePattern: IssuePattern; // 'per_payment': 毎回発行 | 'after_count': N回後に発行 | 'time_period': 期間内に発行 | 'period_range': 期間指定
  maxStamps: number; // after_countパターンの場合は達成条件回数
  timePeriodDays?: number; // time_periodパターンの場合、発行対象期間（日数）
  periodStartDate?: string; // period_rangeパターンの場合、開始日（YYYY-MM-DD）
  periodEndDate?: string; // period_rangeパターンの場合、終了日（YYYY-MM-DD）
  rewardDescription: string;
  imageUrl: string; // Base64 または JPEG BLOB
  imageMimeType: string; // 'image/jpeg' など
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
  sbtTransactionHash?: string; // ⭐ SBT発行トランザクションハッシュ（ブロックチェーン記録）
  sbtMintStatus?: 'pending' | 'success' | 'failed'; // SBT mint ステータス
  chainId?: number; // SBT が発行されたチェーンID
}

const SBTManagement: React.FC = () => {
  const { address: walletAddress, chainId: currentChainId } = useWallet();
  const [templates, setTemplates] = useState<SBTTemplate[]>([
    {
      id: 'template-stamp-card',
      name: 'スタンプカード',
      description: '毎回の支払いでスタンプを1つ獲得',
      issuePattern: 'per_payment',
      maxStamps: 10,
      rewardDescription: 'スタンプ1個',
      imageUrl: '/sbt-images/visit-memorial.png',
      imageMimeType: 'image/png',
      createdAt: '2025-11-14',
      status: 'active',
    },
    {
      id: 'template-milestone',
      name: 'マイルストーン達成',
      description: '10回の支払い達成時にバッジを授与',
      issuePattern: 'after_count',
      maxStamps: 10,
      rewardDescription: 'ゴールド会員バッジ',
      imageUrl: '/sbt-images/milestone-10x.png',
      imageMimeType: 'image/png',
      createdAt: '2025-11-14',
      status: 'active',
    },
    {
      id: 'template-campaign',
      name: 'キャンペーン記念',
      description: 'キャンペーン期間内（30日）の支払いで期間限定メダルを取得',
      issuePattern: 'time_period',
      maxStamps: 5,
      timePeriodDays: 30,
      rewardDescription: 'キャンペーン記念メダル',
      imageUrl: '/sbt-images/campaign-limited.png',
      imageMimeType: 'image/png',
      createdAt: '2025-11-14',
      status: 'active',
    },
  ]);

  const [issuedSBTs, setIssuedSBTs] = useState<IssuedSBT[]>([]);

  const [newTemplate, setNewTemplate] = useState({
    name: '',
    description: '',
    issuePattern: 'per_payment' as IssuePattern,
    maxStamps: 10,
    timePeriodDays: 30,
    periodStartDate: '',
    periodEndDate: '',
    rewardDescription: '',
    imageUrl: '',
    imageMimeType: 'image/jpeg',
  });
  const [imagePreview, setImagePreview] = useState<string>('');

  const [newIssuance, setNewIssuance] = useState({
    templateId: templates[0]?.id || '',
    recipientAddress: '',
  });

  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [showIssuanceForm, setShowIssuanceForm] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [completedPayments, setCompletedPayments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // マウント時: IndexedDB + localStorage からデータを読み込み
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        
        // テンプレートを読み込み
        const savedTemplates = await sbtStorage.getAllTemplates();
        if (savedTemplates.length > 0) {
          setTemplates(savedTemplates);
          console.log(`✅ ${savedTemplates.length}個のテンプレートをロード`);
        }

        // 発行済み SBT を読み込み
        const savedSBTs = await sbtStorage.getAllSBTs();
        if (savedSBTs.length > 0) {
          setIssuedSBTs(savedSBTs);
          console.log(`✅ ${savedSBTs.length}個の SBT をロード`);
        }

        // 完了した支払いセッションを読み込み
        const completedPayments = localStorage.getItem('completedPaymentSessions');
        if (completedPayments) {
          setCompletedPayments(JSON.parse(completedPayments));
        }
      } catch (error) {
        console.error('データロードエラー:', error);
        toast.error('データの読み込みに失敗しました');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

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

  // 画像ファイルアップロード処理
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // ファイルサイズチェック（3MB以下）
    if (file.size > 3 * 1024 * 1024) {
      toast.error('画像サイズは3MB以下にしてください');
      return;
    }

    // ファイル形式チェック（JPEG/PNG）
    if (!file.type.includes('jpeg') && !file.type.includes('png')) {
      toast.error('JPEGまたはPNG形式の画像をアップロードしてください');
      return;
    }

    // Base64 に変換
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64String = event.target?.result as string;
      setNewTemplate({
        ...newTemplate,
        imageUrl: base64String,
        imageMimeType: file.type,
      });
      setImagePreview(base64String);
      toast.success('画像をアップロードしました');
    };
    reader.readAsDataURL(file);
  };

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
    if (!newTemplate.name || !newTemplate.description || !newTemplate.imageUrl) {
      toast.error('必須項目を入力してください（画像も必須です）');
      return;
    }

    // 発行パターンのバリデーション
    if (newTemplate.issuePattern === 'after_count' && newTemplate.maxStamps < 2) {
      toast.error('N回後パターンの場合、2回以上を指定してください');
      return;
    }

    if (newTemplate.issuePattern === 'period_range') {
      if (!newTemplate.periodStartDate || !newTemplate.periodEndDate) {
        toast.error('期間指定パターンの場合、開始日と終了日を入力してください');
        return;
      }
      if (new Date(newTemplate.periodStartDate) >= new Date(newTemplate.periodEndDate)) {
        toast.error('終了日は開始日より後の日付にしてください');
        return;
      }
    }

    handleTemplateFormSubmit(e);
  };

  const deleteTemplate = (id: string) => {
    // 削除対象テンプレートから発行された SBT を確認
    const relatedSBTs = issuedSBTs.filter((sbt) => sbt.templateId === id);
    const completedSBTs = relatedSBTs.filter((sbt) => sbt.status === 'redeemed');

    // ⭐ 完了済み SBT がある場合は削除を阻止
    if (completedSBTs.length > 0) {
      toast.error(
        `❌ 削除できません\n${completedSBTs.length}件の完了済みSBTが存在します。\n完了済みSBTがあるテンプレートは削除できません。`,
        { duration: 5000 }
      );
      return;
    }

    setTemplates(templates.filter((t) => t.id !== id));
    
    // IndexedDB + localStorage から削除
    sbtStorage.deleteTemplate(id).catch(err => {
      console.error('テンプレート削除エラー:', err);
      toast.error('テンプレートの削除に失敗しました');
    });

    toast.success('テンプレートを削除しました');
  };

  // ⭐ テンプレートを編集モードで開く
  const editTemplate = (template: SBTTemplate) => {
    setNewTemplate({
      name: template.name,
      description: template.description,
      issuePattern: template.issuePattern,
      maxStamps: template.maxStamps,
      timePeriodDays: template.timePeriodDays || 30,
      periodStartDate: template.periodStartDate || '',
      periodEndDate: template.periodEndDate || '',
      rewardDescription: template.rewardDescription,
      imageUrl: template.imageUrl,
      imageMimeType: template.imageMimeType,
    });
    setImagePreview(template.imageUrl);
    setEditingTemplateId(template.id);
    setShowTemplateForm(true);
  };

  // ⭐ テンプレートを編集保存（上書き）
  const saveTemplateEdit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newTemplate.name.trim()) {
      toast.error('テンプレート名を入力してください');
      return;
    }

    if (!newTemplate.imageUrl) {
      toast.error('画像をアップロードしてください');
      return;
    }

    if (editingTemplateId) {
      // 既存テンプレートを更新
      const updatedTemplates = templates.map((t) =>
        t.id === editingTemplateId
          ? {
              ...t,
              name: newTemplate.name,
              description: newTemplate.description,
              issuePattern: newTemplate.issuePattern,
              maxStamps: newTemplate.maxStamps,
              timePeriodDays: newTemplate.issuePattern === 'time_period' ? (newTemplate.timePeriodDays || 30) : undefined,
              periodStartDate: newTemplate.issuePattern === 'period_range' ? newTemplate.periodStartDate : undefined,
              periodEndDate: newTemplate.issuePattern === 'period_range' ? newTemplate.periodEndDate : undefined,
              rewardDescription: newTemplate.rewardDescription,
              imageUrl: newTemplate.imageUrl,
              imageMimeType: newTemplate.imageMimeType,
            }
          : t
      );
      setTemplates(updatedTemplates);

      // IndexedDB に保存
      await sbtStorage.saveTemplate(updatedTemplates.find((t) => t.id === editingTemplateId)!);
      
      toast.success('テンプレートを更新しました');
      setEditingTemplateId(null);
    }

    // フォームをリセット
    setNewTemplate({
      name: '',
      description: '',
      issuePattern: 'per_payment' as IssuePattern,
      maxStamps: 10,
      timePeriodDays: 30,
      periodStartDate: '',
      periodEndDate: '',
      rewardDescription: '',
      imageUrl: '',
      imageMimeType: 'image/jpeg',
    });
    setImagePreview('');
    setShowTemplateForm(false);
  };

  // ⭐ テンプレートをコピーして新規作成
  const copyTemplateAsNew = (template: SBTTemplate) => {
    setNewTemplate({
      name: `${template.name} (コピー)`,
      description: template.description,
      issuePattern: template.issuePattern,
      maxStamps: template.maxStamps,
      timePeriodDays: template.timePeriodDays || 30,
      periodStartDate: template.periodStartDate || '',
      periodEndDate: template.periodEndDate || '',
      rewardDescription: template.rewardDescription,
      imageUrl: template.imageUrl,
      imageMimeType: template.imageMimeType,
    });
    setImagePreview(template.imageUrl);
    setEditingTemplateId(null);  // 新規作成モード
    setShowTemplateForm(true);
  };

  // ⭐ テンプレート追加フォームの送信を改変
  const handleTemplateFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newTemplate.name.trim()) {
      toast.error('テンプレート名を入力してください');
      return;
    }

    if (!newTemplate.imageUrl) {
      toast.error('画像をアップロードしてください');
      return;
    }

    if (editingTemplateId) {
      // 編集保存
      await saveTemplateEdit(e);
    } else {
      // 新規作成（コピーも含む）
      const newTemplateData: SBTTemplate = {
        id: `template-${Date.now()}`,
        name: newTemplate.name,
        description: newTemplate.description,
        issuePattern: newTemplate.issuePattern,
        maxStamps: newTemplate.maxStamps,
        timePeriodDays: newTemplate.timePeriodDays,
        periodStartDate: newTemplate.periodStartDate,
        periodEndDate: newTemplate.periodEndDate,
        rewardDescription: newTemplate.rewardDescription,
        imageUrl: newTemplate.imageUrl,
        imageMimeType: newTemplate.imageMimeType,
        createdAt: new Date().toISOString().split('T')[0],
        status: 'active',
      };

      const updatedTemplates = [newTemplateData, ...templates];
      setTemplates(updatedTemplates);

      // IndexedDB に保存
      await sbtStorage.saveTemplate(newTemplateData);

      // フォームをリセット
      setNewTemplate({
        name: '',
        description: '',
        issuePattern: 'per_payment' as IssuePattern,
        maxStamps: 10,
        timePeriodDays: 30,
        periodStartDate: '',
        periodEndDate: '',
        rewardDescription: '',
        imageUrl: '',
        imageMimeType: 'image/jpeg',
      });
      setImagePreview('');
      setShowTemplateForm(false);
      toast.success(editingTemplateId ? 'テンプレートを更新しました' : 'テンプレートを作成しました');
    }
  };

  const issueSBT = async (e: React.FormEvent, selectedPaymentId?: string) => {
    e.preventDefault();

    const template = templates.find((t) => t.id === newIssuance.templateId);
    if (!template) {
      toast.error('テンプレートが見つかりません');
      return;
    }

    // 期間指定パターンの場合、現在の日付が期間内かチェック
    if (template.issuePattern === 'period_range') {
      const now = new Date();
      const startDate = new Date(template.periodStartDate || '');
      const endDate = new Date(template.periodEndDate || '');
      
      if (now < startDate || now > endDate) {
        const periodStr = `${template.periodStartDate} ～ ${template.periodEndDate}`;
        toast.error(`このテンプレートは指定期間（${periodStr}）内でのみ発行できます`);
        return;
      }
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

    // 基本的な SBT オブジェクトを作成
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
      sbtMintStatus: 'pending',
      chainId: currentChainId || undefined,
    };

    // UI に一度表示
    setIssuedSBTs([sbt, ...issuedSBTs]);
    setNewIssuance({ templateId: templates[0]?.id || '', recipientAddress: '' });
    setShowIssuanceForm(false);

    // ⭐ ブロックチェーンに mint（非同期）
    const mintingToast = toast.loading('🔄 SBT をブロックチェーンに記録中...');

    try {
      // tokenURI は base64 イメージそのもの
      const tokenURI = template.imageUrl;

      if (!currentChainId) {
        toast.error('ネットワークを接続してください', { id: mintingToast });
        return;
      }

      // SBT mint 実行
      const result = await mintSBT({
        recipientAddress,
        shopId: 1, // TODO: 実装で適切な shopId を使用
        tokenURI,
        chainId: currentChainId,
      });

      if (result.success && result.transactionHash) {
        // ✅ mint 成功
        sbt.sbtTransactionHash = result.transactionHash;
        sbt.sbtMintStatus = 'success';
        
        // IndexedDB に保存
        await sbtStorage.saveSBT(sbt);

        // 表示を更新
        setIssuedSBTs(prev =>
          prev.map(s => (s.id === sbt.id ? sbt : s))
        );

        toast.success(
          `✅ SBT をブロックチェーンに記録しました！\nTx: ${result.transactionHash.slice(0, 10)}...`,
          { id: mintingToast }
        );
      } else {
        // ❌ mint 失敗
        sbt.sbtMintStatus = 'failed';
        await sbtStorage.saveSBT(sbt);
        setIssuedSBTs(prev =>
          prev.map(s => (s.id === sbt.id ? sbt : s))
        );

        toast.error(
          `❌ SBT 記録失敗: ${result.error || 'Unknown error'}`,
          { id: mintingToast }
        );
      }
    } catch (error: any) {
      // エラーハンドリング
      sbt.sbtMintStatus = 'failed';
      await sbtStorage.saveSBT(sbt);
      setIssuedSBTs(prev =>
        prev.map(s => (s.id === sbt.id ? sbt : s))
      );

      console.error('SBT mint エラー:', error);
      toast.error(
        `SBT 記録エラー: ${error.message || 'Unknown error'}`,
        { id: mintingToast }
      );
    }
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
              onClick={() => {
                if (editingTemplateId) {
                  setEditingTemplateId(null);
                  setImagePreview('');
                  setNewTemplate({
                    name: '',
                    description: '',
                    issuePattern: 'per_payment' as IssuePattern,
                    maxStamps: 10,
                    timePeriodDays: 30,
                    periodStartDate: '',
                    periodEndDate: '',
                    rewardDescription: '',
                    imageUrl: '',
                    imageMimeType: 'image/jpeg',
                  });
                }
                setShowTemplateForm(!showTemplateForm);
              }}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg transition duration-200"
            >
              <Plus className="w-5 h-5" />
              {editingTemplateId ? '編集をキャンセル' : '新規作成'}
            </button>
          </div>

          {showTemplateForm && (
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <form onSubmit={addTemplate} className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900">
                    {editingTemplateId ? '✏️ テンプレート編集' : '➕ 新規テンプレート作成'}
                  </h3>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">テンプレート名 <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={newTemplate.name}
                    onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                    placeholder="例: コーヒーカード"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">説明 <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={newTemplate.description}
                    onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                    placeholder="例: 毎回の支払いでスタンプ付与"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">SBT画像 <span className="text-red-500">*</span></label>
                  <p className="text-xs text-gray-500 mb-2">512px × 512px の JPEG 画像をアップロード（最大3MB）</p>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <input
                        type="file"
                        accept="image/jpeg,image/png"
                        onChange={handleImageUpload}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">PNG/JPEG ファイルをサポート</p>
                    </div>
                    {imagePreview && (
                      <div className="flex-shrink-0">
                        <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-purple-400 flex items-center justify-center bg-gray-100">
                          <img src={imagePreview} alt="preview" className="w-full h-full object-cover" />
                        </div>
                        {editingTemplateId && (
                          <button
                            type="button"
                            onClick={() => {
                              setImagePreview('');
                              setNewTemplate({ ...newTemplate, imageUrl: '' });
                            }}
                            className="text-xs text-red-600 mt-1 hover:text-red-800"
                          >
                            画像変更
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">発行パターン <span className="text-red-500">*</span></label>
                  <select
                    value={newTemplate.issuePattern}
                    onChange={(e) => setNewTemplate({ ...newTemplate, issuePattern: e.target.value as IssuePattern })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="per_payment">毎回発行 - 支払いの度にSBTを発行</option>
                    <option value="after_count">N回後発行 - 指定回数の支払い達成時に発行</option>
                    <option value="time_period">期間内発行 - 指定期間内の支払いで発行（固定30日）</option>
                    <option value="period_range">期間指定発行 - 開始日～終了日を自由に指定</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {newTemplate.issuePattern === 'per_payment' && 'スタンプ最大数'}
                      {newTemplate.issuePattern === 'after_count' && '達成条件回数'}
                      {newTemplate.issuePattern === 'time_period' && 'スタンプ最大数'}
                      {newTemplate.issuePattern === 'period_range' && 'スタンプ最大数'}
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={newTemplate.maxStamps}
                      onChange={(e) => setNewTemplate({ ...newTemplate, maxStamps: parseInt(e.target.value) || 1 })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {newTemplate.issuePattern === 'per_payment' && '例: 10回でカード完成'}
                      {newTemplate.issuePattern === 'after_count' && '例: 10回支払ったらSBT発行'}
                      {newTemplate.issuePattern === 'time_period' && '例: 期間内に達成したらSBT発行'}
                      {newTemplate.issuePattern === 'period_range' && '例: 期間指定内の支払いでSBT発行'}
                    </p>
                  </div>
                  {newTemplate.issuePattern === 'time_period' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">有効期間（日数）</label>
                      <input
                        type="number"
                        min="1"
                        value={newTemplate.timePeriodDays || 30}
                        onChange={(e) => setNewTemplate({ ...newTemplate, timePeriodDays: parseInt(e.target.value) || 30 })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">例: 30日間のキャンペーン</p>
                    </div>
                  )}
                  {newTemplate.issuePattern === 'period_range' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">キャンペーン開始日</label>
                      <input
                        type="date"
                        value={newTemplate.periodStartDate}
                        onChange={(e) => setNewTemplate({ ...newTemplate, periodStartDate: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  )}
                  {newTemplate.issuePattern !== 'time_period' && newTemplate.issuePattern !== 'period_range' && (
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
                  )}
                </div>
                {newTemplate.issuePattern === 'period_range' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">キャンペーン終了日</label>
                    <input
                      type="date"
                      value={newTemplate.periodEndDate}
                      onChange={(e) => setNewTemplate({ ...newTemplate, periodEndDate: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                )}
                {newTemplate.issuePattern === 'time_period' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">報酬内容</label>
                    <input
                      type="text"
                      value={newTemplate.rewardDescription}
                      onChange={(e) => setNewTemplate({ ...newTemplate, rewardDescription: e.target.value })}
                      placeholder="例: キャンペーン期間内の支払いで特別SBT"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                )}
                {newTemplate.issuePattern === 'period_range' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">報酬内容</label>
                    <input
                      type="text"
                      value={newTemplate.rewardDescription}
                      onChange={(e) => setNewTemplate({ ...newTemplate, rewardDescription: e.target.value })}
                      placeholder="例: 期間指定キャンペーンの特別SBT"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg transition duration-200"
                  >
                    {editingTemplateId ? '✅ 更新保存' : '➕ 作成'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowTemplateForm(false);
                      setEditingTemplateId(null);
                      setImagePreview('');
                      setNewTemplate({
                        name: '',
                        description: '',
                        issuePattern: 'per_payment' as IssuePattern,
                        maxStamps: 10,
                        timePeriodDays: 30,
                        periodStartDate: '',
                        periodEndDate: '',
                        rewardDescription: '',
                        imageUrl: '',
                        imageMimeType: 'image/jpeg',
                      });
                    }}
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
                  {template.imageUrl ? (
                    <img src={template.imageUrl} alt={template.name} className="h-24 w-24 object-cover rounded-full border-2 border-white" />
                  ) : (
                    <Award className="w-24 h-24 text-white opacity-50" />
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-gray-900 mb-1">{template.name}</h3>
                  <p className="text-xs text-gray-500 mb-2">{template.description}</p>
                  <div className="mb-3 text-sm space-y-1">
                    <div className="px-2 py-1 bg-blue-50 rounded text-blue-700 text-xs font-medium">
                      {template.issuePattern === 'per_payment' && '🎁 毎回発行'}
                      {template.issuePattern === 'after_count' && `🔢 ${template.maxStamps}回後発行`}
                      {template.issuePattern === 'time_period' && `📅 ${template.timePeriodDays}日間キャンペーン`}
                      {template.issuePattern === 'period_range' && `📅 ${template.periodStartDate} ～ ${template.periodEndDate}`}
                    </div>
                    <p className="text-gray-700">
                      <span className="font-semibold">スタンプ最大:</span> {template.maxStamps}個
                    </p>
                    {template.rewardDescription && (
                      <p className="text-gray-700">
                        <span className="font-semibold">報酬:</span> {template.rewardDescription}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => editTemplate(template)}
                      className="flex-1 p-2 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-lg transition flex items-center justify-center gap-2"
                    >
                      <Edit2 className="w-4 h-4" />
                      編集
                    </button>
                    <button
                      onClick={() => copyTemplateAsNew(template)}
                      className="flex-1 p-2 bg-green-100 hover:bg-green-200 text-green-600 rounded-lg transition flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      コピー
                    </button>
                    <button
                      onClick={() => deleteTemplate(template.id)}
                      disabled={issuedSBTs.some((sbt) => sbt.templateId === template.id && sbt.status === 'redeemed')}
                      className={`flex-1 p-2 rounded-lg transition flex items-center justify-center gap-2 ${
                        issuedSBTs.some((sbt) => sbt.templateId === template.id && sbt.status === 'redeemed')
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-red-100 hover:bg-red-200 text-red-600'
                      }`}
                      title={
                        issuedSBTs.some((sbt) => sbt.templateId === template.id && sbt.status === 'redeemed')
                          ? '完了済みSBTがあるため削除できません'
                          : ''
                      }
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

          {/* 統計ダッシュボード */}
          {issuedSBTs.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-bold text-gray-900 mb-4">📊 発行・配布統計ダッシュボード</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4">
                  <p className="text-xs text-gray-600 font-medium mb-1">配布総数</p>
                  <p className="text-3xl font-bold text-blue-600">{issuedSBTs.length}</p>
                  <p className="text-xs text-gray-600 mt-2">{new Set(issuedSBTs.map(s => s.recipientAddress)).size}個の異なるウォレット</p>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-4">
                  <p className="text-xs text-gray-600 font-medium mb-1">有効SBT</p>
                  <p className="text-3xl font-bold text-green-600">{issuedSBTs.filter(s => s.status === 'active').length}</p>
                  <p className="text-xs text-gray-600 mt-2">進行中</p>
                </div>
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-lg p-4">
                  <p className="text-xs text-gray-600 font-medium mb-1">報酬獲得済み</p>
                  <p className="text-3xl font-bold text-orange-600">{issuedSBTs.filter(s => s.status === 'redeemed').length}</p>
                  <p className="text-xs text-gray-600 mt-2">完了</p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-4">
                  <p className="text-xs text-gray-600 font-medium mb-1">スタンプ集計</p>
                  <p className="text-3xl font-bold text-purple-600">
                    {issuedSBTs.reduce((sum, s) => sum + s.currentStamps, 0)}/{issuedSBTs.reduce((sum, s) => sum + s.maxStamps, 0)}
                  </p>
                  <p className="text-xs text-gray-600 mt-2">
                    {Math.round((issuedSBTs.reduce((sum, s) => sum + s.currentStamps, 0) / issuedSBTs.reduce((sum, s) => sum + s.maxStamps, 0)) * 100)}% 進捗
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 配布先ウォレット統計セクション */}
          {issuedSBTs.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-bold text-gray-900 mb-4">👛 配布先ウォレット統計</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(
                  issuedSBTs.reduce((acc, sbt) => {
                    const addr = sbt.recipientAddress;
                    if (!acc[addr]) {
                      acc[addr] = {
                        address: addr,
                        totalSBTs: 0,
                        activeSBTs: 0,
                        redeemedSBTs: 0,
                        totalStamps: 0,
                        maxStamps: 0,
                      };
                    }
                    acc[addr].totalSBTs += 1;
                    acc[addr].totalStamps += sbt.currentStamps;
                    acc[addr].maxStamps += sbt.maxStamps;
                    if (sbt.status === 'active') acc[addr].activeSBTs += 1;
                    if (sbt.status === 'redeemed') acc[addr].redeemedSBTs += 1;
                    return acc;
                  }, {} as Record<string, any>)
                ).map(([address, stats]) => (
                  <div key={address} className="bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4">
                    <div className="mb-3">
                      <p className="text-xs text-gray-600 font-medium mb-1">ウォレットアドレス</p>
                      <p className="font-mono text-xs text-gray-900 break-all">{address}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white rounded p-2">
                        <p className="text-xs text-gray-600">SBT総数</p>
                        <p className="text-lg font-bold text-purple-600">{stats.totalSBTs}</p>
                      </div>
                      <div className="bg-white rounded p-2">
                        <p className="text-xs text-gray-600">有効</p>
                        <p className="text-lg font-bold text-green-600">{stats.activeSBTs}</p>
                      </div>
                      <div className="bg-white rounded p-2">
                        <p className="text-xs text-gray-600">報酬獲得</p>
                        <p className="text-lg font-bold text-blue-600">{stats.redeemedSBTs}</p>
                      </div>
                      <div className="bg-white rounded p-2">
                        <p className="text-xs text-gray-600">スタンプ合計</p>
                        <p className="text-sm font-bold text-orange-600">{stats.totalStamps}/{stats.maxStamps}</p>
                      </div>
                    </div>
                    <div className="mt-3">
                      <p className="text-xs text-gray-600 mb-1">進捗</p>
                      <div className="w-full bg-gray-300 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all"
                          style={{ width: `${(stats.totalStamps / stats.maxStamps) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* テンプレート別発行統計 */}
          {issuedSBTs.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-bold text-gray-900 mb-4">🎯 テンプレート別発行統計</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.from(new Set(issuedSBTs.map(s => s.templateId)))
                  .map(templateId => {
                    const template = templates.find(t => t.id === templateId);
                    const sbtsForTemplate = issuedSBTs.filter(s => s.templateId === templateId);
                    const activeSBTs = sbtsForTemplate.filter(s => s.status === 'active').length;
                    const redeemedSBTs = sbtsForTemplate.filter(s => s.status === 'redeemed').length;
                    const totalStamps = sbtsForTemplate.reduce((sum, s) => sum + s.currentStamps, 0);
                    const maxStamps = sbtsForTemplate.reduce((sum, s) => sum + s.maxStamps, 0);
                    
                    return (
                      <div key={templateId} className="bg-white border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-bold text-gray-900">{template?.name}</h4>
                            <p className="text-xs text-gray-500 mt-1">{template?.description}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-purple-600">{sbtsForTemplate.length}</p>
                            <p className="text-xs text-gray-600">配布済み</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
                          <div className="bg-green-50 rounded p-2">
                            <p className="text-gray-600">有効</p>
                            <p className="font-bold text-green-600">{activeSBTs}</p>
                          </div>
                          <div className="bg-blue-50 rounded p-2">
                            <p className="text-gray-600">完了</p>
                            <p className="font-bold text-blue-600">{redeemedSBTs}</p>
                          </div>
                          <div className="bg-orange-50 rounded p-2">
                            <p className="text-gray-600">スタンプ</p>
                            <p className="font-bold text-orange-600">{totalStamps}/{maxStamps}</p>
                          </div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-purple-500 to-purple-600 h-2 rounded-full"
                            style={{ width: `${(totalStamps / maxStamps) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })
                }
              </div>
            </div>
          )}

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

          <div className="space-y-6">
            {issuedSBTs.length === 0 ? (
              <div className="bg-white rounded-xl shadow-lg p-8 text-center">
                <Award className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">発行済みのSBTはまだありません</p>
              </div>
            ) : (
              <>
                {/* PC向けテーブルビュー */}
                <div className="hidden lg:block bg-white rounded-xl shadow-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
                          <th className="px-6 py-3 text-left text-sm font-semibold">配布先ウォレット</th>
                          <th className="px-6 py-3 text-left text-sm font-semibold">SBT名</th>
                          <th className="px-6 py-3 text-center text-sm font-semibold">スタンプ</th>
                          <th className="px-6 py-3 text-center text-sm font-semibold">発行日</th>
                          <th className="px-6 py-3 text-center text-sm font-semibold">ステータス</th>
                          <th className="px-6 py-3 text-center text-sm font-semibold">進捗</th>
                        </tr>
                      </thead>
                      <tbody>
                        {issuedSBTs.map((sbt, idx) => (
                          <tr
                            key={sbt.id}
                            className={`border-b ${
                              idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                            } hover:bg-purple-50 transition`}
                          >
                            <td className="px-6 py-4 text-sm font-mono text-gray-900">
                              <div className="truncate" title={sbt.recipientAddress}>
                                {sbt.recipientAddress.slice(0, 12)}...{sbt.recipientAddress.slice(-8)}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm font-medium text-gray-900">
                              {sbt.templateName}
                            </td>
                            <td className="px-6 py-4 text-sm text-center">
                              <span className="inline-block bg-orange-100 text-orange-800 px-3 py-1 rounded-full font-semibold">
                                {sbt.currentStamps}/{sbt.maxStamps}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-center text-gray-600">
                              {sbt.issuedAt}
                            </td>
                            <td className="px-6 py-4 text-sm text-center">
                              <span
                                className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                                  sbt.status === 'active'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-blue-100 text-blue-800'
                                }`}
                              >
                                {sbt.status === 'active' ? '有効' : '報酬獲得'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="w-24 bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-gradient-to-r from-purple-500 to-purple-600 h-2 rounded-full"
                                  style={{ width: `${(sbt.currentStamps / sbt.maxStamps) * 100}%` }}
                                ></div>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* タブレット・スマホ向けカードビュー */}
                <div className="lg:hidden space-y-6">
                  {/* ウォレットアドレス単位でグループ化 */}
                  {Object.entries(
                    issuedSBTs.reduce((acc, sbt) => {
                      const addr = sbt.recipientAddress;
                      if (!acc[addr]) acc[addr] = [];
                      acc[addr].push(sbt);
                      return acc;
                    }, {} as Record<string, IssuedSBT[]>)
                  ).map(([address, sbtsForAddress]) => (
                    <div key={address} className="space-y-4">
                      <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl px-6 py-4 text-white">
                        <h3 className="font-bold text-lg mb-1">ウォレット</h3>
                        <p className="font-mono text-sm break-all">{address}</p>
                      </div>
                      <div className="space-y-4">
                        {sbtsForAddress.map((sbt) => (
                          <SBTCard key={sbt.id} sbt={sbt} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SBTManagement;
