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
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* ロゴ */}
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition">
            <Store className="w-8 h-8 text-blue-600" />
            <span className="text-2xl font-bold text-gray-900">SBT JPYC Pay</span>
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
              to="/payment"
              className="text-gray-600 hover:text-gray-900 font-medium transition"
            >
              QR決済
            </Link>
            <Link
              to="/sbt"
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
          <div className="flex items-center gap-4">
            {onHelpClick && (
              <button
                onClick={onHelpClick}
                className="p-2 hover:bg-gray-100 rounded-lg transition text-gray-600 hover:text-gray-900"
                title="ヘルプ"
              >
                <HelpCircle className="w-6 h-6" />
              </button>
            )}
            <WalletButton />
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition"
            >
              {isMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>

        {/* モバイルナビゲーション */}
        {isMenuOpen && (
          <nav className="md:hidden mt-4 space-y-2 border-t border-gray-200 pt-4">
            <Link
              to="/"
              className="block px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
              onClick={() => setIsMenuOpen(false)}
            >
              ダッシュボード
            </Link>
            <Link
              to="/payment"
              className="block px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
              onClick={() => setIsMenuOpen(false)}
            >
              QR決済
            </Link>
            <Link
              to="/sbt"
              className="block px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
              onClick={() => setIsMenuOpen(false)}
            >
              SBT管理
            </Link>
            <Link
              to="/settings"
              className="block px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
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
                className="w-full text-left px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition flex items-center gap-2"
              >
                <HelpCircle className="w-5 h-5" />
                ヘルプ
              </button>
            )}
          </nav>
        )}
      </div>
    </header>
  );
};

export default Header;