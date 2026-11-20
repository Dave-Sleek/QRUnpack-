import type { ParsedPayload, ScanHistoryItem } from '../types';

const STORAGE_KEY = 'qrunpack_history_v1';
const MAX_HISTORY_ITEMS = 15;

export function loadScanHistory(): ScanHistoryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item): item is ScanHistoryItem =>
          Boolean(item) &&
          typeof item.id === 'string' &&
          typeof item.rawText === 'string' &&
          typeof item.timestamp === 'number'
      )
      .slice(0, MAX_HISTORY_ITEMS);
  } catch {
    return [];
  }
}

export function saveScanToHistory(payload: ParsedPayload): ScanHistoryItem[] {
  const existing = loadScanHistory();
  // Deduplicate identical consecutive or previous payload so history stays fresh
  const filtered = existing.filter((item) => item.rawText !== payload.rawText);

  const entry: ScanHistoryItem = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    rawText: payload.rawText,
    kind: payload.kind,
    kindLabel: payload.kindLabel,
    summaryTitle: payload.summaryTitle,
    summarySubtitle: payload.summarySubtitle,
    timestamp: Date.now(),
  };

  const next = [entry, ...filtered].slice(0, MAX_HISTORY_ITEMS);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage quota errors cleanly
  }
  return next;
}

export function removeHistoryItem(id: string): ScanHistoryItem[] {
  const existing = loadScanHistory();
  const next = existing.filter((item) => item.id !== id);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Ignore
  }
  return next;
}

export function clearScanHistory(): ScanHistoryItem[] {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore
  }
  return [];
}

export function formatRelativeTime(timestamp: number): string {
  const diffSec = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (diffSec < 45) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
