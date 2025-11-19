import React from 'react';
import { Shield, FileText, AlertTriangle, CheckCircle, ExternalLink, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/Button';

const TermsAndPrivacy: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <a href="/" className="text-gray-600 hover:text-gray-800 transition">
              <ArrowLeft className="w-5 h-5" />
            </a>
            <Shield className="w-6 h-6 text-purple-600" />
            <h1 className="text-2xl font-bold text-gray-900">利用条件・プライバシーポリシー</h1>
          </div>
          <p className="text-gray-600">
            SBT masaru21 Pay をご利用の前に、必ずお読みください。
          </p>
        </div>

        {/* 利用条件 */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="bg-blue-50 border-b border-blue-200 px-6 py-4">
            <h2 className="text-xl font-bold text-blue-900 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              利用条件（Terms of Service）
            </h2>
          </div>
          <div className="p-6 space-y-6">
            
            {/* サービス概要 */}
            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">1. サービス概要</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <ul className="text-sm text-gray-700 space-y-2">
                  <li>• SBT masaru21 Pay は、SBT（Soulbound Token）を活用したスタンプカード発行・管理システムです</li>
                  <li>• 店舗・企業向けの決済管理ツールとして提供されています</li>
                  <li>• 本サービスは<strong>デモ・検証用</strong>であり、商用利用には別途設定が必要です</li>
                  <li>• Progressive Web App（PWA）として動作し、各種デバイスで利用可能です</li>
                </ul>
              </div>
            </section>

            {/* 利用要件 */}
            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">2. 利用要件</h3>
              <div className="space-y-3">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="font-semibold text-red-900 flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4" />
                    必須要件
                  </h4>
                  <ul className="text-sm text-red-800 space-y-1">
                    <li>• <strong>インターネット接続</strong> - SBT発行時にPinata (IPFS) およびブロックチェーンへの接続が必要</li>
                    <li>• <strong>MetaMask ウォレット</strong> - ブロックチェーン取引に必要</li>
                    <li>• <strong>対応ブラウザ</strong> - Chrome, Firefox, Safari, Edge の最新版</li>
                    <li>• <strong>JavaScript 有効化</strong> - アプリケーション動作に必要</li>
                  </ul>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <h4 className="font-semibold text-amber-900 mb-2">商用利用時の追加要件</h4>
                  <ul className="text-sm text-amber-800 space-y-1">
                    <li>• 独自サーバー・ドメインの準備</li>
                    <li>• HTTPS 証明書の設定</li>
                    <li>• Pinata API キーの取得・設定</li>
                    <li>• スマートコントラクトのデプロイ</li>
                    <li>• セキュリティ・バックアップ体制の構築</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* 利用者責任 */}
            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">3. 利用者の責任</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <ul className="text-sm text-gray-700 space-y-2">
                  <li>• <strong>ウォレット管理</strong> - 秘密鍵・シードフレーズの安全な保管</li>
                  <li>• <strong>ガス代負担</strong> - ブロックチェーン取引にかかる手数料</li>
                  <li>• <strong>データバックアップ</strong> - ローカルストレージデータの定期的なエクスポート</li>
                  <li>• <strong>法令遵守</strong> - 利用地域の法律・規制への準拠</li>
                  <li>• <strong>適切な利用</strong> - 第三者の権利を侵害しない利用</li>
                  <li>• <strong>セキュリティ対策</strong> - デバイス・ネットワークのセキュリティ確保</li>
                </ul>
              </div>
            </section>

            {/* 免責事項 */}
            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">4. 免責事項</h3>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <ul className="text-sm text-yellow-800 space-y-2">
                  <li>• 開発者は、サービス利用による一切の損害について責任を負いません</li>
                  <li>• ネットワーク障害、サーバー停止による損失は保証されません</li>
                  <li>• ブロックチェーン取引の失敗・遅延による損害は利用者負担です</li>
                  <li>• 第三者サービス（Pinata、MetaMask等）の障害による影響は対象外です</li>
                  <li>• ローカルデータの消失について開発者は責任を負いません</li>
                  <li>• 法的・税務的取り扱いは利用者が専門家に相談してください</li>
                </ul>
              </div>
            </section>

            {/* サービス変更・終了 */}
            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">5. サービス変更・終了</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <ul className="text-sm text-gray-700 space-y-2">
                  <li>• サービス内容は予告なく変更される場合があります</li>
                  <li>• デモ版としての提供のため、予告なく終了する場合があります</li>
                  <li>• サービス終了時は、事前に可能な範囲で通知いたします</li>
                  <li>• データエクスポート機能を活用して、定期的にバックアップを取得してください</li>
                </ul>
              </div>
            </section>
          </div>
        </div>

        {/* プライバシーポリシー */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="bg-green-50 border-b border-green-200 px-6 py-4">
            <h2 className="text-xl font-bold text-green-900 flex items-center gap-2">
              <Shield className="w-5 h-5" />
              プライバシーポリシー（Privacy Policy）
            </h2>
          </div>
          <div className="p-6 space-y-6">
            
            {/* データ収集 */}
            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">1. データ収集について</h3>
              <div className="space-y-3">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-semibold text-green-900 flex items-center gap-2 mb-2">
                    <CheckCircle className="w-4 h-4" />
                    収集しないデータ
                  </h4>
                  <ul className="text-sm text-green-800 space-y-1">
                    <li>• 個人情報（名前、住所、電話番号等）</li>
                    <li>• ウォレットの秘密鍵・シードフレーズ</li>
                    <li>• 取引履歴の詳細</li>
                    <li>• 位置情報</li>
                    <li>• デバイス固有情報</li>
                  </ul>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-2">ローカル保存データ</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• SBTテンプレート設定</li>
                    <li>• 店舗設定情報</li>
                    <li>• 発行済みSBTリスト</li>
                    <li>• アプリケーション設定</li>
                    <li>• ※これらは全て利用者のデバイスにのみ保存され、外部送信されません</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* データ保存・管理 */}
            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">2. データ保存・管理</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <ul className="text-sm text-gray-700 space-y-2">
                  <li>• <strong>ローカルストレージ</strong> - データは利用者のデバイスの IndexedDB および localStorage に保存</li>
                  <li>• <strong>サーバーレス設計</strong> - 開発者のサーバーにデータは保存されません</li>
                  <li>• <strong>ブロックチェーン記録</strong> - SBT発行データは分散台帳に記録（公開情報）</li>
                  <li>• <strong>IPFS保存</strong> - SBTメタデータ・画像は Pinata (IPFS) に分散保存</li>
                  <li>• <strong>自動削除</strong> - アプリ削除時にローカルデータも削除されます</li>
                </ul>
              </div>
            </section>

            {/* 第三者サービス */}
            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">3. 第三者サービス連携</h3>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-semibold text-yellow-900 mb-2">連携サービス</h4>
                <ul className="text-sm text-yellow-800 space-y-2">
                  <li>• <strong>MetaMask</strong> - ウォレット接続（利用者が直接操作）</li>
                  <li>• <strong>Pinata (IPFS)</strong> - SBTメタデータ・画像保存（API経由）</li>
                  <li>• <strong>Polygon Network</strong> - ブロックチェーン取引（利用者が直接実行）</li>
                </ul>
                <p className="text-xs text-yellow-700 mt-2">
                  ※各サービスのプライバシーポリシーも併せてご確認ください
                </p>
              </div>
            </section>

            {/* データの権利 */}
            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">4. 利用者の権利</h3>
              <div className="bg-green-50 rounded-lg p-4">
                <ul className="text-sm text-green-800 space-y-2">
                  <li>• <strong>データの完全制御</strong> - ローカルデータは利用者が完全に管理</li>
                  <li>• <strong>エクスポート権</strong> - いつでもデータを JSON 形式で出力可能</li>
                  <li>• <strong>削除権</strong> - アプリ削除により全データを削除可能</li>
                  <li>• <strong>アクセス制限</strong> - 外部からのデータアクセス不可</li>
                  <li>• <strong>移行の自由</strong> - エクスポート機能により他環境への移行可能</li>
                </ul>
              </div>
            </section>
          </div>
        </div>

        {/* お問い合わせ */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <ExternalLink className="w-5 h-5" />
            お問い合わせ
          </h2>
          <p className="text-gray-700 mb-4">
            利用条件・プライバシーポリシーについてご質問がある場合は、開発者までお問い合わせください。
          </p>
          <div className="flex gap-3">
            <a
              href="https://x.com/masaru21"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition"
            >
              <ExternalLink className="w-4 h-4" />
              X (Twitter)
            </a>
            <a
              href="https://lit.link/itsapotamk"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition"
            >
              <ExternalLink className="w-4 h-4" />
              Lit.link
            </a>
          </div>
        </div>

        {/* 戻るボタン */}
        <div className="text-center">
          <Button
            onClick={() => window.history.back()}
            className="bg-gray-600 hover:bg-gray-700"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            戻る
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TermsAndPrivacy;