import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';

interface QRCodeDisplayProps {
  data: string;
  size?: number;
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  margin?: number;
  className?: string;
  onDownload?: (type: 'png' | 'svg') => void;
  logoUrl?: string; // 中央に表示するロゴのURL
  logoSize?: number; // ロゴのサイズ（QRコードサイズに対する割合、デフォルト0.2 = 20%）
}

const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({
  data,
  size = 300,
  errorCorrectionLevel = 'H',
  margin = 2,
  className = '',
  onDownload,
  logoUrl,
  logoSize = 0.2,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const [svgString, setSvgString] = useState<string>('');
  const [isRendered, setIsRendered] = useState(false);
  const finalCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    console.log('QRCodeDisplay useEffect - data:', data?.substring(0, 50));
    
    if (!data) {
      console.warn('QRCodeDisplay: Missing data');
      return;
    }

    // Try SVG generation first as it's more reliable
    QRCode.toString(
      data,
      {
        errorCorrectionLevel: errorCorrectionLevel,
        type: 'svg' as any,
        width: size,
        margin: margin,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      },
      (error, svg) => {
        if (error) {
          console.error('QRコード(SVG)生成エラー:', error);
          // Fallback to canvas
          if (canvasRef.current) {
            QRCode.toCanvas(
              canvasRef.current,
              data,
              {
                errorCorrectionLevel: errorCorrectionLevel,
                margin: margin,
                width: size,
                color: {
                  dark: '#000000',
                  light: '#FFFFFF',
                },
              },
              (canvasError) => {
                if (canvasError) {
                  console.error('QRコード(Canvas)生成エラー:', canvasError);
                } else {
                  console.log('QRコード(Canvas)生成成功！');
                  // ロゴを中央に配置
                  if (logoUrl && canvasRef.current) {
                    addLogoToCanvas(canvasRef.current);
                  } else {
                    setIsRendered(true);
                  }
                }
              }
            );
          }
        } else {
          console.log('QRコード(SVG)生成成功！');
          setSvgString(svg);
          setIsRendered(true);
        }
      }
    );
  }, [data, size, errorCorrectionLevel, margin, logoUrl]);

  // QRコードの中央にロゴを追加する関数
  const addLogoToCanvas = (qrCanvas: HTMLCanvasElement) => {
    if (!logoUrl || !finalCanvasRef.current) {
      setIsRendered(true);
      return;
    }

    const logo = new Image();
    logo.crossOrigin = 'anonymous';
    logo.onload = () => {
      const canvas = finalCanvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // QRコードをコピー
      canvas.width = qrCanvas.width;
      canvas.height = qrCanvas.height;
      ctx.drawImage(qrCanvas, 0, 0);

      // ロゴのサイズを計算
      const logoPixelSize = qrCanvas.width * logoSize;
      const logoX = (qrCanvas.width - logoPixelSize) / 2;
      const logoY = (qrCanvas.height - logoPixelSize) / 2;

      // 白い背景を描画（ロゴの視認性向上）
      const padding = logoPixelSize * 0.1;
      ctx.fillStyle = 'white';
      ctx.fillRect(
        logoX - padding,
        logoY - padding,
        logoPixelSize + padding * 2,
        logoPixelSize + padding * 2
      );

      // ロゴを描画
      ctx.drawImage(logo, logoX, logoY, logoPixelSize, logoPixelSize);
      
      setIsRendered(true);
      console.log('QRコードにロゴを追加しました');
    };
    logo.onerror = () => {
      console.warn('ロゴ画像の読み込みに失敗しました。ロゴなしで表示します。');
      setIsRendered(true);
    };
    logo.src = logoUrl;
  };

  const downloadQRCode = (type: 'png' | 'svg') => {
    if (type === 'svg' && svgString) {
      const blob = new Blob([svgString], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `qrcode-${Date.now()}.svg`;
      link.click();
      URL.revokeObjectURL(url);
      onDownload?.('svg');
    } else if (type === 'png') {
      // ロゴ付きの場合はfinalCanvasを使用
      const canvas = logoUrl && finalCanvasRef.current ? finalCanvasRef.current : canvasRef.current;
      if (canvas) {
        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/png');
        link.download = `qrcode-${Date.now()}.png`;
        link.click();
        onDownload?.('png');
      }
    }
  };

  // Render SVG if available
  if (svgString) {
    return (
      <div className="flex flex-col gap-2">
        <div
          ref={svgContainerRef}
          className={className}
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            background: 'white',
          }}
          dangerouslySetInnerHTML={{ __html: svgString }}
        />
        <div className="flex gap-2 justify-center text-xs">
          <button
            onClick={() => downloadQRCode('png')}
            className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-700"
          >
            PNG
          </button>
          <button
            onClick={() => downloadQRCode('svg')}
            className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-700"
          >
            SVG
          </button>
        </div>
      </div>
    );
  }

  // Fallback to canvas
  return (
    <div className="flex flex-col gap-2">
      <canvas
        ref={canvasRef}
        className={className}
        style={{
          maxWidth: '100%',
          height: 'auto',
          display: logoUrl ? 'none' : (isRendered ? 'block' : 'block'),
          background: '#ffffff',
          border: '1px solid #e5e7eb',
        }}
      />
      {logoUrl && (
        <canvas
          ref={finalCanvasRef}
          className={className}
          style={{
            maxWidth: '100%',
            height: 'auto',
            display: isRendered ? 'block' : 'none',
            background: '#ffffff',
            border: '1px solid #e5e7eb',
          }}
        />
      )}
      {isRendered && (
        <div className="flex gap-2 justify-center text-xs">
          <button
            onClick={() => downloadQRCode('png')}
            className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-700"
          >
            PNG
          </button>
        </div>
      )}
      {!isRendered && data && (
        <div className="text-xs text-gray-500 mt-2 text-center">
          QRコード生成中...
        </div>
      )}
    </div>
  );
};

export default QRCodeDisplay;
