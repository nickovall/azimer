// АЗИМЕР — клиентский хелпер для admin-api Edge Function

export const ADMIN_FN_URL =
  (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "") + "/functions/v1/admin-api";

// ВАЖНО: для новых Edge Functions в Supabase нужен publishable key (sb_publishable_…),
// а legacy anon-ключ отбивается на gateway (INVALID_CREDENTIALS).
// Старые функции (smooth-task) и REST API продолжают работать со старым anon ключом —
// поэтому supabase.ts использует ANON, а admin-api отдельно ниже.
export const PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ?? "";

export type LeadStatus = "new" | "contacted" | "kp_sent" | "won" | "lost";
export type LeadSource = "contact" | "project" | "partner" | "estimate" | "kp_bot";

export interface LeadRow {
  id: string;
  created_at: string;
  source: LeadSource;
  status: LeadStatus;
  status_updated_at: string | null;
  name: string;
  phone: string;
  email: string | null;
  client_type: string | null;
  object_type: string | null;
  company: string | null;
  message: string | null;
  // deno-lint-ignore-explicit-any
  estimate: any;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  landing_page: string | null;
}

export interface LeadFull extends LeadRow {
  utm_content: string | null;
  utm_term: string | null;
  referrer: string | null;
  direction: string | null;
  notes: string | null;
  files: string[] | null;
}

export interface LeadFileLink {
  path: string;
  url: string | null;
}

export interface DashboardStats {
  today: number;
  week: number;
  month: number;
  total: number;
  byStatus: Record<LeadStatus, number>;
  topSources: Array<{ source: string; count: number }>;
  avgTicket: number;
  avgTicketCount: number;
  recent: LeadRow[];
}

export const STATUS_LABEL: Record<LeadStatus, string> = {
  new:       "🆕 Новая",
  contacted: "🟡 В работе",
  kp_sent:   "📄 КП отправлено",
  won:       "✅ Договор",
  lost:      "❌ Отказ",
};

export const STATUS_COLOR: Record<LeadStatus, string> = {
  new:       "bg-blue-100 text-blue-800",
  contacted: "bg-amber-100 text-amber-800",
  kp_sent:   "bg-indigo-100 text-indigo-800",
  won:       "bg-green-100 text-green-800",
  lost:      "bg-gray-100 text-gray-600",
};

export const SOURCE_LABEL: Record<LeadSource, string> = {
  contact:  "📩 Контактная форма",
  project:  "📐 Проект",
  partner:  "🤝 Партнёрство",
  estimate: "🧮 Мастер расчёта",
  kp_bot:   "💬 Telegram-бот",
};

export async function adminFetch<T = unknown>(
  password: string,
  // deno-lint-ignore-explicit-any
  payload: { action: string; [k: string]: any },
): Promise<T> {
  // Пароль кладём в body, а не в header — Supabase Gateway режет custom-headers
  // на OPTIONS preflight (whitelist: authorization, apikey, content-type, ...).
  const r = await fetch(ADMIN_FN_URL, {
    method: "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": "Bearer " + PUBLISHABLE_KEY,
      "apikey":        PUBLISHABLE_KEY,
    },
    body: JSON.stringify({ ...payload, __pw: password }),
  });
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw new Error(j.error || `${r.status} ${r.statusText}`);
  }
  return r.json() as Promise<T>;
}

export function fmtRub(n: number | null | undefined): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("ru-RU").format(Math.round(n)) + " ₽";
}

export function fmtDateTime(s: string | null | undefined): string {
  if (!s) return "—";
  const d = new Date(s);
  return d.toLocaleString("ru-RU", {
    timeZone: "Asia/Krasnoyarsk",
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function fmtDate(s: string | null | undefined): string {
  if (!s) return "—";
  const d = new Date(s);
  return d.toLocaleDateString("ru-RU", {
    timeZone: "Asia/Krasnoyarsk",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
