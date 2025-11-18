import React from 'react';
import { useWallet } from '../context/WalletContext';

export const PWAWalletInfo: React.FC = () => {
  const { isPWA, isMetaMaskAvailable, pwaWalletInfo, lastConnectionStrategy } = useWallet();
  
  if (!isPWA) return null;
  
  return (
    <div className={`p-4 rounded-lg border ${pwaWalletInfo.isCompatible 
      ? 'bg-green-50 border-green-200 text-green-800' 
      : 'bg-yellow-50 border-yellow-200 text-yellow-800'
    }`}>
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          {pwaWalletInfo.isCompatible ? (
            <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          ) : (
            <div className="w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
          )}
        </div>
        
        <div className="flex-1">
          <h3 className="text-sm font-medium">{pwaWalletInfo.title}</h3>
          <p className="text-sm mt-1">{pwaWalletInfo.message}</p>
          
          {pwaWalletInfo.solutions.length > 0 && (
            <div className="mt-2">
              <p className="text-xs font-medium mb-1">推奨解決策：</p>
              <ul className="text-xs space-y-1">
                {pwaWalletInfo.solutions.map((solution, index) => (
                  <li key={index} className="flex items-center space-x-2">
                    <span className="w-1 h-1 bg-current rounded-full"></span>
                    <span>{solution}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {lastConnectionStrategy && (
            <div className="mt-2 pt-2 border-t border-current/20">
              <p className="text-xs">
                接続方式: <span className="font-medium">{lastConnectionStrategy}</span>
              </p>
            </div>
          )}
        </div>
      </div>
      
      {/* デバッグ情報（開発環境のみ） */}
      {process.env.NODE_ENV === 'development' && (
        <details className="mt-3 text-xs">
          <summary className="cursor-pointer font-medium">技術詳細</summary>
          <div className="mt-2 space-y-1">
            <p>PWA環境: {isPWA ? 'Yes' : 'No'}</p>
            <p>MetaMask検出: {isMetaMaskAvailable ? 'Yes' : 'No'}</p>
            <p>window.ethereum: {typeof window.ethereum !== 'undefined' ? 'Available' : 'Not available'}</p>
            <p>表示モード: {window.matchMedia('(display-mode: standalone)').matches ? 'Standalone' : 'Browser'}</p>
            <p>UserAgent: {navigator.userAgent.substring(0, 50)}...</p>
          </div>
        </details>
      )}
    </div>
  );
};

export const PWAWalletBanner: React.FC = () => {
  const { isPWA, pwaWalletInfo } = useWallet();
  
  // MetaMaskアプリ内ブラウザの場合は警告バナーを表示しない（UserAgentのみで厳密判定）
  const userAgent = navigator.userAgent.toLowerCase();
  const isMetaMaskBrowser = userAgent.includes('metamask');
  
  // 実際にPWA環境でない場合は表示しない
  const isActuallyPWA = window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true;
  
  if (!isActuallyPWA || pwaWalletInfo.isCompatible || isMetaMaskBrowser) return null;
  
  const handleOpenInBrowser = () => {
    const currentUrl = window.location.href;
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    const isAndroid = /Android/i.test(navigator.userAgent);
    
    // URLをコピーして、ユーザーにブラウザで開くよう案内
    const copyUrlAndNotify = async () => {
      try {
        await navigator.clipboard.writeText(currentUrl);
        alert('URLをコピーしました！\n\nSafariまたはChromeで新しいタブを開き、URLを貼り付けてアクセスしてください。');
      } catch (err) {
        // クリップボードAPIが使えない場合のフォールバック
        const message = isIOS 
          ? 'Safari で新しいタブを開いてこのURLにアクセスしてください:\n\n' + currentUrl
          : 'Chrome で新しいタブを開いてこのURLにアクセスしてください:\n\n' + currentUrl;
        alert(message);
      }
    };
    
    // モバイルの場合はURLをコピー
    if (isIOS || isAndroid) {
      copyUrlAndNotify();
    } else {
      // デスクトップの場合は新しいタブで開く
      const url = currentUrl.replace(/\?.*/, '') + '?fromPWA=true';
      window.open(url, '_blank');
    }
  };
  
  return (
    <div className="bg-amber-100 border border-amber-200 text-amber-800 px-4 py-3 text-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <span className="font-medium">PWA環境でウォレット接続が制限されています</span>
        </div>
        
        <button
          onClick={handleOpenInBrowser}
          className="bg-amber-600 text-white px-3 py-1 rounded text-xs font-medium hover:bg-amber-700 transition-colors whitespace-nowrap"
        >
          📋 URLをコピー
        </button>
      </div>
    </div>
  );
};