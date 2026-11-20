import { useEffect, useRef, useState } from 'react';
import { CameraOff, RefreshCw, X } from 'lucide-react';
import { decodeQrFromVideoFrame, type DecodeAttemptResult } from '../utils/qrDecoder';

interface CameraScannerProps {
  onDetected: (result: DecodeAttemptResult) => void;
  onClose: () => void;
}

export function CameraScanner({ onDetected, onClose }: CameraScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scratchCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const detectedRef = useRef(false);

  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [status, setStatus] = useState<'starting' | 'active' | 'error'>('starting');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    detectedRef.current = false;

    async function startCamera() {
      setStatus('starting');
      setErrorMessage('');

      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus('error');
        setErrorMessage('Camera access is not supported in this browser or requires an HTTPS connection.');
        return;
      }

      try {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play();
          setStatus('active');

          if (!scratchCanvasRef.current) {
            scratchCanvasRef.current = document.createElement('canvas');
          }

          let lastCheck = 0;
          const scanLoop = (now: number) => {
            if (cancelled || detectedRef.current) return;
            if (now - lastCheck >= 120 && video.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA) {
              lastCheck = now;
              const result = decodeQrFromVideoFrame(video, scratchCanvasRef.current!);
              if (result) {
                detectedRef.current = true;
                stream.getTracks().forEach((t) => t.stop());
                onDetected(result);
                return;
              }
            }
            rafRef.current = requestAnimationFrame(scanLoop);
          };

          rafRef.current = requestAnimationFrame(scanLoop);
        }
      } catch (err: unknown) {
        if (cancelled) return;
        setStatus('error');
        const msg = err instanceof Error ? err.message : '';
        if (msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('notallowed')) {
          setErrorMessage(
            'Camera permission was denied. Allow camera access in your browser settings, or upload/paste a photo instead.'
          );
        } else {
          setErrorMessage(
            'Could not access a camera on this device. You can still upload a photo or paste a screenshot.'
          );
        }
      }
    }

    startCamera();

    return () => {
      cancelled = true;
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [facingMode, onDetected]);

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131922] overflow-hidden">
      <div className="flex items-center justify-between gap-4 px-4 py-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Live Camera Scanner
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Point at a printed menu, poster, or screen QR code
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'))}
            className="min-h-[44px] px-3 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            title="Switch camera"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Flip</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors inline-flex items-center justify-center cursor-pointer"
            aria-label="Close camera"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {status === 'error' ? (
        <div className="p-8 text-center">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-3">
            <CameraOff className="w-6 h-6" />
          </div>
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-1">
            Camera Unavailable
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm mx-auto mb-5">
            {errorMessage}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer"
          >
            Back to Image Input
          </button>
        </div>
      ) : (
        <div className="relative bg-slate-950 aspect-[4/3] sm:aspect-[16/10] flex items-center justify-center overflow-hidden">
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className="w-full h-full object-cover"
          />
          {status === 'starting' && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-950/70 text-white text-sm font-medium">
              Starting camera...
            </div>
          )}
          {/* Minimal corner viewfinder guide */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-8">
            <div className="relative w-52 h-52 sm:w-60 sm:h-60">
              <span className="absolute top-0 left-0 w-7 h-7 border-t-2 border-l-2 border-white rounded-tl-lg" />
              <span className="absolute top-0 right-0 w-7 h-7 border-t-2 border-r-2 border-white rounded-tr-lg" />
              <span className="absolute bottom-0 left-0 w-7 h-7 border-b-2 border-l-2 border-white rounded-bl-lg" />
              <span className="absolute bottom-0 right-0 w-7 h-7 border-b-2 border-r-2 border-white rounded-br-lg" />
            </div>
          </div>
          <div className="pointer-events-none absolute bottom-3 inset-x-0 flex justify-center">
            <span className="px-3 py-1 rounded-lg bg-black/60 backdrop-blur-sm text-xs text-white/90">
              Processed locally on your device
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
