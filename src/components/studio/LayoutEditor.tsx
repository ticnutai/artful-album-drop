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
} from "lucide-react";
import { BlockContent, BLOCK_LIBRARY, defaultSpec, type Block, type BlockType, type LayoutSpec } from "./BlockRenderer";
import type { Theme } from "./shared";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
      const step = e.altKey ? 2 : 1;
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
  const gridToPx = (g: number, size: number) => g * (size + gap);

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
        <button onClick={save} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:brightness-110 disabled:opacity-50">
          <Save className="size-4" /> {saving ? "שומר…" : "שמור פריסה"}
        </button>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Component palette */}
        <aside className="w-56 bg-white border-l border-slate-200 overflow-y-auto p-3 shrink-0">
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
                    onDragStop={(_, d) => {
                      const x = Math.max(0, Math.min(pxToGrid(d.x, cellSize.w), spec.grid.cols - b.w));
                      const y = Math.max(0, Math.min(pxToGrid(d.y, cellSize.h), spec.grid.rows - b.h));
                      updateBlock(b.id, { x, y });
                    }}
                    onResizeStop={(_, __, ref, ___, pos) => {
                      const w = Math.max(1, Math.min(pxToGrid(ref.offsetWidth + gap, cellSize.w), spec.grid.cols));
                      const h = Math.max(1, Math.min(pxToGrid(ref.offsetHeight + gap, cellSize.h), spec.grid.rows));
                      const x = Math.max(0, Math.min(pxToGrid(pos.x, cellSize.w), spec.grid.cols - w));
                      const y = Math.max(0, Math.min(pxToGrid(pos.y, cellSize.h), spec.grid.rows - h));
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

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">מיקום וגודל</label>
                <div className="grid grid-cols-4 gap-1 mt-1 text-xs">
                  {(["x", "y", "w", "h"] as const).map((k) => (
                    <div key={k}>
                      <div className="text-slate-400 text-center">{k.toUpperCase()}</div>
                      <input type="number" value={selected[k]} min={k === "w" || k === "h" ? 1 : 0}
                        max={k === "x" ? spec.grid.cols - selected.w : k === "y" ? spec.grid.rows - selected.h : k === "w" ? spec.grid.cols : spec.grid.rows}
                        onChange={(e) => updateBlock(selected.id, { [k]: Math.max(0, Number(e.target.value)) } as Partial<Block>)}
                        className="w-full px-2 py-1 border border-slate-200 rounded text-center" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-1 pt-2 border-t border-slate-100">
                <button onClick={() => updateBlock(selected.id, { z: (selected.z ?? 1) + 1 })} className="flex-1 p-2 rounded-lg hover:bg-slate-100" title="חזית"><ArrowUp className="size-4 mx-auto" /></button>
                <button onClick={() => updateBlock(selected.id, { z: Math.max(0, (selected.z ?? 1) - 1) })} className="flex-1 p-2 rounded-lg hover:bg-slate-100" title="רקע"><ArrowDown className="size-4 mx-auto" /></button>
                <button onClick={() => duplicateBlock(selected.id)} className="flex-1 p-2 rounded-lg hover:bg-slate-100" title="שכפל"><Copy className="size-4 mx-auto" /></button>
                <button onClick={() => removeBlock(selected.id)} className="flex-1 p-2 rounded-lg hover:bg-red-50 text-red-500" title="מחק"><Trash2 className="size-4 mx-auto" /></button>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
