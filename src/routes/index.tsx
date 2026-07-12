import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LayoutGrid, LayoutPanelLeft, Sparkles, Check, Plus, Pencil, Trash2, LogOut, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  ScreenCanvas, Toolbar, EmojiRail, ReactionsFloat, ParticipantsPanel,
  participants, useTimer, useReactions,
} from "@/components/studio/shared";
import { CustomLayoutRenderer } from "@/components/studio/CustomLayoutRenderer";
import { LayoutEditor } from "@/components/studio/LayoutEditor";
import type { LayoutSpec } from "@/components/studio/BlockRenderer";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "סטודיו שיתוף מסך — פריסות מותאמות אישית" },
      { name: "description", content: "אפליקציית שיתוף מסך עם עורך פריסות ויזואלי מלא" },
    ],
  }),
  component: StudioPage,
});

// ---------- built-in layouts ----------

function StudioLayout() {
  const time = useTimer();
  const [tool, setTool] = useState("pen");
  const { reactions, send } = useReactions();
  return (
    <div className="flex h-screen w-full bg-[oklch(0.96_0.015_85)] text-[oklch(0.18_0.006_60)] overflow-hidden">
      <aside className="w-72 shrink-0 p-4"><ParticipantsPanel /></aside>
      <main className="flex-1 flex flex-col relative min-w-0">
        <header className="h-16 px-6 bg-white/70 backdrop-blur-md border-b border-[oklch(0.76_0.13_85/0.25)] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="relative flex size-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[oklch(0.76_0.13_85)] opacity-75" /><span className="relative inline-flex rounded-full size-3 bg-[oklch(0.76_0.13_85)]" /></span>
            <span className="text-sm font-medium text-[oklch(0.35_0.01_60)]">בשידור חי · {time}</span>
            <div className="h-4 w-px bg-[oklch(0.76_0.13_85/0.3)]" />
            <h1 className="font-serif text-lg tracking-tight">שיתוף מסך · תוכנית קומה_2.dwg</h1>
          </div>
          <button className="text-sm font-medium px-5 py-2 rounded-md bg-[oklch(0.14_0.006_60)] text-[oklch(0.88_0.09_90)] border border-[oklch(0.76_0.13_85/0.4)] hover:bg-[oklch(0.19_0.006_60)] transition-colors">הזמן</button>
        </header>
        <div className="flex-1 bg-[oklch(0.93_0.012_85)] p-8 flex items-center justify-center relative overflow-hidden">
          <div className="w-full max-w-5xl aspect-video"><ScreenCanvas /></div>
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2"><Toolbar tool={tool} setTool={setTool} /></div>
          <div className="absolute bottom-8 right-8 flex flex-col items-center gap-2">
            <div className="relative h-40 w-12"><ReactionsFloat reactions={reactions} /></div>
            <EmojiRail onSend={send} />
          </div>
        </div>
      </main>
    </div>
  );
}

function CommandLayout() {
  const time = useTimer();
  const [tool, setTool] = useState("pen");
  const { reactions, send } = useReactions();
  return (
    <div className="flex flex-col h-screen w-full bg-obsidian text-champagne overflow-hidden" style={{ background: "var(--gradient-noir)" }}>
      <header className="h-14 px-6 border-b border-[oklch(0.76_0.13_85/0.2)] bg-[oklch(0.14_0.006_60/0.7)] backdrop-blur-md flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <span className="size-2.5 rounded-full bg-gold animate-pulse" />
          <span className="font-mono text-sm text-gold-soft tracking-widest">{time}</span>
          <div className="h-4 w-px bg-[oklch(0.76_0.13_85/0.3)]" />
          <span className="font-serif text-lg text-champagne">תוכנית קומה_2.dwg</span>
        </div>
        <div className="flex -space-x-2 space-x-reverse">
          {participants.slice(0, 3).map((p) => (
            <div key={p.name} className={`size-7 rounded-full border-2 border-obsidian ${p.bg} ${p.color} grid place-items-center text-xs font-bold ring-1 ring-[oklch(0.76_0.13_85/0.4)]`}>{p.initial}</div>
          ))}
        </div>
      </header>
      <div className="flex-1 flex overflow-hidden">
        <aside className="w-64 p-3 shrink-0"><ParticipantsPanel theme="dark" /></aside>
        <main className="flex-1 relative p-6" style={{ background: "radial-gradient(ellipse at top, oklch(0.22 0.008 60), var(--obsidian) 70%)" }}>
          <ScreenCanvas />
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2"><Toolbar tool={tool} setTool={setTool} theme="dark" /></div>
        </main>
        <aside className="w-20 flex flex-col items-center py-4 gap-3 shrink-0">
          <div className="relative flex-1 w-12"><ReactionsFloat reactions={reactions} /></div>
          <EmojiRail onSend={send} theme="dark" />
        </aside>
      </div>
    </div>
  );
}

