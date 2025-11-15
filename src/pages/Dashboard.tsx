import React from 'react';
import { Store, QrCode, Camera } from 'lucide-react';

const Dashboard: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          <Store className="w-16 h-16 text-indigo-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            SBT JPYC Pay
          </h1>
          <p className="text-gray-600 text-lg mb-8">
            スタンプカード発行・管理システム
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <a
              href="/payment"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              <QrCode className="inline-block w-5 h-5 mr-2 mb-1" />
              QR決済（店舗側）
            </a>
            <a
              href="/sbt"
              className="inline-block bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              SBT管理
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
