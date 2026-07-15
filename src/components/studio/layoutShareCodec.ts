import type { LayoutSpec } from "./BlockRenderer";

// Base64URL encoding of JSON — works in browsers & handles unicode.
function toB64Url(s: string) {
  const b64 = btoa(unescape(encodeURIComponent(s)));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromB64Url(s: string) {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  return decodeURIComponent(escape(atob(b64)));
}

export type SharePayload = { name: string; spec: LayoutSpec };

export function encodeShare(payload: SharePayload): string {
  return toB64Url(JSON.stringify(payload));
}

export function decodeShare(code: string): SharePayload | null {
  try {
    const obj = JSON.parse(fromB64Url(code));
    if (!obj?.spec?.blocks || !Array.isArray(obj.spec.blocks)) return null;
    return obj as SharePayload;
  } catch { return null; }
}

export function buildShareUrl(payload: SharePayload): string {
  const base = typeof window !== "undefined" ? `${window.location.origin}/` : "/";
  return `${base}?share=${encodeShare(payload)}`;
}