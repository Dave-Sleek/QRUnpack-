import { useState } from 'react';
import {
  Check,
  Clock,
  Copy,
  FileText,
  Globe,
  KeyRound,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Trash2,
  UserPlus,
  Wallet,
  Wifi,
} from 'lucide-react';
import type { PayloadKind, ScanHistoryItem } from '../types';
import { formatRelativeTime } from '../utils/historyStorage';

interface RecentScansProps {
  items: ScanHistoryItem[];
  activeRawText?: string;
  onSelect: (item: ScanHistoryItem) => void;
  onDeleteItem: (id: string) => void;
  onClearAll: () => void;
}

function getKindIcon(kind: PayloadKind) {
  const cls = 'w-4 h-4';
  switch (kind) {
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
}

export function RecentScans({
  items,
  activeRawText,
  onSelect,
  onDeleteItem,
  onClearAll,
}: RecentScansProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const handleCopy = async (e: React.MouseEvent, item: ScanHistoryItem) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(item.rawText);
      setCopiedId(item.id);
      window.setTimeout(() => {
        setCopiedId((curr) => (curr === item.id ? null : curr));
      }, 1500);
    } catch {
      // ignore
    }
  };

  return (
    <section
      id="recent-scans"
      className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#131922] overflow-hidden"
    >
      <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            Recent Scans (Saved on This Device)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums mt-0.5">
            {items.length} of 15 decoded strings stored locally · No images saved
          </p>
        </div>

        {items.length > 0 && (
          <div className="flex items-center gap-2">
            {confirmClear ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    onClearAll();
                    setConfirmClear(false);
                  }}
                  className="min-h-[36px] px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium transition-colors whitespace-nowrap cursor-pointer"
                >
                  Confirm Clear
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClear(false)}
                  className="min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap cursor-pointer"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmClear(true)}
                className="min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear History</span>
              </button>
            )}
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <div className="mx-auto w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-slate-400 dark:text-slate-500 flex items-center justify-center mb-2.5">
            <Clock className="w-5 h-5" />
          </div>
          <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
            No recent scans yet
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
            Decoded QR text, links, and Wi-Fi credentials will appear here for quick one-tap reuse.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800/80 max-h-[420px] overflow-y-auto">
          {items.map((item) => {
            const isActive = activeRawText === item.rawText;
            return (
              <li
                key={item.id}
                onClick={() => onSelect(item)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect(item);
                  }
                }}
                className={`group flex items-center gap-3 px-4 py-3 min-h-[60px] transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-blue-50/70 dark:bg-blue-950/30'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {getKindIcon(item.kind)}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <span className="truncate">{item.kindLabel}</span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums whitespace-nowrap shrink-0">
                      {formatRelativeTime(item.timestamp)}
                    </span>
                  </div>
                  <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                    {item.summaryTitle}
                  </div>
                  <div className="text-xs font-mono text-slate-500 dark:text-slate-400 truncate">
                    {item.summarySubtitle}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => handleCopy(e, item)}
                    className="min-h-[44px] min-w-[44px] rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700/60 inline-flex items-center justify-center cursor-pointer"
                    aria-label="Copy decoded payload"
                    title="Copy"
                  >
                    {copiedId === item.id ? (
                      <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteItem(item.id);
                    }}
                    className="min-h-[44px] min-w-[44px] rounded-xl text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 inline-flex items-center justify-center cursor-pointer"
                    aria-label="Remove item from history"
                    title="Remove"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
