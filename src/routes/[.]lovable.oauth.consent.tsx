import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type OAuthClient = { name?: string; client_name?: string; redirect_uri?: string };
type AuthorizationDetails = {
  client?: OAuthClient;
  scope?: string;
  redirect_url?: string;
  redirect_to?: string;
};

type SupabaseOAuth = {
  getAuthorizationDetails: (id: string) => Promise<{ data: AuthorizationDetails | null; error: Error | null }>;
  approveAuthorization: (id: string) => Promise<{ data: AuthorizationDetails | null; error: Error | null }>;
  denyAuthorization: (id: string) => Promise<{ data: AuthorizationDetails | null; error: Error | null }>;
};

function oauthApi(): SupabaseOAuth {
  return (supabase.auth as unknown as { oauth: SupabaseOAuth }).oauth;
}

function isSameOriginRelative(next: string): boolean {
  return next.startsWith("/") && !next.startsWith("//");
}

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
    const { data } = await supabase.auth.getSession();
    const next = location.pathname + location.searchStr;
    if (!data.session) throw redirect({ to: "/auth", search: { next } });
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id")!;
    const { data, error } = await oauthApi().getAuthorizationDetails(authorizationId);
    if (error) throw error;
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <main dir="rtl" className="min-h-screen grid place-items-center p-6 bg-slate-50">
      <div className="max-w-md bg-white p-6 rounded-2xl border border-slate-200 shadow">
        <h1 className="text-lg font-bold mb-2">לא ניתן לטעון את בקשת ההרשאה</h1>
        <p className="text-sm text-slate-600">{String((error as Error)?.message ?? error)}</p>
      </div>
    </main>
  ),
});

export { isSameOriginRelative };

function Consent() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clientName = details?.client?.client_name ?? details?.client?.name ?? "אפליקציה חיצונית";
  const redirectUri = details?.client?.redirect_uri;
  const scopes = (details?.scope ?? "openid email profile").split(/\s+/).filter(Boolean);

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const api = oauthApi();
    const { data, error: err } = approve
      ? await api.approveAuthorization(authorization_id)
      : await api.denyAuthorization(authorization_id);
    if (err) { setBusy(false); setError(err.message); return; }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) { setBusy(false); setError("שרת ההרשאות לא החזיר יעד להפניה."); return; }
    window.location.href = target;
  }

  return (
    <main dir="rtl" className="min-h-screen grid place-items-center p-6 bg-gradient-to-br from-indigo-50 via-slate-50 to-purple-50">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl shadow-indigo-500/10 p-8 border border-slate-200">
        <div className="size-14 rounded-2xl bg-primary text-primary-foreground grid place-items-center mx-auto mb-3 text-2xl">🔐</div>
        <h1 className="text-xl font-bold text-center">חבר את {clientName} לחשבון שלך</h1>
        <p className="text-sm text-slate-500 text-center mt-1">
          פעולה זו תאפשר ל{clientName} להשתמש בכלים של האפליקציה בשמך.
        </p>

        <div className="mt-5 space-y-3 text-sm">
          {redirectUri && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 break-all">
              <div className="text-xs text-slate-500 mb-1">כתובת חזרה</div>
              <div dir="ltr" className="font-mono text-xs">{redirectUri}</div>
            </div>
          )}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-xs text-slate-500 mb-1">הרשאות מבוקשות</div>
            <ul className="list-disc pr-5 space-y-0.5">
              {scopes.map((s: string) => <li key={s} dir="ltr" className="font-mono text-xs">{s}</li>)}
            </ul>
          </div>
          <p className="text-xs text-slate-500">
            זה לא עוקף את הרשאות האפליקציה או את מדיניות הגישה במסד הנתונים.
          </p>
        </div>

        {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}

        <div className="mt-6 flex gap-2">
          <button
            disabled={busy}
            onClick={() => decide(true)}
            className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:brightness-110 disabled:opacity-50"
          >
            אישור
          </button>
          <button
            disabled={busy}
            onClick={() => decide(false)}
            className="flex-1 py-3 border-2 border-slate-200 rounded-xl font-bold hover:border-slate-300 disabled:opacity-50"
          >
            ביטול
          </button>
        </div>
      </div>
    </main>
  );
}