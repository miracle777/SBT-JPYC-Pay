import React, { useState } from 'react';
import { AlertTriangle, Wifi, Server, ExternalLink, MessageCircle, User, Globe, X } from 'lucide-react';
import { Button } from './ui/Button';

interface DisclaimerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
}

const DisclaimerModal: React.FC<DisclaimerModalProps> = ({ isOpen, onClose, onAccept }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[95vh] overflow-hidden flex flex-col mx-2 sm:mx-0">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            <h2 className="text-white text-lg sm:text-xl font-bold">SBT Pay 利用前の重要事項</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-purple-800 rounded-lg p-1 sm:p-2 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 px-4 sm:px-6 py-4 space-y-6">
          
          {/* ネットワーク要件 */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Wifi className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
              <div className="space-y-2">
                <h3 className="text-red-900 font-bold text-lg">⚠️ インターネット接続必須</h3>
                <p className="text-red-800">
                  <strong>SBT発行とJPYC QR決済にはインターネット接続が必要です。</strong>
                  オフラインではSBTを作成・保存、QR決済を実行できません。
                </p>
                <div className="bg-white rounded p-3 space-y-1">
                  <p className="font-semibold text-red-900">必要なサービス：</p>
                  <ul className="text-sm text-red-800 space-y-1">
                    <li>• <strong>Pinata (IPFS)</strong> - SBT画像・メタデータの分散保存</li>
                    <li>• <strong>Polygon Network</strong> - ブロックチェーンへの記録</li>
                    <li>• <strong>MetaMask</strong> - ウォレット接続とJPYC決済処理</li>
                    <li>• <strong>RPCエンドポイント</strong> - リアルタイムトランザクション処理</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* サーバー設定要件 */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Server className="w-6 h-6 text-amber-600 flex-shrink-0 mt-1" />
              <div className="space-y-2">
                <h3 className="text-amber-900 font-bold text-lg">🏢 企業・店舗での利用について</h3>
                <p className="text-amber-800">
                  実際の商用利用には、<strong>専用サーバーの設定と環境構築が必要</strong>です。
                  このデモ版は機能確認用です。
                </p>
                <div className="bg-white rounded p-3 space-y-1">
                  <p className="font-semibold text-amber-900">商用利用で必要な設定：</p>
                  <ul className="text-sm text-amber-800 space-y-1">
                    <li>• 独自ドメインとHTTPS証明書</li>
                    <li>• Pinata APIキーの取得・設定</li>
                    <li>• スマートコントラクトのデプロイ</li>
                    <li>• セキュリティ設定とバックアップ体制</li>
                    <li>• 運用監視とメンテナンス</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* 免責事項 */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-gray-600 flex-shrink-0 mt-1" />
              <div className="space-y-2">
                <h3 className="text-gray-900 font-bold text-lg">📋 免責事項</h3>
                <div className="text-sm text-gray-800 space-y-2">
                  <p>• このアプリは<strong>デモ・検証用</strong>です。本格運用前に充分なテストを行ってください。</p>
                  <p>• ブロックチェーン取引に関わる<strong>ガス代は利用者負担</strong>です。</p>
                  <p>• ネットワーク障害やサービス停止による損失について、開発者は責任を負いません。</p>
                  <p>• 秘密鍵・ウォレット管理は利用者の責任で行ってください。</p>
                  <p>• 法的・税務的な取り扱いは専門家にご相談ください。</p>
                </div>
              </div>
            </div>
          </div>

          {/* データ管理 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Globe className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
              <div className="space-y-2">
                <h3 className="text-blue-900 font-bold text-lg">💾 データ管理について</h3>
                <div className="text-sm text-blue-800 space-y-2">
                  <p>• データは<strong>あなたのデバイスのローカルストレージ</strong>に保存されます。</p>
                  <p>• サーバーにデータは保存されません（プライバシー重視）。</p>
                  <p>• アプリを削除するとデータも削除されます。<strong>定期的なエクスポート</strong>を推奨します。</p>
                  <p>• 複数デバイスでデータを共有するには手動エクスポート/インポートが必要です。</p>
                </div>
              </div>
            </div>
          </div>

          {/* サポート・お問い合わせ */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <MessageCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
              <div className="space-y-3">
                <h3 className="text-green-900 font-bold text-lg">💬 お問い合わせ・サポート</h3>
                <p className="text-green-800">
                  <strong>企業・店舗での導入をご検討の方は、開発者までお気軽にお問い合わせください。</strong>
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <a
                    href="https://x.com/masaru21"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition"
                  >
                    <User className="w-4 h-4" />
                    <span className="text-sm font-medium">X (Twitter)</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <a
                    href="https://lit.link/itsapotamk"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition"
                  >
                    <Globe className="w-4 h-4" />
                    <span className="text-sm font-medium">Lit.link</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <p className="text-xs text-green-700">
                  ※ 導入支援、カスタマイズ、保守運用もご相談可能です
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* Footer Buttons */}
        <div className="border-t bg-gray-50 px-4 sm:px-6 py-4 flex justify-center">
          <Button
            onClick={onAccept}
            className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700"
          >
            理解しました。アプリを使用する
          </Button>
        </div>
      </div>
    </div>
  );
};

export const DisclaimerBanner: React.FC = () => {
  const [hasAccepted, setHasAccepted] = useState(() => {
    return localStorage.getItem('sbt-pay-disclaimer-accepted') === 'true';
  });
  const [showModal, setShowModal] = useState(false);

  const handleAccept = () => {
    setHasAccepted(true);
    localStorage.setItem('sbt-pay-disclaimer-accepted', 'true');
    setShowModal(false);
  };

  const handleShowModal = () => {
    setShowModal(true);
  };

  if (hasAccepted) {
    return (
      <>
        {/* コンパクトな再確認バナー */}
        <div className="bg-purple-100 border-b border-purple-200 px-3 sm:px-6 py-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-purple-600 flex-shrink-0" />
              <span className="text-purple-800">
                <strong>SBT発行・QRコード決済にはインターネット接続とサーバー設定が必要</strong>
              </span>
            </div>
            <button
              onClick={handleShowModal}
              className="text-purple-700 hover:text-purple-900 font-medium text-xs underline whitespace-nowrap"
            >
              詳細を再確認
            </button>
          </div>
        </div>
        
        <DisclaimerModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onAccept={handleAccept}
        />
      </>
    );
  }

  return (
    <>
      {/* メイン警告バナー */}
      <div className="bg-gradient-to-r from-red-500 to-red-600 text-white px-3 sm:px-6 py-3 sm:py-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-start gap-3 flex-1">
            <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="font-bold text-sm sm:text-base">
                ⚠️ 利用前に必ずお読みください
              </h3>
              <p className="text-xs sm:text-sm text-red-100">
                SBT発行とJPYC QR決済にはインターネット接続が必要です。企業・店舗利用には専用サーバー設定が必要です。
              </p>
            </div>
          </div>
          <Button
            onClick={handleShowModal}
            className="bg-yellow-400 text-red-900 hover:bg-yellow-300 font-semibold whitespace-nowrap text-sm px-4 py-2 border-2 border-red-600"
          >
            重要事項を確認
          </Button>
        </div>
      </div>

      <DisclaimerModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onAccept={handleAccept}
      />
    </>
  );
};