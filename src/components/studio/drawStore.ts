import { useSyncExternalStore } from "react";

export type Tool = "pen" | "line" | "arrow" | "circle" | "rect" | "eraser" | "text" | "color";

export type Pt = { x: number; y: number };

export type Shape =
  | { id: string; kind: "stroke"; points: Pt[]; color: string; width: number }
  | { id: string; kind: "line"; x1: number; y1: number; x2: number; y2: number; color: string; width: number }
  | { id: string; kind: "arrow"; x1: number; y1: number; x2: number; y2: number; color: string; width: number }
  | { id: string; kind: "circle"; cx: number; cy: number; r: number; color: string; width: number }
  | { id: string; kind: "rect"; x: number; y: number; w: number; h: number; color: string; width: number }
  | { id: string; kind: "triangle"; points: [Pt, Pt, Pt]; color: string; width: number };

type State = {
  tool: Tool;
  color: string;
  width: number;
  smart: boolean;
  shapes: Shape[];
};

let state: State = {
  tool: "pen",
  color: "#ef4444",
  width: 0.5, // percent-of-min-dimension
  smart: true,
  shapes: [],
};

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const drawStore = {
  get: () => state,
  set: (patch: Partial<State>) => {
    state = { ...state, ...patch };
    emit();
  },
  setTool: (tool: Tool) => {
    // keep the "color" pseudo-tool from switching the drawing mode
    if (tool === "color") return;
    drawStore.set({ tool });
  },
  setColor: (color: string) => drawStore.set({ color }),
  setSmart: (smart: boolean) => drawStore.set({ smart }),
  addShape: (s: Shape) => drawStore.set({ shapes: [...state.shapes, s] }),
  undo: () => drawStore.set({ shapes: state.shapes.slice(0, -1) }),
  clear: () => drawStore.set({ shapes: [] }),
  subscribe: (l: () => void) => {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

export function useDraw<T>(sel: (s: State) => T): T {
  return useSyncExternalStore(drawStore.subscribe, () => sel(state), () => sel(state));
}

export const PALETTE = ["#ef4444", "#f59e0b", "#eab308", "#22c55e", "#3b82f6", "#a855f7", "#ffffff", "#0f0f0f"];