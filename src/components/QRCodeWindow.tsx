import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import QRCodeDisplay from './QRCodeDisplay';

interface QRCodeWindowProps {
  sessionId: string;
  qrData: string;
  amount: number;
  shopName: string;
  chainName: string;
  onClose: () => void;
}

const QRCodeWindow: React.FC<QRCodeWindowProps> = ({
  sessionId,
  qrData,
  amount,
  shopName,
  chainName,
  onClose,
}) => {
  useEffect(() => {
    // 自動でフルスクリーン表示用に調整
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.body.style.backgroundColor = '#ffffff';

    return () => {
      document.body.style.margin = '';
      document.body.style.padding = '';
    };
  }, []);

  const downloadQR = () => {
    const qrElement = document.getElementById('qr-code-display');
    if (qrElement) {
      const canvas = qrElement.querySelector('canvas');
      if (canvas) {
        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/png');
        link.download = `qr-payment-${sessionId}.png`;
        link.click();
      }
    }
  };

  const printQR = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex flex-col items-center justify-center p-4">
      {/* ヘッダー */}
      <div className="absolute top-0 left-0 right-0 bg-white shadow-md p-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{shopName}</h1>
          <p className="text-sm text-gray-600 mt-1">ネットワーク: {chainName}</p>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-lg transition"
          title="閉じる"
        >
          <X className="w-6 h-6 text-gray-600" />
        </button>
      </div>

      {/* メインコンテンツ */}
      <div className="mt-24 flex flex-col items-center">
        {/* QRコード表示 */}
        <div className="bg-white rounded-xl shadow-2xl p-8 mb-8">
          <div id="qr-code-display" className="flex items-center justify-center">
            <QRCodeDisplay
              data={qrData}
              size={400}
              errorCorrectionLevel="H"
              onDownload={() => downloadQR()}
            />
          </div>
        </div>

        {/* 支払い情報 */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8 max-w-md w-full">
          <div className="text-center">
            <p className="text-gray-600 text-sm mb-2">支払い金額</p>
            <p className="text-4xl font-bold text-purple-600 mb-2">{amount}</p>
            <p className="text-gray-600 text-lg">JPYC</p>
            <p className="text-xs text-gray-500 mt-4">
              セッションID: {sessionId.slice(0, 16)}...
            </p>
          </div>
        </div>

        {/* 操作ボタン */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={downloadQR}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition duration-200 flex items-center gap-2"
          >
            💾 ダウンロード
          </button>
          <button
            onClick={printQR}
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition duration-200 flex items-center gap-2"
          >
            🖨️ 印刷
          </button>
        </div>

        {/* 説明文 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md text-center">
          <p className="text-sm text-blue-900">
            お客様に上記のQRコードを読み込んでいただき、支払いを実行してください。
          </p>
        </div>
      </div>

      {/* フッター */}
      <div className="absolute bottom-4 right-4 text-xs text-gray-500">
        SBT masaru21 Pay - QR Display Window
      </div>

      {/* 印刷用スタイル */}
      <style>{`
        @media print {
          body {
            background: white;
            margin: 0;
            padding: 0;
          }
          .no-print {
            display: none !important;
          }
          #qr-code-display {
            display: flex !important;
            align-items: center;
            justify-content: center;
            page-break-inside: avoid;
          }
        }
      `}</style>
    </div>
  );
};

export default QRCodeWindow;
