import React from 'react';
import { Settings as SettingsIcon } from 'lucide-react';

const Settings: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="flex items-center space-x-4 mb-6">
            <SettingsIcon className="w-8 h-8 text-gray-600" />
            <h1 className="text-2xl font-bold text-gray-900">設定</h1>
          </div>
          <p className="text-gray-600">店舗情報・セキュリティ・ネットワーク設定</p>
        </div>
      </div>
    </div>
  );
};

export default Settings;
