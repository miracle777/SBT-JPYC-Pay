import React from 'react';
import { Github, Twitter, Globe } from 'lucide-react';
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
            © 2024 miracle777. All rights reserved.
          </p>
          <p className="text-xs text-gray-400 mt-1">
            SBT スタンプカード発行・管理システム
          </p>
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
            href="#"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Twitter"
          >
            <Twitter size={18} />
          </a>
          <a
            href="#"
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