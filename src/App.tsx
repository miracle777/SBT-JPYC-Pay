import { Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import QRPayment from './pages/QRPayment';
import SBTManagement from './pages/SBTManagement';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';
import { WalletProvider } from './context/WalletContext';
import Header from './components/layout/Header';

function App() {
  return (
    <WalletProvider>
      <div className="App min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/payment" element={<QRPayment />} />
            <Route path="/sbt" element={<SBTManagement />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
      </div>
    </WalletProvider>
  );
}

export default App;