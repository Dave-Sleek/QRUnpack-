import { useEffect, useRef, useState } from 'react';
import { Crop, RotateCcw, ScanSearch, Upload } from 'lucide-react';
import type { CropRect } from '../types';

interface CropRetryToolProps {
  imageUrl: string;
  errorMessage?: string;
  onRetryCrop: (crop: CropRect) => void;
  onResetImage: () => void;
}

interface NormalizedBox {
  x: number; // 0..1
  y: number; // 0..1
  w: number; // 0..1
  h: number; // 0..1
}

type DragMode = 'move' | 'nw' | 'ne' | 'sw' | 'se' | 'draw' | null;

const DEFAULT_BOX: NormalizedBox = { x: 0.2, y: 0.2, w: 0.6, h: 0.6 };

export function CropRetryTool({
  imageUrl,
  errorMessage,
  onRetryCrop,
  onResetImage,
}: CropRetryToolProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const [box, setBox] = useState<NormalizedBox>(DEFAULT_BOX);
  const [dragMode, setDragMode] = useState<DragMode>(null);
  const dragStartRef = useRef<{
    clientX: number;
    clientY: number;
    startBox: NormalizedBox;
    originX: number;
    originY: number;
  } | null>(null);

  useEffect(() => {
    setBox(DEFAULT_BOX);
  }, [imageUrl]);

  const getRelativePoint = (clientX: number, clientY: number) => {
    const el = containerRef.current;
    if (!el) return { rx: 0, ry: 0 };
    const rect = el.getBoundingClientRect();
    const rx = Math.max(0, Math.min(1, (clientX - rect.left) / Math.max(1, rect.width)));
    const ry = Math.max(0, Math.min(1, (clientY - rect.top) / Math.max(1, rect.height)));
    return { rx, ry };
  };

  const beginDrag = (mode: DragMode, e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const { rx, ry } = getRelativePoint(e.clientX, e.clientY);
    setDragMode(mode);
    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      startBox: { ...box },
      originX: rx,
      originY: ry,
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragMode || !dragStartRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const dx = (e.clientX - dragStartRef.current.clientX) / Math.max(1, rect.width);
    const dy = (e.clientY - dragStartRef.current.clientY) / Math.max(1, rect.height);
    const s = dragStartRef.current.startBox;
    const minSize = 0.08;

    if (dragMode === 'move') {
      const nextX = Math.max(0, Math.min(1 - s.w, s.x + dx));
      const nextY = Math.max(0, Math.min(1 - s.h, s.y + dy));
      setBox({ ...s, x: nextX, y: nextY });
      return;
    }

    if (dragMode === 'draw') {
      const { rx, ry } = getRelativePoint(e.clientX, e.clientY);
      const x1 = Math.min(dragStartRef.current.originX, rx);
      const y1 = Math.min(dragStartRef.current.originY, ry);
      const x2 = Math.max(dragStartRef.current.originX, rx);
      const y2 = Math.max(dragStartRef.current.originY, ry);
      setBox({
        x: x1,
        y: y1,
        w: Math.max(minSize, x2 - x1),
        h: Math.max(minSize, y2 - y1),
      });
      return;
    }

    let { x, y, w, h } = s;
    if (dragMode.includes('e')) {
      w = Math.max(minSize, Math.min(1 - x, s.w + dx));
    }
    if (dragMode.includes('s')) {
      h = Math.max(minSize, Math.min(1 - y, s.h + dy));
    }
    if (dragMode.includes('w')) {
      const newX = Math.max(0, Math.min(s.x + s.w - minSize, s.x + dx));
      w = s.x + s.w - newX;
      x = newX;
    }
    if (dragMode.includes('n')) {
      const newY = Math.max(0, Math.min(s.y + s.h - minSize, s.y + dy));
      h = s.y + s.h - newY;
      y = newY;
    }
    setBox({ x, y, w, h });
  };

  const endDrag = () => {
    setDragMode(null);
    dragStartRef.current = null;
  };

  const handleScanCrop = () => {
    const img = imgRef.current;
    if (!img || !img.naturalWidth || !img.naturalHeight) return;
    onRetryCrop({
      x: box.x * img.naturalWidth,
      y: box.y * img.naturalHeight,
      width: box.w * img.naturalWidth,
      height: box.h * img.naturalHeight,
    });
  };

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131922] p-4 sm:p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
            <Crop className="w-4 h-4 shrink-0" />
            <h3 className="text-sm font-semibold">
              {errorMessage ? 'No QR Code Detected Automatically' : 'Crop & Re-Scan Region'}
            </h3>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            {errorMessage ||
              'Drag the blue box tightly around the QR code (leave a small margin around its edges) and tap Scan Cropped Region.'}
          </p>
        </div>
        <button
          type="button"
          onClick={onResetImage}
          className="min-h-[40px] px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>New Image</span>
        </button>
      </div>

      <div className="flex justify-center bg-slate-100 dark:bg-slate-900/70 rounded-xl p-2 sm:p-3 border border-slate-200/80 dark:border-slate-800">
        <div
          ref={containerRef}
          onPointerDown={(e) => beginDrag('draw', e)}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          className="relative inline-block max-w-full max-h-[380px] select-none touch-none overflow-hidden rounded-lg cursor-crosshair"
        >
          <img
            ref={imgRef}
            src={imageUrl}
            alt="Uploaded screenshot for QR cropping"
            draggable={false}
            className="block max-w-full max-h-[380px] w-auto h-auto object-contain pointer-events-none"
          />

          {/* Dimmed backdrop around crop box using 4 edge masks */}
          <div
            className="pointer-events-none absolute inset-x-0 top-0 bg-slate-950/55"
            style={{ height: `${box.y * 100}%` }}
          />
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 bg-slate-950/55"
            style={{ top: `${(box.y + box.h) * 100}%` }}
          />
          <div
            className="pointer-events-none absolute left-0 bg-slate-950/55"
            style={{
              top: `${box.y * 100}%`,
              height: `${box.h * 100}%`,
              width: `${box.x * 100}%`,
            }}
          />
          <div
            className="pointer-events-none absolute right-0 bg-slate-950/55"
            style={{
              top: `${box.y * 100}%`,
              height: `${box.h * 100}%`,
              left: `${(box.x + box.w) * 100}%`,
            }}
          />

          {/* Active crop selection box */}
          <div
            onPointerDown={(e) => beginDrag('move', e)}
            style={{
              left: `${box.x * 100}%`,
              top: `${box.y * 100}%`,
              width: `${box.w * 100}%`,
              height: `${box.h * 100}%`,
            }}
            className="absolute border-2 border-blue-500 shadow-[0_0_0_1px_rgba(255,255,255,0.6)] cursor-move"
          >
            {/* Corner resize handles with generous touch hit areas */}
            <button
              type="button"
              aria-label="Resize top left"
              onPointerDown={(e) => beginDrag('nw', e)}
              className="absolute -top-3 -left-3 w-7 h-7 flex items-center justify-center cursor-nwse-resize"
            >
              <span className="w-3.5 h-3.5 rounded-sm bg-blue-600 border-2 border-white shadow" />
            </button>
            <button
              type="button"
              aria-label="Resize top right"
              onPointerDown={(e) => beginDrag('ne', e)}
              className="absolute -top-3 -right-3 w-7 h-7 flex items-center justify-center cursor-nesw-resize"
            >
              <span className="w-3.5 h-3.5 rounded-sm bg-blue-600 border-2 border-white shadow" />
            </button>
            <button
              type="button"
              aria-label="Resize bottom left"
              onPointerDown={(e) => beginDrag('sw', e)}
              className="absolute -bottom-3 -left-3 w-7 h-7 flex items-center justify-center cursor-nesw-resize"
            >
              <span className="w-3.5 h-3.5 rounded-sm bg-blue-600 border-2 border-white shadow" />
            </button>
            <button
              type="button"
              aria-label="Resize bottom right"
              onPointerDown={(e) => beginDrag('se', e)}
              className="absolute -bottom-3 -right-3 w-7 h-7 flex items-center justify-center cursor-nwse-resize"
            >
              <span className="w-3.5 h-3.5 rounded-sm bg-blue-600 border-2 border-white shadow" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
        <button
          type="button"
          onClick={handleScanCrop}
          className="flex-1 min-h-[48px] px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white text-sm font-semibold transition-all inline-flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
        >
          <ScanSearch className="w-4 h-4" />
          <span>Scan Cropped Region</span>
        </button>
        <button
          type="button"
          onClick={() => setBox(DEFAULT_BOX)}
          className="min-h-[48px] px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-medium transition-colors inline-flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Reset Box</span>
        </button>
      </div>
    </div>
  );
}
