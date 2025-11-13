import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from './ui/Button';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });

    // ここで外部のエラー追跡サービスにエラーを送信可能
    // 例: Sentry, LogRocket, etc.
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="text-red-600" size={32} />
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              エラーが発生しました
            </h1>
            
            <p className="text-gray-600 mb-6">
              申し訳ございませんが、アプリケーションでエラーが発生しました。
              ページをリロードするか、ホームページに戻ってお試しください。
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="text-left mb-6 p-4 bg-gray-100 rounded-lg">
                <summary className="cursor-pointer text-sm font-medium text-gray-700 mb-2">
                  エラー詳細（開発環境のみ）
                </summary>
                <pre className="text-xs text-red-600 overflow-auto">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="primary"
                onClick={this.handleReload}
                className="flex-1"
              >
                <RefreshCw size={18} className="mr-2" />
                ページをリロード
              </Button>
              
              <Button
                variant="outline"
                onClick={this.handleGoHome}
                className="flex-1"
              >
                <Home size={18} className="mr-2" />
                ホームに戻る
              </Button>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                この問題が継続する場合は、サポートまでお問い合わせください。
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook版のエラーハンドリング（関数コンポーネント用）
export const useErrorHandler = () => {
  return React.useCallback((error: Error, errorInfo?: string) => {
    console.error('Error caught by useErrorHandler:', error);
    
    // エラーの処理ロジック
    // 例：エラー追跡サービスへの送信、ユーザー通知など
    
    // 開発環境でのエラー表示
    if (process.env.NODE_ENV === 'development') {
      console.group('Error Details');
      console.error('Error:', error);
      console.error('Additional Info:', errorInfo);
      console.groupEnd();
    }
  }, []);
};