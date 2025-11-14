import React, { useState } from 'react';
import { ChevronDown, HelpCircle, Database, Lock, RefreshCw, TrendingUp, Calendar, Settings } from 'lucide-react';

interface FAQItem {
  id: string;
  category: 'データ管理' | 'SBT発行' | 'セキュリティ' | '確認・レポート';
  question: string;
  answer: React.ReactNode;
  icon: React.ReactNode;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    id: 'data-storage',
    category: 'データ管理',
    question: 'SBTテンプレートと発行データはどこに保存されていますか？',
    answer: (
      <div className="space-y-3 text-sm">
        <p><strong>📍 保存場所：</strong> あなたのパソコン/タブレット/スマートフォンのローカルストレージ</p>
        <div className="bg-blue-50 border border-blue-200 rounded p-3">
          <p className="font-semibold text-blue-900 mb-2">🗄️ 具体的には：</p>
          <ul className="space-y-1 text-blue-800">
            <li>• <strong>IndexedDB</strong>：テンプレート・SBT発行データ（主要）</li>
            <li>• <strong>localStorage</strong>：バックアップ・設定情報</li>
            <li>• 容量：50MB～数GB（デバイス依存）</li>
          </ul>
        </div>
        <p className="text-gray-600"><strong>✅ メリット：</strong> サーバーなし、ユーザー管理不要、完全にあなたの管理下</p>
        <p className="text-gray-600"><strong>⚠️ 注意：</strong> アプリ削除時にデータも削除されます（エクスポート推奨）</p>
      </div>
    ),
    icon: <Database className="w-5 h-5" />,
  },
  {
    id: 'data-persistence',
    category: 'データ管理',
    question: 'インターネット接続なしでデータは保存されますか？',
    answer: (
      <div className="space-y-3 text-sm">
        <p><strong>✅ はい、完全に保存されます</strong></p>
        <div className="bg-green-50 border border-green-200 rounded p-3 space-y-2">
          <p className="font-semibold text-green-900">🟢 オフライン動作対応：</p>
          <ul className="text-green-800 space-y-1">
            <li>• テンプレート作成 ✓</li>
            <li>• SBT 発行・管理 ✓</li>
            <li>• QR コード生成 ✓</li>
            <li>• データ表示・検索 ✓</li>
          </ul>
        </div>
        <p className="text-gray-600"><strong>❌ オフラインでは不可：</strong></p>
        <ul className="text-gray-600 space-y-1">
          <li>• ブロックチェーン取引（インターネット接続必須）</li>
          <li>• 新版アプリ更新（接続時に自動更新）</li>
        </ul>
      </div>
    ),
    icon: <RefreshCw className="w-5 h-5" />,
  },
  {
    id: 'multi-device',
    category: 'データ管理',
    question: '複数のパソコン・タブレットで同じデータを使いたい',
    answer: (
      <div className="space-y-3 text-sm">
        <p><strong>📌 データは各デバイスで独立しています</strong></p>
        <p className="text-gray-600">（サーバーがないため、自動同期はできません）</p>
        <div className="bg-yellow-50 border border-yellow-200 rounded p-3 space-y-2">
          <p className="font-semibold text-yellow-900">💡 対策方法：</p>
          <ol className="text-yellow-800 space-y-2">
            <li><strong>1. エクスポート</strong>
              <p className="text-xs">パソコンA → 設定 → データエクスポート → JSON ファイル保存</p>
            </li>
            <li><strong>2. インポート</strong>
              <p className="text-xs">パソコンB → 設定 → データインポート → ファイル選択</p>
            </li>
            <li><strong>3. USB/クラウド共有</strong>
              <p className="text-xs">USB メモリまたは Google Drive で JSON ファイルを共有</p>
            </li>
          </ol>
        </div>
      </div>
    ),
    icon: <TrendingUp className="w-5 h-5" />,
  },
  {
    id: 'sbt-issuance',
    category: 'SBT発行',
    question: 'SBT発行の３つのパターンの違いは？',
    answer: (
      <div className="space-y-3 text-sm">
        <div className="space-y-3">
          <div className="border-l-4 border-purple-500 pl-3 py-2">
            <p className="font-semibold text-purple-700">1️⃣ 毎回発行（per_payment）</p>
            <p className="text-gray-600">支払いのたびに SBT を 1 つずつ発行します</p>
            <p className="text-xs text-gray-500">例：コーヒー購入 → SBT1個発行、また購入 → SBT1個追加発行</p>
          </div>
          <div className="border-l-4 border-blue-500 pl-3 py-2">
            <p className="font-semibold text-blue-700">2️⃣ N回後発行（after_count）</p>
            <p className="text-gray-600">決められた回数の支払いに達したら SBT を 1 つ発行</p>
            <p className="text-xs text-gray-500">例：10回購入したらスタンプカード進呈 → SBT1個発行</p>
          </div>
          <div className="border-l-4 border-green-500 pl-3 py-2">
            <p className="font-semibold text-green-700">3️⃣ 期間内発行（time_period）</p>
            <p className="text-gray-600">指定期間内に支払いがあれば SBT を発行</p>
            <p className="text-xs text-gray-500">例：10月1日～31日 キャンペーン期間内の購入 → SBT発行</p>
          </div>
        </div>
      </div>
    ),
    icon: <Calendar className="w-5 h-5" />,
  },
  {
    id: 'sbt-status',
    category: 'SBT発行',
    question: 'SBTの「有効」と「報酬獲得」の状態の違いは？',
    answer: (
      <div className="space-y-3 text-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="bg-green-50 border border-green-200 rounded p-3">
            <p className="font-semibold text-green-900">🟢 有効（Active）</p>
            <p className="text-green-800 text-xs mt-1">スタンプを集め中の状態</p>
            <p className="text-green-700 text-xs mt-2">例：スタンプ 3/10 進行中</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded p-3">
            <p className="font-semibold text-blue-900">🔵 報酬獲得（Redeemed）</p>
            <p className="text-blue-800 text-xs mt-1">スタンプが満杯になった状態</p>
            <p className="text-blue-700 text-xs mt-2">例：スタンプ 10/10 完了 → 報酬獲得</p>
          </div>
        </div>
      </div>
    ),
    icon: <TrendingUp className="w-5 h-5" />,
  },
  {
    id: 'template-period',
    category: 'SBT発行',
    question: '期間指定テンプレートの設定方法は？',
    answer: (
      <div className="space-y-3 text-sm">
        <p><strong>🗓️ 開始日と終了日を指定するテンプレート</strong></p>
        <div className="bg-purple-50 border border-purple-200 rounded p-3 space-y-2">
          <p className="font-semibold text-purple-900">設定方法：</p>
          <ol className="text-purple-800 space-y-1">
            <li>1. テンプレート作成 → 「発行パターン」で「期間指定」を選択</li>
            <li>2. 「開始日」カレンダーで最初の日を指定</li>
            <li>3. 「終了日」カレンダーで最後の日を指定</li>
            <li>4. この期間内の支払いで SBT が自動発行</li>
          </ol>
        </div>
        <p className="text-gray-600"><strong>例：</strong> 2025年11月14日～2025年12月31日のキャンペーン</p>
      </div>
    ),
    icon: <Calendar className="w-5 h-5" />,
  },
  {
    id: 'sales-history',
    category: 'データ管理',
    question: '売上・決済履歴はどのように記録されますか？',
    answer: (
      <div className="space-y-3 text-sm">
        <p><strong>💳 決済履歴の記録方法</strong></p>
        <div className="bg-indigo-50 border border-indigo-200 rounded p-3 space-y-2">
          <p className="font-semibold text-indigo-900">📊 記録される情報：</p>
          <ul className="text-indigo-800 space-y-1">
            <li>• 決済額（JPYC）</li>
            <li>• 決済日時</li>
            <li>• 顧客ウォレットアドレス（接続している場合）</li>
            <li>• SBT 発行状況（発行済み/未発行）</li>
            <li>• トランザクションハッシュ（ブロックチェーン記録）</li>
          </ul>
        </div>
        <p className="text-gray-600"><strong>📍 保存場所：</strong> IndexedDB（デバイスローカル）</p>
        <p className="text-gray-600"><strong>📤 エクスポート方法：</strong> 設定 → データエクスポート → CSV/JSON 形式</p>
      </div>
    ),
    icon: <Database className="w-5 h-5" />,
  },
  {
    id: 'security',
    category: 'セキュリティ',
    question: 'データは安全に保護されていますか？',
    answer: (
      <div className="space-y-3 text-sm">
        <p><strong>🔐 セキュリティ対策</strong></p>
        <div className="bg-green-50 border border-green-200 rounded p-3 space-y-2">
          <p className="font-semibold text-green-900">✅ 実装済み対策：</p>
          <ul className="text-green-800 space-y-1">
            <li>• ローカルストレージ（サーバー保存なし）</li>
            <li>• IndexedDB 自動暗号化（OS 依存）</li>
            <li>• Service Worker による安全なキャッシング</li>
            <li>• HTTPS 推奨（デプロイ時）</li>
          </ul>
        </div>
        <p className="text-yellow-600 text-xs"><strong>⚠️ 注意：</strong> 秘密鍵管理は MetaMask に委譲されます</p>
      </div>
    ),
    icon: <Lock className="w-5 h-5" />,
  },
  {
    id: 'confirm-issue',
    category: '確認・レポート',
    question: 'SBT の発行状況をどのように確認・管理しますか？',
    answer: (
      <div className="space-y-3 text-sm">
        <p><strong>📊 SBT 発行状況の確認方法</strong></p>
        <div className="space-y-2">
          <div className="bg-blue-50 border border-blue-200 rounded p-3">
            <p className="font-semibold text-blue-900">1️⃣ 配布先ウォレット統計</p>
            <p className="text-blue-800 text-xs">ウォレットアドレス単位で SBT 発行数を集計</p>
            <ul className="text-blue-700 text-xs mt-1">
              <li>• 総 SBT 数</li>
              <li>• 有効な SBT 数</li>
              <li>• 報酬獲得済み SBT 数</li>
              <li>• スタンプ進捗率</li>
            </ul>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded p-3">
            <p className="font-semibold text-purple-900">2️⃣ SBT 詳細リスト</p>
            <p className="text-purple-800 text-xs">個別の SBT を確認・管理</p>
            <ul className="text-purple-700 text-xs mt-1">
              <li>• PC 版：テーブルビューで全体俯瞰</li>
              <li>• スマホ版：ウォレット別カードビュー</li>
              <li>• 各 SBT の詳細情報確認可能</li>
            </ul>
          </div>
          <div className="bg-green-50 border border-green-200 rounded p-3">
            <p className="font-semibold text-green-900">3️⃣ テンプレート別追跡</p>
            <p className="text-green-800 text-xs">各テンプレートで何個の SBT が発行されたか確認</p>
            <ul className="text-green-700 text-xs mt-1">
              <li>• テンプレート発行数</li>
              <li>• 各パターンの発行状況</li>
            </ul>
          </div>
        </div>
      </div>
    ),
    icon: <TrendingUp className="w-5 h-5" />,
  },
  {
    id: 'distribution-status',
    category: '確認・レポート',
    question: 'SBT の配布状況をどのように確認しますか？',
    answer: (
      <div className="space-y-3 text-sm">
        <p><strong>📍 配布状況の確認ポイント</strong></p>
        <div className="space-y-2">
          <div className="border-l-4 border-purple-500 pl-3 py-2">
            <p className="font-semibold">📊 配布先ウォレット統計（SBT管理画面トップ）</p>
            <p className="text-gray-600 text-xs">各ウォレットアドレスに配布された SBT の集計</p>
            <div className="bg-gray-50 p-2 rounded mt-1 text-xs text-gray-700">
              <p>• <strong>ウォレット</strong>：配布先のアドレス</p>
              <p>• <strong>総 SBT：</strong> 配布した SBT 総数</p>
              <p>• <strong>有効：</strong> 進行中の SBT 数</p>
              <p>• <strong>報酬獲得済み：</strong> 完了した SBT 数</p>
              <p>• <strong>進捗：</strong> スタンプ集計と完了率</p>
            </div>
          </div>
          <div className="border-l-4 border-blue-500 pl-3 py-2">
            <p className="font-semibold">📋 SBT 詳細表示</p>
            <p className="text-gray-600 text-xs">統計の下に個別 SBT を表示</p>
            <ul className="text-xs text-gray-700 mt-1">
              <li>• PC：テーブル形式（ウォレット、SBT名、スタンプ、発行日、状態）</li>
              <li>• タブレット：カードビュー（読みやすさ重視）</li>
            </ul>
          </div>
          <div className="border-l-4 border-green-500 pl-3 py-2">
            <p className="font-semibold">🔍 情報確認方法</p>
            <p className="text-gray-600 text-xs">SBT 管理画面で以下の確認が可能</p>
            <ul className="text-xs text-gray-700 mt-1">
              <li>• ウォレット別の SBT 集計</li>
              <li>• 各ウォレットの進捗状況</li>
              <li>• テンプレート別の発行数</li>
              <li>• 日付順の発行履歴</li>
            </ul>
          </div>
        </div>
      </div>
    ),
    icon: <Settings className="w-5 h-5" />,
  },
];

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  if (!isOpen) return null;

  const categories = Array.from(new Set(FAQ_ITEMS.map(item => item.category)));
  const filteredItems = selectedCategory 
    ? FAQ_ITEMS.filter(item => item.category === selectedCategory)
    : FAQ_ITEMS;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <HelpCircle className="w-6 h-6 text-white" />
            <h2 className="text-white text-xl font-bold">よくある質問（FAQ）</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-purple-800 rounded-lg p-2 transition"
          >
            ✕
          </button>
        </div>

        {/* Category Filter */}
        <div className="border-b px-6 py-3 bg-gray-50">
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-6 px-6">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-4 py-2 rounded-full whitespace-nowrap font-semibold text-sm transition flex-shrink-0 ${
                selectedCategory === null
                  ? 'bg-purple-600 text-white'
                  : 'bg-white border border-gray-300 text-gray-700 hover:border-purple-400'
              }`}
            >
              すべて
            </button>
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-full whitespace-nowrap font-semibold text-sm transition flex-shrink-0 ${
                  selectedCategory === category
                    ? 'bg-purple-600 text-white'
                    : 'bg-white border border-gray-300 text-gray-700 hover:border-purple-400'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-2">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="border border-gray-200 rounded-lg overflow-hidden hover:border-purple-400 transition"
            >
              <button
                onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                className="w-full px-4 py-3 flex items-start gap-3 hover:bg-gray-50 transition text-left"
              >
                <div className="text-purple-600 mt-1">{item.icon}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900">{item.question}</p>
                  <p className="text-xs text-gray-500 mt-1">{item.category}</p>
                </div>
                <ChevronDown
                  className={`w-5 h-5 text-gray-400 flex-shrink-0 transition ${
                    expandedId === item.id ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {expandedId === item.id && (
                <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
                  {item.answer}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t bg-gray-50 px-6 py-3 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};

export default HelpModal;
