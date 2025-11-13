import React from 'react';
import { Award } from 'lucide-react';

const SBTManagement: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="flex items-center space-x-4 mb-6">
            <Award className="w-8 h-8 text-purple-600" />
            <h1 className="text-2xl font-bold text-gray-900">SBT管理</h1>
          </div>
          <p className="text-gray-600">スタンプカードテンプレートの作成・管理と発行</p>
        </div>
      </div>
    </div>
  );
};

export default SBTManagement;
