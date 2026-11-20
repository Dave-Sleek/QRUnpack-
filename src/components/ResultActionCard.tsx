import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  Globe,
  KeyRound,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UserPlus,
  Wallet,
  Wifi,
} from 'lucide-react';
import type { AiSafetyAnalysis, DecodeSourceInfo, ParsedPayload } from '../types';

interface ResultActionCardProps {
  payload: ParsedPayload;
  sourceInfo?: DecodeSourceInfo;
  onScanAnother: () => void;
  onOpenCrop?: () => void;
  onGenerateQr?: (rawText: string) => void;
}

export function ResultActionCard({
  payload,
  sourceInfo,
  onScanAnother,
  onOpenCrop,
  onGenerateQr,
}: ResultActionCardProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showSecret, setShowSecret] = useState(false);
  const [showRaw, setShowRaw] = useState(false);

  const [aiStatus, setAiStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [aiResult, setAiResult] = useState<AiSafetyAnalysis | null>(null);
  const [aiError, setAiError] = useState('');

  // Reset per-payload transient state when a new payload is loaded
  useEffect(() => {
    setCopiedKey(null);
    setShowSecret(false);
    setShowRaw(false);
    setAiStatus('idle');
    setAiResult(null);
    setAiError('');
  }, [payload.rawText]);

  const handleCopy = async (text: string, key = 'main') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      window.setTimeout(() => {
        setCopiedKey((curr) => (curr === key ? null : curr));
      }, 1800);
    } catch {
      // Fallback copy via temporary textarea
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedKey(key);
      window.setTimeout(() => {
        setCopiedKey((curr) => (curr === key ? null : curr));
      }, 1800);
    }
  };

  const handleDownloadVcf = () => {
    if (!payload.vcard) return;
    const blob = new Blob([payload.vcard.rawVcard], { type: 'text/vcard;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safeName = (payload.vcard.fullName || 'contact')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    a.href = url;
    a.download = `${safeName || 'contact'}.vcf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleRunAiCheck = async () => {
    setAiStatus('loading');
    setAiError('');
    try {
      const response = await fetch('/api/analyze-payload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payload: payload.rawText,
          detectedType: payload.kindLabel,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || `Analysis failed with status ${response.status}.`);
      }
      setAiResult(data as AiSafetyAnalysis);
      setAiStatus('success');
    } catch (err: unknown) {
      setAiStatus('error');
      setAiError(err instanceof Error ? err.message : 'Could not complete AI safety check.');
    }
  };

  const renderKindIcon = () => {
    const cls = 'w-5 h-5';
    switch (payload.kind) {
      case 'url':
        return <Globe className={cls} />;
      case 'file':
        return <FileText className={cls} />;
      case 'wifi':
        return <Wifi className={cls} />;
      case 'vcard':
        return <UserPlus className={cls} />;
      case 'email':
        return <Mail className={cls} />;
      case 'phone':
        return <Phone className={cls} />;
      case 'sms':
        return <MessageSquare className={cls} />;
      case 'geo':
        return <MapPin className={cls} />;
      case 'otp':
        return <KeyRound className={cls} />;
      case 'payment':
        return <Wallet className={cls} />;
      default:
        return <FileText className={cls} />;
    }
  };

  return (
    <motion.section
      key={payload.rawText}
      initial={{ opacity: 0, y: 8, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      aria-live="polite"
      className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131922] shadow-sm overflow-hidden"
    >
      {/* Header Row: Full-width icon + kicker + title, followed by wrap-safe utility actions */}
      <div className="px-4 sm:px-5 pt-4 sm:pt-5 pb-3.5 border-b border-slate-100 dark:border-slate-800/80 space-y-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            {renderKindIcon()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-medium text-blue-600 dark:text-blue-400">
                {payload.kindLabel}
              </span>
              {sourceInfo?.passUsed && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{sourceInfo.passUsed}</span>
                </>
              )}
            </div>
            <h2 className="mt-1 text-lg font-semibold text-slate-900 dark:text-white leading-snug [overflow-wrap:anywhere]">
              {payload.summaryTitle}
            </h2>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          {onGenerateQr && (
            <button
              type="button"
              onClick={() => onGenerateQr(payload.rawText)}
              className="min-h-[38px] px-3 py-1.5 rounded-xl border border-blue-200 dark:border-blue-900/70 bg-blue-50/70 dark:bg-blue-950/40 text-xs font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-950/70 transition-colors whitespace-nowrap cursor-pointer"
            >
              Make QR
            </button>
          )}
          {onOpenCrop && sourceInfo?.imageUrl && (
            <button
              type="button"
              onClick={onOpenCrop}
              className="min-h-[38px] px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap cursor-pointer"
            >
              Re-crop
            </button>
          )}
          <button
            type="button"
            onClick={onScanAnother}
            className="min-h-[38px] px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap cursor-pointer"
          >
            Scan Another
          </button>
        </div>
      </div>

      {/* Tailored Payload Body & Primary Actions */}
      <div className="p-4 sm:p-5 space-y-4">
        {/* 1. WEBSITE / APP LINK OR FILE DOWNLOAD */}
        {(payload.kind === 'url' || payload.kind === 'file') && payload.url && (() => {
          const url = payload.url;
          const isUnusual =
            url.isPunycode ||
            url.hasUserInfo ||
            url.isIpAddress ||
            Boolean(url.port) ||
            url.isHttpInsecure;

          let structureTone = 'text-emerald-700 dark:text-emerald-400';
          let structureLabel = 'URL structure: Standard HTTPS';

          if (url.isPunycode || url.hasUserInfo) {
            structureTone = 'text-rose-700 dark:text-rose-400';
            structureLabel = url.hasUserInfo
              ? 'URL structure: Unusual · Embedded credentials (@)'
              : 'URL structure: Unusual · Internationalized (xn--)';
          } else if (url.isShortener) {
            structureTone = 'text-amber-700 dark:text-amber-400';
            structureLabel = 'URL shortener detected';
          } else if (url.isIpAddress) {
            structureTone = 'text-amber-700 dark:text-amber-400';
            structureLabel = 'URL structure: Unusual · Raw IP address';
          } else if (url.port) {
            structureTone = 'text-amber-700 dark:text-amber-400';
            structureLabel = `URL structure: Unusual · Custom port (${url.port})`;
          } else if (url.isHttpInsecure) {
            structureTone = 'text-amber-700 dark:text-amber-400';
            structureLabel = 'URL structure: Unencrypted HTTP';
          }

          return (
            <>
              <div className="rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 divide-y divide-slate-200/70 dark:divide-slate-800">
                {/* Explicit Domain & Local Structure Status */}
                <div className="px-3.5 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-4">
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      Domain
                    </div>
                    <div className="font-mono text-sm leading-snug break-all select-all mt-0.5">
                      {url.subdomain && (
                        <span className="text-slate-500 dark:text-slate-400">{url.subdomain}</span>
                      )}
                      <span className="font-semibold text-slate-950 dark:text-white underline decoration-blue-500/60 decoration-2 underline-offset-4">
                        {url.rootDomain}
                      </span>
                      {url.port && (
                        <span className="text-amber-600 dark:text-amber-400 font-semibold">
                          {url.port}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className={`inline-flex items-center gap-1.5 text-xs font-medium shrink-0 ${structureTone}`}>
                    {isUnusual || url.isShortener ? (
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    ) : (
                      <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                    )}
                    <span>{structureLabel}</span>
                  </div>
                </div>

                {/* Full URL */}
                <div className="px-3.5 py-3 space-y-1.5">
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {payload.kind === 'file' ? 'File URL' : 'Full URL'}
                  </div>
                  <div className="font-mono text-xs sm:text-sm leading-relaxed break-all select-all text-slate-700 dark:text-slate-300">
                    <span className="text-slate-400 dark:text-slate-500">{url.protocol}</span>
                    <span>{url.hostname}</span>
                    {url.port && (
                      <span className="text-amber-600 dark:text-amber-400 font-semibold">{url.port}</span>
                    )}
                    <span>{url.pathAndQuery}</span>
                  </div>

                  {payload.file && (
                    <div className="pt-1 text-xs text-slate-600 dark:text-slate-300 flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                      <span className="font-medium shrink-0">{payload.file.label}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono truncate">{payload.file.fileName}</span>
                    </div>
                  )}

                  {/* Detailed local heuristic notes when triggered */}
                  {(url.isIpAddress ||
                    url.isPunycode ||
                    url.isHttpInsecure ||
                    url.isShortener ||
                    url.hasUserInfo ||
                    Boolean(url.port)) && (
                    <div className="pt-2 mt-1 border-t border-slate-200/70 dark:border-slate-800 space-y-1">
                      {url.isShortener && (
                        <div className="flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-400">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <span>Shortened URL masks the final destination until opened.</span>
                        </div>
                      )}
                      {url.isIpAddress && (
                        <div className="flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-400">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <span>Points directly to an IP address instead of a named domain.</span>
                        </div>
                      )}
                      {url.isPunycode && (
                        <div className="flex items-start gap-1.5 text-xs text-rose-700 dark:text-rose-400">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <span>Contains internationalized punycode (xn--) characters—verify spelling carefully.</span>
                        </div>
                      )}
                      {url.hasUserInfo && (
                        <div className="flex items-start gap-1.5 text-xs text-rose-700 dark:text-rose-400">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <span>Contains an @ userinfo prefix that can disguise the real destination host.</span>
                        </div>
                      )}
                      {url.port && (
                        <div className="flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-400">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <span>Uses a non-standard port ({url.port}).</span>
                        </div>
                      )}
                      {url.isHttpInsecure && (
                        <div className="flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-400">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <span>Unencrypted HTTP link (not HTTPS). Avoid entering passwords.</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5">
                <a
                  href={url.fullUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 min-h-[48px] px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white text-sm font-semibold transition-all inline-flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  {payload.kind === 'file' ? (
                    <>
                      <Download className="w-4 h-4 shrink-0" />
                      <span>Open File</span>
                    </>
                  ) : (
                    <>
                      <ExternalLink className="w-4 h-4 shrink-0" />
                      <span>Open Link in New Tab</span>
                    </>
                  )}
                </a>
                <button
                  type="button"
                  onClick={() => handleCopy(url.fullUrl, 'url')}
                  className="min-h-[48px] px-5 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-medium transition-colors inline-flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
                >
                  {copiedKey === 'url' ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>{payload.kind === 'file' ? 'Copy File URL' : 'Copy Link'}</span>
                    </>
                  )}
                </button>
              </div>
            </>
          );
        })()}

        {/* 2. WI-FI NETWORK */}
        {payload.kind === 'wifi' && payload.wifi && (
          <>
            <div className="rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 divide-y divide-slate-200/70 dark:divide-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-4 px-4 py-3">
                <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0">Network (SSID)</span>
                <span className="text-sm font-semibold text-slate-900 dark:text-white [overflow-wrap:anywhere] sm:text-right">
                  {payload.wifi.ssid}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-4 px-4 py-3">
                <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0">Security</span>
                <span className="text-sm font-medium text-slate-800 dark:text-slate-200 sm:text-right">
                  {payload.wifi.security}
                  {payload.wifi.hidden ? ' · Hidden' : ''}
                </span>
              </div>
              {payload.wifi.password && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-3 px-4 py-2.5">
                  <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0">Password</span>
                  <div className="flex items-center justify-between sm:justify-end gap-2 min-w-0">
                    <span className="font-mono text-sm font-medium text-slate-900 dark:text-white truncate">
                      {showSecret ? payload.wifi.password : '••••••••••••'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowSecret((v) => !v)}
                      className="min-h-[40px] min-w-[40px] rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-200/60 dark:hover:bg-slate-800 inline-flex items-center justify-center cursor-pointer shrink-0"
                      aria-label={showSecret ? 'Hide password' : 'Show password'}
                    >
                      {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5">
              {payload.wifi.password ? (
                <button
                  type="button"
                  onClick={() => handleCopy(payload.wifi!.password, 'wifi-pass')}
                  className="flex-1 min-h-[48px] px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors inline-flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
                >
                  {copiedKey === 'wifi-pass' ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Password Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy Password</span>
                    </>
                  )}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => handleCopy(payload.wifi!.ssid, 'wifi-ssid')}
                className={`${payload.wifi.password ? '' : 'flex-1 bg-blue-600 hover:bg-blue-700 text-white border-transparent'} min-h-[48px] px-5 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-medium transition-colors inline-flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer`}
              >
                {copiedKey === 'wifi-ssid' ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>SSID Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy Network Name</span>
                  </>
                )}
              </button>
            </div>
          </>
        )}

        {/* 3. VCARD CONTACT */}
        {payload.kind === 'vcard' && payload.vcard && (
          <>
            <div className="rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 divide-y divide-slate-200/70 dark:divide-slate-800">
              {(payload.vcard.title || payload.vcard.organization) && (
                <div className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                  {[payload.vcard.title, payload.vcard.organization].filter(Boolean).join(' · ')}
                </div>
              )}
              {payload.vcard.phones.map((p, idx) => (
                <div key={`${p.value}-${idx}`} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <div className="min-w-0">
                    <div className="text-xs text-slate-500 dark:text-slate-400">{p.type}</div>
                    <a
                      href={`tel:${p.value}`}
                      className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline font-mono break-all"
                    >
                      {p.value}
                    </a>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(p.value, `tel-${idx}`)}
                    className="min-h-[40px] px-3 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800 cursor-pointer shrink-0"
                  >
                    {copiedKey === `tel-${idx}` ? 'Copied' : 'Copy'}
                  </button>
                </div>
              ))}
              {payload.vcard.emails.map((em, idx) => (
                <div key={`${em.value}-${idx}`} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <div className="min-w-0">
                    <div className="text-xs text-slate-500 dark:text-slate-400">{em.type}</div>
                    <a
                      href={`mailto:${em.value}`}
                      className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline break-all"
                    >
                      {em.value}
                    </a>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(em.value, `email-${idx}`)}
                    className="min-h-[40px] px-3 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800 cursor-pointer shrink-0"
                  >
                    {copiedKey === `email-${idx}` ? 'Copied' : 'Copy'}
                  </button>
                </div>
              ))}
              {payload.vcard.url && (
                <div className="px-4 py-2.5">
                  <div className="text-xs text-slate-500 dark:text-slate-400">Website</div>
                  <a
                    href={payload.vcard.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline break-all"
                  >
                    {payload.vcard.url}
                  </a>
                </div>
              )}
              {payload.vcard.address && (
                <div className="px-4 py-2.5">
                  <div className="text-xs text-slate-500 dark:text-slate-400">Address</div>
                  <div className="text-sm text-slate-800 dark:text-slate-200">{payload.vcard.address}</div>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                onClick={handleDownloadVcf}
                className="flex-1 min-h-[48px] px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors inline-flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download .vcf Contact</span>
              </button>
              <button
                type="button"
                onClick={() => handleCopy(payload.rawText, 'vcard-raw')}
                className="min-h-[48px] px-5 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-medium transition-colors inline-flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
              >
                {copiedKey === 'vcard-raw' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>{copiedKey === 'vcard-raw' ? 'Copied' : 'Copy vCard'}</span>
              </button>
            </div>
          </>
        )}

        {/* 4. EMAIL */}
        {payload.kind === 'email' && payload.email && (
          <>
            <div className="rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 divide-y divide-slate-200/70 dark:divide-slate-800">
              <div className="px-4 py-3">
                <div className="text-xs text-slate-500 dark:text-slate-400">Recipient</div>
                <div className="text-sm font-medium text-slate-900 dark:text-white break-all">
                  {payload.email.to}
                </div>
              </div>
              {payload.email.subject && (
                <div className="px-4 py-3">
                  <div className="text-xs text-slate-500 dark:text-slate-400">Subject</div>
                  <div className="text-sm text-slate-800 dark:text-slate-200">{payload.email.subject}</div>
                </div>
              )}
              {payload.email.body && (
                <div className="px-4 py-3">
                  <div className="text-xs text-slate-500 dark:text-slate-400">Body</div>
                  <div className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{payload.email.body}</div>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5">
              <a
                href={payload.email.mailtoHref}
                className="flex-1 min-h-[48px] px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors inline-flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <Mail className="w-4 h-4" />
                <span>Send Email</span>
              </a>
              <button
                type="button"
                onClick={() => handleCopy(payload.email!.to, 'email-to')}
                className="min-h-[48px] px-5 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-medium transition-colors inline-flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
              >
                {copiedKey === 'email-to' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>{copiedKey === 'email-to' ? 'Copied' : 'Copy Address'}</span>
              </button>
            </div>
          </>
        )}

        {/* 5. PHONE */}
        {payload.kind === 'phone' && payload.phone && (
          <div className="flex flex-col sm:flex-row gap-2.5">
            <a
              href={payload.phone.telHref}
              className="flex-1 min-h-[48px] px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors inline-flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <Phone className="w-4 h-4" />
              <span>Call Number</span>
            </a>
            <button
              type="button"
              onClick={() => handleCopy(payload.phone!.number, 'phone-num')}
              className="min-h-[48px] px-5 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-medium transition-colors inline-flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
            >
              {copiedKey === 'phone-num' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copiedKey === 'phone-num' ? 'Copied' : 'Copy Number'}</span>
            </button>
          </div>
        )}

        {/* 6. SMS */}
        {payload.kind === 'sms' && payload.sms && (
          <>
            <div className="rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 divide-y divide-slate-200/70 dark:divide-slate-800">
              <div className="px-4 py-3">
                <div className="text-xs text-slate-500 dark:text-slate-400">Recipient Number</div>
                <div className="text-sm font-mono font-medium text-slate-900 dark:text-white">
                  {payload.sms.number}
                </div>
              </div>
              {payload.sms.body && (
                <div className="px-4 py-3">
                  <div className="text-xs text-slate-500 dark:text-slate-400">Pre-filled Message</div>
                  <div className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
                    {payload.sms.body}
                  </div>
                </div>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <a
                href={payload.sms.smsHref}
                className="flex-1 min-h-[48px] px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors inline-flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Send SMS</span>
              </a>
              <button
                type="button"
                onClick={() => handleCopy(payload.sms!.body || payload.sms!.number, 'sms-copy')}
                className="min-h-[48px] px-5 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-medium transition-colors inline-flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
              >
                {copiedKey === 'sms-copy' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>{copiedKey === 'sms-copy' ? 'Copied' : 'Copy Text'}</span>
              </button>
            </div>
          </>
        )}

        {/* 7. GEO LOCATION */}
        {payload.kind === 'geo' && payload.geo && (
          <>
            <div className="rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Coordinates</div>
                <div className="font-mono text-sm font-medium text-slate-900 dark:text-white">
                  {payload.geo.latitude}, {payload.geo.longitude}
                </div>
              </div>
              {payload.geo.query && (
                <div className="sm:text-right text-xs text-slate-600 dark:text-slate-300 [overflow-wrap:anywhere]">
                  {payload.geo.query}
                </div>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <a
                href={payload.geo.mapsHref}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 min-h-[48px] px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors inline-flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <MapPin className="w-4 h-4" />
                <span>Open in Maps</span>
              </a>
              <button
                type="button"
                onClick={() => handleCopy(`${payload.geo!.latitude}, ${payload.geo!.longitude}`, 'geo-copy')}
                className="min-h-[48px] px-5 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-medium transition-colors inline-flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
              >
                {copiedKey === 'geo-copy' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>{copiedKey === 'geo-copy' ? 'Copied' : 'Copy Coordinates'}</span>
              </button>
            </div>
          </>
        )}

        {/* 8. OTP AUTHENTICATOR */}
        {payload.kind === 'otp' && payload.otp && (
          <>
            <div className="rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 divide-y divide-slate-200/70 dark:divide-slate-800">
              <div className="px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-4">
                <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0">Account</span>
                <span className="text-sm font-medium text-slate-900 dark:text-white [overflow-wrap:anywhere] sm:text-right">
                  {payload.otp.label}
                </span>
              </div>
              <div className="px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-4">
                <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0">Parameters</span>
                <span className="text-xs font-mono text-slate-700 dark:text-slate-300 sm:text-right">
                  {payload.otp.otpType} · {payload.otp.digits} digits · {payload.otp.period}s · {payload.otp.algorithm}
                </span>
              </div>
              {payload.otp.secret && (
                <div className="px-4 py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-3">
                  <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0">Setup Secret</span>
                  <div className="flex items-center justify-between sm:justify-end gap-2 min-w-0">
                    <span className="font-mono text-sm text-slate-900 dark:text-white truncate">
                      {showSecret ? payload.otp.secret : '••••••••••••••••'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowSecret((v) => !v)}
                      className="min-h-[40px] min-w-[40px] rounded-lg text-slate-500 hover:bg-slate-200/60 dark:hover:bg-slate-800 inline-flex items-center justify-center cursor-pointer shrink-0"
                      aria-label={showSecret ? 'Hide secret' : 'Show secret'}
                    >
                      {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-2.5">
              {payload.otp.secret && (
                <button
                  type="button"
                  onClick={() => handleCopy(payload.otp!.secret, 'otp-secret')}
                  className="flex-1 min-h-[48px] px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors inline-flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
                >
                  {copiedKey === 'otp-secret' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedKey === 'otp-secret' ? 'Secret Copied' : 'Copy Setup Key'}</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => handleCopy(payload.rawText, 'otp-uri')}
                className="min-h-[48px] px-5 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-medium transition-colors inline-flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
              >
                {copiedKey === 'otp-uri' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>{copiedKey === 'otp-uri' ? 'Copied' : 'Copy Full URI'}</span>
              </button>
            </div>
          </>
        )}

        {/* 9. PAYMENT OR PLAIN TEXT */}
        {(payload.kind === 'payment' || payload.kind === 'text') && (
          <>
            {payload.payment && (
              <div className="rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 divide-y divide-slate-200/70 dark:divide-slate-800">
                <div className="px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-4">
                  <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0">Payment Type</span>
                  <span className="text-sm font-medium text-slate-900 dark:text-white [overflow-wrap:anywhere] sm:text-right">
                    {payload.payment.scheme}
                  </span>
                </div>
                {payload.payment.amount && (
                  <div className="px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-4">
                    <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0">Amount</span>
                    <span className="text-sm font-semibold font-mono text-slate-900 dark:text-white [overflow-wrap:anywhere] sm:text-right">
                      {payload.payment.amount}
                    </span>
                  </div>
                )}
              </div>
            )}
            <div className="rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 p-4">
              <pre className="font-mono text-sm text-slate-900 dark:text-slate-100 whitespace-pre-wrap break-all leading-relaxed select-all max-h-60 overflow-y-auto">
                {payload.rawText}
              </pre>
            </div>
            <button
              type="button"
              onClick={() => handleCopy(payload.rawText, 'text-main')}
              className="w-full min-h-[48px] px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors inline-flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
            >
              {copiedKey === 'text-main' ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Copied to Clipboard</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy Text</span>
                </>
              )}
            </button>
          </>
        )}

        {/* Optional Raw Payload Inspector for Structured Types */}
        {payload.kind !== 'text' && (
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowRaw((r) => !r)}
              className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 inline-flex items-center gap-1 py-1 cursor-pointer"
            >
              {showRaw ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              <span>{showRaw ? 'Hide raw QR string' : 'Inspect raw QR string'}</span>
            </button>
            {showRaw && (
              <div className="mt-2 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 p-3 flex items-start justify-between gap-3">
                <code className="font-mono text-xs text-slate-700 dark:text-slate-300 break-all whitespace-pre-wrap select-all">
                  {payload.rawText}
                </code>
                <button
                  type="button"
                  onClick={() => handleCopy(payload.rawText, 'raw-str')}
                  className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline shrink-0 cursor-pointer"
                >
                  {copiedKey === 'raw-str' ? 'Copied' : 'Copy'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Optional Gemini AI Safety & Summary Check (On-Demand Only) */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-3">
          {aiStatus === 'idle' && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Sends this decoded text or URL to Gemini for a safety and summary check. Your QR image stays on this device.
              </p>
              <button
                type="button"
                onClick={handleRunAiCheck}
                className="min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-semibold transition-colors inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>AI Safety & Summary Check</span>
              </button>
            </div>
          )}

          {aiStatus === 'loading' && (
            <div className="rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 p-4 flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin shrink-0" />
              <span>Checking payload structure and link safety with Gemini...</span>
            </div>
          )}

          {aiStatus === 'error' && (
            <div className="rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/70 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5 text-xs text-rose-800 dark:text-rose-300">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{aiError}</span>
              </div>
              <button
                type="button"
                onClick={handleRunAiCheck}
                className="min-h-[40px] px-3.5 py-2 rounded-lg bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-800 text-xs font-semibold text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/50 whitespace-nowrap shrink-0 cursor-pointer"
              >
                Retry Check
              </button>
            </div>
          )}

          {aiStatus === 'success' && aiResult && (
            <div className="rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 p-4 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {aiResult.safetyAssessment === 'Safe' && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                      <ShieldCheck className="w-4 h-4 shrink-0" />
                      <span>Safe</span>
                    </span>
                  )}
                  {aiResult.safetyAssessment === 'Caution' && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>Caution</span>
                    </span>
                  )}
                  {aiResult.safetyAssessment === 'High Risk' && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-700 dark:text-rose-400">
                      <ShieldAlert className="w-4 h-4 shrink-0" />
                      <span>High Risk</span>
                    </span>
                  )}
                  <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
                    {aiResult.categoryLabel}
                  </span>
                </div>
              </div>

              <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
                {aiResult.explanation}
              </p>

              {aiResult.signals.length > 0 && (
                <ul className="pt-1 space-y-1">
                  {aiResult.signals.map((sig, i) => (
                    <li
                      key={i}
                      className="text-xs text-slate-600 dark:text-slate-400 flex items-start gap-2"
                    >
                      <span className="text-slate-400 dark:text-slate-500 select-none">•</span>
                      <span>{sig}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.section>
  );
}
