import { useEffect, useRef, useState } from "react";
import type { LayoutSpec } from "./BlockRenderer";

export type Draft = { spec: LayoutSpec; name: string; ts: number };

const KEY = (id: string) => `layout-draft:${id}`;

export function loadDraft(id: string): Draft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY(id));
    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch { return null; }
}

export function clearDraft(id: string) {
  if (typeof window === "undefined") return;
  try { localStorage.removeItem(KEY(id)); } catch {}
}

/** Debounced write to localStorage. Returns last-saved timestamp. */
export function useAutosave(id: string, spec: LayoutSpec, name: string, enabled = true) {
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const first = useRef(true);

  useEffect(() => {
    if (!enabled) return;
    // Skip first write on mount to avoid overwriting an existing draft immediately
    if (first.current) { first.current = false; return; }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      try {
        const d: Draft = { spec, name, ts: Date.now() };
        localStorage.setItem(KEY(id), JSON.stringify(d));
        setSavedAt(d.ts);
      } catch {}
    }, 800);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [id, spec, name, enabled]);

  return savedAt;
}

export function relativeTime(ts: number | null): string {
  if (!ts) return "";
  const s = Math.max(1, Math.round((Date.now() - ts) / 1000));
  if (s < 60) return `לפני ${s} שניות`;
  const m = Math.round(s / 60);
  if (m < 60) return `לפני ${m} דקות`;
  const h = Math.round(m / 60);
  return `לפני ${h} שעות`;
}