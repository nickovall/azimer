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

export type LeadStatus =
  | "new"
  | "contacted"
  | "accepted"
  | "measurement_done"
  | "tz_received"
  | "kp_preparing"
  | "kp_sent"
  | "kp_approved"
  | "sent_to_accountant"
  | "invoice_issued"
  | "paid_partial"
  | "paid_full"
  | "won"
  | "lost"
  | "commission_paid";
export type LeadSource = "contact" | "project" | "partner" | "estimate" | "kp_bot";
export type SourceChannel = "site" | "tender" | "manual";
export type KpStatus = "not_started" | "preparing" | "sent" | "approved";
export type ContractStatus = "not_started" | "drafting" | "sent" | "signed";
export type InvoiceStatus = "not_issued" | "issued";
export type PaymentStatus = "not_paid" | "partial" | "paid";
export type LeadDocumentType = "tz" | "kp" | "contract" | "invoice" | "act" | "payment" | "mail" | "drawing" | "other";

export interface LeadDocSummary {
  document_count: number;
  has_tz: boolean;
  has_kp: boolean;
  has_contract: boolean;
  has_invoice: boolean;
  has_payment: boolean;
  kp_amount: number | null;
  invoice_amount: number | null;
  paid_amount: number | null;
}

export interface LeadDocument {
  id: string;
  lead_id: string;
  lead_code: string | null;
  created_at: string;
  doc_type: LeadDocumentType;
  title: string;
  file_url: string | null;
  storage_provider: "google_drive" | "supabase" | "other";
  storage_path: string | null;
  amount: number | null;
  currency: "RUB";
  uploaded_by: string | null;
  sent_to_accountant_at: string | null;
  notes: string | null;
}

export interface DealCommission {
  id: string;
  lead_id: string;
  lead_code: string | null;
  commission_rate: number;
  kp_amount: number;
  invoice_amount: number;
  paid_amount: number;
  commission_due: number;
  commission_paid: number;
  payment_status: PaymentStatus;
  notes: string | null;
  updated_at: string;
}

export interface LeadRow {
  id: string;
  created_at: string;
  source: LeadSource;
  source_channel: SourceChannel;
  lead_code: string | null;
  external_source: string | null;
  external_source_url: string | null;
  created_by_system: string | null;
  status: LeadStatus;
  deal_status: LeadStatus;
  status_updated_at: string | null;
  kp_status: KpStatus;
  contract_status: ContractStatus;
  invoice_status: InvoiceStatus;
  payment_status: PaymentStatus;
  commission_eligible: boolean;
  commission_rate: number;
  commission_notes: string | null;
  project_folder_url: string | null;
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
  doc_summary?: LeadDocSummary;
  commission?: DealCommission | null;
}

export interface LeadFull extends LeadRow {
  utm_content: string | null;
  utm_term: string | null;
  referrer: string | null;
  direction: string | null;
  notes: string | null;
  files: string[] | null;
  catalog_version: string | null;
}

export interface LeadFileLink {
  path: string;
  url: string | null;
}

export interface MessageTemplate {
  id: string;
  channel: "sms" | "email";
  slug: string;
  name: string;
  subject: string | null;
  body: string;
  is_active: boolean;
  sort_order: number;
  updated_at?: string;
}

