import React from 'react';
import { Store, QrCode, Wifi, Server, AlertTriangle, CheckCircle2, ExternalLink, MessageCircle, Globe, Twitter, ArrowRight } from 'lucide-react';
import { useWallet } from '../hooks/useWallet';
import { WalletButton } from '../components/WalletButton';

const Dashboard: React.FC = () => {
  const { isConnected } = useWallet();

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* メインヘッダー */}
        <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8 text-center">
          <Store className="w-12 h-12 sm:w-16 sm:h-16 text-purple-600 mx-auto mb-4" />
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            SBT JPYC Pay
          </h1>
          <p className="text-gray-600 text-base sm:text-lg mb-6">
            JPYC QR決済 & SBTスタンプカード発行・管理システム（デモ版）
          </p>
          
          {!isConnected && (
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-purple-800 mb-3">
                <strong>ウォレット接続前に、下記の重要事項を必ずご確認ください</strong>
              </p>
              <WalletButton />
            </div>
          )}
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <a
              href="/payment"
              className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              <QrCode className="w-5 h-5" />
              JPYC QR決済（店舗側）
              <ArrowRight className="w-4 h-4" />
            </a>
            <a
              href="/sbt"
              className="flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              <Store className="w-5 h-5" />
              SBT管理
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* 重要事項セクション */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* ネットワーク要件 */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="bg-red-50 border-b border-red-200 px-6 py-4">
              <h2 className="text-lg font-bold text-red-900 flex items-center gap-2">
                <Wifi className="w-5 h-5" />
                ⚠️ ネットワーク要件
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="font-bold text-red-900 mb-2">インターネット接続必須</h3>
                <p className="text-sm text-red-800 mb-3">
                  SBTの発行には以下のサービスへの接続が必要です：
                </p>
                <ul className="text-sm text-red-700 space-y-1">
                  <li>• <strong>Pinata (IPFS)</strong> - SBT画像・メタデータ保存</li>
                  <li>• <strong>Polygon Network</strong> - ブロックチェーン記録</li>
                  <li>• <strong>MetaMask</strong> - ウォレット接続</li>
                </ul>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-bold text-green-900 mb-2 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  オフライン対応範囲
                </h3>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• テンプレート作成・編集</li>
                  <li>• ローカルデータ管理</li>
                  <li>• QRコード表示</li>
                  <li>• PWAアプリとしての動作</li>
                </ul>
              </div>
            </div>
          </div>

          {/* 企業・店舗利用について */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="bg-amber-50 border-b border-amber-200 px-6 py-4">
              <h2 className="text-lg font-bold text-amber-900 flex items-center gap-2">
                <Server className="w-5 h-5" />
                🏢 企業・店舗での利用
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h3 className="font-bold text-amber-900 mb-2">商用利用には専用サーバーが必要</h3>
                <p className="text-sm text-amber-800 mb-3">
                  このデモ版は機能確認用です。実際の運用には：
                </p>
                <ul className="text-sm text-amber-700 space-y-1">
                  <li>• 独自ドメイン・HTTPS証明書</li>
                  <li>• Pinata APIキー設定</li>
                  <li>• スマートコントラクトデプロイ</li>
                  <li>• セキュリティ・バックアップ体制</li>
                  <li>• 運用監視・メンテナンス</li>
                </ul>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-bold text-blue-900 mb-2">導入支援サービス</h3>
                <p className="text-sm text-blue-800 mb-2">
                  カスタマイズ・環境構築・運用サポートを提供
                </p>
                <div className="flex gap-2">
                  <a
                    href="https://x.com/masaru21"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 bg-black text-white px-3 py-1.5 rounded text-xs hover:bg-gray-800 transition"
                  >
                    <Twitter className="w-3 h-3" />
                    お問い合わせ
                  </a>
                  <a
                    href="https://lit.link/itsapotamk"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 bg-purple-600 text-white px-3 py-1.5 rounded text-xs hover:bg-purple-700 transition"
                  >
                    <Globe className="w-3 h-3" />
                    詳細情報
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 機能詳細セクション */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* JPYC決済機能 */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="bg-blue-50 border-b border-blue-200 px-6 py-4">
              <h2 className="text-lg font-bold text-blue-900 flex items-center gap-2">
                <QrCode className="w-5 h-5" />
                💰 JPYC QR決済機能
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-bold text-blue-900 mb-2">店舗向けQR決済</h3>
                <p className="text-sm text-blue-800 mb-3">
                  JPYC（日本円連動ステーブルコイン）でのQRコード決済に対応：
                </p>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• 金額指定QRコード生成</li>
                  <li>• リアルタイム決済確認</li>
                  <li>• トランザクション履歴表示</li>
                </ul>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-bold text-green-900 mb-2">対応ウォレット</h3>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• MetaMask（推奨）</li>
                  <li>• WalletConnect対応ウォレット</li>
                  <li>• モバイルウォレットアプリ</li>
                </ul>
              </div>
            </div>
          </div>

          {/* SBTスタンプカード機能 */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="bg-purple-50 border-b border-purple-200 px-6 py-4">
              <h2 className="text-lg font-bold text-purple-900 flex items-center gap-2">
                <Store className="w-5 h-5" />
                🎫 SBTスタンプカード機能
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h3 className="font-bold text-purple-900 mb-2">デジタルスタンプカード発行</h3>
                <p className="text-sm text-purple-800 mb-3">
                  Soul Bound Token（SBT）技術で実現する次世代スタンプカード：
                </p>
                <ul className="text-sm text-purple-700 space-y-1">
                  <li>• 転送不可のデジタル証明書</li>
                  <li>• カスタムデザイン対応</li>
                  <li>• 自動スタンプ付与</li>
                  <li>• 来店履歴の永続記録</li>
                  <li>• 偽造防止・不正利用防止</li>
                </ul>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="font-bold text-yellow-900 mb-2">管理機能</h3>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• 店舗別スタンプカード作成</li>
                  <li>• 発行履歴・統計表示</li>
                  <li>• 特典・キャンペーン設定</li>
                  <li>• スタンプ付与記録管理</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* 免責事項・データ管理 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* 免責事項 */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                📋 免責事項
              </h2>
            </div>
            <div className="p-6">
              <div className="text-sm text-gray-700 space-y-3">
                <div className="border-l-4 border-gray-400 pl-3">
                  <p className="font-medium">デモ・検証用アプリ</p>
                  <p className="text-xs text-gray-600">本格運用前に充分なテストを実施してください</p>
                </div>
                <div className="border-l-4 border-yellow-400 pl-3">
                  <p className="font-medium">ガス代は利用者負担</p>
                  <p className="text-xs text-gray-600">ブロックチェーン取引の手数料が発生します</p>
                </div>
                <div className="border-l-4 border-blue-400 pl-3">
                  <p className="font-medium">ウォレット管理は自己責任</p>
                  <p className="text-xs text-gray-600">秘密鍵・セキュリティは利用者が管理</p>
                </div>
                <div className="border-l-4 border-green-400 pl-3">
                  <p className="font-medium">法的・税務的取り扱い</p>
                  <p className="text-xs text-gray-600">専門家にご相談ください</p>
                </div>
              </div>
            </div>
          </div>

          {/* データ管理 */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="bg-blue-50 border-b border-blue-200 px-6 py-4">
              <h2 className="text-lg font-bold text-blue-900 flex items-center gap-2">
                <Globe className="w-5 h-5" />
                💾 データ管理について
              </h2>
            </div>
            <div className="p-6">
              <div className="text-sm text-blue-800 space-y-3">
                <div className="bg-blue-50 border border-blue-200 rounded p-3">
                  <p className="font-medium">ローカルストレージ保存</p>
                  <p className="text-xs">データはあなたのデバイスに保存（サーバーなし）</p>
                </div>
                <div className="bg-green-50 border border-green-200 rounded p-3">
                  <p className="font-medium text-green-700">プライバシー重視</p>
                  <p className="text-xs text-green-600">個人情報は外部送信されません</p>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                  <p className="font-medium text-yellow-700">定期的エクスポート推奨</p>
                  <p className="text-xs text-yellow-600">アプリ削除時にデータも削除されます</p>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded p-3">
                  <p className="font-medium text-purple-700">複数デバイス利用</p>
                  <p className="text-xs text-purple-600">手動エクスポート/インポートで同期可能</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* お問い合わせ・サポート */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="bg-green-50 border-b border-green-200 px-6 py-4">
            <h2 className="text-lg font-bold text-green-900 flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              💬 お問い合わせ・サポート
            </h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* 企業・店舗向け */}
              <div className="space-y-4">
                <h3 className="font-bold text-green-900">企業・店舗での導入をご検討の方</h3>
                <div className="bg-green-50 rounded-lg p-4 space-y-3">
                  <p className="text-sm text-green-800">
                    専門チームが導入から運用まで完全サポート
                  </p>
                  <ul className="text-xs text-green-700 space-y-1">
                    <li>• 要件ヒアリング・提案</li>
                    <li>• カスタマイズ開発</li>
                    <li>• サーバー環境構築</li>
                    <li>• 運用トレーニング</li>
                    <li>• 保守・監視サポート</li>
                  </ul>
                  <div className="flex gap-2 pt-2">
                    <a
                      href="https://x.com/masaru21"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition text-sm"
                    >
                      <Twitter className="w-4 h-4" />
                      X でお問い合わせ
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <a
                      href="https://lit.link/itsapotamk"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition text-sm"
                    >
                      <Globe className="w-4 h-4" />
                      詳細情報
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>

              {/* 技術情報・リソース */}
              <div className="space-y-4">
                <h3 className="font-bold text-green-900">技術情報・リソース</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <p className="text-sm text-gray-800">
                    開発者・技術者向けリソース
                  </p>
                  <ul className="text-xs text-gray-700 space-y-1">
                    <li>• オープンソースコード (GitHub)</li>
                    <li>• 技術ドキュメント</li>
                    <li>• API仕様書</li>
                    <li>• デプロイメントガイド</li>
                    <li>• トラブルシューティング</li>
                  </ul>
                  <div className="flex gap-2 pt-2">
                    <a
                      href="https://github.com/miracle777/SBT-JPYC-Pay"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-900 transition text-sm"
                    >
                      <ExternalLink className="w-4 h-4" />
                      GitHub Repository
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