function FloatingLayout() {
  const time = useTimer();
  const [tool, setTool] = useState("pen");
  const { reactions, send } = useReactions();
  return (
    <div className="min-h-screen w-full p-6 flex items-center justify-center overflow-hidden" style={{ background: "radial-gradient(circle at 20% 20%, oklch(0.22 0.008 60), var(--obsidian) 60%)" }}>
      <div className="relative w-full max-w-7xl aspect-[16/10] rounded-[2rem] overflow-hidden" style={{ background: "var(--onyx)", boxShadow: "var(--shadow-noir), 0 0 0 1px oklch(0.76 0.13 85 / 0.35), 0 0 0 6px oklch(0.14 0.006 60)" }}>
        <div className="absolute inset-0"><ScreenCanvas rounded="rounded-none" /></div>
        <div className="absolute top-5 inset-x-5 flex justify-between">
          <div className="bg-[oklch(0.14_0.006_60/0.75)] backdrop-blur-md border border-[oklch(0.76_0.13_85/0.3)] rounded-xl px-4 py-2 flex items-center gap-3">
            <span className="text-[oklch(0.88_0.09_90)] text-[10px] font-bold tracking-[0.2em]">4F2K</span>
            <span className="size-2 rounded-full bg-[oklch(0.76_0.13_85)] animate-pulse" />
            <span className="text-champagne font-mono text-sm tracking-wider">{time}</span>
          </div>
          <div className="flex -space-x-2 space-x-reverse">
            {participants.filter((p) => p.role !== "מנותק").map((p) => (
              <div key={p.name} className={`size-10 rounded-full border-2 border-obsidian ${p.bg} ${p.color} grid place-items-center font-bold shadow-lg ring-1 ring-[oklch(0.76_0.13_85/0.5)]`}>{p.initial}</div>
            ))}
          </div>
        </div>
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2"><Toolbar tool={tool} setTool={setTool} theme="dark" /></div>
        <div className="absolute bottom-24 left-5"><div className="relative h-40 w-12"><ReactionsFloat reactions={reactions} /></div></div>
        <div className="absolute bottom-5 left-5"><EmojiRail onSend={send} theme="dark" /></div>
      </div>
    </div>
  );
}

// ---------- switcher ----------

type BuiltInKey = "studio" | "command" | "floating";
type CustomLayout = { id: string; name: string; spec: LayoutSpec; thumbnail: string | null };

const builtins: { key: BuiltInKey; label: string; description: string; icon: typeof LayoutGrid }[] = [
  { key: "studio", label: "סטודיו בהיר", description: "סייד־בר עם משתתפים", icon: LayoutPanelLeft },
  { key: "command", label: "מרכז פיקוד", description: "מצב כהה", icon: LayoutGrid },
  { key: "floating", label: "קנבס צף", description: "פאנלים זכוכיתיים", icon: Sparkles },
];

