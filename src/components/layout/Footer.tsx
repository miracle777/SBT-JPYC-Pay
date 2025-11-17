import React from 'react';
import { Github, Twitter, Globe, FileText, Shield, AlertTriangle, MessageCircle, Server } from 'lucide-react';
import { APP_CONFIG } from '../../config';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-50 border-t border-gray-200">
      {/* 重要な注意事項バー */}
      <div className="bg-amber-50 border-b border-amber-200 px-3 sm:px-6 py-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm max-w-7xl mx-auto">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span className="text-amber-800">
              <strong>注意:</strong> SBT発行にはインターネット接続とサーバー設定が必要です
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="text-amber-700">企業・店舗導入のご相談</span>
            <div className="flex gap-2">
              <a
                href="https://x.com/masaru21"
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-800 hover:text-amber-900 underline flex items-center gap-1"
              >
                <Twitter className="w-3 h-3" />
                X
              </a>
              <a
                href="https://lit.link/itsapotamk"
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-800 hover:text-amber-900 underline flex items-center gap-1"
              >
                <Globe className="w-3 h-3" />
                Lit.link
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* メインフッターコンテンツ */}
      <div className="px-3 sm:px-6 py-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* アプリ情報 */}
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Server className="w-4 h-4" />
                {APP_CONFIG.name} v{APP_CONFIG.version}
              </h3>
              <p className="text-sm text-gray-600">
                SBT スタンプカード発行・管理システム
              </p>
              <div className="text-xs text-gray-500 space-y-1">
                <p>• PWA対応（スマートフォンアプリ化可能）</p>
                <p>• ローカルデータ管理（プライバシー重視）</p>
                <p>• マルチチェーン対応</p>
              </div>
            </div>

            {/* 重要事項 */}
            <div className="space-y-3">
              <h3 className="font-semibold text-red-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                重要事項
              </h3>
              <div className="text-sm text-gray-700 space-y-2">
                <div className="bg-red-50 rounded p-2">
                  <p className="text-red-800 font-medium">インターネット接続必須</p>
                  <p className="text-xs text-red-700">SBT発行時にPinata・ブロックチェーン接続が必要</p>
                </div>
                <div className="bg-amber-50 rounded p-2">
                  <p className="text-amber-800 font-medium">企業利用には専用サーバー</p>
                  <p className="text-xs text-amber-700">商用利用時は環境構築・設定が必要</p>
                </div>
                <div className="bg-gray-50 rounded p-2">
                  <p className="text-gray-800 font-medium">デモ・検証用アプリ</p>
                  <p className="text-xs text-gray-600">本格運用前にテストネットで検証推奨</p>
                </div>
              </div>
            </div>

            {/* サポート・リンク */}
            <div className="space-y-3">
              <h3 className="font-semibold text-green-700 flex items-center gap-2">
                <MessageCircle className="w-4 h-4" />
                サポート・お問い合わせ
              </h3>
              <div className="space-y-2">
                <p className="text-sm text-gray-700">
                  企業・店舗での導入をご検討の方
                </p>
                <div className="flex gap-2">
                  <a
                    href="https://x.com/masaru21"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 bg-black text-white px-3 py-1.5 rounded text-xs hover:bg-gray-800 transition"
                  >
                    <Twitter className="w-3 h-3" />
                    X (Twitter)
                  </a>
                  <a
                    href="https://lit.link/itsapotamk"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 bg-purple-600 text-white px-3 py-1.5 rounded text-xs hover:bg-purple-700 transition"
                  >
                    <Globe className="w-3 h-3" />
                    Lit.link
                  </a>
                </div>
                <p className="text-xs text-green-600">
                  導入支援・カスタマイズ・運用サポート対応
                </p>
              </div>

              {/* 開発情報・リンク */}
              <div className="pt-3 border-t border-gray-200">
                <div className="flex items-center space-x-3">
                  <a
                    href={APP_CONFIG.social.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label="GitHub"
                  >
                    <Github size={16} />
                  </a>
                  <a
                    href="/terms-privacy"
                    className="text-xs text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1"
                  >
                    <Shield size={12} />
                    プライバシー
                  </a>
                  <a
                    href="/terms-privacy"
                    className="text-xs text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1"
                  >
                    <FileText size={12} />
                    利用条件
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Copyright */}
          <div className="mt-6 pt-4 border-t border-gray-200 text-center">
            <p className="text-xs text-gray-500">
              © 2025 miracle777. All rights reserved. 
              <span className="mx-2">•</span>
              Made with ❤️ for SBT & JPYC ecosystem
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};