import React from 'react';
import { Github, Twitter, Globe, FileText, Shield, AlertTriangle, MessageCircle, Server } from 'lucide-react';
import { APP_CONFIG } from '../../config';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-50 border-t border-gray-200">
      {/* メインフッターコンテンツ */}
      <div className="px-3 sm:px-6 py-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* アプリ情報 */}
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Server className="w-4 h-4" />
                {APP_CONFIG.name} v{APP_CONFIG.version}
              </h3>
              <p className="text-sm text-gray-600">
                SBT スタンプカード発行・管理システム（デモ版）
              </p>
              <div className="text-xs text-gray-500 space-y-1">
                <p>• PWA対応（スマートフォンアプリ化可能）</p>
                <p>• ローカルデータ管理（プライバシー重視）</p>
                <p>• マルチチェーン対応</p>
              </div>
              
              {/* 重要事項コンパクト表示 */}
              <div className="bg-red-50 border border-red-200 rounded p-3 space-y-2">
                <p className="text-red-800 font-medium text-sm flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  重要事項
                </p>
                <div className="text-xs text-red-700 space-y-1">
                  <p>• SBT発行にはインターネット接続必須</p>
                  <p>• 企業利用には専用サーバー設定必要</p>
                  <p>• デモ・検証用アプリ</p>
                </div>
              </div>
            </div>

            {/* 開発者・リンク情報 */}
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                <MessageCircle className="w-4 h-4" />
                開発者・サポート
              </h3>
              <div className="space-y-3">
                <p className="text-sm text-gray-600">
                  企業導入相談・技術サポート
                </p>
                <div className="flex gap-2">
                  <a
                    href="https://x.com/masaru21"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 bg-black text-white px-3 py-1.5 rounded text-xs hover:bg-gray-800 transition"
                  >
                    <Twitter className="w-3 h-3" />
                    X
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
                <div className="flex items-center gap-3 pt-2 border-t border-gray-200">
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
                    利用規約
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