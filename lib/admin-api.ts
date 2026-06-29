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
export type AdminRole = "owner" | "manager";

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
  storage_bucket: string | null;
  storage_path: string | null;
  file_size_bytes: number | null;
  file_mime: string | null;
  original_filename: string | null;
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
  assigned_manager_id: string | null;
  assigned_manager_name: string | null;
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
  follow_up_at: string | null;
  follow_up_note: string | null;
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

export interface AdminActor {
  user_id: string | null;
  login: string;
  display_name: string;
  phone: string | null;
  email: string | null;
  role: AdminRole;
  legacy: boolean;
}

export interface AdminSession {
  token: string;
  expires_at: number;
  actor: AdminActor;
}

export interface AdminUser {
  id: string;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
  login: string;
  display_name: string;
  phone: string | null;
  email: string | null;
  role: AdminRole;
  is_active: boolean;
  notes: string | null;
}

export interface AdminAuditEvent {
  id: string;
  created_at: string;
  actor_user_id: string | null;
  actor_login: string | null;
  actor_name: string | null;
  actor_role: AdminRole | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  lead_id: string | null;
  metadata: Record<string, unknown>;
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

export async function adminLogin(login: string, password: string): Promise<AdminSession> {
  const r = await fetch(ADMIN_FN_URL, {
    method: "POST",
    headers: {
      "Content-Type":  "application/json",
      "apikey":        PUBLISHABLE_KEY,
    },
    body: JSON.stringify({ action: "login", login: login || undefined, password }),
  });
  const data = await parseAdminResponse<{ ok: true; token: string; expires_at: number; actor: AdminActor }>(r);
  return { token: data.token, expires_at: data.expires_at, actor: data.actor };
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

export function fmtBytes(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  if (n < 1024) return `${n} Б`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} КБ`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} МБ`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} ГБ`;
}

export async function listActiveManagers(token: string): Promise<AdminUser[]> {
  const r = await adminFetch<{ ok: true; users: AdminUser[] }>(token, {
    action: "list_active_managers",
  });
  return r.users;
}

export async function assignLeadManager(
  token: string,
  id: string,
  managerId: string | null,
): Promise<LeadFull> {
  const r = await adminFetch<{ ok: true; lead: LeadFull }>(token, {
    action: "assign_lead_manager",
    id,
    manager_id: managerId,
  });
  return r.lead;
}

export async function listLeadEvents(token: string, leadId: string): Promise<AdminAuditEvent[]> {
  const r = await adminFetch<{ ok: true; events: AdminAuditEvent[] }>(token, {
    action: "list_lead_events",
    lead_id: leadId,
  });
  return r.events;
}

export async function listAdminUsers(token: string): Promise<AdminUser[]> {
  const r = await adminFetch<{ ok: true; users: AdminUser[] }>(token, {
    action: "list_admin_users",
  });
  return r.users;
}

export async function createAdminUser(
  token: string,
  input: {
    login: string;
    display_name: string;
    password: string;
    role: AdminRole;
    phone?: string;
    email?: string;
    notes?: string;
  },
): Promise<AdminUser> {
  const r = await adminFetch<{ ok: true; user: AdminUser }>(token, {
    action: "create_admin_user",
    ...input,
  });
  return r.user;
}

export async function updateAdminUser(
  token: string,
  input: {
    id: string;
    display_name?: string;
    phone?: string | null;
    email?: string | null;
    role?: AdminRole;
    is_active?: boolean;
    notes?: string | null;
    password?: string;
  },
): Promise<AdminUser> {
  const r = await adminFetch<{ ok: true; user: AdminUser }>(token, {
    action: "update_admin_user",
    ...input,
  });
  return r.user;
}

// ─────────── Загрузка файлов в lead-documents bucket ───────────

export async function uploadLeadFileDirect(args: {
  token: string;
  leadId: string;
  docType: LeadDocumentType;
  file: File;
  title?: string;
  amount?: number;
}): Promise<LeadDocument> {
  const { token, leadId, docType, file, title, amount } = args;

  // 1) signed URL от admin-api
  const step1 = await adminFetch<{ ok: true; upload_url: string; storage_path: string }>(token, {
    action: "create_lead_upload_url",
    lead_id: leadId,
    doc_type: docType,
    filename: file.name,
  });

  // 2) PUT файла прямо в Supabase Storage
  const up = await fetch(step1.upload_url, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": file.type || "application/octet-stream" },
  });
  if (!up.ok) throw new Error(`Upload failed: ${up.status} ${up.statusText}`);

  // 3) Подтверждение метаданных
  const step3 = await adminFetch<{ ok: true; document: LeadDocument }>(token, {
    action: "confirm_lead_upload",
    lead_id: leadId,
    doc_type: docType,
    title: title || file.name,
    storage_path: step1.storage_path,
    file_size_bytes: file.size,
    file_mime: file.type || null,
    original_filename: file.name,
    amount,
  });
  return step3.document;
}

// ─────────── Ручное создание лида из админки ───────────

export interface NewLeadInput {
  name: string;
  phone: string;
  email?: string;
  company?: string;
  client_type?: string;
  object_type?: string;
  direction?: string;
  message?: string;
}

// Создаёт лид с source_channel='manual'. Возвращает id + сгенерированный lead_code (MAN-…).
// Триггер v6 для manual-лидов «тихий»: ни SMS клиенту, ни Telegram Азамату.
export async function createLead(token: string, input: NewLeadInput): Promise<{ id: string; lead_code: string | null }> {
  const r = await adminFetch<{ ok: true; id: string; lead_code: string | null }>(token, {
    action: "create_lead",
    ...input,
  });
  return { id: r.id, lead_code: r.lead_code };
}

// ─────────── Правка контактных полей лида ───────────

export interface ContactEditInput {
  name?: string;
  phone?: string;
  email?: string | null;
  company?: string | null;
  client_type?: string | null;
  object_type?: string | null;
  direction?: string | null;
  message?: string | null;
}

// Обновляет только переданные поля. Возвращает обновлённый лид.
export async function updateLeadContact(
  token: string,
  id: string,
  fields: ContactEditInput,
): Promise<LeadFull> {
  const r = await adminFetch<{ ok: true; lead: LeadFull }>(token, {
    action: "update_lead_contact",
    id,
    ...fields,
  });
  return r.lead;
}

// ─────────── Напоминание (follow-up) по лиду ───────────

// at = ISO-строка (поставить) или null (снять). note — о чём напомнить.
export async function setLeadFollowUp(
  token: string,
  id: string,
  at: string | null,
  note?: string | null,
): Promise<LeadFull> {
  const r = await adminFetch<{ ok: true; lead: LeadFull }>(token, {
    action: "set_lead_followup",
    id,
    follow_up_at: at,
    follow_up_note: note ?? null,
  });
  return r.lead;
}

export async function deleteLeadDocument(token: string, documentId: string): Promise<void> {
  await adminFetch(token, { action: "delete_lead_document", document_id: documentId });
}

// Удалить лид безвозвратно (для мусора/спама). Каскадом удалятся документы,
// сообщения и комиссия. Используется в карточке и в списке заявок.
export async function deleteLead(token: string, id: string): Promise<void> {
  await adminFetch(token, { action: "delete_lead", id });
}

export async function getLeadDocumentUrl(token: string, documentId: string): Promise<string> {
  const r = await adminFetch<{ ok: true; url: string }>(token, {
    action: "get_lead_document_signed_url",
    document_id: documentId,
  });
  return r.url;
}
