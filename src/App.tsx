import React, { Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LoadingSpinner } from './components/ui/LoadingSpinner';
import { Navigation } from './components/layout/Navigation';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';

// Lazy loading for better performance
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const ShopManagement = React.lazy(() => import('./pages/ShopManagement'));
const SBTManagement = React.lazy(() => import('./pages/SBTManagement'));
const QRPayment = React.lazy(() => import('./pages/QRPayment'));
const Settings = React.lazy(() => import('./pages/Settings'));
const About = React.lazy(() => import('./pages/About'));
const NotFound = React.lazy(() => import('./pages/NotFound'));

function App() {
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Header */}
        <Header />
        
        <div className="flex flex-1">
          {/* Navigation Sidebar */}
          <Navigation />
          
          {/* Main Content */}
          <main className="flex-1 p-4 md:p-6 lg:p-8">
            <Suspense fallback={<LoadingSpinner />}>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/shops" element={<ShopManagement />} />
                <Route path="/sbt" element={<SBTManagement />} />
                <Route path="/payment" element={<QRPayment />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/about" element={<About />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </main>
        </div>
        
        {/* Footer */}
        <Footer />
      </div>
    </ErrorBoundary>
  );
}

export default App;