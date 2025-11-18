import React, { useState, useEffect } from 'react';
import { Database, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Button } from './ui/Button';
import { sbtStorage } from '../utils/storage';

interface StorageTestResult {
  localStorageWorks: boolean;
  indexedDBWorks: boolean;
  crossContextSharing: 'unknown' | 'shared' | 'isolated';
  environment: 'browser' | 'pwa' | 'unknown';
  testData?: any;
}

export const StorageCompatibilityChecker: React.FC = () => {
  const [testResult, setTestResult] = useState<StorageTestResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const detectEnvironment = (): 'browser' | 'pwa' | 'unknown' => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return 'pwa';
    } else if ((window.navigator as any).standalone === true) {
      return 'pwa'; // iOS Safari
    }
    return 'browser';
  };

  const runStorageTest = async () => {
    setIsLoading(true);
    
    const result: StorageTestResult = {
      localStorageWorks: false,
      indexedDBWorks: false,
      crossContextSharing: 'unknown',
      environment: detectEnvironment()
    };

    try {
      // localStorage テスト
      const testKey = 'storage-test-' + Date.now();
      const testValue = { test: true, timestamp: Date.now(), environment: result.environment };
      
      localStorage.setItem(testKey, JSON.stringify(testValue));
      const retrieved = localStorage.getItem(testKey);
      
      if (retrieved && JSON.parse(retrieved).test === true) {
        result.localStorageWorks = true;
      }
      
      localStorage.removeItem(testKey);
      
      // IndexedDB テスト
      try {
        await sbtStorage.initDB();
        
        // テストテンプレートを作成
        const testTemplate = {
          id: 'test-template-' + Date.now(),
          shopId: 9999,
          name: 'テストテンプレート',
          description: 'ストレージ互換性テスト用',
          issuePattern: 'per_payment' as const,
          maxStamps: 1,
          rewardDescription: 'テスト報酬',
          imageUrl: '',
          imageMimeType: 'image/jpeg',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        await sbtStorage.saveTemplate(testTemplate);
        const allTemplates = await sbtStorage.getAllTemplates();
        const retrievedTemplate = allTemplates.find(t => t.id === testTemplate.id);
        
        if (retrievedTemplate && retrievedTemplate.id === testTemplate.id) {
          result.indexedDBWorks = true;
          result.testData = {
            templateSaved: true,
            templateId: testTemplate.id
          };
        }
        
        // テストデータクリーンアップ
        await sbtStorage.deleteTemplate(testTemplate.id);
        
      } catch (idbError) {
        console.warn('IndexedDB テストエラー:', idbError);
        result.indexedDBWorks = false;
      }

      // 既存データの確認（共有状況判定）
      try {
        const existingTemplates = await sbtStorage.getAllTemplates();
        const existingWalletInfo = localStorage.getItem('walletAddress');
        
        if (existingTemplates.length > 0 || existingWalletInfo) {
          result.crossContextSharing = 'shared';
          result.testData = {
            ...result.testData,
            existingTemplates: existingTemplates.length,
            hasWalletInfo: !!existingWalletInfo
          };
        } else {
          // 新規状態または分離されている
          result.crossContextSharing = 'unknown';
        }
      } catch (error) {
        console.warn('既存データ確認エラー:', error);
      }

    } catch (error) {
      console.error('ストレージテストエラー:', error);
    }

    setTestResult(result);
    setIsLoading(false);
  };

  useEffect(() => {
    // 初回ロード時に自動テスト実行
    runStorageTest();
  }, []);

  const getStatusIcon = (works: boolean) => {
    return works ? (
      <CheckCircle2 className="w-5 h-5 text-green-600" />
    ) : (
      <AlertTriangle className="w-5 h-5 text-red-600" />
    );
  };

  const getSharingStatusText = (status: string, environment: string) => {
    switch (status) {
      case 'shared':
        return `✅ ${environment === 'pwa' ? 'PWA' : 'ブラウザ'}と共有されています`;
      case 'isolated':
        return `⚠️ ${environment === 'pwa' ? 'PWA' : 'ブラウザ'}で分離されています`;
      case 'unknown':
        return '🔍 共有状況を判定中（データが不十分）';
      default:
        return '❓ 不明';
    }
  };

  return (
    <div className="bg-white border rounded-lg p-4 mb-4">
      <div className="flex items-center gap-2 mb-4">
        <Database className="w-5 h-5 text-blue-600" />
        <h3 className="font-semibold">ストレージ互換性チェック</h3>
        <Button
          onClick={runStorageTest}
          disabled={isLoading}
          variant="outline"
          className="ml-auto text-xs py-1 px-2"
        >
          <RefreshCw className={`w-3 h-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
          再テスト
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">テスト実行中...</span>
        </div>
      ) : testResult ? (
        <div className="space-y-3">
          {/* 環境情報 */}
          <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
            <span className="text-sm font-medium">現在の環境:</span>
            <span className={`text-sm font-bold ${
              testResult.environment === 'pwa' ? 'text-purple-600' : 'text-blue-600'
            }`}>
              {testResult.environment === 'pwa' ? '📱 PWA' : '🌐 ブラウザ'}
            </span>
          </div>

          {/* ストレージ機能テスト結果 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex items-center justify-between p-2 border rounded">
              {getStatusIcon(testResult.localStorageWorks)}
              <div className="flex-1 ml-2">
                <div className="text-sm font-medium">localStorage</div>
                <div className="text-xs text-gray-500">設定・ウォレット情報</div>
              </div>
            </div>

            <div className="flex items-center justify-between p-2 border rounded">
              {getStatusIcon(testResult.indexedDBWorks)}
              <div className="flex-1 ml-2">
                <div className="text-sm font-medium">IndexedDB</div>
                <div className="text-xs text-gray-500">テンプレート・画像</div>
              </div>
            </div>
          </div>

          {/* データ共有状況 */}
          <div className="p-3 border rounded-lg bg-blue-50">
            <div className="text-sm font-medium text-blue-900 mb-1">
              データ共有状況
            </div>
            <div className="text-xs text-blue-800">
              {getSharingStatusText(testResult.crossContextSharing, testResult.environment)}
            </div>
            
            {testResult.testData && (
              <div className="mt-2 text-xs text-blue-700">
                {testResult.testData.existingTemplates !== undefined && (
                  <div>📄 既存テンプレート: {testResult.testData.existingTemplates}件</div>
                )}
                {testResult.testData.hasWalletInfo && (
                  <div>👛 ウォレット情報: 保存済み</div>
                )}
              </div>
            )}
          </div>

          {/* 推奨事項 */}
          {testResult.crossContextSharing === 'shared' ? (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="text-sm text-green-800">
                ✅ <strong>データは共有されています！</strong><br />
                PWAとブラウザ間でテンプレートやウォレット設定が同期されます。
              </div>
            </div>
          ) : (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="text-sm text-amber-800">
                ⚠️ <strong>データ共有の確認が必要</strong><br />
                PWAとブラウザで異なるストレージ領域を使用している可能性があります。
                エクスポート/インポート機能でデータを移行することをお勧めします。
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-4 text-gray-500">
          テスト結果を読み込み中...
        </div>
      )}
    </div>
  );
};

export default StorageCompatibilityChecker;