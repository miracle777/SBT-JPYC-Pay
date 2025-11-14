import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';

interface QRCodeDisplayProps {
  data: string;
  size?: number;
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  margin?: number;
  className?: string;
  onDownload?: (type: 'png' | 'svg') => void;
}

const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({
  data,
  size = 300,
  errorCorrectionLevel = 'H',
  margin = 2,
  className = '',
  onDownload,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const [svgString, setSvgString] = useState<string>('');
  const [isRendered, setIsRendered] = useState(false);

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
                  setIsRendered(true);
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
  }, [data, size, errorCorrectionLevel, margin]);

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
    } else if (type === 'png' && canvasRef.current) {
      const link = document.createElement('a');
      link.href = canvasRef.current.toDataURL('image/png');
      link.download = `qrcode-${Date.now()}.png`;
      link.click();
      onDownload?.('png');
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
          display: isRendered ? 'block' : 'block',
          background: '#ffffff',
          border: '1px solid #e5e7eb',
        }}
      />
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
