import { Outlet } from 'react-router-dom';
import { useState } from 'react';
import Header from './components/layout/Header';
import HelpModal from './components/HelpModal';
import { DisclaimerBanner } from './components/DisclaimerBanner';
import { Footer } from './components/layout/Footer';
import PWAStatus from './components/PWAStatus';
import PWAInstallButton from './components/PWAInstallButton';
import { PWAWalletBanner } from './components/PWAWalletInfo';
import MetaMaskBrowserInfo from './components/MetaMaskBrowserInfo';

const App: React.FC = () => {
  const [showHelp, setShowHelp] = useState(false);

  return (
    <div className="App min-h-screen bg-gray-50 flex flex-col overflow-x-hidden">
      <Header onHelpClick={() => setShowHelp(true)} />
      <MetaMaskBrowserInfo />
      <PWAWalletBanner />
      <DisclaimerBanner />
      <main className="flex-1 overflow-x-hidden">
        <Outlet />
      </main>
      <Footer />
      <PWAStatus />
      
      {/* PWA インストールボタン */}
      <div className="fixed bottom-2 xs:bottom-4 left-2 xs:left-4 z-40 landscape:bottom-1 landscape:left-2">
        <PWAInstallButton />
      </div>
      
      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />

      {/* JPYC免責事項 - ウォレット接続前でも表示 */}
      <footer className="bg-white border-t border-gray-200 mt-8">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="text-xs text-gray-500 text-center space-y-1">
            <p>※ 本プログラムは、JPYC株式会社による公式コンテンツではありません。</p>
            <p>※ 「JPYC」は、JPYC株式会社の提供するステーブルコインです。</p>
            <p>※ JPYC及びJPYCロゴは、JPYC株式会社の登録商標です。</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

function AppWrapper() {
  return <App />;
}

export default AppWrapper;