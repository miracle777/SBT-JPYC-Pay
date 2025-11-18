import { Outlet } from 'react-router-dom';
import { useState } from 'react';
import { WalletProvider } from './context/WalletContext';
import Header from './components/layout/Header';
import HelpModal from './components/HelpModal';
import { DisclaimerBanner } from './components/DisclaimerBanner';
import { Footer } from './components/layout/Footer';
import PWAStatus from './components/PWAStatus';
import PWAInstallButton from './components/PWAInstallButton';

function App() {
  const [showHelp, setShowHelp] = useState(false);

  return (
    <WalletProvider>
      <div className="App min-h-screen bg-gray-50 flex flex-col">
        <Header onHelpClick={() => setShowHelp(true)} />
        <DisclaimerBanner />
        <main className="flex-1">
          <Outlet />
        </main>
        <Footer />
        <PWAStatus />
        
        {/* PWA インストールボタン */}
        <div className="fixed bottom-4 left-4 z-40">
          <PWAInstallButton />
        </div>
        
        <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />
      </div>
    </WalletProvider>
  );
}

export default App;