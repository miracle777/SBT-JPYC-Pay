import React from 'react';
import { Link } from 'react-router-dom';
import { Store, Menu, X, HelpCircle } from 'lucide-react';
import { WalletButton } from '../WalletButton';
import { useState } from 'react';

interface HeaderProps {
  onHelpClick?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onHelpClick }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-3 xs:px-4 sm:px-6 py-2 xs:py-3 sm:py-4 landscape:py-2">
        <div className="flex items-center justify-between gap-2 xs:gap-3 sm:gap-4">
          {/* ロゴ */}
          <Link to="/" className="flex items-center gap-1.5 xs:gap-2 hover:opacity-80 transition flex-shrink-0">
            <Store className="w-6 h-6 xs:w-7 xs:h-7 sm:w-8 sm:h-8 text-blue-600" />
            <span className="text-lg xs:text-xl sm:text-2xl font-bold text-gray-900 hidden xs:inline">
              SBT JPYC Pay
            </span>
            <span className="text-base font-bold text-blue-600 xs:hidden">
              SBT Pay
            </span>
          </Link>

          {/* デスクトップナビゲーション */}
          <nav className="hidden md:flex items-center gap-6">
            <Link
              to="/"
              className="text-gray-600 hover:text-gray-900 font-medium transition"
            >
              ダッシュボード
            </Link>
            <Link
              to="/qr-payment"
              className="text-gray-600 hover:text-gray-900 font-medium transition"
            >
              QR決済
            </Link>
            <Link
              to="/sbt-management"
              className="text-gray-600 hover:text-gray-900 font-medium transition"
            >
              SBT管理
            </Link>
            <Link
              to="/settings"
              className="text-gray-600 hover:text-gray-900 font-medium transition"
            >
              設定
            </Link>
          </nav>

          {/* ウォレットボタン、FAQボタン、メニューボタン */}
          <div className="flex items-center gap-1.5 xs:gap-2 sm:gap-4 flex-shrink-0">
            {onHelpClick && (
              <button
                onClick={onHelpClick}
                className="p-1.5 xs:p-2 hover:bg-gray-100 rounded-lg transition text-gray-600 hover:text-gray-900"
                title="ヘルプ"
              >
                <HelpCircle className="w-5 h-5 xs:w-6 xs:h-6" />
              </button>
            )}
            <div className="xs:block hidden md:block">
              <WalletButton />
            </div>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-1.5 xs:p-2 hover:bg-gray-100 rounded-lg transition relative z-50"
            >
              {isMenuOpen ? (
                <X className="w-5 h-5 xs:w-6 xs:h-6" />
              ) : (
                <Menu className="w-5 h-5 xs:w-6 xs:h-6" />
              )}
            </button>
          </div>
        </div>

        {/* モバイルナビゲーション */}
        {isMenuOpen && (
          <nav className="md:hidden mt-3 xs:mt-4 space-y-1 xs:space-y-2 border-t border-gray-200 pt-3 xs:pt-4 landscape:mt-2 landscape:pt-2 relative z-40 overflow-x-hidden">
            <Link
              to="/"
              className="block px-3 xs:px-4 py-1.5 xs:py-2 text-sm xs:text-base text-gray-600 hover:bg-gray-100 rounded-lg transition truncate"
              onClick={() => setIsMenuOpen(false)}
            >
              ダッシュボード
            </Link>
            <Link
              to="/qr-payment"
              className="block px-3 xs:px-4 py-1.5 xs:py-2 text-sm xs:text-base text-gray-600 hover:bg-gray-100 rounded-lg transition truncate"
              onClick={() => setIsMenuOpen(false)}
            >
              QR決済
            </Link>
            <Link
              to="/sbt-management"
              className="block px-3 xs:px-4 py-1.5 xs:py-2 text-sm xs:text-base text-gray-600 hover:bg-gray-100 rounded-lg transition truncate"
              onClick={() => setIsMenuOpen(false)}
            >
              SBT管理
            </Link>
            <Link
              to="/settings"
              className="block px-3 xs:px-4 py-1.5 xs:py-2 text-sm xs:text-base text-gray-600 hover:bg-gray-100 rounded-lg transition truncate"
              onClick={() => setIsMenuOpen(false)}
            >
              設定
            </Link>
            {onHelpClick && (
              <button
                onClick={() => {
                  onHelpClick();
                  setIsMenuOpen(false);
                }}
                className="w-full text-left px-3 xs:px-4 py-1.5 xs:py-2 text-sm xs:text-base text-gray-600 hover:bg-gray-100 rounded-lg transition flex items-center gap-2 truncate"
              >
                <HelpCircle className="w-4 h-4 xs:w-5 xs:h-5 flex-shrink-0" />
                <span className="truncate">ヘルプ</span>
              </button>
            )}
          </nav>
        )}
      </div>
    </header>
  );
};

export default Header;