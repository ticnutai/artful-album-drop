import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { Rnd } from "react-rnd";
import { toPng } from "html-to-image";
import {
  X, Save, Undo2, Redo2, Copy, Trash2, Plus,
  ChevronUp, ChevronDown, ChevronLeft, ChevronRight,
  Maximize2, Minus, Move, Target,
  AlignHorizontalJustifyCenter, AlignVerticalJustifyCenter,
  AlignHorizontalJustifyStart, AlignHorizontalJustifyEnd,
  AlignVerticalJustifyStart, AlignVerticalJustifyEnd,
  Layers, Grid3x3, ArrowUp, ArrowDown,
  Magnet, Share2, Download, Upload, Folder, Cloud, Check,
} from "lucide-react";
import { BlockContent, BLOCK_LIBRARY, defaultSpec, type Block, type BlockType, type LayoutSpec } from "./BlockRenderer";
import type { Theme } from "./shared";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAutosave, loadDraft, clearDraft, relativeTime } from "./useAutosave";
import { buildShareUrl } from "./layoutShareCodec";

type State = { spec: LayoutSpec; past: LayoutSpec[]; future: LayoutSpec[] };
type Action =
  | { type: "set"; spec: LayoutSpec }
  | { type: "undo" } | { type: "redo" }
  | { type: "reset"; spec: LayoutSpec };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "set":
      return { spec: action.spec, past: [...state.past.slice(-49), state.spec], future: [] };
    case "undo":
      if (!state.past.length) return state;
      return { spec: state.past[state.past.length - 1], past: state.past.slice(0, -1), future: [state.spec, ...state.future] };
    case "redo":
      if (!state.future.length) return state;
      return { spec: state.future[0], past: [...state.past, state.spec], future: state.future.slice(1) };
    case "reset":
      return { spec: action.spec, past: [], future: [] };
  }
}

const BG_OPTIONS = [
  { label: "שמפניה", value: "bg-[oklch(0.96_0.015_85)]" },
  { label: "אובסידיאן", value: "bg-[oklch(0.14_0.006_60)]" },
  { label: "אוניקס עמוק", value: "bg-[oklch(0.11_0.005_60)] [background-image:radial-gradient(ellipse_at_top,oklch(0.22_0.008_60),oklch(0.11_0.005_60)_70%)]" },
  { label: "רשת זהב", value: "bg-[oklch(0.14_0.006_60)] [background-image:linear-gradient(oklch(0.76_0.13_85/0.06)_1px,transparent_1px),linear-gradient(90deg,oklch(0.76_0.13_85/0.06)_1px,transparent_1px)] [background-size:32px_32px]" },
  { label: "לבן", value: "bg-white" },
];

