import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';

interface QRCodeDisplayProps {
  data: string;
  size?: number;
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  margin?: number;
  className?: string;
}

const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({
  data,
  size = 300,
  errorCorrectionLevel = 'H',
  margin = 2,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
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
        type: 'image/svg+xml',
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

  // Render SVG if available
  if (svgString) {
    return (
      <div
        className={className}
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          background: 'white',
        }}
        dangerouslySetInnerHTML={{ __html: svgString }}
      />
    );
  }

  // Fallback to canvas
  return (
    <>
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
      {!isRendered && data && (
        <div className="text-xs text-gray-500 mt-2 text-center">
          QRコード生成中...
        </div>
      )}
    </>
  );
};

export default QRCodeDisplay;
