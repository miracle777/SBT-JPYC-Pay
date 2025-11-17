import { Routes, Route } from 'react-router-dom';
import { useState } from 'react';
import Dashboard from './pages/Dashboard';
import QRPayment from './pages/QRPayment';
import SBTManagement from './pages/SBTManagement';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';
import { WalletProvider } from './context/WalletContext';
import Header from './components/layout/Header';
import HelpModal from './components/HelpModal';
import { DisclaimerBanner } from './components/DisclaimerBanner';
import { Footer } from './components/layout/Footer';
import PWAStatus from './components/PWAStatus';

function App() {
  const [showHelp, setShowHelp] = useState(false);

  return (
    <WalletProvider>
      <div className="App min-h-screen bg-gray-50 flex flex-col">
        <Header onHelpClick={() => setShowHelp(true)} />
        <DisclaimerBanner />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/payment" element={<QRPayment />} />
            <Route path="/sbt" element={<SBTManagement />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        <Footer />
        <PWAStatus />
        <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />
      </div>
    </WalletProvider>
  );
}

export default App;