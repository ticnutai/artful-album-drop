import { useEffect, useRef, useState } from "react";
import { drawStore, useDraw, type Pt, type Shape } from "./drawStore";
import { recognize } from "./recognize";

function ShapeSvg({ s }: { s: Shape }) {
  const stroke = s.color;
  const sw = s.width;
  const common = { stroke, strokeWidth: sw, fill: "none", strokeLinecap: "round" as const, strokeLinejoin: "round" as const, vectorEffect: "non-scaling-stroke" as const };
  switch (s.kind) {
    case "stroke":
      return <polyline {...common} points={s.points.map((p) => `${p.x},${p.y}`).join(" ")} />;
    case "line":
      return <line {...common} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} />;
    case "arrow": {
      const angle = Math.atan2(s.y2 - s.y1, s.x2 - s.x1);
      const head = 3;
      const hx1 = s.x2 - head * Math.cos(angle - 0.5);
      const hy1 = s.y2 - head * Math.sin(angle - 0.5);
      const hx2 = s.x2 - head * Math.cos(angle + 0.5);
      const hy2 = s.y2 - head * Math.sin(angle + 0.5);
      return (
        <g>
          <line {...common} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} />
          <polyline {...common} points={`${hx1},${hy1} ${s.x2},${s.y2} ${hx2},${hy2}`} />
        </g>
      );
    }
    case "circle":
      return <ellipse {...common} cx={s.cx} cy={s.cy} rx={s.r} ry={s.r} />;
    case "rect":
      return <rect {...common} x={s.x} y={s.y} width={s.w} height={s.h} rx={0.5} />;
    case "triangle":
      return <polygon {...common} points={s.points.map((p) => `${p.x},${p.y}`).join(" ")} />;
  }
}

/**
 * Absolute-positioned drawing overlay. Coordinates are % of container (0-100).
 */
export function SmartCanvas() {
  const tool = useDraw((s) => s.tool);
  const color = useDraw((s) => s.color);
  const width = useDraw((s) => s.width);
  const smart = useDraw((s) => s.smart);
  const shapes = useDraw((s) => s.shapes);

  const ref = useRef<SVGSVGElement | null>(null);
  const [current, setCurrent] = useState<Pt[] | null>(null);
  const [anchor, setAnchor] = useState<Pt | null>(null);
  const [preview, setPreview] = useState<Shape | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const active = tool !== "text";

  const toPct = (e: React.PointerEvent): Pt => {
    const r = (ref.current as SVGSVGElement).getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * 100,
      y: ((e.clientY - r.top) / r.height) * 100,
    };
  };

  const onDown = (e: React.PointerEvent) => {
    if (!active) return;
    (e.target as Element).setPointerCapture(e.pointerId);
    const p = toPct(e);
    if (tool === "pen" || tool === "eraser") setCurrent([p]);
    else setAnchor(p);
  };

  const onMove = (e: React.PointerEvent) => {
    if (!active) return;
    const p = toPct(e);
    if (current) setCurrent((c) => (c ? [...c, p] : c));
    else if (anchor) {
      const id = "preview";
      if (tool === "line") setPreview({ id, kind: "line", x1: anchor.x, y1: anchor.y, x2: p.x, y2: p.y, color, width });
      else if (tool === "arrow") setPreview({ id, kind: "arrow", x1: anchor.x, y1: anchor.y, x2: p.x, y2: p.y, color, width });
      else if (tool === "circle") {
        const r = Math.hypot(p.x - anchor.x, p.y - anchor.y);
        setPreview({ id, kind: "circle", cx: anchor.x, cy: anchor.y, r, color, width });
      } else if (tool === "rect") {
        const x = Math.min(anchor.x, p.x), y = Math.min(anchor.y, p.y);
        setPreview({ id, kind: "rect", x, y, w: Math.abs(p.x - anchor.x), h: Math.abs(p.y - anchor.y), color, width });
      }
    }
  };

  const finish = () => {
    const nid = `s${Date.now()}${Math.random().toString(16).slice(2, 6)}`;
    if (current && current.length > 1) {
      if (tool === "eraser") {
        // erase any shape whose bbox intersects the stroke bbox
        // simple: remove last-drawn shape near the stroke centroid
        const cx = current.reduce((a, p) => a + p.x, 0) / current.length;
        const cy = current.reduce((a, p) => a + p.y, 0) / current.length;
        const shapesNow = drawStore.get().shapes;
        const keep = shapesNow.filter((s) => !nearShape(s, cx, cy, 6));
        if (keep.length !== shapesNow.length) drawStore.set({ shapes: keep });
      } else {
        const shape = smart
          ? recognize(current, color, width, nid)
          : ({ id: nid, kind: "stroke", points: current, color, width } as Shape);
        drawStore.addShape(shape);
        if (smart && shape.kind !== "stroke") {
          setFlash(labelFor(shape.kind));
          setTimeout(() => setFlash(null), 900);
        }
      }
    } else if (preview) {
      drawStore.addShape({ ...preview, id: nid });
    }
    setCurrent(null);
    setAnchor(null);
    setPreview(null);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "z") { e.preventDefault(); drawStore.undo(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <svg
        ref={ref}
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full"
        style={{ cursor: active ? "crosshair" : "default", touchAction: "none" }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={finish}
        onPointerCancel={finish}
      >
        {shapes.map((s) => <ShapeSvg key={s.id} s={s} />)}
        {current && current.length > 1 && (
          <polyline
            points={current.map((p) => `${p.x},${p.y}`).join(" ")}
            fill="none" stroke={color} strokeWidth={width}
            strokeLinecap="round" strokeLinejoin="round"
            vectorEffect="non-scaling-stroke" opacity={0.85}
          />
        )}
        {preview && <g opacity={0.7}><ShapeSvg s={preview} /></g>}
      </svg>
      {flash && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[11px] font-bold tracking-wider text-obsidian pointer-events-none animate-fade-in"
             style={{ background: "var(--gradient-gold)", boxShadow: "var(--shadow-gold)" }}>
          ✨ {flash}
        </div>
      )}
    </>
  );
}

function labelFor(k: Shape["kind"]) {
  return { line: "קו יושר", arrow: "חץ נוקה", circle: "עיגול מושלם", rect: "מלבן מיושר", triangle: "משולש חד", stroke: "" }[k];
}

function nearShape(s: Shape, x: number, y: number, tol: number) {
  switch (s.kind) {
    case "circle": return Math.abs(Math.hypot(x - s.cx, y - s.cy) - s.r) < tol;
    case "rect": return x > s.x - tol && x < s.x + s.w + tol && y > s.y - tol && y < s.y + s.h + tol;
    case "line":
    case "arrow": {
      const A = { x: s.x1, y: s.y1 }, B = { x: s.x2, y: s.y2 };
      const L2 = (B.x - A.x) ** 2 + (B.y - A.y) ** 2 || 1;
      const t = Math.max(0, Math.min(1, ((x - A.x) * (B.x - A.x) + (y - A.y) * (B.y - A.y)) / L2));
      const px = A.x + t * (B.x - A.x), py = A.y + t * (B.y - A.y);
      return Math.hypot(x - px, y - py) < tol;
    }
    case "stroke": return s.points.some((p) => Math.hypot(p.x - x, p.y - y) < tol);
    case "triangle": return s.points.some((p) => Math.hypot(p.x - x, p.y - y) < tol * 2);
  }
}