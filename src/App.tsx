import { Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import QRPayment from './pages/QRPayment';
import SBTManagement from './pages/SBTManagement';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';

function App() {
  return (
    <div className="App min-h-screen bg-gray-50">
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/payment" element={<QRPayment />} />
        <Route path="/sbt" element={<SBTManagement />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
}

export default App;