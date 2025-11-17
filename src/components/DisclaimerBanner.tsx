import React, { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

export const DisclaimerBanner: React.FC = () => {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div className="bg-amber-50 border-l-4 border-amber-400 px-6 py-4">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <AlertTriangle className="h-5 w-5 text-amber-400" />
        </div>
        <div className="ml-3 flex-1">
          <div className="text-sm text-amber-700">
            <p className="font-semibold mb-1">重要：テストバージョンです</p>
            <p className="text-xs">
              このアプリはデモ・テスト目的です。本番環境での利用は推奨されません。
              <strong>必ずテストネット（Polygon Amoy等）でのみご利用ください。</strong>
              本アプリにはウォレット機能がありません。残高やSBTはお客様のウォレットで管理されます。
              詳細は
              <a 
                href="https://raw.githubusercontent.com/miracle777/SBT-JPYC-Pay/main/PRIVACY_POLICY.md" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="underline hover:text-amber-800 ml-1"
              >
                プライバシーポリシー
              </a>
              をご確認ください。
            </p>
          </div>
        </div>
        <div className="ml-auto pl-3">
          <div className="-mx-1.5 -my-1.5">
            <button
              type="button"
              onClick={() => setIsVisible(false)}
              className="inline-flex rounded-md bg-amber-50 p-1.5 text-amber-500 hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-600 focus:ring-offset-2 focus:ring-offset-amber-50"
            >
              <span className="sr-only">閉じる</span>
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};