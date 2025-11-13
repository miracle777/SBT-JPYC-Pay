import React from 'react';
import { QrCode } from 'lucide-react';

const QRPayment: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="flex items-center space-x-4 mb-6">
            <QrCode className="w-8 h-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">QR決済</h1>
          </div>
          <p className="text-gray-600">JPYC対応のQRコード決済を生成・管理します</p>
        </div>
      </div>
    </div>
  );
};

export default QRPayment;
