import { useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Copy,
  Crop,
  Download,
  ExternalLink,
  ImageOff,
  Loader2,
  X,
  XCircle,
} from 'lucide-react';
import type { BatchScanItem } from '../types';

interface BatchResultsListProps {
  items: BatchScanItem[];
  activeRawText?: string;
  isProcessing: boolean;
  onSelectItem: (item: BatchScanItem) => void;
  onCropItem: (item: BatchScanItem) => void;
  onClearBatch: () => void;
}

export function BatchResultsList({
  items,
  activeRawText,
  isProcessing,
  onSelectItem,
  onCropItem,
  onClearBatch,
}: BatchResultsListProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  const decodedItems = items.filter((item) => item.status === 'decoded' && item.payload);
  const remainingCount = items.filter(
    (item) => item.status === 'pending' || item.status === 'scanning'
  ).length;
  const completedCount = items.length - remainingCount;
  const progressPercent = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;
  const needsCropCount = items.filter((item) => item.status === 'not_found').length;

  const copyText = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopiedId(id);
    window.setTimeout(() => {
      setCopiedId((curr) => (curr === id ? null : curr));
    }, 1500);
  };

  const handleCopyAll = async () => {
    if (decodedItems.length === 0) return;
    const combined = decodedItems.map((i) => i.payload!.rawText).join('\n');
    try {
      await navigator.clipboard.writeText(combined);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = combined;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopiedAll(true);
    window.setTimeout(() => setCopiedAll(false), 1800);
  };

  const ringRadius = 8;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference * (1 - progressPercent / 100);

  return (
    <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131922] overflow-hidden">
      <div className="border-b border-slate-100 dark:border-slate-800/80">
        <div className="px-4 sm:px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {isProcessing && (
              <svg
                className="w-6 h-6 -rotate-90 shrink-0"
                viewBox="0 0 22 22"
                aria-hidden="true"
              >
                <circle
                  cx="11"
                  cy="11"
                  r={ringRadius}
                  fill="none"
                  strokeWidth="2.5"
                  className="stroke-slate-200 dark:stroke-slate-800"
                />
                <circle
                  cx="11"
                  cy="11"
                  r={ringRadius}
                  fill="none"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeDasharray={ringCircumference}
                  strokeDashoffset={ringOffset}
                  className="stroke-blue-600 dark:stroke-blue-400 transition-[stroke-dashoffset] duration-200"
                />
              </svg>
            )}

            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Batch Scan Results
              </h2>
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 tabular-nums mt-0.5">
                {isProcessing ? (
                  <span className="text-blue-600 dark:text-blue-400 font-medium">
                    Processed {completedCount} of {items.length} · {remainingCount}{' '}
                    {remainingCount === 1 ? 'file' : 'files'} remaining ({progressPercent}%)
                  </span>
                ) : (
                  <>
                    <span className="font-medium text-emerald-700 dark:text-emerald-400">
                      {decodedItems.length} decoded
                    </span>
                    {needsCropCount > 0 && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="text-amber-700 dark:text-amber-400">
                          {needsCropCount} needs crop
                        </span>
                      </>
                    )}
                    <span aria-hidden="true">·</span>
                    <span>{items.length} total</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {decodedItems.length > 0 && (
              <button
                type="button"
                onClick={handleCopyAll}
                className="min-h-[38px] px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
              >
                {copiedAll ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Copied All</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy All ({decodedItems.length})</span>
                  </>
                )}
              </button>
            )}
            <button
              type="button"
              onClick={onClearBatch}
              className="min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors inline-flex items-center gap-1 whitespace-nowrap cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          </div>
        </div>

        {/* Linear Progress Bar */}
        {isProcessing && (
          <div
            role="progressbar"
            aria-label="Batch scan progress"
            aria-valuenow={completedCount}
            aria-valuemin={0}
            aria-valuemax={items.length}
            className="h-1.5 w-full bg-slate-100 dark:bg-slate-800/90 overflow-hidden"
          >
            <div
              className="h-full bg-blue-600 dark:bg-blue-500 transition-[width] duration-200 ease-out"
              style={{ width: `${Math.max(progressPercent, 4)}%` }}
            />
          </div>
        )}
      </div>

      <ul className="divide-y divide-slate-100 dark:divide-slate-800/80 max-h-[430px] overflow-y-auto">
        {items.map((item) => {
          const isDecoded = item.status === 'decoded' && item.payload;
          const isActive = isDecoded && activeRawText === item.payload!.rawText;

          return (
            <li
              key={item.id}
              onClick={() => {
                if (isDecoded) onSelectItem(item);
              }}
              role={isDecoded ? 'button' : undefined}
              tabIndex={isDecoded ? 0 : undefined}
              onKeyDown={(e) => {
                if (isDecoded && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  onSelectItem(item);
                }
              }}
              className={`px-4 sm:px-5 py-3.5 flex flex-col sm:flex-row sm:items-center gap-3 transition-colors ${
                isDecoded ? 'cursor-pointer' : ''
              } ${
                isActive
                  ? 'bg-blue-50/70 dark:bg-blue-950/30'
                  : isDecoded
                    ? 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    : ''
              }`}
            >
              <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                {/* Thumbnail */}
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.fileName}
                    className="w-12 h-12 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0 bg-slate-100 dark:bg-slate-900"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 text-slate-400 flex items-center justify-center shrink-0">
                    <ImageOff className="w-5 h-5" />
                  </div>
                )}

                {/* Content */}
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[180px] sm:max-w-[240px]">
                      {item.fileName}
                    </span>
                    {item.imageWidth && item.imageHeight && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">
                          {item.imageWidth}×{item.imageHeight}
                        </span>
                      </>
                    )}
                  </div>

                  {item.status === 'pending' || item.status === 'scanning' ? (
                    <div className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 font-medium">
                      <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                      <span>{item.status === 'scanning' ? 'Decoding QR code...' : 'Queued'}</span>
                    </div>
                  ) : null}

                  {isDecoded && item.payload && (
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span>{item.payload.kindLabel}</span>
                      </div>
                      <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                        {item.payload.summaryTitle}
                      </div>
                      <div className="text-xs font-mono text-slate-500 dark:text-slate-400 truncate">
                        {item.payload.rawText}
                      </div>
                    </div>
                  )}

                  {item.status === 'not_found' && (
                    <div className="flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>{item.errorMessage || 'No QR code detected automatically'}</span>
                    </div>
                  )}

                  {item.status === 'error' && (
                    <div className="flex items-center gap-1.5 text-xs font-medium text-rose-700 dark:text-rose-400">
                      <XCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{item.errorMessage || 'Unable to read file'}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Per-Row Actions */}
              <div className="flex items-center gap-1.5 pl-[62px] sm:pl-0 shrink-0">
                {isDecoded && item.payload && (
                  <>
                    {item.payload.url && (
                      <a
                        href={item.payload.url.fullUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="min-h-[40px] min-w-[40px] rounded-xl text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 inline-flex items-center justify-center"
                        aria-label={item.payload.kind === 'file' ? 'Open file' : 'Open link in new tab'}
                        title={item.payload.kind === 'file' ? 'Open file' : 'Open link'}
                      >
                        {item.payload.kind === 'file' ? (
                          <Download className="w-4 h-4" />
                        ) : (
                          <ExternalLink className="w-4 h-4" />
                        )}
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        void copyText(item.payload!.rawText, item.id);
                      }}
                      className="min-h-[40px] min-w-[40px] rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-700/60 inline-flex items-center justify-center cursor-pointer"
                      aria-label="Copy decoded payload"
                      title="Copy"
                    >
                      {copiedId === item.id ? (
                        <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </>
                )}

                {item.imageUrl && (item.status === 'not_found' || isDecoded) && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCropItem(item);
                    }}
                    className={`min-h-[40px] px-2.5 rounded-xl text-xs font-medium inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                      item.status === 'not_found'
                        ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-950/80'
                        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
                    }`}
                    title={item.status === 'not_found' ? 'Crop & Retry' : 'Re-crop'}
                  >
                    <Crop className="w-3.5 h-3.5" />
                    <span>{item.status === 'not_found' ? 'Crop & Retry' : 'Crop'}</span>
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
