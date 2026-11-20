import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { QRCodeCanvas, QRCodeSVG } from 'qrcode.react';
import { AlertTriangle, Check, Copy, Download, Eraser, QrCode, RotateCcw } from 'lucide-react';

interface GenerateQrPanelProps {
  initialValue?: string;
}

type ErrorLevel = 'L' | 'M' | 'Q' | 'H';

const LEVEL_OPTIONS: { value: ErrorLevel; label: string; hint: string }[] = [
  { value: 'L', label: 'L (7%)', hint: 'Compact' },
  { value: 'M', label: 'M (15%)', hint: 'Standard' },
  { value: 'Q', label: 'Q (25%)', hint: 'Resilient' },
  { value: 'H', label: 'H (30%)', hint: 'Max' },
];

const MAX_QR_CHARS = 1800;
const DEFAULT_FG_COLOR = '#0f172a';
const DEFAULT_BG_COLOR = '#ffffff';

function hexLuminance(hex: string): number {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return 0;
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const toLin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * toLin(r) + 0.7152 * toLin(g) + 0.0722 * toLin(b);
}

function getContrastRatio(hexA: string, hexB: string): number {
  const l1 = hexLuminance(hexA);
  const l2 = hexLuminance(hexB);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

export function GenerateQrPanel({ initialValue = '' }: GenerateQrPanelProps) {
  const [text, setText] = useState<string>(initialValue);
  const [level, setLevel] = useState<ErrorLevel>('M');
  const [fgColor, setFgColor] = useState<string>(DEFAULT_FG_COLOR);
  const [bgColor, setBgColor] = useState<string>(DEFAULT_BG_COLOR);
  const [copiedImg, setCopiedImg] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState('');

  const exportCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const exportSvgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (initialValue) {
      setText(initialValue.slice(0, MAX_QR_CHARS));
    }
  }, [initialValue]);

  const trimmed = text.trim();
  const hasValue = trimmed.length > 0;
  const isOverLimit = trimmed.length > MAX_QR_CHARS;
  const isCustomColors = fgColor !== DEFAULT_FG_COLOR || bgColor !== DEFAULT_BG_COLOR;
  const lowContrast = getContrastRatio(fgColor, bgColor) < 3;

  const getSuggestedFilename = () => {
    try {
      if (/^https?:\/\//i.test(trimmed)) {
        const host = new URL(trimmed).hostname.replace(/^www\./, '').replace(/[^a-z0-9.-]+/gi, '-');
        return `qrunpack-${host}`;
      }
    } catch {
      // ignore
    }
    return 'qrunpack-qrcode';
  };

  const handleDownloadPng = () => {
    const canvas = exportCanvasRef.current;
    if (!canvas || !hasValue || isOverLimit) return;
    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${getSuggestedFilename()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDownloadSvg = () => {
    const svg = exportSvgRef.current;
    if (!svg || !hasValue || isOverLimit) return;
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svg);
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${getSuggestedFilename()}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyPng = async () => {
    const canvas = exportCanvasRef.current;
    if (!canvas || !hasValue || isOverLimit) return;
    setCopyFeedback('');

    if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined') {
      setCopyFeedback('Image clipboard copy is not supported in this browser—use Download PNG.');
      return;
    }

    try {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/png')
      );
      if (!blob) throw new Error('Could not generate PNG image.');
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      setCopiedImg(true);
      window.setTimeout(() => setCopiedImg(false), 1800);
    } catch {
      setCopyFeedback('Could not copy image to clipboard. Use Download PNG instead.');
    }
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131922] shadow-sm overflow-hidden"
    >
      <div className="px-5 pt-5 pb-4 border-b border-slate-100 dark:border-slate-800/80 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <QrCode className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-medium text-blue-600 dark:text-blue-400">
              Generate QR Code
            </div>
            <h2 className="mt-0.5 text-lg font-semibold text-slate-900 dark:text-white leading-snug">
              Create &amp; Download QR Image
            </h2>
          </div>
        </div>
        {text.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setText('');
              setCopyFeedback('');
            }}
            className="min-h-[40px] px-3 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Eraser className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        )}
      </div>

      <div className="p-5 space-y-4">
        {/* Text / URL Input */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <label
              htmlFor="qr-generate-input"
              className="text-xs font-medium text-slate-600 dark:text-slate-300"
            >
              URL or Text Content
            </label>
            <span className="text-xs text-slate-400 dark:text-slate-500 tabular-nums">
              {text.length} / {MAX_QR_CHARS}
            </span>
          </div>
          <textarea
            id="qr-generate-input"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setCopyFeedback('');
            }}
            rows={3}
            maxLength={MAX_QR_CHARS}
            placeholder="https://example.com or any text, Wi-Fi string, or contact info..."
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/70 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 font-mono focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent resize-y min-h-[84px]"
          />
        </div>

        {/* Error Correction Segmented Selector */}
        <div className="space-y-1.5">
          <span className="text-xs font-medium text-slate-600 dark:text-slate-300 block">
            Error Correction
          </span>
          <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200/70 dark:border-slate-800">
            {LEVEL_OPTIONS.map((opt) => {
              const active = level === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setLevel(opt.value)}
                  className={`min-h-[38px] px-1 sm:px-2 py-1.5 rounded-lg text-[11px] sm:text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                    active
                      ? 'bg-white dark:bg-[#131922] text-slate-950 dark:text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                  title={opt.hint}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Foreground & Background Color Pickers */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
              QR Colors
            </span>
            {isCustomColors && (
              <button
                type="button"
                onClick={() => {
                  setFgColor(DEFAULT_FG_COLOR);
                  setBgColor(DEFAULT_BG_COLOR);
                }}
                className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset colors</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <label
              htmlFor="qr-fg-color"
              className="min-h-[46px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/70 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors flex items-center justify-between gap-2.5 cursor-pointer"
            >
              <div className="min-w-0">
                <div className="text-xs font-medium text-slate-800 dark:text-slate-200">
                  Foreground
                </div>
                <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 uppercase tabular-nums">
                  {fgColor}
                </div>
              </div>
              <input
                id="qr-fg-color"
                type="color"
                value={fgColor}
                onChange={(e) => setFgColor(e.target.value)}
                aria-label="QR foreground color"
                className="w-8 h-8 rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent p-0 cursor-pointer shrink-0"
              />
            </label>

            <label
              htmlFor="qr-bg-color"
              className="min-h-[46px] px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/70 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors flex items-center justify-between gap-2.5 cursor-pointer"
            >
              <div className="min-w-0">
                <div className="text-xs font-medium text-slate-800 dark:text-slate-200">
                  Background
                </div>
                <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 uppercase tabular-nums">
                  {bgColor}
                </div>
              </div>
              <input
                id="qr-bg-color"
                type="color"
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                aria-label="QR background color"
                className="w-8 h-8 rounded-lg border border-slate-300 dark:border-slate-600 bg-transparent p-0 cursor-pointer shrink-0"
              />
            </label>
          </div>

          {lowContrast && (
            <div className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400 pt-0.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>Low contrast between foreground and background may reduce scannability.</span>
            </div>
          )}
        </div>

        {/* Live QR Preview */}
        <div className="rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 p-5 flex flex-col items-center justify-center min-h-[240px]">
          {hasValue && !isOverLimit ? (
            <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-xs">
              <QRCodeCanvas
                value={trimmed}
                size={208}
                level={level}
                bgColor={bgColor}
                fgColor={fgColor}
                marginSize={3}
                title={`QR code for ${trimmed.slice(0, 60)}`}
              />
            </div>
          ) : (
            <div className="text-center space-y-2 max-w-xs">
              <div className="mx-auto w-12 h-12 rounded-2xl bg-slate-200/70 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center">
                <QrCode className="w-6 h-6" />
              </div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {isOverLimit ? 'Text exceeds QR character limit' : 'Enter text or a URL above'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                A scannable high-contrast QR code renders instantly in your browser.
              </p>
            </div>
          )}
        </div>

        {/* Hidden high-resolution Canvas (640px) & SVG for crisp downloads */}
        {hasValue && !isOverLimit && (
          <div className="hidden" aria-hidden="true">
            <QRCodeCanvas
              ref={exportCanvasRef}
              value={trimmed}
              size={640}
              level={level}
              bgColor={bgColor}
              fgColor={fgColor}
              marginSize={4}
            />
            <QRCodeSVG
              ref={exportSvgRef}
              value={trimmed}
              size={640}
              level={level}
              bgColor={bgColor}
              fgColor={fgColor}
              marginSize={4}
            />
          </div>
        )}

        {/* Download & Copy Actions */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          <button
            type="button"
            disabled={!hasValue || isOverLimit}
            onClick={handleDownloadPng}
            className="flex-1 min-h-[48px] px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-45 disabled:pointer-events-none text-white text-sm font-semibold transition-colors inline-flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
          >
            <Download className="w-4 h-4 shrink-0" />
            <span>Download PNG</span>
          </button>

          <button
            type="button"
            disabled={!hasValue || isOverLimit}
            onClick={handleDownloadSvg}
            className="min-h-[48px] px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-45 disabled:pointer-events-none text-sm font-medium transition-colors inline-flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
          >
            <Download className="w-4 h-4 shrink-0" />
            <span>SVG</span>
          </button>

          <button
            type="button"
            disabled={!hasValue || isOverLimit}
            onClick={handleCopyPng}
            className="min-h-[48px] px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-45 disabled:pointer-events-none text-sm font-medium transition-colors inline-flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
          >
            {copiedImg ? (
              <>
                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 shrink-0" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>

        {copyFeedback && (
          <p className="text-xs text-amber-700 dark:text-amber-400">{copyFeedback}</p>
        )}
      </div>
    </motion.section>
  );
}
