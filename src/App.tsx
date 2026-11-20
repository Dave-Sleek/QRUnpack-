import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Camera,
  ClipboardPaste,
  Crop,
  ImagePlus,
  Moon,
  QrCode,
  ShieldCheck,
  Sun,
  X,
} from 'lucide-react';
import { BatchResultsList } from './components/BatchResultsList';
import { CameraScanner } from './components/CameraScanner';
import { CropRetryTool } from './components/CropRetryTool';
import { GenerateQrPanel } from './components/GenerateQrPanel';
import { InfoPages, type PageSlug } from './components/InfoPages';
import { RecentScans } from './components/RecentScans';
import { ResultActionCard } from './components/ResultActionCard';
import type {
  BatchScanItem,
  CropRect,
  DecodeSourceInfo,
  ParsedPayload,
  ScanHistoryItem,
} from './types';
import {
  clearScanHistory,
  loadScanHistory,
  removeHistoryItem,
  saveScanToHistory,
} from './utils/historyStorage';
import { parseQrPayload } from './utils/payloadParser';
import {
  decodeQrFromSource,
  loadImageFromUrl,
  type DecodeAttemptResult,
} from './utils/qrDecoder';

type WorkspaceMode = 'idle' | 'camera' | 'crop';

function parseHashToPage(hash: string): PageSlug {
  const clean = hash.replace(/^#\/?/, '').toLowerCase();
  if (clean === 'about') return 'about';
  if (clean === 'privacy' || clean === 'privacy-policy') return 'privacy';
  if (clean === 'cookies' || clean === 'cookie-policy') return 'cookies';
  if (clean === 'terms' || clean === 'terms-of-use') return 'terms';
  if (clean === 'contact' || clean === 'contact-us') return 'contact';
  return 'decoder';
}

function pageToHash(page: PageSlug): string {
  switch (page) {
    case 'about':
      return '#about';
    case 'privacy':
      return '#privacy-policy';
    case 'cookies':
      return '#cookies';
    case 'terms':
      return '#terms';
    case 'contact':
      return '#contact';
    default:
      return '#decoder';
  }
}

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof document !== 'undefined' && document.documentElement.classList.contains('dark')) {
      return 'dark';
    }
    return 'light';
  });

  const [activePage, setActivePage] = useState<PageSlug>(() =>
    typeof window !== 'undefined' ? parseHashToPage(window.location.hash) : 'decoder'
  );
  const [mode, setMode] = useState<WorkspaceMode>('idle');
  const [hubTab, setHubTab] = useState<'decode' | 'generate'>('decode');
  const [generateInitialValue, setGenerateInitialValue] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const [isDecoding, setIsDecoding] = useState(false);

  const [loadedImageUrl, setLoadedImageUrl] = useState<string | null>(null);
  const [cropError, setCropError] = useState<string>('');
  const [inputNotice, setInputNotice] = useState<string>('');

  const [batchItems, setBatchItems] = useState<BatchScanItem[]>([]);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [croppingBatchItemId, setCroppingBatchItemId] = useState<string | null>(null);

  const [activeResult, setActiveResult] = useState<ParsedPayload | null>(null);
  const [sourceInfo, setSourceInfo] = useState<DecodeSourceInfo | undefined>(undefined);
  const [history, setHistory] = useState<ScanHistoryItem[]>(() => loadScanHistory());

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const loadedUrlRef = useRef<string | null>(null);
  const batchUrlsRef = useRef<string[]>([]);
  const batchRunIdRef = useRef(0);

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    document.documentElement.classList.toggle('dark', next === 'dark');
    try {
      localStorage.setItem('qrunpack_theme', next);
    } catch {
      // ignore
    }
  };

  const replaceLoadedImageUrl = useCallback((nextUrl: string | null) => {
    if (loadedUrlRef.current && loadedUrlRef.current !== nextUrl) {
      URL.revokeObjectURL(loadedUrlRef.current);
    }
    loadedUrlRef.current = nextUrl;
    setLoadedImageUrl(nextUrl);
  }, []);

  const clearBatchUrls = useCallback(() => {
    batchUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    batchUrlsRef.current = [];
  }, []);

  useEffect(() => {
    const syncPageFromHash = () => {
      setActivePage(parseHashToPage(window.location.hash));
    };
    window.addEventListener('hashchange', syncPageFromHash);
    window.addEventListener('popstate', syncPageFromHash);
    return () => {
      window.removeEventListener('hashchange', syncPageFromHash);
      window.removeEventListener('popstate', syncPageFromHash);
      if (loadedUrlRef.current) {
        URL.revokeObjectURL(loadedUrlRef.current);
      }
      batchUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const navigateToPage = useCallback((page: PageSlug) => {
    setActivePage(page);
    const nextHash = pageToHash(page);
    if (window.location.hash !== nextHash) {
      window.history.pushState(null, '', nextHash);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const commitDecodedText = useCallback(
    (rawText: string, info: DecodeSourceInfo) => {
      const parsed = parseQrPayload(rawText);
      setActiveResult(parsed);
      setSourceInfo(info);
      setHistory(saveScanToHistory(parsed));
      setMode('idle');
      setHubTab('decode');
      setCropError('');
      setInputNotice('');
    },
    []
  );

  const processImageBlob = useCallback(
    async (blob: Blob, sourceType: 'upload' | 'clipboard') => {
      batchRunIdRef.current += 1;
      clearBatchUrls();
      setBatchItems([]);
      setIsBatchProcessing(false);
      setCroppingBatchItemId(null);

      setIsDecoding(true);
      setInputNotice('');
      setCropError('');
      setMode('idle');

      const url = URL.createObjectURL(blob);
      replaceLoadedImageUrl(url);

      try {
        const img = await loadImageFromUrl(url);
        const decoded = decodeQrFromSource(img);

        if (decoded) {
          commitDecodedText(decoded.text, {
            sourceType,
            imageUrl: url,
            imageWidth: img.naturalWidth,
            imageHeight: img.naturalHeight,
            passUsed: decoded.passUsed,
          });
        } else {
          setActiveResult(null);
          setSourceInfo({
            sourceType,
            imageUrl: url,
            imageWidth: img.naturalWidth,
            imageHeight: img.naturalHeight,
          });
          setCropError(
            'No QR code was detected in the full image. Drag the box tightly around the QR code (with a thin border) and scan again.'
          );
          setMode('crop');
        }
      } catch (err: unknown) {
        setInputNotice(
          err instanceof Error
            ? err.message
            : 'Unable to read this image. Please try a PNG, JPG, WEBP, or GIF file.'
        );
        replaceLoadedImageUrl(null);
      } finally {
        setIsDecoding(false);
      }
    },
    [clearBatchUrls, commitDecodedText, replaceLoadedImageUrl]
  );

  const processBatchFiles = useCallback(
    async (files: File[]) => {
      const runId = ++batchRunIdRef.current;
      clearBatchUrls();
      replaceLoadedImageUrl(null);
      setCroppingBatchItemId(null);
      setInputNotice('');
      setCropError('');
      setMode('idle');
      setIsBatchProcessing(true);

      const initialItems: BatchScanItem[] = files.map((file, idx) => {
        const isImage = file.type.startsWith('image/');
        const imageUrl = isImage ? URL.createObjectURL(file) : undefined;
        if (imageUrl) batchUrlsRef.current.push(imageUrl);
        return {
          id: `${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
          fileName: file.name || `Image ${idx + 1}`,
          imageUrl,
          status: isImage ? 'pending' : 'error',
          errorMessage: isImage ? undefined : 'Unsupported file type (not an image)',
        };
      });

      setBatchItems(initialItems);
      let firstDecodedSet = false;

      for (let i = 0; i < initialItems.length; i++) {
        if (batchRunIdRef.current !== runId) return;
        const current = initialItems[i];
        if (current.status === 'error' || !current.imageUrl) continue;

        setBatchItems((prev) =>
          prev.map((item) => (item.id === current.id ? { ...item, status: 'scanning' } : item))
        );

        // Yield to let UI paint scanning progress
        await new Promise((r) => window.setTimeout(r, 0));
        if (batchRunIdRef.current !== runId) return;

        try {
          const img = await loadImageFromUrl(current.imageUrl);
          if (batchRunIdRef.current !== runId) return;

          const decoded = decodeQrFromSource(img);
          if (decoded) {
            const parsed = parseQrPayload(decoded.text);
            setHistory(saveScanToHistory(parsed));

            setBatchItems((prev) =>
              prev.map((item) =>
                item.id === current.id
                  ? {
                      ...item,
                      status: 'decoded',
                      payload: parsed,
                      passUsed: decoded.passUsed,
                      imageWidth: img.naturalWidth,
                      imageHeight: img.naturalHeight,
                    }
                  : item
              )
            );

            if (!firstDecodedSet) {
              firstDecodedSet = true;
              setActiveResult(parsed);
              setSourceInfo({
                sourceType: 'upload',
                imageWidth: img.naturalWidth,
                imageHeight: img.naturalHeight,
                passUsed: decoded.passUsed,
              });
              setHubTab('decode');
            }
          } else {
            setBatchItems((prev) =>
              prev.map((item) =>
                item.id === current.id
                  ? {
                      ...item,
                      status: 'not_found',
                      imageWidth: img.naturalWidth,
                      imageHeight: img.naturalHeight,
                      errorMessage: 'No QR code detected automatically',
                    }
                  : item
              )
            );
          }
        } catch {
          if (batchRunIdRef.current !== runId) return;
          setBatchItems((prev) =>
            prev.map((item) =>
              item.id === current.id
                ? {
                    ...item,
                    status: 'error',
                    errorMessage: 'Could not read image data',
                  }
                : item
            )
          );
        }
      }

      if (batchRunIdRef.current === runId) {
        setIsBatchProcessing(false);
      }
    },
    [clearBatchUrls, replaceLoadedImageUrl]
  );

  const handleFilesSelected = useCallback(
    (fileList: FileList | File[] | undefined | null) => {
      if (!fileList || fileList.length === 0) return;
      const files = Array.from(fileList);
      if (files.length === 1) {
        const file = files[0];
        if (!file.type.startsWith('image/')) {
          setInputNotice('Please select an image file (PNG, JPG, WEBP, or GIF).');
          return;
        }
        void processImageBlob(file, 'upload');
        return;
      }
      void processBatchFiles(files);
    },
    [processBatchFiles, processImageBlob]
  );

  // Global Ctrl+V / Cmd+V clipboard paste listener
  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        return;
      }

      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith('image/')) {
          const blob = item.getAsFile();
          if (blob) {
            e.preventDefault();
            void processImageBlob(blob, 'clipboard');
            return;
          }
        }
      }

      const pastedText = e.clipboardData?.getData('text/plain')?.trim();
      if (pastedText) {
        setInputNotice(
          'Clipboard contains text rather than an image. Take or copy a screenshot containing a QR code, then paste it here.'
        );
      }
    };

    window.addEventListener('paste', handleGlobalPaste);
    return () => window.removeEventListener('paste', handleGlobalPaste);
  }, [processImageBlob]);

  // Dedicated "Paste Image from Clipboard" button using navigator.clipboard.read()
  const handleClipboardButton = async () => {
    setInputNotice('');
    if (!navigator.clipboard?.read) {
      setInputNotice(
        'Direct clipboard button is not supported in this browser. Press Ctrl+V (or Cmd+V on Mac) anywhere on the page to paste your screenshot.'
      );
      return;
    }

    try {
      const clipboardItems = await navigator.clipboard.read();
      for (const item of clipboardItems) {
        const imageType = item.types.find((t) => t.startsWith('image/'));
        if (imageType) {
          const blob = await item.getType(imageType);
          await processImageBlob(blob, 'clipboard');
          return;
        }
      }
      setInputNotice(
        'No image found on your clipboard. Copy a screenshot or image first, then tap Paste Image again.'
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message.toLowerCase() : '';
      if (msg.includes('denied') || msg.includes('notallowed') || msg.includes('permission')) {
        setInputNotice(
          'Clipboard read permission was blocked. Allow clipboard access or simply press Ctrl+V / Cmd+V anywhere on this page.'
        );
      } else {
        setInputNotice(
          'Could not read image from clipboard. Try pressing Ctrl+V / Cmd+V or uploading the screenshot file.'
        );
      }
    }
  };

  const activeCropBatchItem = croppingBatchItemId
    ? batchItems.find((b) => b.id === croppingBatchItemId)
    : undefined;
  const activeCropImageUrl = activeCropBatchItem?.imageUrl ?? loadedImageUrl;

  const handleRetryCrop = async (crop: CropRect) => {
    if (!activeCropImageUrl) return;
    setIsDecoding(true);
    setCropError('');
    try {
      const img = await loadImageFromUrl(activeCropImageUrl);
      const decoded = decodeQrFromSource(img, crop);
      if (decoded) {
        const parsed = parseQrPayload(decoded.text);
        if (croppingBatchItemId) {
          setHistory(saveScanToHistory(parsed));
          setBatchItems((prev) =>
            prev.map((item) =>
              item.id === croppingBatchItemId
                ? {
                    ...item,
                    status: 'decoded',
                    payload: parsed,
                    passUsed: `${decoded.passUsed} (cropped)`,
                    imageWidth: img.naturalWidth,
                    imageHeight: img.naturalHeight,
                    errorMessage: undefined,
                  }
                : item
            )
          );
          setActiveResult(parsed);
          setSourceInfo({
            sourceType: 'upload',
            imageWidth: img.naturalWidth,
            imageHeight: img.naturalHeight,
            passUsed: `${decoded.passUsed} (cropped)`,
          });
          setHubTab('decode');
          setCroppingBatchItemId(null);
          setMode('idle');
        } else {
          commitDecodedText(decoded.text, {
            sourceType: sourceInfo?.sourceType || 'upload',
            imageUrl: activeCropImageUrl,
            imageWidth: img.naturalWidth,
            imageHeight: img.naturalHeight,
            passUsed: `${decoded.passUsed} (cropped)`,
          });
        }
      } else {
        setCropError(
          'Still no QR code found in that box. Make sure the entire square plus a thin light margin around all four sides is inside the box.'
        );
      }
    } catch {
      setCropError('Could not re-process the cropped region. Try selecting a new image.');
    } finally {
      setIsDecoding(false);
    }
  };

  const handleCameraDetected = useCallback(
    (result: DecodeAttemptResult) => {
      batchRunIdRef.current += 1;
      clearBatchUrls();
      setBatchItems([]);
      setIsBatchProcessing(false);
      setCroppingBatchItemId(null);
      replaceLoadedImageUrl(null);
      commitDecodedText(result.text, {
        sourceType: 'camera',
        passUsed: result.passUsed,
      });
    },
    [clearBatchUrls, commitDecodedText, replaceLoadedImageUrl]
  );

  const handleClearBatch = () => {
    batchRunIdRef.current += 1;
    clearBatchUrls();
    setBatchItems([]);
    setIsBatchProcessing(false);
    setCroppingBatchItemId(null);
    if (mode === 'crop') setMode('idle');
  };

  const handleResetWorkspace = () => {
    setMode('idle');
    setActiveResult(null);
    setSourceInfo(undefined);
    setCropError('');
    setInputNotice('');
    setCroppingBatchItemId(null);
    replaceLoadedImageUrl(null);
  };

  const handleSelectHistoryItem = (item: ScanHistoryItem) => {
    const parsed = parseQrPayload(item.rawText);
    setActiveResult(parsed);
    setSourceInfo({ sourceType: 'history' });
    setMode('idle');
    setHubTab('decode');
    setCroppingBatchItemId(null);
    setCropError('');
    setInputNotice('');
    replaceLoadedImageUrl(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FA] text-slate-900 dark:bg-[#0B0F14] dark:text-slate-100 transition-colors duration-150">
      {/* Top Bar Contract: 1 row, 3 zones separated by gap-8 */}
      <header className="sticky top-0 z-30 h-14 bg-white/90 dark:bg-[#0B0F14]/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800">
        <div className="max-w-6xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-8">
          {/* Zone 1: Single-line Brand Wordmark */}
          <a
            href="#decoder"
            onClick={(e) => {
              e.preventDefault();
              navigateToPage('decoder');
            }}
            className="inline-flex items-center gap-2.5 text-lg font-bold tracking-tight text-slate-950 dark:text-white whitespace-nowrap shrink-0 font-display"
          >
            <span className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center">
              <QrCode className="w-4 h-4" />
            </span>
            <span>QRUnpack</span>
          </a>

          {/* Zone 2: Clean single-line navigation links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300">
            <a
              href="#decoder"
              onClick={(e) => {
                e.preventDefault();
                navigateToPage('decoder');
              }}
              className={`hover:text-slate-950 dark:hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 ${
                activePage === 'decoder' ? 'text-slate-950 dark:text-white underline underline-offset-4' : ''
              }`}
            >
              Decoder
            </a>
            <a
              href="#about"
              onClick={(e) => {
                e.preventDefault();
                navigateToPage('about');
              }}
              className={`hover:text-slate-950 dark:hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 ${
                activePage === 'about' ? 'text-slate-950 dark:text-white underline underline-offset-4' : ''
              }`}
            >
              About
            </a>
            <a
              href="#privacy-policy"
              onClick={(e) => {
                e.preventDefault();
                navigateToPage('privacy');
              }}
              className={`hover:text-slate-950 dark:hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 ${
                activePage === 'privacy' ? 'text-slate-950 dark:text-white underline underline-offset-4' : ''
              }`}
            >
              Privacy
            </a>
            <a
              href="#terms"
              onClick={(e) => {
                e.preventDefault();
                navigateToPage('terms');
              }}
              className={`hover:text-slate-950 dark:hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 ${
                activePage === 'terms' ? 'text-slate-950 dark:text-white underline underline-offset-4' : ''
              }`}
            >
              Terms
            </a>
            <a
              href="#contact"
              onClick={(e) => {
                e.preventDefault();
                navigateToPage('contact');
              }}
              className={`hover:text-slate-950 dark:hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 ${
                activePage === 'contact' ? 'text-slate-950 dark:text-white underline underline-offset-4' : ''
              }`}
            >
              Contact
            </a>
          </nav>

          {/* Zone 3: 1 Primary Header Control (Theme Toggle) */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={toggleTheme}
              className="min-h-[40px] min-w-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#131922] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors inline-flex items-center justify-center gap-2 text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer"
              aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            >
              {theme === 'light' ? (
                <>
                  <Moon className="w-4 h-4" />
                  <span className="hidden sm:inline">Dark</span>
                </>
              ) : (
                <>
                  <Sun className="w-4 h-4" />
                  <span className="hidden sm:inline">Light</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      <main id="top" className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {activePage !== 'decoder' ? (
          <InfoPages
            page={activePage}
            onBackToDecoder={() => navigateToPage('decoder')}
            onNavigate={navigateToPage}
          />
        ) : (
          <>
        {/* Compact Hero & Privacy Assurance */}
        <section id="decoder" className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-950 dark:text-white [text-wrap:balance]">
            Decode QR codes right on this device
          </h1>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700 dark:text-emerald-400">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>100% Browser-Based QR Decoding</span>
            </span>
            <span aria-hidden="true">·</span>
            <span>No Account Required</span>
            <span aria-hidden="true">·</span>
            <span>Images Never Leave Your Device</span>
          </div>
        </section>

        {/* Responsive Workspace Grid: Mobile puts active Result or Generator first, Desktop uses balanced 7/5 split */}
        <div className="flex flex-col gap-6 lg:grid lg:grid-cols-12 lg:items-start">
          {/* SMART ACTION HUB (Result + Generate QR Tab) */}
          <div
            className={`lg:col-span-5 lg:col-start-8 lg:row-start-1 space-y-3 ${
              activeResult || hubTab === 'generate' ? 'order-1 lg:order-none' : 'order-3 lg:order-none'
            }`}
          >
            {/* Segmented Tab Switcher */}
            <div
              role="tablist"
              aria-label="Smart Action Hub"
              className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-200/70 dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
            >
              <button
                type="button"
                role="tab"
                aria-selected={hubTab === 'decode'}
                onClick={() => setHubTab('decode')}
                className={`min-h-[44px] px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                  hubTab === 'decode'
                    ? 'bg-white dark:bg-[#131922] text-slate-950 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Unpack Result
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={hubTab === 'generate'}
                onClick={() => setHubTab('generate')}
                className={`min-h-[44px] px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                  hubTab === 'generate'
                    ? 'bg-white dark:bg-[#131922] text-slate-950 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Generate QR
              </button>
            </div>

            {hubTab === 'generate' ? (
              <GenerateQrPanel initialValue={generateInitialValue} />
            ) : activeResult ? (
              <ResultActionCard
                payload={activeResult}
                sourceInfo={sourceInfo}
                onScanAnother={handleResetWorkspace}
                onOpenCrop={loadedImageUrl ? () => setMode('crop') : undefined}
                onGenerateQr={(rawText) => {
                  setGenerateInitialValue(rawText);
                  setHubTab('generate');
                }}
              />
            ) : (
              <div className="hidden lg:block rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131922] p-5 space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
                    <QrCode className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                      Smart Action Hub
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Decoded results appear here instantly
                    </p>
                  </div>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Drop a screenshot, press <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-xs">Ctrl+V</kbd> / <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-xs">Cmd+V</kbd>, or scan with your camera.
                </p>
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Supports Websites · PDF &amp; File Links · Wi-Fi Credentials · vCard Contacts · Email, Phone &amp; SMS · Maps · 2FA Keys · Payment QR
                </div>
              </div>
            )}
          </div>

          {/* INPUT / CAMERA / CROP STAGE (Left 7 columns on desktop) */}
          <div className="order-2 lg:order-none lg:col-span-7 lg:col-start-1 lg:row-start-1 lg:row-span-2 space-y-4">
            {mode === 'camera' && (
              <CameraScanner
                onDetected={handleCameraDetected}
                onClose={() => setMode('idle')}
              />
            )}

            {mode === 'crop' && activeCropImageUrl && (
              <CropRetryTool
                imageUrl={activeCropImageUrl}
                errorMessage={cropError}
                onRetryCrop={handleRetryCrop}
                onResetImage={() => {
                  if (croppingBatchItemId) {
                    setCroppingBatchItemId(null);
                    setCropError('');
                    setMode('idle');
                  } else {
                    handleResetWorkspace();
                  }
                }}
              />
            )}

            {mode === 'idle' && (
              <>
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131922] p-4 sm:p-5 space-y-4">
                  {/* Hidden File Input (supports single or multiple images) */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/png,image/jpeg,image/webp,image/gif,image/*"
                    className="hidden"
                    onChange={(e) => {
                      handleFilesSelected(e.target.files);
                      e.target.value = '';
                    }}
                  />

                  {/* Drag-and-Drop / Upload Dropzone */}
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      handleFilesSelected(e.dataTransfer.files);
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        fileInputRef.current?.click();
                      }
                    }}
                    className={`relative rounded-xl border-2 border-dashed transition-colors p-6 sm:p-8 text-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                      isDragging
                        ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/30'
                        : 'border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 bg-slate-50/60 dark:bg-slate-900/40'
                    }`}
                  >
                    <div className="mx-auto w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center mb-3 shadow-sm">
                      <ImagePlus className="w-6 h-6" />
                    </div>
                    <p className="text-base font-semibold text-slate-900 dark:text-white">
                      {isDecoding
                        ? 'Decoding QR code...'
                        : isBatchProcessing
                          ? 'Batch scanning images...'
                          : 'Upload or Drop Screenshot(s)'}
                    </p>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                      Drop one or multiple PNG, JPG, WEBP, GIF images — or press{' '}
                      <span className="font-mono text-slate-700 dark:text-slate-300">Ctrl+V / Cmd+V</span>
                    </p>
                  </div>

                  {/* Quick Action Buttons */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={handleClipboardButton}
                      className="min-h-[48px] px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm font-medium transition-colors inline-flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
                    >
                      <ClipboardPaste className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                      <span>Paste Image</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setInputNotice('');
                        setMode('camera');
                      }}
                      className="min-h-[48px] px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 text-sm font-medium transition-colors inline-flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
                    >
                      <Camera className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                      <span>Use Camera</span>
                    </button>
                  </div>

                  {/* Inline Notice / Error Banner */}
                  {inputNotice && (
                    <div
                      role="status"
                      className="rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/70 px-4 py-3 flex items-start justify-between gap-3 text-xs text-amber-900 dark:text-amber-200"
                    >
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                        <span>{inputNotice}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setInputNotice('')}
                        className="text-amber-700 dark:text-amber-300 hover:opacity-75 p-0.5 shrink-0 cursor-pointer"
                        aria-label="Dismiss notice"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* Loaded Image Strip (when decoded from a single image, offers instant Re-crop for multi-QR flyers) */}
                  {loadedImageUrl && activeResult && batchItems.length === 0 && (
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={loadedImageUrl}
                          alt="Scanned source thumbnail"
                          className="w-12 h-12 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                            Loaded screenshot
                          </p>
                          {sourceInfo?.imageWidth && sourceInfo?.imageHeight && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                              {sourceInfo.imageWidth} × {sourceInfo.imageHeight} px
                            </p>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setMode('crop')}
                        className="min-h-[40px] px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <Crop className="w-3.5 h-3.5" />
                        <span>Crop Another Area</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Scrollable Batch Results List */}
                {batchItems.length > 0 && (
                  <BatchResultsList
                    items={batchItems}
                    activeRawText={activeResult?.rawText}
                    isProcessing={isBatchProcessing}
                    onSelectItem={(item) => {
                      if (!item.payload) return;
                      setActiveResult(item.payload);
                      setSourceInfo({
                        sourceType: 'upload',
                        imageWidth: item.imageWidth,
                        imageHeight: item.imageHeight,
                        passUsed: item.passUsed,
                      });
                      setHubTab('decode');
                    }}
                    onCropItem={(item) => {
                      if (!item.imageUrl) return;
                      setCroppingBatchItemId(item.id);
                      setCropError(
                        item.status === 'not_found'
                          ? 'Drag the box around the QR code in this image and tap Scan Cropped Region.'
                          : ''
                      );
                      setMode('crop');
                    }}
                    onClearBatch={handleClearBatch}
                  />
                )}
              </>
            )}
          </div>

          {/* RECENT SCANS (Order 3 on mobile, Right Bottom on desktop) */}
          <div className="order-3 lg:order-none lg:col-span-5 lg:col-start-8 lg:row-start-2">
            <RecentScans
              items={history}
              activeRawText={activeResult?.rawText}
              onSelect={handleSelectHistoryItem}
              onDeleteItem={(id) => setHistory(removeHistoryItem(id))}
              onClearAll={() => setHistory(clearScanHistory())}
            />
          </div>
        </div>
          </>
        )}
      </main>

      {/* Clean Quiet Footer with Full Site Navigation */}
      <footer className="border-t border-slate-200/80 dark:border-slate-800 bg-white/60 dark:bg-[#0B0F14] mt-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between text-xs text-slate-500 dark:text-slate-400">
          <p className="max-w-md leading-relaxed">
            QRUnpack decodes all QR images locally on an off-screen HTML5 canvas. Zero-Auth · Local History.
          </p>
          <nav
            aria-label="Footer navigation"
            className="flex flex-wrap items-center gap-x-5 gap-y-2 font-medium text-slate-600 dark:text-slate-300"
          >
            <a
              href="#decoder"
              onClick={(e) => {
                e.preventDefault();
                navigateToPage('decoder');
              }}
              className="hover:text-slate-950 dark:hover:text-white hover:underline underline-offset-4 whitespace-nowrap"
            >
              Decoder
            </a>
            <a
              href="#about"
              onClick={(e) => {
                e.preventDefault();
                navigateToPage('about');
              }}
              className="hover:text-slate-950 dark:hover:text-white hover:underline underline-offset-4 whitespace-nowrap"
            >
              About
            </a>
            <a
              href="#privacy-policy"
              onClick={(e) => {
                e.preventDefault();
                navigateToPage('privacy');
              }}
              className="hover:text-slate-950 dark:hover:text-white hover:underline underline-offset-4 whitespace-nowrap"
            >
              Privacy Policy
            </a>
            <a
              href="#cookies"
              onClick={(e) => {
                e.preventDefault();
                navigateToPage('cookies');
              }}
              className="hover:text-slate-950 dark:hover:text-white hover:underline underline-offset-4 whitespace-nowrap"
            >
              Cookies
            </a>
            <a
              href="#terms"
              onClick={(e) => {
                e.preventDefault();
                navigateToPage('terms');
              }}
              className="hover:text-slate-950 dark:hover:text-white hover:underline underline-offset-4 whitespace-nowrap"
            >
              Terms of Use
            </a>
            <a
              href="#contact"
              onClick={(e) => {
                e.preventDefault();
                navigateToPage('contact');
              }}
              className="hover:text-slate-950 dark:hover:text-white hover:underline underline-offset-4 whitespace-nowrap"
            >
              Contact Us
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
