import { useEffect, useMemo, useRef, useState } from "react";
import { MessageCircle, X, Send, Copy, LogIn } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type ChatRow = {
  id: string;
  body: string;
  display_name: string;
  user_id: string | null;
  created_at: string;
};

const ROOM = "main";

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? "?") + (parts[1]?.[0] ?? "");
}
function colorFor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return `oklch(0.55 0.12 ${h})`;
}
function timeShort(ts: string) {
  const d = new Date(ts);
  return d.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
}

export function ChatPanel() {
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string>("");
  const [messages, setMessages] = useState<ChatRow[]>([]);
  const [draft, setDraft] = useState("");
  const [unread, setUnread] = useState(0);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auth
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user;
      if (u) {
        setUserId(u.id);
        setDisplayName((u.user_metadata as { display_name?: string; full_name?: string })?.display_name
          ?? (u.user_metadata as { full_name?: string })?.full_name
          ?? u.email?.split("@")[0] ?? "משתמש");
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      const u = s?.user;
      setUserId(u?.id ?? null);
      if (u) {
        setDisplayName((u.user_metadata as { display_name?: string; full_name?: string })?.display_name
          ?? (u.user_metadata as { full_name?: string })?.full_name
          ?? u.email?.split("@")[0] ?? "משתמש");
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Initial fetch + realtime
  useEffect(() => {
    let alive = true;
    (async () => {
      const { data, error } = await supabase
        .from("chat_messages").select("*")
        .eq("room_id", ROOM)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) { console.error(error); return; }
      if (!alive) return;
      setMessages((data ?? []).reverse());
    })();

    const channel = supabase
      .channel(`chat-${ROOM}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `room_id=eq.${ROOM}` },
        (payload) => {
          const row = payload.new as ChatRow;
          setMessages((m) => (m.some((x) => x.id === row.id) ? m : [...m, row]));
        })
      .subscribe();

    return () => { alive = false; supabase.removeChannel(channel); };
  }, []);

  // Autoscroll to bottom on new message
  useEffect(() => {
    if (open) {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
      setUnread(0);
    } else if (messages.length) {
      setUnread((u) => u + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length]);

  // Clear unread when opening
  useEffect(() => { if (open) setUnread(0); }, [open]);

  const canSend = useMemo(() => !!userId && draft.trim().length > 0 && !sending, [userId, draft, sending]);

  const send = async () => {
    if (!canSend || !userId) return;
    const body = draft.trim().slice(0, 2000);
    setSending(true);
    const { error } = await supabase.from("chat_messages").insert({
      room_id: ROOM, user_id: userId, display_name: displayName || "משתמש", body,
    });
    setSending(false);
    if (error) { toast.error("שגיאה בשליחה"); return; }
    setDraft("");
  };

  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin + "/");
      toast.success("הקישור הועתק");
    } catch { toast.error("לא ניתן להעתיק"); }
  };

  return (
    <div dir="rtl" className="fixed bottom-6 right-6 z-50">
      {open && (
        <div
          className="mb-3 w-[340px] h-[480px] rounded-2xl overflow-hidden flex flex-col animate-fade-in border border-[oklch(0.76_0.13_85/0.25)]"
          style={{
            background: "linear-gradient(180deg, oklch(0.19 0.006 60), oklch(0.14 0.006 60))",
            boxShadow: "0 30px 60px -20px rgba(0,0,0,0.6), 0 0 0 1px oklch(0.76 0.13 85 / 0.15)",
          }}
        >
          <div className="h-11 px-3 flex items-center justify-between border-b border-[oklch(0.76_0.13_85/0.2)]">
            <div className="flex items-center gap-2">
              <MessageCircle className="size-4 text-[oklch(0.88_0.09_90)]" />
              <span className="font-serif text-[oklch(0.92_0.06_90)] text-sm">צ'אט חי · {messages.length}</span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={copyInvite} title="העתק קישור הזמנה"
                      className="p-1.5 rounded hover:bg-white/5 text-[oklch(0.85_0.08_90)]">
                <Copy className="size-3.5" />
              </button>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded hover:bg-white/5 text-[oklch(0.85_0.08_90)]">
                <X className="size-4" />
              </button>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
            {messages.length === 0 && (
              <div className="text-center text-xs text-[oklch(0.7_0.03_90/0.7)] pt-16">
                עוד לא נשלחו הודעות בחדר.
              </div>
            )}
            {messages.map((m) => {
              const mine = m.user_id && m.user_id === userId;
              return (
                <div key={m.id} className={`flex gap-2 ${mine ? "flex-row-reverse" : ""}`}>
                  <div className="size-7 rounded-full grid place-items-center text-[10px] font-bold text-white shrink-0"
                       style={{ background: colorFor(m.display_name) }}>{initials(m.display_name)}</div>
                  <div className={`max-w-[75%] rounded-2xl px-3 py-1.5 text-sm ${
                    mine
                      ? "bg-[oklch(0.76_0.13_85/0.22)] text-[oklch(0.94_0.05_90)] border border-[oklch(0.76_0.13_85/0.4)]"
                      : "bg-white/5 text-[oklch(0.9_0.03_90)] border border-white/5"
                  }`}>
                    {!mine && (
                      <div className="text-[10px] font-bold text-[oklch(0.85_0.08_90)] mb-0.5">{m.display_name}</div>
                    )}
                    <div className="whitespace-pre-wrap break-words leading-snug">{m.body}</div>
                    <div className="text-[9px] text-white/40 mt-0.5 text-left" dir="ltr">{timeShort(m.created_at)}</div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="border-t border-[oklch(0.76_0.13_85/0.2)] p-2">
            {userId ? (
              <div className="flex items-end gap-2">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                  rows={1}
                  placeholder="כתוב הודעה… (Enter לשליחה)"
                  className="flex-1 resize-none max-h-24 rounded-xl bg-white/5 text-[oklch(0.92_0.03_90)] placeholder:text-white/30 px-3 py-2 text-sm outline-none border border-white/5 focus:border-[oklch(0.76_0.13_85/0.5)]"
                />
                <button onClick={send} disabled={!canSend}
                        className="size-9 grid place-items-center rounded-xl text-primary-foreground disabled:opacity-40"
                        style={{ background: "var(--gradient-gold)" }}>
                  <Send className="size-4" />
                </button>
              </div>
            ) : (
              <a href="/auth" className="flex items-center justify-center gap-2 py-2 rounded-xl bg-white/5 text-[oklch(0.85_0.08_90)] text-sm hover:bg-white/10">
                <LogIn className="size-4" /> התחבר כדי לכתוב
              </a>
            )}
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        className="relative size-14 rounded-full grid place-items-center text-primary-foreground hover:scale-105 active:scale-95 transition-transform"
        style={{ background: "var(--gradient-gold)", boxShadow: "var(--shadow-gold), inset 0 1px 0 oklch(1 0 0 / 0.3)" }}
        aria-label="צ'אט חי"
      >
        <MessageCircle className="size-6" />
        {!open && unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold grid place-items-center border-2 border-[oklch(0.14_0.006_60)]">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
    </div>
  );
}