function LayoutSwitcher({
  currentBuiltin, currentCustomId, customLayouts, userId,
  onBuiltinChange, onCustomChange, onNew, onEdit, onDelete, onSignOut, onSignIn,
}: {
  currentBuiltin: BuiltInKey | null;
  currentCustomId: string | null;
  customLayouts: CustomLayout[];
  userId: string | null;
  onBuiltinChange: (k: BuiltInKey) => void;
  onCustomChange: (l: CustomLayout) => void;
  onNew: () => void;
  onEdit: (l: CustomLayout) => void;
  onDelete: (l: CustomLayout) => void;
  onSignOut: () => void;
  onSignIn: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="fixed bottom-6 left-6 z-50" dir="rtl">
      {open && (
        <div className="absolute bottom-16 left-0 w-80 rounded-2xl p-2 max-h-[70vh] overflow-y-auto animate-fade-in border border-[oklch(0.76_0.13_85/0.25)]"
             style={{ background: "linear-gradient(180deg, oklch(0.19 0.006 60), oklch(0.14 0.006 60))", boxShadow: "var(--shadow-noir), 0 0 0 1px oklch(0.76 0.13 85 / 0.15)" }}>
          <div className="px-3 py-2 flex items-center justify-between">
            <span className="text-[10px] font-bold text-gold uppercase tracking-[0.25em]">פריסות</span>
            {userId ? (
              <button onClick={onSignOut} className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1"><LogOut className="size-3" />יציאה</button>
            ) : (
              <button onClick={onSignIn} className="text-xs text-gold-soft hover:text-gold flex items-center gap-1"><User className="size-3" />התחבר לשמירה</button>
            )}
          </div>
          {builtins.map((opt) => {
            const Icon = opt.icon;
            const active = currentBuiltin === opt.key && !currentCustomId;
            return (
              <button key={opt.key} onClick={() => { onBuiltinChange(opt.key); setOpen(false); }}
                className={`w-full flex items-center gap-3 p-3 rounded-xl text-right transition-colors ${active ? "bg-[oklch(0.76_0.13_85/0.14)] ring-1 ring-[oklch(0.76_0.13_85/0.35)]" : "hover:bg-[oklch(1_0_0/0.04)]"}`}>
                <div className={`size-10 rounded-lg grid place-items-center shrink-0 ${active ? "bg-gold text-primary-foreground" : "bg-[oklch(1_0_0/0.05)] text-champagne"}`}><Icon className="size-5" /></div>
                <div className="flex-1 min-w-0">
                  <div className="font-serif text-base tracking-tight text-champagne">{opt.label}</div>
                  <div className="text-xs text-muted-foreground">{opt.description}</div>
                </div>
                {active && <Check className="size-4 text-gold" />}
              </button>
            );
          })}

          {customLayouts.length > 0 && (
            <>
              <div className="mx-3 my-2 h-px bg-[oklch(0.76_0.13_85/0.15)]" />
              <div className="px-3 py-1 text-[10px] font-bold text-gold uppercase tracking-[0.25em]">שלי</div>
              {customLayouts.map((l) => {
                const active = currentCustomId === l.id;
                return (
                  <div key={l.id} className={`group flex items-center gap-2 p-2 rounded-xl ${active ? "bg-[oklch(0.76_0.13_85/0.14)] ring-1 ring-[oklch(0.76_0.13_85/0.35)]" : "hover:bg-[oklch(1_0_0/0.04)]"}`}>
                    <button onClick={() => { onCustomChange(l); setOpen(false); }} className="flex items-center gap-3 flex-1 min-w-0 text-right">
                      <div className="size-10 rounded-lg bg-[oklch(1_0_0/0.05)] overflow-hidden shrink-0 ring-1 ring-[oklch(0.76_0.13_85/0.25)]">
                        {l.thumbnail ? <img src={l.thumbnail} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full grid place-items-center text-muted-foreground"><LayoutGrid className="size-4" /></div>}
                      </div>
                      <span className="font-serif text-base truncate flex-1 text-champagne">{l.name}</span>
                      {active && <Check className="size-4 text-gold shrink-0" />}
                    </button>
                    <button onClick={() => onEdit(l)} className="p-1.5 rounded hover:bg-[oklch(1_0_0/0.08)] opacity-0 group-hover:opacity-100" title="ערוך"><Pencil className="size-3.5 text-gold-soft" /></button>
                    <button onClick={() => onDelete(l)} className="p-1.5 rounded hover:bg-[oklch(1_0_0/0.08)] opacity-0 group-hover:opacity-100" title="מחק"><Trash2 className="size-3.5 text-destructive" /></button>
                  </div>
                );
              })}
            </>
          )}

          <div className="mx-3 my-2 h-px bg-[oklch(0.76_0.13_85/0.15)]" />
          <button onClick={() => { setOpen(false); onNew(); }} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-[oklch(0.76_0.13_85/0.1)] text-gold">
            <div className="size-10 rounded-lg grid place-items-center shrink-0 text-primary-foreground" style={{ background: "var(--gradient-gold)" }}><Plus className="size-5" /></div>
            <div className="text-right"><div className="font-serif text-base text-champagne">בנה פריסה חדשה</div><div className="text-xs text-muted-foreground">עורך ויזואלי מלא</div></div>
          </button>
        </div>
      )}
      <button onClick={() => setOpen((o) => !o)} className="size-14 rounded-full grid place-items-center hover:scale-105 active:scale-95 transition-transform text-primary-foreground" aria-label="החלף פריסה"
              style={{ background: "var(--gradient-gold)", boxShadow: "var(--shadow-gold), inset 0 1px 0 oklch(1 0 0 / 0.3)" }}>
        <LayoutGrid className="size-6" />
      </button>
    </div>
  );
}

// ---------- page ----------

type EditorState = { open: false } | { open: true; initial?: LayoutSpec; name?: string; id?: string };

function StudioPage() {
  const navigate = useNavigate();
  const [builtin, setBuiltin] = useState<BuiltInKey>("studio");
  const [customId, setCustomId] = useState<string | null>(null);
  const [customLayouts, setCustomLayouts] = useState<CustomLayout[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [editor, setEditor] = useState<EditorState>({ open: false });

  // Auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUserId(s?.user.id ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  // Restore selection
  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("studio-selection") : null;
    if (saved) {
      try {
        const p = JSON.parse(saved);
        if (p.customId) setCustomId(p.customId);
        else if (p.builtin) setBuiltin(p.builtin);
      } catch {}
    }
  }, []);

  // Fetch custom layouts
  const fetchLayouts = async () => {
    if (!userId) { setCustomLayouts([]); return; }
    const { data, error } = await supabase.from("custom_layouts").select("id,name,spec,thumbnail").order("updated_at", { ascending: false });
    if (error) { console.error(error); return; }
    setCustomLayouts((data ?? []).map((r) => ({ id: r.id, name: r.name, spec: r.spec as unknown as LayoutSpec, thumbnail: r.thumbnail })));
  };
  useEffect(() => { fetchLayouts(); }, [userId]);

  const currentCustom = customId ? customLayouts.find((l) => l.id === customId) : null;

  const selectBuiltin = (k: BuiltInKey) => {
    setBuiltin(k); setCustomId(null);
    try { localStorage.setItem("studio-selection", JSON.stringify({ builtin: k })); } catch {}
  };
  const selectCustom = (l: CustomLayout) => {
    setCustomId(l.id);
    try { localStorage.setItem("studio-selection", JSON.stringify({ customId: l.id })); } catch {}
  };

  const openNew = () => {
    if (!userId) { toast.info("התחבר כדי לבנות ולשמור פריסות"); navigate({ to: "/auth" }); return; }
    setEditor({ open: true });
  };
  const openEdit = (l: CustomLayout) => setEditor({ open: true, initial: l.spec, name: l.name, id: l.id });

  const deleteLayout = async (l: CustomLayout) => {
    if (!confirm(`למחוק את "${l.name}"?`)) return;
    const { error } = await supabase.from("custom_layouts").delete().eq("id", l.id);
    if (error) { toast.error("שגיאה במחיקה"); return; }
    toast.success("נמחק");
    if (customId === l.id) { setCustomId(null); }
    fetchLayouts();
  };

  const signOut = async () => { await supabase.auth.signOut(); toast.success("התנתקת"); };

  const layoutKey = customId ? `c-${customId}` : `b-${builtin}`;

  return (
    <div dir="rtl">
      <div key={layoutKey} className="animate-fade-in">
        {currentCustom ? <CustomLayoutRenderer spec={currentCustom.spec} />
          : builtin === "studio" ? <StudioLayout />
          : builtin === "command" ? <CommandLayout />
          : <FloatingLayout />}
      </div>

      <LayoutSwitcher
        currentBuiltin={customId ? null : builtin}
        currentCustomId={customId}
        customLayouts={customLayouts}
        userId={userId}
        onBuiltinChange={selectBuiltin}
        onCustomChange={selectCustom}
        onNew={openNew}
        onEdit={openEdit}
        onDelete={deleteLayout}
        onSignOut={signOut}
        onSignIn={() => navigate({ to: "/auth" })}
      />

      {editor.open && (
        <LayoutEditor
          initial={editor.initial} initialName={editor.name} layoutId={editor.id}
          onExit={() => { setEditor({ open: false }); fetchLayouts(); }}
        />
      )}

      <style>{`
        @keyframes reactionFloat {
          0% { transform: translateY(0) scale(0.5); opacity: 0; }
          20% { opacity: 1; transform: translateY(-20px) scale(1.1); }
          100% { transform: translateY(-160px) scale(0.9); opacity: 0; }
        }
        .animate-fade-in { animation: fadeIn 0.3s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
      `}</style>
    </div>
  );
}
