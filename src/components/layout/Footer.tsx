import React from 'react';
import { Github, Twitter, Globe, FileText, Shield } from 'lucide-react';
import { APP_CONFIG } from '../../config';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-gray-200 px-6 py-4">
      <div className="flex flex-col md:flex-row items-center justify-between">
        {/* Left section */}
        <div className="flex items-center space-x-4 mb-4 md:mb-0">
          <div className="text-sm text-gray-600">
            <span className="font-medium">{APP_CONFIG.name}</span>
            <span className="mx-2">•</span>
            <span>v{APP_CONFIG.version}</span>
          </div>
        </div>

        {/* Center section */}
        <div className="text-center mb-4 md:mb-0">
          <p className="text-xs text-gray-500">
            © 2025 miracle777. All rights reserved.
          </p>
          <p className="text-xs text-gray-400 mt-1">
            SBT スタンプカード発行・管理システム
          </p>
          <div className="flex items-center justify-center space-x-4 mt-2">
            <a
              href={APP_CONFIG.legal.privacyPolicy}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-500 hover:text-blue-700 transition-colors flex items-center space-x-1"
            >
              <Shield size={12} />
              <span>プライバシーポリシー</span>
            </a>
            <span className="text-xs text-gray-300">•</span>
            <a
              href={APP_CONFIG.legal.license}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-500 hover:text-blue-700 transition-colors flex items-center space-x-1"
            >
              <FileText size={12} />
              <span>利用条件</span>
            </a>
          </div>
        </div>

        {/* Right section */}
        <div className="flex items-center space-x-3">
          <a
            href={APP_CONFIG.social.github}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="GitHub"
          >
            <Github size={18} />
          </a>
          <a
            href={APP_CONFIG.social.twitter}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Twitter"
          >
            <Twitter size={18} />
          </a>
          <a
            href={APP_CONFIG.social.website}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Website"
          >
            <Globe size={18} />
          </a>
        </div>
      </div>
    </footer>
  );
};