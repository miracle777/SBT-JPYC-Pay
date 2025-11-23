import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';
import { 
  Home,
  Store,
  Award,
  QrCode,
  Settings,
  Info,
  Wallet
} from 'lucide-react';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Button } from '../ui/Button';

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ to, icon, label, isActive }) => (
  <Link
    to={to}
    className={clsx(
      'flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-200',
      isActive
        ? 'bg-primary-100 text-primary-700 border-r-2 border-primary-500'
        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
    )}
  >
    <span className="mr-3">{icon}</span>
    <span>{label}</span>
  </Link>
);

export const Navigation: React.FC = () => {
  const location = useLocation();
  const { isConnected, address } = useAccount();
  
  const navItems = [
    { to: '/', icon: <Home size={20} />, label: 'ダッシュボード' },
    { to: '/qr-payment', icon: <QrCode size={20} />, label: 'QR決済' },
    { to: '/sbt', icon: <Award size={20} />, label: 'SBT管理' },
    { to: '/settings', icon: <Settings size={20} />, label: '設定' },
  ];

  return (
    <nav className="w-64 bg-white shadow-sm border-r border-gray-200 flex flex-col">
      {/* Logo Section */}
      <div className="p-6 border-b border-gray-200">
        <Link to="/" className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
            <Award className="text-white" size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">SBT Pay</h1>
            <p className="text-xs text-gray-500">店舗管理システム</p>
          </div>
        </Link>
      </div>

      {/* Wallet Connection Section */}
      <div className="p-4 border-b border-gray-200">
        {isConnected && address ? (
          <div className="space-y-3">
            <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-green-800">接続済み</p>
                <p className="text-xs text-green-600 truncate">
                  {`${address.slice(0, 6)}...${address.slice(-4)}`}
                </p>
              </div>
            </div>
            <div className="w-full">
              <ConnectButton.Custom>
                {({ openAccountModal }) => (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={openAccountModal}
                    className="w-full"
                  >
                    <Wallet size={16} className="mr-2" />
                    アカウント管理
                  </Button>
                )}
              </ConnectButton.Custom>
            </div>
          </div>
        ) : (
          <div className="w-full">
            <ConnectButton.Custom>
              {({ openConnectModal, connectModalOpen }) => (
                <Button 
                  variant="primary" 
                  size="sm" 
                  onClick={openConnectModal} 
                  loading={connectModalOpen}
                  className="w-full"
                >
                  <Wallet size={16} className="mr-2" />
                  {connectModalOpen ? '接続中...' : 'ウォレット接続'}
                </Button>
              )}
            </ConnectButton.Custom>
          </div>
        )}
      </div>

      {/* Navigation Items */}
      <div className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        {navItems.map((item) => (
          <NavItem
            key={item.to}
            to={item.to}
            icon={item.icon}
            label={item.label}
            isActive={location.pathname === item.to}
          />
        ))}
      </div>

      {/* Footer Section */}
      <div className="p-4 border-t border-gray-200">
        <div className="text-xs text-gray-500 text-center">
          <p>SBT masaru21 Pay(仮) v1.0.0</p>
          <p className="mt-1">© 2024 miracle777</p>
        </div>
      </div>
    </nav>
  );
};