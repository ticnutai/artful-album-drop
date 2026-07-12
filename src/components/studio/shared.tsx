import { useEffect, useState } from "react";
import floorPlan from "@/assets/floor-plan.jpg";

export type Participant = {
  initial: string;
  name: string;
  role: string;
  color: string;
  bg: string;
};

export const participants: Participant[] = [
  { initial: "מ", name: "מורה (מארח)", role: "משתף מסך", color: "text-indigo-700", bg: "bg-indigo-100" },
  { initial: "ד", name: "דנה כהן", role: "צופה", color: "text-emerald-700", bg: "bg-emerald-100" },
  { initial: "א", name: "אורי לוי", role: "מצייר", color: "text-amber-700", bg: "bg-amber-100" },
  { initial: "ר", name: "רון ברק", role: "מנותק", color: "text-slate-500", bg: "bg-slate-200" },
];

export const tools = [
  { id: "pen", label: "עט" },
  { id: "circle", label: "עיגול" },
  { id: "rect", label: "מלבן" },
  { id: "text", label: "טקסט" },
  { id: "color", label: "צבע" },
] as const;

export const emojiSet = ["👏", "🎉", "🔥", "❤️", "👍"];

export function useTimer() {
  const [seconds, setSeconds] = useState(765);
  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export type Reaction = { id: number; emoji: string };
export function useReactions() {
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const send = (emoji: string) => {
    const id = Date.now() + Math.random();
    setReactions((r) => [...r, { id, emoji }]);
    setTimeout(() => setReactions((r) => r.filter((x) => x.id !== id)), 2600);
  };
  return { reactions, send };
}

export type Theme = "light" | "dark" | "glass";

function themeClasses(theme: Theme) {
  if (theme === "dark") return "bg-slate-900/85 backdrop-blur-xl border-white/10 text-slate-100";
  if (theme === "glass") return "bg-white/60 backdrop-blur-xl border-white/40 text-slate-900 shadow-lg";
  return "bg-white border-slate-200 text-slate-900";
}

export function ScreenCanvas({ rounded = "rounded-2xl" }: { rounded?: string }) {
  return (
    <div className={`w-full h-full bg-white ${rounded} shadow-2xl shadow-indigo-500/10 border border-slate-200 relative overflow-hidden`}>
      <img src={floorPlan} alt="תוכנית קומה" className="w-full h-full object-cover" />
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 size-24 border-4 border-red-500 rounded-full opacity-80" />
        <svg className="absolute top-1/2 right-1/3 w-40 h-16 -translate-y-1/2" viewBox="0 0 160 60">
          <path d="M 5 50 Q 40 5, 80 30 T 155 15" stroke="rgb(239 68 68)" strokeWidth="4" fill="none" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
}

export function Toolbar({ tool, setTool, theme = "light", orientation = "horizontal" }: {
  tool: string; setTool: (t: string) => void; theme?: Theme; orientation?: "horizontal" | "vertical";
}) {
  return (
    <div className={`flex ${orientation === "vertical" ? "flex-col" : ""} items-center gap-1 p-2 border rounded-2xl shadow-xl ${themeClasses(theme)}`}>
      {tools.map((t) => (
        <button
          key={t.id}
          onClick={() => setTool(t.id)}
          className={`p-3 rounded-xl transition-all ${
            tool === t.id
              ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-105"
              : theme === "dark" ? "hover:bg-white/10 text-slate-300" : "hover:bg-slate-100 text-slate-600"
          }`}
          aria-label={t.label} title={t.label}
        >
          {t.id === "pen" && <div className="size-5 border-b-2 border-r-2 border-current rotate-45" />}
          {t.id === "circle" && <div className="size-5 border-2 border-current rounded-full" />}
          {t.id === "rect" && <div className="size-5 border-2 border-current rounded-sm" />}
          {t.id === "text" && <span className="size-5 grid place-items-center font-bold text-sm">T</span>}
          {t.id === "color" && <div className="size-5 rounded-full bg-gradient-to-br from-red-500 via-amber-400 to-primary" />}
        </button>
      ))}
    </div>
  );
}

export function EmojiRail({ onSend, theme = "light", orientation = "vertical" }: {
  onSend: (e: string) => void; theme?: Theme; orientation?: "horizontal" | "vertical";
}) {
  return (
    <div className={`flex ${orientation === "vertical" ? "flex-col" : ""} gap-2 border shadow-lg rounded-full p-1.5 ${themeClasses(theme)}`}>
      {emojiSet.map((e) => (
        <button
          key={e} onClick={() => onSend(e)}
          className={`size-9 rounded-full grid place-items-center text-lg transition-all active:scale-90 ${theme === "dark" ? "hover:bg-white/10" : "hover:bg-slate-100"}`}
        >{e}</button>
      ))}
    </div>
  );
}

export function ReactionsFloat({ reactions }: { reactions: Reaction[] }) {
  return (
    <div className="relative h-full w-12 pointer-events-none overflow-visible">
      {reactions.map((r, i) => (
        <div key={r.id} className="absolute bottom-0 text-3xl"
          style={{ animation: "reactionFloat 2.6s ease-out forwards", left: `${50 + ((i % 3) - 1) * 20}%` }}>
          {r.emoji}
        </div>
      ))}
    </div>
  );
}

export function ParticipantsPanel({ theme = "light", variant = "list" }: { theme?: Theme; variant?: "list" | "compact" | "avatars" }) {
  const active = participants.filter((p) => p.role !== "מנותק");
  if (variant === "avatars") {
    return (
      <div className={`flex items-center gap-2 p-3 border rounded-2xl ${themeClasses(theme)}`}>
        <div className="flex -space-x-2 space-x-reverse">
          {active.map((p) => (
            <div key={p.name} className={`size-9 rounded-full border-2 ${theme === "dark" ? "border-slate-900" : "border-white"} ${p.bg} ${p.color} grid place-items-center font-bold text-sm`}>{p.initial}</div>
          ))}
        </div>
        <span className="text-xs font-bold opacity-70">{active.length} משתתפים</span>
      </div>
    );
  }
  if (variant === "compact") {
    return (
      <div className={`flex flex-col gap-1 p-2 border rounded-2xl ${themeClasses(theme)}`}>
        {participants.map((p) => (
          <div key={p.name} className={`flex items-center gap-2 p-1.5 rounded-lg ${p.role === "מנותק" ? "opacity-40" : ""}`}>
            <div className={`size-7 rounded-full ${p.bg} ${p.color} grid place-items-center text-xs font-bold`}>{p.initial}</div>
            <span className="text-xs font-medium truncate">{p.name}</span>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className={`flex flex-col border rounded-2xl overflow-hidden h-full ${themeClasses(theme)}`}>
      <div className="px-4 py-3 border-b border-current/10 font-bold text-sm flex items-center gap-2">
        משתתפים
        <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full">{active.length}</span>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {participants.map((p) => (
          <div key={p.name} className={`flex items-center gap-3 p-2 rounded-xl ${p.role === "מנותק" ? "opacity-40" : theme === "dark" ? "hover:bg-white/5" : "hover:bg-slate-50"}`}>
            <div className={`size-9 rounded-full ${p.bg} ${p.color} grid place-items-center font-bold`}>{p.initial}</div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold truncate">{p.name}</div>
              <div className="text-[11px] opacity-60">{p.role}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function LiveClock({ theme = "light" }: { theme?: Theme }) {
  const time = useTimer();
  return (
    <div className={`flex items-center gap-2 px-4 py-2.5 border rounded-2xl ${themeClasses(theme)}`}>
      <span className="relative flex size-2.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
        <span className="relative inline-flex rounded-full size-2.5 bg-red-500" />
      </span>
      <span className="text-sm font-mono font-bold tabular-nums">{time}</span>
      <span className="text-[10px] opacity-60 font-bold uppercase tracking-wider">בשידור</span>
    </div>
  );
}

export function RoomCodeBadge({ theme = "light" }: { theme?: Theme }) {
  return (
    <div className={`flex items-center gap-2 px-4 py-2.5 border rounded-2xl ${themeClasses(theme)}`}>
      <span className="text-[10px] opacity-60 font-bold uppercase tracking-wider">קוד חדר</span>
      <span className="font-mono font-bold text-primary">4F2K</span>
    </div>
  );
}

export function QualityHUD({ theme = "light" }: { theme?: Theme }) {
  return (
    <div className={`flex items-center gap-3 px-4 py-2 border rounded-2xl text-xs ${themeClasses(theme)}`}>
      <span className="font-medium">1080p · 60fps</span>
      <span className="h-3 w-px bg-current/20" />
      <span className="text-emerald-500 font-bold">32ms</span>
    </div>
  );
}

export function TitleBlock({ text, theme = "light" }: { text: string; theme?: Theme }) {
  return (
    <div className={`px-4 py-3 border rounded-2xl ${themeClasses(theme)}`}>
      <h2 className="font-bold text-lg truncate">{text}</h2>
    </div>
  );
}

export function ActionButton({ label, theme = "light" }: { label: string; theme?: Theme }) {
  return (
    <button className={`px-5 py-2.5 rounded-2xl font-bold text-sm shadow-lg transition-all hover:scale-105 active:scale-95 ${
      theme === "dark" ? "bg-white text-slate-900" : "bg-primary text-primary-foreground"
    }`}>{label}</button>
  );
}