// Ready-to-apply layout presets
const TEMPLATES: { key: string; label: string; description: string; icon: string; build: () => LayoutSpec }[] = [
  {
    key: "three-floors",
    label: "3 קומות",
    description: "כותרת · תוכן · פעולות",
    icon: "▤",
    build: () => ({
      grid: { cols: 12, rows: 8 },
      background: BG_OPTIONS[0].value,
      blocks: [
        { id: "t1", type: "title", x: 0, y: 0, w: 8, h: 1, props: { theme: "light", text: "שיתוף מסך" } },
        { id: "t2", type: "clock", x: 8, y: 0, w: 2, h: 1, props: { theme: "light" } },
        { id: "t3", type: "roomCode", x: 10, y: 0, w: 2, h: 1, props: { theme: "light" } },
        { id: "t4", type: "canvas", x: 0, y: 1, w: 12, h: 6, props: { theme: "light" } },
        { id: "t5", type: "toolbar", x: 0, y: 7, w: 8, h: 1, props: { theme: "light" } },
        { id: "t6", type: "action", x: 8, y: 7, w: 2, h: 1, props: { theme: "light", text: "הזמן" } },
        { id: "t7", type: "quality", x: 10, y: 7, w: 2, h: 1, props: { theme: "light" } },
      ],
    }),
  },
  {
    key: "grid-2x2",
    label: "רשת 2×2",
    description: "ארבעה חלונות שווים",
    icon: "▦",
    build: () => ({
      grid: { cols: 12, rows: 8 },
      background: BG_OPTIONS[3].value,
      blocks: [
        { id: "g1", type: "canvas", x: 0, y: 0, w: 6, h: 4, props: { theme: "dark" } },
        { id: "g2", type: "canvas", x: 6, y: 0, w: 6, h: 4, props: { theme: "dark" } },
        { id: "g3", type: "participants", x: 0, y: 4, w: 6, h: 4, props: { theme: "dark", variant: "avatars" } },
        { id: "g4", type: "canvas", x: 6, y: 4, w: 6, h: 4, props: { theme: "dark" } },
      ],
    }),
  },
  {
    key: "top-header",
    label: "כותרת עליונה",
    description: "שורת סטטוס + במה מלאה",
    icon: "▔",
    build: () => ({
      grid: { cols: 12, rows: 8 },
      background: BG_OPTIONS[2].value,
      blocks: [
        { id: "h1", type: "clock", x: 0, y: 0, w: 2, h: 1, props: { theme: "dark" } },
        { id: "h2", type: "title", x: 2, y: 0, w: 6, h: 1, props: { theme: "dark", text: "שיתוף מסך · חי" } },
        { id: "h3", type: "quality", x: 8, y: 0, w: 2, h: 1, props: { theme: "dark" } },
        { id: "h4", type: "roomCode", x: 10, y: 0, w: 2, h: 1, props: { theme: "dark" } },
        { id: "h5", type: "canvas", x: 0, y: 1, w: 12, h: 7, props: { theme: "dark" } },
      ],
    }),
  },
  {
    key: "presenter",
    label: "מציג + משתתפים",
    description: "קנבס גדול וסייד־בר",
    icon: "◧",
    build: () => ({
      grid: { cols: 12, rows: 8 },
      background: BG_OPTIONS[0].value,
      blocks: [
        { id: "p1", type: "participants", x: 0, y: 0, w: 3, h: 7, props: { theme: "light", variant: "list" } },
        { id: "p2", type: "canvas", x: 3, y: 0, w: 9, h: 7, props: { theme: "light" } },
        { id: "p3", type: "toolbar", x: 3, y: 7, w: 7, h: 1, props: { theme: "light" } },
        { id: "p4", type: "emoji", x: 10, y: 7, w: 2, h: 1, props: { theme: "light", orientation: "horizontal" } },
      ],
    }),
  },
  {
    key: "focus",
    label: "פוקוס נקי",
    description: "רק קנבס וסרגל",
    icon: "◻",
    build: () => ({
      grid: { cols: 12, rows: 8 },
      background: BG_OPTIONS[4].value,
      blocks: [
        { id: "f1", type: "canvas", x: 0, y: 0, w: 12, h: 7, props: { theme: "light" } },
        { id: "f2", type: "toolbar", x: 4, y: 7, w: 4, h: 1, props: { theme: "light" } },
      ],
    }),
  },
];

