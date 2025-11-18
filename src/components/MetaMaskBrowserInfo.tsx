import React from 'react';
import { CheckCircle, Smartphone, Wallet } from 'lucide-react';

export const MetaMaskBrowserInfo: React.FC = () => {
  // MetaMaskアプリ内ブラウザかどうかを厳密に検出（UserAgentのみで判定）
  const userAgent = navigator.userAgent.toLowerCase();
  const isMetaMaskBrowser = userAgent.includes('metamask');
  
  if (!isMetaMaskBrowser) return null;
  
  return (
    <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 text-sm">
      <div className="flex items-center space-x-2">
        <CheckCircle className="w-4 h-4 text-blue-600" />
        <Smartphone className="w-4 h-4 text-blue-600" />
        <div className="flex-1">
          <span className="font-medium">MetaMaskアプリ内ブラウザで動作中</span>
          <span className="ml-2">ウォレット機能は完全に利用できます</span>
        </div>
        <Wallet className="w-4 h-4 text-blue-600" />
      </div>
    </div>
  );
};

export default MetaMaskBrowserInfo;