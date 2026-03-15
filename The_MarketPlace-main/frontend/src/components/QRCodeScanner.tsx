import { useEffect, useRef, useState } from 'react';
import QrScanner from 'qr-scanner';

export default function QRCodeScanner({ onResult, onClose }: { onResult: any, onClose: any }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<any>(null);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    scannerRef.current = new QrScanner(video, (result: any) => {
      try {
        onResult && onResult(result?.data || result);
      } catch (e: any) {
        console.error('qr result handler', e);
      }
    }, { returnDetailedScanResult: true } as any);

    QrScanner.hasCamera().then(has => {
      if (!has) setError('No camera found');
    }).catch(() => setError('Camera check failed'));

    scannerRef.current.start().catch((err: any) => {
      console.error('qr start err', err);
      setError('Unable to access camera');
    });

    return () => {
      try { scannerRef.current && scannerRef.current.stop(); } catch (e: any) { }
      scannerRef.current && scannerRef.current.destroy();
    };
  }, [onResult]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-lg overflow-hidden w-[90%] max-w-xl">
        <div className="p-2 flex justify-between items-center border-b">
          <h3 className="font-medium">Scan QR</h3>
          <button onClick={onClose} className="px-2 py-1 bg-gray-100 rounded">Close</button>
        </div>
        <div className="p-4">
          {error ? (
            <div className="text-red-500">{error}</div>
          ) : (
            <div className="w-full h-64 bg-black flex items-center justify-center">
              <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
