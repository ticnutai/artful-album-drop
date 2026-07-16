import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";

function safeNext(next: string | undefined): string {
  if (!next) return "/";
  // Same-origin relative path only.
  if (!next.startsWith("/") || next.startsWith("//")) return "/";
  return next;
}

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "התחברות — סטודיו שיתוף מסך" },
      { name: "description", content: "התחבר כדי לבנות ולשמור פריסות מותאמות אישית" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>) => ({
    next: typeof s.next === "string" ? s.next : undefined,
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { next } = Route.useSearch();
  const target = safeNext(next);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) window.location.replace(target);
    });
  }, [target]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: window.location.origin + target },
        });
        if (error) throw error;
        toast.success("נרשמת בהצלחה!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      window.location.replace(target);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שגיאה");
    } finally { setLoading(false); }
  };

  const google = async () => {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + target,
    });
    if (result.error) toast.error("שגיאה בהתחברות עם Google");
    if (!result.redirected && !result.error) window.location.replace(target);
  };

  return (
    <div dir="rtl" className="min-h-screen grid place-items-center bg-gradient-to-br from-indigo-50 via-slate-50 to-purple-50 p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl shadow-indigo-500/10 p-8 border border-slate-200">
        <div className="text-center mb-6">
          <div className="size-14 rounded-2xl bg-primary text-primary-foreground grid place-items-center mx-auto mb-3 text-2xl">🎨</div>
          <h1 className="text-2xl font-bold">{mode === "signin" ? "ברוך שובך" : "בואו נתחיל"}</h1>
          <p className="text-sm text-slate-500 mt-1">{mode === "signin" ? "התחבר כדי לגשת לפריסות שלך" : "צור חשבון כדי לשמור פריסות בענן"}</p>
        </div>

        <button onClick={google} className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-slate-200 rounded-xl font-bold hover:border-primary hover:bg-primary/5 transition-all mb-4">
          <svg className="size-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          המשך עם Google
        </button>

        <div className="flex items-center gap-3 my-4 text-xs text-slate-400"><div className="flex-1 h-px bg-slate-200" />או<div className="flex-1 h-px bg-slate-200" /></div>

        <form onSubmit={submit} className="space-y-3">
          <input type="email" placeholder="אימייל" required value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-primary outline-none" />
          <input type="password" placeholder="סיסמה" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-primary outline-none" />
          <button type="submit" disabled={loading} className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:brightness-110 disabled:opacity-50">
            {loading ? "רגע…" : mode === "signin" ? "התחבר" : "צור חשבון"}
          </button>
        </form>

        <button onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="w-full mt-4 text-sm text-slate-500 hover:text-primary">
          {mode === "signin" ? "אין לך חשבון? הירשם" : "יש לך חשבון? התחבר"}
        </button>
      </div>
    </div>
  );
}