export function LayoutEditor({
  initial, initialName, layoutId, onExit,
}: {
  initial?: LayoutSpec; initialName?: string; layoutId?: string; onExit: () => void;
}) {
  const [state, dispatch] = useReducer(reducer, undefined, () => ({ spec: initial ?? defaultSpec(), past: [], future: [] }));
  const [name, setName] = useState(initialName ?? "פריסה חדשה");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [cellSize, setCellSize] = useState({ w: 80, h: 80 });

  // Snap sensitivity (0=off). Cycles through low/med/high. Threshold in px.
  const SNAP_LEVELS = [
    { key: 0, label: "כבוי", px: 0 },
    { key: 1, label: "עדין", px: 4 },
    { key: 2, label: "רגיל", px: 8 },
    { key: 3, label: "חזק", px: 16 },
  ] as const;
  const [snapLevel, setSnapLevel] = useState<number>(2);
  const snapPx = SNAP_LEVELS[snapLevel].px;
  const [guides, setGuides] = useState<{ v: number[]; h: number[] }>({ v: [], h: [] });

  // Precision: subdivisions per grid cell. 1 = grid only, higher = finer movement.
  const PRECISION_LEVELS = [
    { key: 1, label: "רשת" },
    { key: 2, label: "½" },
    { key: 4, label: "¼" },
    { key: 10, label: "עדין" },
    { key: 20, label: "מדויק" },
  ] as const;
  const [precisionIdx, setPrecisionIdx] = useState<number>(0);
  const subdiv = PRECISION_LEVELS[precisionIdx].key;
  const roundFine = (g: number) => Math.round(g * subdiv) / subdiv;

  const spec = state.spec;
  const selected = selectedId ? spec.blocks.find((b) => b.id === selectedId) : null;

  // Measure cell size
  useEffect(() => {
    if (!canvasRef.current) return;
    const el = canvasRef.current;
    const measure = () => {
      const r = el.getBoundingClientRect();
      const gap = 12;
      setCellSize({
        w: (r.width - gap * (spec.grid.cols - 1)) / spec.grid.cols,
        h: (r.height - gap * (spec.grid.rows - 1)) / spec.grid.rows,
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [spec.grid.cols, spec.grid.rows]);

  const setSpec = (s: LayoutSpec) => dispatch({ type: "set", spec: s });

  const updateBlock = (id: string, patch: Partial<Block>) => {
    setSpec({ ...spec, blocks: spec.blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)) });
  };
  const updateProps = (id: string, patch: Partial<Block["props"]>) => {
    setSpec({ ...spec, blocks: spec.blocks.map((b) => (b.id === id ? { ...b, props: { ...b.props, ...patch } } : b)) });
  };
  const addBlock = (type: BlockType) => {
    const lib = BLOCK_LIBRARY.find((l) => l.type === type)!;
    const id = `b${Date.now()}`;
    const w = Math.min(lib.defaultSize[0], spec.grid.cols);
    const h = Math.min(lib.defaultSize[1], spec.grid.rows);
    const block: Block = { id, type, x: 0, y: 0, w, h, props: { theme: "light" } };
    setSpec({ ...spec, blocks: [...spec.blocks, block] });
    setSelectedId(id);
  };
  const removeBlock = (id: string) => {
    setSpec({ ...spec, blocks: spec.blocks.filter((b) => b.id !== id) });
    if (selectedId === id) setSelectedId(null);
  };
  const duplicateBlock = (id: string) => {
    const b = spec.blocks.find((x) => x.id === id); if (!b) return;
    const nid = `b${Date.now()}`;
    setSpec({ ...spec, blocks: [...spec.blocks, { ...b, id: nid, x: Math.min(b.x + 1, spec.grid.cols - b.w), y: Math.min(b.y + 1, spec.grid.rows - b.h) }] });
    setSelectedId(nid);
  };

  // Nudge / resize helpers used by joystick + keyboard
  const clampBlock = (b: Block, patch: Partial<Block>): Partial<Block> => {
    const w = Math.max(1, Math.min(patch.w ?? b.w, spec.grid.cols));
    const h = Math.max(1, Math.min(patch.h ?? b.h, spec.grid.rows));
    const x = Math.max(0, Math.min(patch.x ?? b.x, spec.grid.cols - w));
    const y = Math.max(0, Math.min(patch.y ?? b.y, spec.grid.rows - h));
    return { x, y, w, h };
  };
  const nudge = (dx: number, dy: number) => {
    if (!selected) return;
    updateBlock(selected.id, clampBlock(selected, { x: selected.x + dx, y: selected.y + dy }));
  };
  const resizeBy = (dw: number, dh: number) => {
    if (!selected) return;
    updateBlock(selected.id, clampBlock(selected, { w: selected.w + dw, h: selected.h + dh }));
  };
  const alignBlock = (dir: "left" | "right" | "top" | "bottom" | "centerX" | "centerY" | "fill") => {
    if (!selected) return;
    const b = selected;
    let patch: Partial<Block> = {};
    if (dir === "left") patch = { x: 0 };
    if (dir === "right") patch = { x: spec.grid.cols - b.w };
    if (dir === "top") patch = { y: 0 };
    if (dir === "bottom") patch = { y: spec.grid.rows - b.h };
    if (dir === "centerX") patch = { x: Math.round((spec.grid.cols - b.w) / 2) };
    if (dir === "centerY") patch = { y: Math.round((spec.grid.rows - b.h) / 2) };
    if (dir === "fill") patch = { x: 0, y: 0, w: spec.grid.cols, h: spec.grid.rows };
    updateBlock(b.id, clampBlock(b, patch));
  };

  // Keyboard shortcuts: arrows nudge, shift+arrows resize, cmd+d duplicate, del removes
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") { e.preventDefault(); dispatch({ type: e.shiftKey ? "redo" : "undo" }); return; }
      if (!selected) return;
      // Fine step matches precision level; Alt = 2× jump; Shift keeps grid steps for resize predictability
      const fine = 1 / subdiv;
      const step = e.altKey ? fine * 2 : fine;
      if (e.key === "ArrowLeft") { e.preventDefault(); e.shiftKey ? resizeBy(-step, 0) : nudge(-step, 0); }
      else if (e.key === "ArrowRight") { e.preventDefault(); e.shiftKey ? resizeBy(step, 0) : nudge(step, 0); }
      else if (e.key === "ArrowUp") { e.preventDefault(); e.shiftKey ? resizeBy(0, -step) : nudge(0, -step); }
      else if (e.key === "ArrowDown") { e.preventDefault(); e.shiftKey ? resizeBy(0, step) : nudge(0, step); }
      else if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); removeBlock(selected.id); }
      else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "d") { e.preventDefault(); duplicateBlock(selected.id); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const gap = 12;
  const pxToGrid = (px: number, size: number) => Math.round(px / (size + gap));
  // Fractional grid units based on current precision (subdiv)
  const pxToFine = (px: number, size: number) => Math.round((px / (size + gap)) * subdiv) / subdiv;
  const gridToPx = (g: number, size: number) => g * (size + gap);

  // Smart snapping: compute guide lines against other blocks + canvas edges/centers
  const canvasPxSize = () => ({
    w: spec.grid.cols * cellSize.w + (spec.grid.cols - 1) * gap,
    h: spec.grid.rows * cellSize.h + (spec.grid.rows - 1) * gap,
  });
  const collectTargets = (ignoreId: string) => {
    const cs = canvasPxSize();
    const v: number[] = [0, cs.w / 2, cs.w];
    const h: number[] = [0, cs.h / 2, cs.h];
    spec.blocks.forEach((b) => {
      if (b.id === ignoreId) return;
      const x1 = gridToPx(b.x, cellSize.w);
      const x2 = x1 + gridToPx(b.w, cellSize.w) - gap;
      const y1 = gridToPx(b.y, cellSize.h);
      const y2 = y1 + gridToPx(b.h, cellSize.h) - gap;
      v.push(x1, x2, (x1 + x2) / 2);
      h.push(y1, y2, (y1 + y2) / 2);
    });
    return { v, h };
  };
  const nearest = (val: number, list: number[]) => {
    let best = { d: Infinity, val };
    for (const t of list) { const d = Math.abs(t - val); if (d < best.d) best = { d, val: t }; }
    return best;
  };
  const snapEdges = (
    ignoreId: string,
    rect: { x: number; y: number; w: number; h: number },
    edges: { left?: boolean; right?: boolean; top?: boolean; bottom?: boolean; centerX?: boolean; centerY?: boolean },
  ) => {
    const gV: number[] = []; const gH: number[] = [];
    if (snapPx <= 0) return { dx: 0, dy: 0, gV, gH };
    const { v, h } = collectTargets(ignoreId);
    const cx = rect.x + rect.w / 2, cy = rect.y + rect.h / 2;
    const candsX: { d: number; delta: number; line: number }[] = [];
    if (edges.left) { const n = nearest(rect.x, v); candsX.push({ d: n.d, delta: n.val - rect.x, line: n.val }); }
    if (edges.right) { const n = nearest(rect.x + rect.w, v); candsX.push({ d: n.d, delta: n.val - (rect.x + rect.w), line: n.val }); }
    if (edges.centerX) { const n = nearest(cx, v); candsX.push({ d: n.d, delta: n.val - cx, line: n.val }); }
    const bestX = candsX.filter((c) => c.d <= snapPx).sort((a, b) => a.d - b.d)[0];
    const candsY: { d: number; delta: number; line: number }[] = [];
    if (edges.top) { const n = nearest(rect.y, h); candsY.push({ d: n.d, delta: n.val - rect.y, line: n.val }); }
    if (edges.bottom) { const n = nearest(rect.y + rect.h, h); candsY.push({ d: n.d, delta: n.val - (rect.y + rect.h), line: n.val }); }
    if (edges.centerY) { const n = nearest(cy, h); candsY.push({ d: n.d, delta: n.val - cy, line: n.val }); }
    const bestY = candsY.filter((c) => c.d <= snapPx).sort((a, b) => a.d - b.d)[0];
    if (bestX) gV.push(bestX.line);
    if (bestY) gH.push(bestY.line);
    return { dx: bestX?.delta ?? 0, dy: bestY?.delta ?? 0, gV, gH };
  };

  const save = async () => {
    setSaving(true);
    try {
      // Deselect for a clean thumbnail
      setSelectedId(null);
      await new Promise((r) => setTimeout(r, 50));
      let thumbnail: string | null = null;
      if (canvasRef.current) {
        try {
          thumbnail = await toPng(canvasRef.current, { pixelRatio: 0.3, cacheBust: true });
        } catch (e) { console.warn("thumbnail failed", e); }
      }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error("יש להתחבר כדי לשמור"); return; }
      if (layoutId) {
        const { error } = await supabase.from("custom_layouts").update({ name, spec: spec as never, thumbnail }).eq("id", layoutId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("custom_layouts").insert({ user_id: user.id, name, spec: spec as never, thumbnail });
        if (error) throw error;
      }
      toast.success("הפריסה נשמרה");
      onExit();
    } catch (e) {
      console.error(e);
      toast.error("שגיאה בשמירה");
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-100 flex flex-col">
      {/* Top bar */}
      <header className="h-14 bg-white border-b border-slate-200 flex items-center gap-3 px-4 shrink-0">
        <button onClick={onExit} className="p-2 hover:bg-slate-100 rounded-lg" aria-label="יציאה"><X className="size-5" /></button>
        <input value={name} onChange={(e) => setName(e.target.value)} className="font-bold bg-transparent outline-none border-b border-transparent focus:border-primary px-1 min-w-0 flex-1 max-w-xs" />
        <div className="flex items-center gap-1 border-r border-slate-200 pr-3 mr-1">
          <button onClick={() => dispatch({ type: "undo" })} disabled={!state.past.length} className="p-2 hover:bg-slate-100 rounded-lg disabled:opacity-30" aria-label="בטל"><Undo2 className="size-4" /></button>
          <button onClick={() => dispatch({ type: "redo" })} disabled={!state.future.length} className="p-2 hover:bg-slate-100 rounded-lg disabled:opacity-30" aria-label="חזור"><Redo2 className="size-4" /></button>
        </div>
        <div className="text-xs text-slate-500 mr-auto">{spec.blocks.length} רכיבים · רשת {spec.grid.cols}×{spec.grid.rows}</div>
        <button
          onClick={() => setSnapLevel((l) => (l + 1) % SNAP_LEVELS.length)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
            snapPx > 0
              ? "bg-primary/10 border-primary/40 text-primary"
              : "bg-slate-50 border-slate-200 text-slate-500"
          }`}
          title="רגישות הצמדה"
        >
          <Magnet className="size-3.5" /> הצמדה · {SNAP_LEVELS[snapLevel].label}
        </button>
        <button
          onClick={() => setPrecisionIdx((i) => (i + 1) % PRECISION_LEVELS.length)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
            subdiv > 1
              ? "bg-fuchsia-100 border-fuchsia-300 text-fuchsia-700"
              : "bg-slate-50 border-slate-200 text-slate-500"
          }`}
          title="דיוק תזוזה — הקטן את קפיצות התזוזה"
        >
          <Target className="size-3.5" /> דיוק · {PRECISION_LEVELS[precisionIdx].label}
        </button>
        <button onClick={save} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:brightness-110 disabled:opacity-50">
          <Save className="size-4" /> {saving ? "שומר…" : "שמור פריסה"}
        </button>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Component palette */}
        <aside className="w-56 bg-white border-l border-slate-200 overflow-y-auto p-3 shrink-0">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 px-1 flex items-center gap-1"><Layers className="size-3" /> תבניות מוכנות</h3>
          <div className="space-y-1.5 mb-4">
            {TEMPLATES.map((t) => (
              <button
                key={t.key}
                onClick={() => {
                  dispatch({ type: "set", spec: t.build() });
                  setSelectedId(null);
                  toast.success(`הופעל: ${t.label}`);
                }}
                className="w-full flex items-center gap-2 p-2 border border-slate-200 rounded-xl hover:border-primary hover:bg-primary/5 transition-all text-right"
              >
                <span className="text-xl leading-none w-7 h-7 grid place-items-center bg-slate-100 rounded-lg shrink-0">{t.icon}</span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[12px] font-bold text-slate-800 truncate">{t.label}</span>
                  <span className="block text-[10px] text-slate-500 truncate">{t.description}</span>
                </span>
                <span className="text-[10px] font-bold text-primary shrink-0">החל</span>
              </button>
            ))}
          </div>

          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 px-1">רכיבים</h3>
          <div className="grid grid-cols-2 gap-2">
            {BLOCK_LIBRARY.map((lib) => (
              <button key={lib.type} onClick={() => addBlock(lib.type)}
                className="flex flex-col items-center gap-1 p-3 border border-slate-200 rounded-xl hover:border-primary hover:bg-primary/5 transition-all text-center">
                <span className="text-2xl">{lib.icon}</span>
                <span className="text-[11px] font-bold text-slate-700">{lib.label}</span>
              </button>
            ))}
          </div>

          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-6 mb-2 px-1">רקע</h3>
          <div className="space-y-1">
            {BG_OPTIONS.map((bg) => (
              <button key={bg.value} onClick={() => setSpec({ ...spec, background: bg.value })}
                className={`w-full text-right px-3 py-2 rounded-lg text-xs font-medium ${spec.background === bg.value ? "bg-primary text-white" : "hover:bg-slate-100"}`}>
                {bg.label}
              </button>
            ))}
          </div>

          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-6 mb-2 px-1 flex items-center gap-1"><Grid3x3 className="size-3" /> רשת</h3>
          <div className="space-y-2 px-1">
            <div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1"><span>עמודות</span><span className="font-mono font-bold text-slate-700">{spec.grid.cols}</span></div>
              <input type="range" min={4} max={16} value={spec.grid.cols} onChange={(e) => setSpec({ ...spec, grid: { ...spec.grid, cols: Number(e.target.value) } })} className="w-full accent-primary" />
            </div>
            <div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1"><span>שורות</span><span className="font-mono font-bold text-slate-700">{spec.grid.rows}</span></div>
              <input type="range" min={3} max={12} value={spec.grid.rows} onChange={(e) => setSpec({ ...spec, grid: { ...spec.grid, rows: Number(e.target.value) } })} className="w-full accent-primary" />
            </div>
          </div>
        </aside>

        {/* Canvas */}
        <main className="flex-1 p-6 overflow-auto flex items-center justify-center">
          <div className={`w-full max-w-6xl aspect-video ${spec.background} rounded-2xl shadow-2xl relative`}>
            <div
              ref={canvasRef}
              className="absolute inset-4"
              onClick={(e) => { if (e.target === e.currentTarget) setSelectedId(null); }}
              style={{
                backgroundImage: "linear-gradient(rgba(99,102,241,0.08) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,0.08) 1px,transparent 1px)",
                backgroundSize: `${cellSize.w + gap}px ${cellSize.h + gap}px`,
              }}
            >
              {spec.blocks.map((b) => {
                const isSel = selectedId === b.id;
                return (
                  <Rnd
                    key={b.id}
                    size={{ width: gridToPx(b.w, cellSize.w) - gap, height: gridToPx(b.h, cellSize.h) - gap }}
                    position={{ x: gridToPx(b.x, cellSize.w), y: gridToPx(b.y, cellSize.h) }}
                    bounds="parent"
                    onDrag={(_, d) => {
                      const width = gridToPx(b.w, cellSize.w) - gap;
                      const height = gridToPx(b.h, cellSize.h) - gap;
                      const s = snapEdges(b.id, { x: d.x, y: d.y, w: width, h: height }, { left: true, right: true, top: true, bottom: true, centerX: true, centerY: true });
                      setGuides({ v: s.gV, h: s.gH });
                    }}
                    onDragStop={(_, d) => {
                      const width = gridToPx(b.w, cellSize.w) - gap;
                      const height = gridToPx(b.h, cellSize.h) - gap;
                      const s = snapEdges(b.id, { x: d.x, y: d.y, w: width, h: height }, { left: true, right: true, top: true, bottom: true, centerX: true, centerY: true });
                      const x = Math.max(0, Math.min(pxToFine(d.x + s.dx, cellSize.w), spec.grid.cols - b.w));
                      const y = Math.max(0, Math.min(pxToFine(d.y + s.dy, cellSize.h), spec.grid.rows - b.h));
                      setGuides({ v: [], h: [] });
                      updateBlock(b.id, { x, y });
                    }}
                    onResize={(_, dir, ref, __, pos) => {
                      const edges = {
                        left: /Left/i.test(dir) || dir === "left",
                        right: /Right/i.test(dir) || dir === "right",
                        top: /^top/i.test(dir) || dir === "top",
                        bottom: /^bottom/i.test(dir) || dir === "bottom",
                      };
                      const s = snapEdges(b.id, { x: pos.x, y: pos.y, w: ref.offsetWidth, h: ref.offsetHeight }, edges);
                      setGuides({ v: s.gV, h: s.gH });
                    }}
                    onResizeStop={(_, dir, ref, ___, pos) => {
                      const edges = {
                        left: /Left/i.test(dir) || dir === "left",
                        right: /Right/i.test(dir) || dir === "right",
                        top: /^top/i.test(dir) || dir === "top",
                        bottom: /^bottom/i.test(dir) || dir === "bottom",
                      };
                      const rect = { x: pos.x, y: pos.y, w: ref.offsetWidth, h: ref.offsetHeight };
                      const s = snapEdges(b.id, rect, edges);
                      // Apply snap by shifting only the active edges
                      let { x: nx, y: ny, w: nw, h: nh } = rect;
                      if (edges.left) { nx += s.dx; nw -= s.dx; }
                      else if (edges.right) { nw += s.dx; }
                      if (edges.top) { ny += s.dy; nh -= s.dy; }
                      else if (edges.bottom) { nh += s.dy; }
                      const w = Math.max(1 / subdiv, Math.min(pxToFine(nw + gap, cellSize.w), spec.grid.cols));
                      const h = Math.max(1 / subdiv, Math.min(pxToFine(nh + gap, cellSize.h), spec.grid.rows));
                      const x = Math.max(0, Math.min(pxToFine(nx, cellSize.w), spec.grid.cols - w));
                      const y = Math.max(0, Math.min(pxToFine(ny, cellSize.h), spec.grid.rows - h));
                      setGuides({ v: [], h: [] });
                      updateBlock(b.id, { w, h, x, y });
                    }}
                    onMouseDown={() => setSelectedId(b.id)}
                    style={{ zIndex: (b.z ?? 1) + (isSel ? 100 : 0) }}
                    className={`rounded-2xl overflow-hidden transition-shadow ${isSel ? "ring-2 ring-primary ring-offset-2" : "ring-1 ring-transparent hover:ring-primary/30"}`}
                  >
                    <div className="w-full h-full pointer-events-none">
                      <BlockContent block={b} />
                    </div>
                  </Rnd>
                );
              })}
              {/* Smart snap guide lines */}
              {guides.v.map((x, i) => (
                <div key={`gv${i}`} className="pointer-events-none absolute top-0 bottom-0 w-px bg-fuchsia-500 shadow-[0_0_6px_rgba(217,70,239,0.7)] z-[9999]" style={{ left: x }} />
              ))}
              {guides.h.map((y, i) => (
                <div key={`gh${i}`} className="pointer-events-none absolute left-0 right-0 h-px bg-fuchsia-500 shadow-[0_0_6px_rgba(217,70,239,0.7)] z-[9999]" style={{ top: y }} />
              ))}
            </div>
          </div>
        </main>

        {/* Properties */}
        <aside className="w-64 bg-white border-r border-slate-200 overflow-y-auto p-4 shrink-0">
          {!selected ? (
            <div className="text-center text-sm text-slate-400 pt-10">
              <div className="text-4xl mb-2">👆</div>
              בחר רכיב כדי לערוך אותו
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">רכיב נבחר</h3>
                <div className="font-bold">{BLOCK_LIBRARY.find((l) => l.type === selected.type)?.label}</div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">ערכת נושא</label>
                <div className="flex gap-1 mt-1">
                  {(["light", "dark", "glass"] as Theme[]).map((th) => (
                    <button key={th} onClick={() => updateProps(selected.id, { theme: th })}
                      className={`flex-1 px-2 py-2 rounded-lg text-xs font-medium ${selected.props?.theme === th ? "bg-primary text-white" : "bg-slate-100 hover:bg-slate-200"}`}>
                      {th === "light" ? "בהיר" : th === "dark" ? "כהה" : "זכוכית"}
                    </button>
                  ))}
                </div>
              </div>

              {selected.type === "participants" && (
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">תצוגה</label>
                  <div className="flex gap-1 mt-1">
                    {(["list", "compact", "avatars"] as const).map((v) => (
                      <button key={v} onClick={() => updateProps(selected.id, { variant: v })}
                        className={`flex-1 px-2 py-2 rounded-lg text-xs font-medium ${(selected.props?.variant ?? "list") === v ? "bg-primary text-white" : "bg-slate-100 hover:bg-slate-200"}`}>
                        {v === "list" ? "רשימה" : v === "compact" ? "קומפקטי" : "אווטרים"}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {(selected.type === "toolbar" || selected.type === "emoji") && (
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">כיוון</label>
                  <div className="flex gap-1 mt-1">
                    {(["horizontal", "vertical"] as const).map((o) => (
                      <button key={o} onClick={() => updateProps(selected.id, { orientation: o })}
                        className={`flex-1 px-2 py-2 rounded-lg text-xs font-medium ${(selected.props?.orientation ?? (selected.type === "emoji" ? "vertical" : "horizontal")) === o ? "bg-primary text-white" : "bg-slate-100 hover:bg-slate-200"}`}>
                        {o === "horizontal" ? "אופקי" : "אנכי"}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {(selected.type === "title" || selected.type === "action") && (
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">טקסט</label>
                  <input value={selected.props?.text ?? ""} onChange={(e) => updateProps(selected.id, { text: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-primary outline-none" />
                </div>
              )}

              {/* Joystick — nudge position */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1"><Move className="size-3" /> ג'ויסטיק</label>
                <div className="mt-2 mx-auto grid grid-cols-3 grid-rows-3 gap-1 w-36 h-36 p-2 rounded-2xl"
                     style={{ background: "linear-gradient(180deg, oklch(0.19 0.006 60), oklch(0.14 0.006 60))", boxShadow: "inset 0 2px 8px rgba(0,0,0,0.5), 0 0 0 1px oklch(0.76 0.13 85 / 0.3)" }}>
                  <div />
                  <button onClick={() => nudge(0, -1)} className="rounded-lg grid place-items-center text-champagne hover:text-[oklch(0.14_0.006_60)] hover:bg-gold active:scale-95 transition-all" title="למעלה (↑)"><ChevronUp className="size-5" /></button>
                  <div />
                  <button onClick={() => nudge(-1, 0)} className="rounded-lg grid place-items-center text-champagne hover:text-[oklch(0.14_0.006_60)] hover:bg-gold active:scale-95 transition-all" title="שמאלה (←)"><ChevronLeft className="size-5" /></button>
                  <button onClick={() => alignBlock("centerX")} onDoubleClick={() => alignBlock("centerY")} className="rounded-lg grid place-items-center text-gold hover:text-[oklch(0.14_0.006_60)] hover:bg-gold active:scale-95 transition-all" title="מרכז אופקי (דאבל: אנכי)"><Target className="size-4" /></button>
                  <button onClick={() => nudge(1, 0)} className="rounded-lg grid place-items-center text-champagne hover:text-[oklch(0.14_0.006_60)] hover:bg-gold active:scale-95 transition-all" title="ימינה (→)"><ChevronRight className="size-5" /></button>
                  <div />
                  <button onClick={() => nudge(0, 1)} className="rounded-lg grid place-items-center text-champagne hover:text-[oklch(0.14_0.006_60)] hover:bg-gold active:scale-95 transition-all" title="למטה (↓)"><ChevronDown className="size-5" /></button>
                  <div />
                </div>
                <div className="text-[10px] text-slate-400 text-center mt-1">חצים במקלדת = הזזה · Shift+חצים = שינוי גודל</div>
              </div>

              {/* Resize pad */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1"><Maximize2 className="size-3" /> גודל</label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div className="rounded-lg border border-slate-200 p-1 flex items-center justify-between">
                    <button onClick={() => resizeBy(-1, 0)} className="p-1 rounded hover:bg-slate-100 text-slate-600" title="הקטן רוחב"><Minus className="size-4" /></button>
                    <span className="font-mono text-xs font-bold">W {selected.w}</span>
                    <button onClick={() => resizeBy(1, 0)} className="p-1 rounded hover:bg-slate-100 text-slate-600" title="הגדל רוחב"><Plus className="size-4" /></button>
                  </div>
                  <div className="rounded-lg border border-slate-200 p-1 flex items-center justify-between">
                    <button onClick={() => resizeBy(0, -1)} className="p-1 rounded hover:bg-slate-100 text-slate-600" title="הקטן גובה"><Minus className="size-4" /></button>
                    <span className="font-mono text-xs font-bold">H {selected.h}</span>
                    <button onClick={() => resizeBy(0, 1)} className="p-1 rounded hover:bg-slate-100 text-slate-600" title="הגדל גובה"><Plus className="size-4" /></button>
                  </div>
                </div>
                <button onClick={() => alignBlock("fill")} className="mt-2 w-full py-2 rounded-lg bg-slate-100 hover:bg-gold hover:text-[oklch(0.14_0.006_60)] text-xs font-bold transition-colors flex items-center justify-center gap-1">
                  <Maximize2 className="size-3" /> מלא מסך
                </button>
              </div>

              {/* Align */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">יישור</label>
                <div className="grid grid-cols-3 gap-1 mt-2">
                  <button onClick={() => alignBlock("right")} className="p-2 rounded-lg border border-slate-200 hover:border-gold hover:bg-gold/10" title="לימין"><AlignHorizontalJustifyEnd className="size-4 mx-auto" /></button>
                  <button onClick={() => alignBlock("centerX")} className="p-2 rounded-lg border border-slate-200 hover:border-gold hover:bg-gold/10" title="מרכז אופקי"><AlignHorizontalJustifyCenter className="size-4 mx-auto" /></button>
                  <button onClick={() => alignBlock("left")} className="p-2 rounded-lg border border-slate-200 hover:border-gold hover:bg-gold/10" title="לשמאל"><AlignHorizontalJustifyStart className="size-4 mx-auto" /></button>
                  <button onClick={() => alignBlock("top")} className="p-2 rounded-lg border border-slate-200 hover:border-gold hover:bg-gold/10" title="למעלה"><AlignVerticalJustifyStart className="size-4 mx-auto" /></button>
                  <button onClick={() => alignBlock("centerY")} className="p-2 rounded-lg border border-slate-200 hover:border-gold hover:bg-gold/10" title="מרכז אנכי"><AlignVerticalJustifyCenter className="size-4 mx-auto" /></button>
                  <button onClick={() => alignBlock("bottom")} className="p-2 rounded-lg border border-slate-200 hover:border-gold hover:bg-gold/10" title="למטה"><AlignVerticalJustifyEnd className="size-4 mx-auto" /></button>
                </div>
              </div>

              {/* Numeric readout */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">מיקום מדויק</label>
                <div className="grid grid-cols-4 gap-1 mt-1 text-xs">
                  {(["x", "y", "w", "h"] as const).map((k) => (
                    <div key={k}>
                      <div className="text-slate-400 text-center">{k.toUpperCase()}</div>
                      <input type="number" value={selected[k]} min={k === "w" || k === "h" ? 1 : 0}
                        max={k === "x" ? spec.grid.cols - selected.w : k === "y" ? spec.grid.rows - selected.h : k === "w" ? spec.grid.cols : spec.grid.rows}
                        onChange={(e) => updateBlock(selected.id, clampBlock(selected, { [k]: Math.max(0, Number(e.target.value)) }))}
                        className="w-full px-2 py-1 border border-slate-200 rounded text-center font-mono" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-1 pt-3 border-t border-slate-100">
                <button onClick={() => updateBlock(selected.id, { z: (selected.z ?? 1) + 1 })} className="flex-1 p-2 rounded-lg hover:bg-slate-100" title="שלח לחזית"><Layers className="size-4 mx-auto" /></button>
                <button onClick={() => updateBlock(selected.id, { z: Math.max(0, (selected.z ?? 1) - 1) })} className="flex-1 p-2 rounded-lg hover:bg-slate-100" title="שלח לרקע"><ArrowDown className="size-4 mx-auto" /></button>
                <button onClick={() => duplicateBlock(selected.id)} className="flex-1 p-2 rounded-lg hover:bg-slate-100" title="שכפל (⌘D)"><Copy className="size-4 mx-auto" /></button>
                <button onClick={() => removeBlock(selected.id)} className="flex-1 p-2 rounded-lg hover:bg-red-50 text-red-500" title="מחק (Del)"><Trash2 className="size-4 mx-auto" /></button>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
