import React, { useState, useEffect } from 'react';
import { getMobileBrowserInfo } from '../utils/smartphoneWallet';

interface BrowserRedirectGuideProps {
  isVisible: boolean;
  onClose: () => void;
  onForceConnect: () => void;
}

export const BrowserRedirectGuide: React.FC<BrowserRedirectGuideProps> = ({
  isVisible,
  onClose,
  onForceConnect
}) => {
  const [currentUrl, setCurrentUrl] = useState('');
  const [browserInfo, setBrowserInfo] = useState<any>(null);

  useEffect(() => {
    setCurrentUrl(window.location.href);
    setBrowserInfo(getMobileBrowserInfo());
  }, []);

  if (!isVisible) return null;

  const openInSafari = () => {
    if (browserInfo?.isIOS) {
      // iOSの場合、Safariで開く
      window.location.href = currentUrl;
    } else if (browserInfo?.isAndroid) {
      // Androidの場合、Chromeで開く
      const chromeUrl = `googlechrome://${currentUrl.replace(/^https?:\/\//, '')}`;
      const fallbackUrl = currentUrl;
      
      // Chrome URLスキームを試し、失敗した場合は通常のURLにフォールバック
      window.location.href = chromeUrl;
      setTimeout(() => {
        window.location.href = fallbackUrl;
      }, 1000);
    }
  };

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      alert('URLをコピーしました。Safariまたは標準ブラウザで開いてください。');
    } catch (err) {
      // フォールバック: テキスト選択
      const textArea = document.createElement('textarea');
      textArea.value = currentUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('URLをコピーしました。Safariまたは標準ブラウザで開いてください。');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            🌐 ブラウザの変更をお勧めします
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          {browserInfo?.isMetaMaskBrowser && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800">
                現在MetaMaskアプリ内ブラウザをご利用中です。
                一部機能が制限される場合があります。
              </p>
            </div>
          )}

          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              より安定した接続のため、以下のブラウザでのご利用をお勧めします：
            </p>

            {browserInfo?.isIOS && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">🧭</span>
                  <span className="font-medium text-blue-900">Safari</span>
                </div>
                <p className="text-xs text-blue-700 mt-1">
                  iOSデバイスで最も安定した動作が期待できます
                </p>
              </div>
            )}

            {browserInfo?.isAndroid && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">🌐</span>
                  <span className="font-medium text-green-900">Chrome</span>
                </div>
                <p className="text-xs text-green-700 mt-1">
                  Androidデバイスで最も安定した動作が期待できます
                </p>
              </div>
            )}

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <span className="text-lg">🔗</span>
                <span className="font-medium text-gray-900">その他のブラウザ</span>
              </div>
              <p className="text-xs text-gray-700 mt-1">
                Edge、Firefox等でも正常に動作します
              </p>
            </div>
          </div>

          <div className="flex flex-col space-y-2">
            <button
              onClick={openInSafari}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
            >
              <span>🌐</span>
              <span>
                {browserInfo?.isIOS ? 'Safariで開く' : 'ブラウザで開く'}
              </span>
            </button>

            <button
              onClick={copyUrl}
              className="w-full bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center space-x-2"
            >
              <span>📋</span>
              <span>URLをコピー</span>
            </button>

            <div className="border-t pt-3">
              <button
                onClick={() => {
                  onClose();
                  onForceConnect();
                }}
                className="w-full text-blue-600 py-2 px-4 rounded-lg hover:bg-blue-50 transition-colors text-sm"
              >
                このブラウザで続行する
              </button>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-xs text-amber-800">
              💡 <strong>ヒント:</strong> 標準ブラウザを使用することで、
              MetaMask拡張機能の全機能をご利用いただけます。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrowserRedirectGuide;