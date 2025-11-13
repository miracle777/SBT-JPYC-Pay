import React from 'react';
import { Home } from 'lucide-react';

const NotFound: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
      <div className="max-w-md mx-auto text-center">
        <h1 className="text-6xl font-bold text-gray-300 mb-4">404</h1>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">ページが見つかりません</h2>
        <p className="text-gray-600 mb-6">お探しのページは存在しません</p>
        <a
          href="/"
          className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
        >
          <Home className="w-4 h-4 inline mr-2" />
          ホームに戻る
        </a>
      </div>
    </div>
  );
};

export default NotFound;
