import React from 'react';
import { Bell, Menu, X } from 'lucide-react';
import { useWallet } from '../../hooks/useWallet';
import { formatAddress, getNetworkConfig } from '../../utils/helpers';
import { Button } from '../ui/Button';

export const Header: React.FC = () => {
  const { isConnected, address, chainId, balance } = useWallet();
  const [showMobileMenu, setShowMobileMenu] = React.useState(false);

  const networkConfig = chainId ? getNetworkConfig(chainId) : null;

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 px-4 py-3 flex items-center justify-between">
      {/* Mobile menu button */}
      <div className="md:hidden">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setShowMobileMenu(!showMobileMenu)}
        >
          {showMobileMenu ? <X size={20} /> : <Menu size={20} />}
        </Button>
      </div>

      {/* Title */}
      <div className="flex-1 md:flex-none">
        <h1 className="text-xl font-semibold text-gray-900 md:hidden">
          SBT Pay
        </h1>
      </div>

      {/* Right section */}
      <div className="flex items-center space-x-4">
        {/* Network & Account Info */}
        {isConnected && (
          <div className="hidden md:flex items-center space-x-4">
            {/* Network indicator */}
            {networkConfig && (
              <div className="flex items-center space-x-2 px-3 py-1.5 bg-gray-100 rounded-lg">
                <div 
                  className={`w-2 h-2 rounded-full ${
                    networkConfig.name === 'Polygon' ? 'bg-purple-500' :
                    networkConfig.name === 'Ethereum Mainnet' ? 'bg-blue-500' :
                    networkConfig.name === 'Avalanche' ? 'bg-red-500' :
                    'bg-gray-500'
                  }`}
                />
                <span className="text-sm text-gray-700 font-medium">
                  {networkConfig.name}
                </span>
              </div>
            )}

            {/* Account info */}
            <div className="flex items-center space-x-3 px-3 py-1.5 bg-gray-50 rounded-lg">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {formatAddress(address || '')}
                </p>
                <p className="text-xs text-gray-500">
                  {parseFloat(balance).toFixed(4)} ETH
                </p>
              </div>
              <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">
                  {address ? address[2].toUpperCase() : '?'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Notifications */}
        <Button variant="secondary" size="sm" className="relative">
          <Bell size={20} />
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
            3
          </span>
        </Button>

        {/* User menu */}
        <div className="relative">
          <Button variant="secondary" size="sm">
            <div className="w-6 h-6 bg-gray-300 rounded-full"></div>
          </Button>
        </div>
      </div>

      {/* Mobile menu overlay */}
      {showMobileMenu && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 md:hidden">
          <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-lg">
            {/* Mobile menu content would go here */}
            <div className="p-4">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowMobileMenu(false)}
                className="mb-4"
              >
                <X size={20} className="mr-2" />
                閉じる
              </Button>
              {/* Add mobile navigation items here */}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};