export interface LeadMessage {
  id: string;
  channel: "sms" | "email";
  template_slug: string | null;
  recipient: string;
  subject: string | null;
  body_rendered: string;
  status: "sent" | "failed" | "pending";
  error_message: string | null;
  sent_at: string;
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

export interface AdminSession {
  token: string;
  expires_at: number;
}

export const STATUS_LABEL_LEGACY: Partial<Record<LeadStatus, string>> = {
  new:       "🆕 Новая",
  contacted: "🟡 В работе",
  kp_sent:   "📄 КП отправлено",
  won:       "✅ Договор",
  lost:      "❌ Отказ",
};

export const STATUS_COLOR_LEGACY: Partial<Record<LeadStatus, string>> = {
  new:       "bg-blue-100 text-blue-800",
  contacted: "bg-amber-100 text-amber-800",
  kp_sent:   "bg-indigo-100 text-indigo-800",
  won:       "bg-green-100 text-green-800",
  lost:      "bg-gray-100 text-gray-600",
};

export const SOURCE_LABEL_LEGACY: Record<LeadSource, string> = {
  contact:  "📩 Контактная форма",
  project:  "📐 Проект",
  partner:  "🤝 Партнёрство",
  estimate: "🧮 Мастер расчёта",
  kp_bot:   "💬 Telegram-бот",
};

export const STATUS_LABEL: Record<LeadStatus, string> = {
  new: "Новая",
  contacted: "В работе",
  accepted: "Принято",
  measurement_done: "Замеры",
  tz_received: "ТЗ получено",
  kp_preparing: "КП готовится",
  kp_sent: "КП отправлено",
  kp_approved: "КП одобрено",
  sent_to_accountant: "Бухгалтер",
  invoice_issued: "Счет выставлен",
  paid_partial: "Частично оплачено",
  paid_full: "Оплачено",
  won: "Договор",
  lost: "Отказ",
  commission_paid: "Комиссия выплачена",
};

export const STATUS_COLOR: Record<LeadStatus, string> = {
  new: "bg-blue-100 text-blue-800",
  contacted: "bg-amber-100 text-amber-800",
  accepted: "bg-amber-100 text-amber-800",
  measurement_done: "bg-cyan-100 text-cyan-800",
  tz_received: "bg-cyan-100 text-cyan-800",
  kp_preparing: "bg-violet-100 text-violet-800",
  kp_sent: "bg-indigo-100 text-indigo-800",
  kp_approved: "bg-emerald-100 text-emerald-800",
  sent_to_accountant: "bg-orange-100 text-orange-800",
  invoice_issued: "bg-teal-100 text-teal-800",
  paid_partial: "bg-lime-100 text-lime-800",
  paid_full: "bg-green-100 text-green-800",
  won: "bg-green-100 text-green-800",
  lost: "bg-gray-100 text-gray-600",
  commission_paid: "bg-slate-100 text-slate-700",
};

export const SOURCE_LABEL: Record<LeadSource, string> = {
  contact: "Контактная форма",
  project: "Проект",
  partner: "Партнерство",
  estimate: "Мастер расчета",
  kp_bot: "Telegram-бот",
};

export const SOURCE_CHANNEL_LABEL: Record<SourceChannel, string> = {
  site: "Сайт",
  tender: "Тендер",
  manual: "Ручной",
};

export const KP_STATUS_LABEL: Record<KpStatus, string> = {
  not_started: "нет",
  preparing: "готовится",
  sent: "отправлено",
  approved: "одобрено",
};

export const CONTRACT_STATUS_LABEL: Record<ContractStatus, string> = {
  not_started: "нет",
  drafting: "готовится",
  sent: "отправлен",
  signed: "подписан",
};

export const INVOICE_STATUS_LABEL: Record<InvoiceStatus, string> = {
  not_issued: "нет",
  issued: "выставлен",
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  not_paid: "нет",
  partial: "частично",
  paid: "оплачено",
};

export const DOCUMENT_TYPE_LABEL: Record<LeadDocumentType, string> = {
  tz: "ТЗ",
  kp: "КП",
  contract: "Договор",
  invoice: "Счет",
  act: "Акт",
  payment: "Оплата",
  mail: "Переписка",
  drawing: "Чертежи",
  other: "Другое",
};

async function parseAdminResponse<T>(r: Response): Promise<T> {
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw new Error(j.error || `${r.status} ${r.statusText}`);
  }
  return r.json() as Promise<T>;
}

export async function adminLogin(password: string): Promise<AdminSession> {
  const r = await fetch(ADMIN_FN_URL, {
    method: "POST",
    headers: {
      "Content-Type":  "application/json",
      "apikey":        PUBLISHABLE_KEY,
    },
    body: JSON.stringify({ action: "login", password }),
  });
  const data = await parseAdminResponse<{ ok: true; token: string; expires_at: number }>(r);
  return { token: data.token, expires_at: data.expires_at };
}

export async function adminFetch<T = unknown>(
  token: string,
  // deno-lint-ignore-explicit-any
  payload: { action: string; [k: string]: any },
): Promise<T> {
  const r = await fetch(ADMIN_FN_URL, {
    method: "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": "Bearer " + token,
      "apikey":        PUBLISHABLE_KEY,
    },
    body: JSON.stringify(payload),
  });
  return parseAdminResponse<T>(r);
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
