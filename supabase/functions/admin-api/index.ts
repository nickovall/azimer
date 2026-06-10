// АЗИМЕР — единая Edge Function для админ-операций (каталог + заявки + дашборд)
// Заменяет старую catalog-admin. После деплоя catalog-admin можно удалить.
//
// Деплой: Supabase Dashboard → Edge Functions → Deploy new function → имя admin-api
// Verify JWT: отключить (используем свой короткоживущий admin session token)
// Env: ADMIN_PASSWORD, ADMIN_SESSION_SECRET, SITE_URL

// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL    = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY     = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ADMIN_PASSWORD  = Deno.env.get("ADMIN_PASSWORD") ?? "";
const SITE_URL        = Deno.env.get("SITE_URL") ?? "https://azimer.ru";
// Должен быть отдельный секрет, не равный паролю.
// Fallback на ADMIN_PASSWORD убран сознательно: иначе компрометация пароля
// = компрометация подписи всех живых сессий, и rotate пароля молча
// инвалидирует токены вместо явного rotate секрета.
const ADMIN_SESSION_SECRET = Deno.env.get("ADMIN_SESSION_SECRET") ?? "";
const ADMIN_TOKEN_TTL_SECONDS = Math.max(60, Math.min(
  Number(Deno.env.get("ADMIN_TOKEN_TTL_SECONDS") ?? 30 * 60),
  8 * 60 * 60,
));

const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const CORS_BASE = {
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey",
};

const LEAD_STATUSES = [
  "new",
  "contacted",
  "accepted",
  "measurement_done",
  "tz_received",
  "kp_preparing",
  "kp_sent",
  "kp_approved",
  "sent_to_accountant",
  "invoice_issued",
  "paid_partial",
  "paid_full",
  "won",
  "lost",
  "commission_paid",
] as const;
const ALLOWED_LEAD_STATUSES = new Set<string>(LEAD_STATUSES);
const ALLOWED_SOURCE_CHANNELS = new Set(["site", "tender", "manual"]);
const ALLOWED_DOC_TYPES = new Set(["tz", "kp", "contract", "invoice", "act", "payment", "mail", "drawing", "other"]);
const ALLOWED_PAYMENT_STATUSES = new Set(["not_paid", "partial", "paid"]);
const ALLOWED_KP_STATUSES = new Set(["not_started", "preparing", "sent", "approved"]);
const ALLOWED_CONTRACT_STATUSES = new Set(["not_started", "drafting", "sent", "signed"]);
const ALLOWED_INVOICE_STATUSES = new Set(["not_issued", "issued"]);

function normalizeOrigin(value: string): string | null {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function allowedOrigins(): Set<string> {
  const origins = new Set<string>([
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
  ]);
  const site = normalizeOrigin(SITE_URL);
  if (site) origins.add(site);
  for (const raw of (Deno.env.get("ADMIN_ALLOWED_ORIGINS") ?? "").split(",")) {
    const origin = normalizeOrigin(raw.trim());
    if (origin) origins.add(origin);
  }
  return origins;
}

function corsFor(req: Request): { allowed: boolean; headers: Record<string, string> } {
  const origin = req.headers.get("Origin");
  if (!origin) {
    return { allowed: true, headers: { ...CORS_BASE, "Access-Control-Allow-Origin": normalizeOrigin(SITE_URL) ?? SITE_URL } };
  }
  const normalized = normalizeOrigin(origin);
  const allowed = !!normalized && allowedOrigins().has(normalized);
  return {
    allowed,
    headers: {
      ...CORS_BASE,
      ...(allowed ? { "Access-Control-Allow-Origin": normalized!, "Access-Control-Max-Age": "86400" } : {}),
    },
  };
}

function jsonResponse(body: any, status: number, corsHeaders: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function stringToBase64Url(value: string): string {
  return bytesToBase64Url(new TextEncoder().encode(value));
}

function base64UrlToBytes(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const bin = atob(padded);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function hmacSha256(data: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return bytesToBase64Url(new Uint8Array(sig));
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function createAdminToken(): Promise<{ token: string; exp: number }> {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: "admin",
    iat: now,
    exp: now + ADMIN_TOKEN_TTL_SECONDS,
  };
  const encoded = stringToBase64Url(JSON.stringify(payload));
  const sig = await hmacSha256(encoded, ADMIN_SESSION_SECRET);
  return { token: `${encoded}.${sig}`, exp: payload.exp };
}

async function verifyAdminToken(req: Request): Promise<{ ok: true; exp: number } | { ok: false; error: string }> {
  if (!ADMIN_SESSION_SECRET) return { ok: false, error: "ADMIN_SESSION_SECRET is not configured" };
  const auth = req.headers.get("Authorization") ?? "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m) return { ok: false, error: "Missing bearer token" };

  const [payloadPart, sigPart] = m[1].split(".");
  if (!payloadPart || !sigPart) return { ok: false, error: "Invalid token" };

  const expected = await hmacSha256(payloadPart, ADMIN_SESSION_SECRET);
  if (!timingSafeEqual(expected, sigPart)) return { ok: false, error: "Invalid token" };

  let payload: any;
  try {
    payload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(payloadPart)));
  } catch {
    return { ok: false, error: "Invalid token payload" };
  }

  const now = Math.floor(Date.now() / 1000);
  if (payload?.sub !== "admin" || typeof payload?.exp !== "number" || payload.exp <= now) {
    return { ok: false, error: "Token expired" };
  }
  return { ok: true, exp: payload.exp };
}

function nullableString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function optionalNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function isHttpUrl(value: string | null): boolean {
  if (!value) return true;
  return /^https?:\/\//i.test(value);
}

function pipelinePatchForStatus(status: string): Record<string, unknown> {
  const patch: Record<string, unknown> = { status, deal_status: status };
  if (status === "tz_received") patch.kp_status = "preparing";
  if (status === "kp_preparing") patch.kp_status = "preparing";
  if (status === "kp_sent") patch.kp_status = "sent";
  if (status === "kp_approved" || status === "sent_to_accountant") patch.kp_status = "approved";
  if (status === "sent_to_accountant") patch.contract_status = "sent";
  if (status === "invoice_issued" || status === "paid_partial" || status === "paid_full" || status === "won") {
    patch.invoice_status = "issued";
  }
  if (status === "paid_partial") patch.payment_status = "partial";
  if (status === "paid_full" || status === "won") patch.payment_status = "paid";
  return patch;
}

// Папки в bucket'е lead-documents — мапятся из doc_type.
const FOLDER_BY_DOC_TYPE: Record<string, string> = {
  tz: "01_TZ",
  kp: "02_KP_i_smety",
  contract: "03_Dogovory",
  invoice: "04_Scheta",
  act: "05_Akty",
  payment: "06_Oplaty",
  mail: "07_Perepiska",
  drawing: "08_Foto_i_chertezhi",
  other: "99_Other",
};

function safeFilename(name: string): string {
  const base = name.replace(/^.*[\\/]/, "");
  const cleaned = base.replace(/[^\w.\-]/g, "_").slice(0, 200);
  return cleaned || "file";
}

function documentPatchForType(docType: string): Record<string, unknown> {
  if (docType === "tz") return { deal_status: "tz_received", status: "tz_received" };
  if (docType === "kp") return { kp_status: "sent", deal_status: "kp_sent", status: "kp_sent" };
  if (docType === "contract") return { contract_status: "sent" };
  if (docType === "invoice") return { invoice_status: "issued", deal_status: "invoice_issued", status: "invoice_issued" };
  if (docType === "payment") return { payment_status: "partial", deal_status: "paid_partial", status: "paid_partial" };
  return {};
}

function summarizeDocuments(docs: Array<any>): Map<string, any> {
  const byLead = new Map<string, any>();
  for (const doc of docs) {
    const leadId = doc.lead_id;
    const current = byLead.get(leadId) ?? {
      document_count: 0,
      has_tz: false,
      has_kp: false,
      has_contract: false,
      has_invoice: false,
      has_payment: false,
      kp_amount: null,
      invoice_amount: null,
      paid_amount: null,
    };
    current.document_count++;
    if (doc.doc_type === "tz") current.has_tz = true;
    if (doc.doc_type === "kp") {
      current.has_kp = true;
      if (current.kp_amount == null && typeof doc.amount === "number") current.kp_amount = doc.amount;
    }
    if (doc.doc_type === "contract") current.has_contract = true;
    if (doc.doc_type === "invoice") {
      current.has_invoice = true;
      if (current.invoice_amount == null && typeof doc.amount === "number") current.invoice_amount = doc.amount;
    }
    if (doc.doc_type === "payment") {
      current.has_payment = true;
      if (current.paid_amount == null && typeof doc.amount === "number") current.paid_amount = doc.amount;
    }
    byLead.set(leadId, current);
  }
  return byLead;
}

async function loadLeadDocuments(leadIds: string[]): Promise<Map<string, any>> {
  if (leadIds.length === 0) return new Map();
  const { data, error } = await sb
    .from("lead_documents")
    .select("lead_id, doc_type, amount")
    .in("lead_id", leadIds)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return summarizeDocuments(data ?? []);
}

async function loadLeadCommissions(leadIds: string[]): Promise<Map<string, any>> {
  const byLead = new Map<string, any>();
  if (leadIds.length === 0) return byLead;
  const { data, error } = await sb
    .from("deal_commissions")
    .select("*")
    .in("lead_id", leadIds);
  if (error) throw error;
  for (const row of (data ?? [])) byLead.set(row.lead_id, row);
  return byLead;
}

function latestDocUrl(docs: Array<any>, docType: string): string | null {
  return docs.find((doc) => doc.doc_type === docType && doc.file_url)?.file_url ?? null;
}

function leadCustomerName(lead: any): string {
  return lead?.company || lead?.name || "unknown";
}

function composeAccountantNotice(lead: any, docs: Array<any>): string {
  const kpUrl = latestDocUrl(docs, "kp");
  const contractUrl = latestDocUrl(docs, "contract");
  const amount = docs.find((doc) => (doc.doc_type === "kp" || doc.doc_type === "invoice") && typeof doc.amount === "number")?.amount;
  return [
    "Нужно выставить счет",
    `Lead ID: ${lead.lead_code ?? lead.id}`,
    `Заказчик: ${leadCustomerName(lead)}`,
    amount ? `Сумма: ${fmtRubMsg(amount)}` : null,
    lead.project_folder_url ? `Папка сделки: ${lead.project_folder_url}` : null,
    kpUrl ? `КП: ${kpUrl}` : null,
    contractUrl ? `Договор: ${contractUrl}` : null,
  ].filter(Boolean).join("\n");
}

Deno.serve(async (req) => {
  const cors = corsFor(req);
  const json = (body: any, status = 200) => jsonResponse(body, status, cors.headers);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: cors.allowed ? 204 : 403, headers: cors.headers });
  }
  if (!cors.allowed) return json({ error: "Origin not allowed" }, 403);
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  let body: any;
  try { body = await req.json(); }
  catch { return json({ error: "Invalid JSON" }, 400); }

  const action = body?.action;

  // ════════════════════════════════════════════════════════════════
  //   AUTH
  // ════════════════════════════════════════════════════════════════
  if (action === "login") {
    const pw = typeof body?.password === "string" ? body.password : "";
    if (!ADMIN_PASSWORD || !ADMIN_SESSION_SECRET || pw !== ADMIN_PASSWORD) {
      return json({ error: "Unauthorized" }, 401);
    }
    const session = await createAdminToken();
    return json({ ok: true, token: session.token, expires_at: session.exp });
  }

  const admin = await verifyAdminToken(req);
  if (!admin.ok) return json({ error: "Unauthorized" }, 401);

  if (action === "verify_session") {
    return json({ ok: true, expires_at: admin.exp });
  }

  // ════════════════════════════════════════════════════════════════
  //   CATALOG (perенесено из catalog-admin)
  // ════════════════════════════════════════════════════════════════
  if (action === "update_price") {
    const { category, key, label, unit, price, vendor, source } = body;
    if (!category || !key || !label || !unit || typeof price !== "number") {
      return json({ error: "Missing fields" }, 400);
    }
    const { data, error } = await sb.rpc("update_catalog_price", {
      p_category: category,
      p_key:      key,
      p_label:    label,
      p_unit:     unit,
      p_price:    price,
      p_vendor:   vendor ?? null,
      p_source:   source ?? "manual",
    });
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true, id: data });
  }

  if (action === "bulk_update") {
    const items = body.items as Array<any>;
    if (!Array.isArray(items)) return json({ error: "items must be array" }, 400);
    const results: any[] = [];
    for (const it of items) {
      const { data, error } = await sb.rpc("update_catalog_price", {
        p_category: it.category,
        p_key:      it.key,
        p_label:    it.label,
        p_unit:     it.unit,
        p_price:    it.price,
        p_vendor:   it.vendor ?? null,
        p_source:   it.source ?? "manual",
      });
      results.push({ key: it.key, ok: !error, error: error?.message });
    }
    return json({ ok: true, results });
  }

  if (action === "get_history") {
    const { category, key } = body;
    if (!category || !key) return json({ error: "Need category + key" }, 400);
    const { data, error } = await sb
      .from("catalog_items")
      .select("price, vendor, source, valid_from, valid_to, created_by")
      .eq("category", category)
      .eq("key", key)
      .order("valid_from", { ascending: false });
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true, history: data });
  }

  // ════════════════════════════════════════════════════════════════
  //   LEADS
  // ════════════════════════════════════════════════════════════════

  // list_leads — список с фильтрами и пагинацией
  if (action === "list_leads") {
    const limit = Math.min(Number(body.limit ?? 50), 200);
    const offset = Number(body.offset ?? 0);
    const status = body.status as string | undefined;
    const source = body.source as string | undefined;
    const sourceChannel = body.source_channel as string | undefined;
    const commission = body.commission as string | undefined;
    const paymentStatus = body.payment_status as string | undefined;
    const search = (body.search as string | undefined)?.trim();
    const dateFrom = body.dateFrom as string | undefined;
    const dateTo = body.dateTo as string | undefined;

    let q = sb.from("leads")
      .select(`
        id, created_at, source, source_channel, lead_code, external_source,
        external_source_url, created_by_system, status, deal_status,
        status_updated_at, kp_status, contract_status, invoice_status,
        payment_status, commission_eligible, commission_rate,
        commission_notes, project_folder_url, name, phone, email,
        client_type, object_type, company, message, estimate, utm_source,
        utm_medium, utm_campaign, landing_page
      `, { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status && ALLOWED_LEAD_STATUSES.has(status)) q = q.eq("deal_status", status);
    if (source) q = q.eq("source", source);
    if (sourceChannel && ALLOWED_SOURCE_CHANNELS.has(sourceChannel)) q = q.eq("source_channel", sourceChannel);
    if (commission === "yes") q = q.eq("commission_eligible", true);
    if (commission === "no") q = q.eq("commission_eligible", false);
    if (paymentStatus && ALLOWED_PAYMENT_STATUSES.has(paymentStatus)) q = q.eq("payment_status", paymentStatus);
    if (dateFrom) q = q.gte("created_at", dateFrom);
    if (dateTo) q = q.lte("created_at", dateTo);
    if (search) {
      const s = search.replace(/[%(),]/g, "");
      q = q.or(`lead_code.ilike.%${s}%,name.ilike.%${s}%,phone.ilike.%${s}%,email.ilike.%${s}%,company.ilike.%${s}%,external_source.ilike.%${s}%`);
    }

    const { data, error, count } = await q;
    if (error) return json({ error: error.message }, 500);

    try {
      const rows = data ?? [];
      const leadIds = rows.map((lead: any) => lead.id);
      const [documentsByLead, commissionsByLead] = await Promise.all([
        loadLeadDocuments(leadIds),
        loadLeadCommissions(leadIds),
      ]);
      const leads = rows.map((lead: any) => {
        const docSummary = documentsByLead.get(lead.id) ?? {
          document_count: 0,
          has_tz: false,
          has_kp: false,
          has_contract: false,
          has_invoice: false,
          has_payment: false,
          kp_amount: null,
          invoice_amount: null,
          paid_amount: null,
        };
        const commissionRow = commissionsByLead.get(lead.id) ?? null;
        return {
          ...lead,
          doc_summary: {
            ...docSummary,
            kp_amount: commissionRow?.kp_amount || docSummary.kp_amount,
            invoice_amount: commissionRow?.invoice_amount || docSummary.invoice_amount,
            paid_amount: commissionRow?.paid_amount || docSummary.paid_amount,
          },
          commission: commissionRow,
        };
      });
      return json({ ok: true, leads, total: count ?? 0 });
    } catch (e: any) {
      return json({ error: e.message }, 500);
    }
  }

  if (action === "list_leads_legacy") {
    const limit  = Math.min(Number(body.limit ?? 50), 200);
    const offset = Number(body.offset ?? 0);
    const status = body.status as string | undefined;        // 'new' | 'contacted' | ...
    const source = body.source as string | undefined;        // 'contact' | 'project' | ...
    const search = (body.search as string | undefined)?.trim();
    const dateFrom = body.dateFrom as string | undefined;    // ISO
    const dateTo   = body.dateTo   as string | undefined;    // ISO

    let q = sb.from("leads")
      .select("id, created_at, source, status, status_updated_at, name, phone, email, client_type, object_type, company, message, estimate, utm_source, utm_medium, utm_campaign, landing_page", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status && ALLOWED_LEAD_STATUSES.has(status)) q = q.eq("status", status);
    if (source)   q = q.eq("source", source);
    if (dateFrom) q = q.gte("created_at", dateFrom);
    if (dateTo)   q = q.lte("created_at", dateTo);
    if (search) {
      // Простой OR по нескольким полям
      const s = search.replace(/[%(),]/g, "");
      q = q.or(`name.ilike.%${s}%,phone.ilike.%${s}%,email.ilike.%${s}%,company.ilike.%${s}%`);
    }

    const { data, error, count } = await q;
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true, leads: data, total: count ?? 0 });
  }

  // get_lead — одна заявка с файлами
  if (action === "get_lead") {
    const { id } = body;
    if (!id) return json({ error: "Need id" }, 400);

    const { data: lead, error } = await sb
      .from("leads")
      .select("*")
      .eq("id", id)
      .single();
    if (error) return json({ error: error.message }, 500);

    const [documentsQ, commissionQ] = await Promise.all([
      sb.from("lead_documents")
        .select("*")
        .eq("lead_id", id)
        .order("created_at", { ascending: false }),
      sb.from("deal_commissions")
        .select("*")
        .eq("lead_id", id)
        .maybeSingle(),
    ]);
    if (documentsQ.error) return json({ error: documentsQ.error.message }, 500);
    if (commissionQ.error) return json({ error: commissionQ.error.message }, 500);

    const files = Array.isArray(lead?.files) ? lead.files : [];
    const fileLinks: Array<{ path: string; url: string | null }> = [];
    for (const f of files) {
      const path = extractStoragePath(f);
      if (!path) {
        fileLinks.push({ path: f, url: f });
        continue;
      }
      const { data: signed } = await sb.storage
        .from("lead-files")
        .createSignedUrl(path, 5 * 60);
      fileLinks.push({ path, url: signed?.signedUrl ?? null });
    }

    return json({
      ok: true,
      lead,
      files: fileLinks,
      documents: documentsQ.data ?? [],
      commission: commissionQ.data ?? null,
    });
  }

  if (action === "get_lead_legacy") {
    const { id } = body;
    if (!id) return json({ error: "Need id" }, 400);

    const { data: lead, error } = await sb
      .from("leads")
      .select("*")
      .eq("id", id)
      .single();
    if (error) return json({ error: error.message }, 500);

    // Сгенерировать свежие signed URLs для файлов (валидны 1 час)
    const files = Array.isArray(lead?.files) ? lead.files : [];
    const fileLinks: Array<{ path: string; url: string | null }> = [];
    for (const f of files) {
      // В files лежат либо path внутри bucket, либо уже signed URL.
      // Извлечём path: если это URL — берём то что после /lead-files/
      const path = extractStoragePath(f);
      if (!path) {
        fileLinks.push({ path: f, url: f });
        continue;
      }
      // 5 минут — админ просмотр в активной сессии. Длинный TTL значит,
      // что случайно расшаренная/скриншотнутая ссылка остаётся читабельной
      // вне сессии. Если нужно скачать после паузы — повторно жмём «обновить».
      const { data: signed } = await sb.storage
        .from("lead-files")
        .createSignedUrl(path, 5 * 60);
      fileLinks.push({ path, url: signed?.signedUrl ?? null });
    }

    return json({ ok: true, lead, files: fileLinks });
  }

  // update_lead_status
  if (action === "update_lead_status") {
    const { id, status } = body;
    if (!id) return json({ error: "Need id" }, 400);
    if (!ALLOWED_LEAD_STATUSES.has(status)) {
      return json({ error: "Bad status" }, 400);
    }
    const { error } = await sb.from("leads").update(pipelinePatchForStatus(status)).eq("id", id);
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true });
  }

  if (action === "update_lead_status_legacy") {
    const { id, status } = body;
    if (!id) return json({ error: "Need id" }, 400);
    if (!ALLOWED_LEAD_STATUSES.has(status)) {
      return json({ error: "Bad status" }, 400);
    }
    const { error } = await sb.from("leads").update({ status }).eq("id", id);
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true });
  }

  // update_lead_notes
  if (action === "update_lead_notes") {
    const { id, notes } = body;
    if (!id) return json({ error: "Need id" }, 400);
    if (typeof notes !== "string") return json({ error: "notes must be string" }, 400);
    const { error } = await sb.from("leads").update({ notes }).eq("id", id);
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true });
  }

  // ════════════════════════════════════════════════════════════════
  if (action === "update_lead_deal_fields") {
    const { id } = body;
    if (!id) return json({ error: "Need id" }, 400);

    const patch: Record<string, unknown> = {};
    if (body.source_channel !== undefined) {
      if (!ALLOWED_SOURCE_CHANNELS.has(body.source_channel)) return json({ error: "Bad source_channel" }, 400);
      patch.source_channel = body.source_channel;
    }
    if (body.external_source !== undefined) patch.external_source = nullableString(body.external_source);
    if (body.external_source_url !== undefined) {
      const url = nullableString(body.external_source_url);
      if (!isHttpUrl(url)) return json({ error: "external_source_url must be http(s)" }, 400);
      patch.external_source_url = url;
    }
    if (body.created_by_system !== undefined) patch.created_by_system = nullableString(body.created_by_system);
    if (body.project_folder_url !== undefined) {
      const url = nullableString(body.project_folder_url);
      if (!isHttpUrl(url)) return json({ error: "project_folder_url must be http(s)" }, 400);
      patch.project_folder_url = url;
    }
    if (body.kp_status !== undefined) {
      if (!ALLOWED_KP_STATUSES.has(body.kp_status)) return json({ error: "Bad kp_status" }, 400);
      patch.kp_status = body.kp_status;
    }
    if (body.contract_status !== undefined) {
      if (!ALLOWED_CONTRACT_STATUSES.has(body.contract_status)) return json({ error: "Bad contract_status" }, 400);
      patch.contract_status = body.contract_status;
    }
    if (body.invoice_status !== undefined) {
      if (!ALLOWED_INVOICE_STATUSES.has(body.invoice_status)) return json({ error: "Bad invoice_status" }, 400);
      patch.invoice_status = body.invoice_status;
    }
    if (body.payment_status !== undefined) {
      if (!ALLOWED_PAYMENT_STATUSES.has(body.payment_status)) return json({ error: "Bad payment_status" }, 400);
      patch.payment_status = body.payment_status;
    }
    if (body.commission_eligible !== undefined) patch.commission_eligible = body.commission_eligible === true;
    if (body.commission_rate !== undefined) {
      const rate = optionalNumber(body.commission_rate);
      if (rate == null || rate < 0 || rate > 1) return json({ error: "Bad commission_rate" }, 400);
      patch.commission_rate = rate;
    }
    if (body.commission_notes !== undefined) patch.commission_notes = nullableString(body.commission_notes);

    if (Object.keys(patch).length === 0) return json({ error: "No fields to update" }, 400);
    if (patch.source_channel === "tender" && patch.commission_eligible === true && patch.commission_rate === undefined) {
      patch.commission_rate = 0.0500;
    }

    const { data, error } = await sb.from("leads").update(patch).eq("id", id).select("*").single();
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true, lead: data });
  }

  if (action === "add_lead_document") {
    const leadId = body.lead_id as string | undefined;
    const docType = body.doc_type as string | undefined;
    const title = nullableString(body.title);
    const fileUrl = nullableString(body.file_url);
    const amount = optionalNumber(body.amount);
    if (!leadId) return json({ error: "Need lead_id" }, 400);
    if (!docType || !ALLOWED_DOC_TYPES.has(docType)) return json({ error: "Bad doc_type" }, 400);
    if (!title) return json({ error: "Need title" }, 400);
    if (!isHttpUrl(fileUrl)) return json({ error: "file_url must be http(s)" }, 400);

    const leadR = await sb
      .from("leads")
      .select("id, lead_code, source_channel, commission_eligible, commission_rate")
      .eq("id", leadId)
      .single();
    if (leadR.error || !leadR.data) return json({ error: leadR.error?.message ?? "Lead not found" }, 404);

    const row = {
      lead_id: leadId,
      lead_code: leadR.data.lead_code,
      doc_type: docType,
      title,
      file_url: fileUrl,
      storage_provider: body.storage_provider ?? "google_drive",
      storage_path: nullableString(body.storage_path),
      amount,
      currency: "RUB",
      uploaded_by: nullableString(body.uploaded_by),
      notes: nullableString(body.notes),
    };
    const { data, error } = await sb.from("lead_documents").insert(row).select("*").single();
    if (error) return json({ error: error.message }, 500);

    const patch = documentPatchForType(docType);
    if (Object.keys(patch).length > 0) {
      await sb.from("leads").update(patch).eq("id", leadId);
    }

    if (leadR.data.source_channel === "tender" && leadR.data.commission_eligible && amount != null) {
      const commissionPatch: Record<string, unknown> = {
        lead_id: leadId,
        lead_code: leadR.data.lead_code,
        commission_rate: leadR.data.commission_rate || 0.0500,
      };
      if (docType === "kp") commissionPatch.kp_amount = amount;
      if (docType === "invoice") commissionPatch.invoice_amount = amount;
      if (docType === "payment") {
        commissionPatch.paid_amount = amount;
        commissionPatch.payment_status = "partial";
      }
      if (Object.keys(commissionPatch).length > 3) {
        await sb.from("deal_commissions").upsert(commissionPatch, { onConflict: "lead_id" });
      }
    }

    return json({ ok: true, document: data });
  }

  // ──────── Загрузка файлов в Supabase Storage ─────────

  // Шаг 1: браузер просит signed upload URL под конкретный (lead_id, doc_type, filename)
  if (action === "create_lead_upload_url") {
    const leadId = body.lead_id as string | undefined;
    const docType = body.doc_type as string | undefined;
    const filename = body.filename as string | undefined;
    if (!leadId) return json({ error: "Need lead_id" }, 400);
    if (!docType || !ALLOWED_DOC_TYPES.has(docType)) return json({ error: "Bad doc_type" }, 400);
    if (!filename) return json({ error: "Need filename" }, 400);

    const leadR = await sb.from("leads").select("lead_code").eq("id", leadId).single();
    if (leadR.error || !leadR.data) return json({ error: leadR.error?.message ?? "Lead not found" }, 404);

    const folder = FOLDER_BY_DOC_TYPE[docType] ?? "99_Other";
    const codeOrId = leadR.data.lead_code ?? leadId;
    const path = `${codeOrId}/${folder}/${Date.now()}_${safeFilename(filename)}`;
    const { data, error } = await sb.storage.from("lead-documents").createSignedUploadUrl(path);
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true, upload_url: data.signedUrl, token: data.token, storage_path: path });
  }

  // Шаг 2: после успешной заливки браузер шлёт метаданные, пишем lead_documents
  // + автопродвижение статуса по типу документа
  if (action === "confirm_lead_upload") {
    const leadId = body.lead_id as string | undefined;
    const docType = body.doc_type as string | undefined;
    const title = nullableString(body.title);
    const storagePath = nullableString(body.storage_path);
    const fileSize = optionalNumber(body.file_size_bytes);
    const fileMime = nullableString(body.file_mime);
    const originalFilename = nullableString(body.original_filename);
    const amount = optionalNumber(body.amount);
    if (!leadId) return json({ error: "Need lead_id" }, 400);
    if (!docType || !ALLOWED_DOC_TYPES.has(docType)) return json({ error: "Bad doc_type" }, 400);
    if (!title) return json({ error: "Need title" }, 400);
    if (!storagePath) return json({ error: "Need storage_path" }, 400);

    const leadR = await sb
      .from("leads")
      .select("id, lead_code, source_channel, commission_eligible, commission_rate")
      .eq("id", leadId)
      .single();
    if (leadR.error || !leadR.data) return json({ error: leadR.error?.message ?? "Lead not found" }, 404);

    const { data: doc, error } = await sb.from("lead_documents").insert({
      lead_id: leadId,
      lead_code: leadR.data.lead_code,
      doc_type: docType,
      title,
      storage_provider: "supabase",
      storage_bucket: "lead-documents",
      storage_path: storagePath,
      file_size_bytes: fileSize,
      file_mime: fileMime,
      original_filename: originalFilename,
      amount,
      currency: "RUB",
      uploaded_by: nullableString(body.uploaded_by) ?? "admin",
    }).select("*").single();
    if (error) return json({ error: error.message }, 500);

    const patch = documentPatchForType(docType);
    if (Object.keys(patch).length > 0) {
      await sb.from("leads").update(patch).eq("id", leadId);
    }

    if (leadR.data.source_channel === "tender" && leadR.data.commission_eligible && amount != null) {
      const commissionPatch: Record<string, unknown> = {
        lead_id: leadId,
        lead_code: leadR.data.lead_code,
        commission_rate: leadR.data.commission_rate || 0.0500,
      };
      if (docType === "kp") commissionPatch.kp_amount = amount;
      if (docType === "invoice") commissionPatch.invoice_amount = amount;
      if (docType === "payment") {
        commissionPatch.paid_amount = amount;
        commissionPatch.payment_status = "partial";
      }
      if (Object.keys(commissionPatch).length > 3) {
        await sb.from("deal_commissions").upsert(commissionPatch, { onConflict: "lead_id" });
      }
    }

    return json({ ok: true, document: doc });
  }

  // Свежий signed download URL (живёт час)
  if (action === "get_lead_document_signed_url") {
    const docId = body.document_id as string | undefined;
    if (!docId) return json({ error: "Need document_id" }, 400);
    const docR = await sb.from("lead_documents").select("storage_bucket, storage_path").eq("id", docId).single();
    if (docR.error || !docR.data) return json({ error: docR.error?.message ?? "Document not found" }, 404);
    if (!docR.data.storage_bucket || !docR.data.storage_path) {
      return json({ error: "Document is stored externally (no Supabase path)" }, 400);
    }
    const { data, error } = await sb.storage.from(docR.data.storage_bucket).createSignedUrl(docR.data.storage_path, 3600);
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true, url: data.signedUrl });
  }

  // Удалить документ — и файл, и запись
  if (action === "delete_lead_document") {
    const docId = body.document_id as string | undefined;
    if (!docId) return json({ error: "Need document_id" }, 400);
    const docR = await sb.from("lead_documents").select("storage_bucket, storage_path").eq("id", docId).single();
    if (docR.error || !docR.data) return json({ error: docR.error?.message ?? "Document not found" }, 404);
    if (docR.data.storage_bucket && docR.data.storage_path) {
      await sb.storage.from(docR.data.storage_bucket).remove([docR.data.storage_path]);
    }
    const { error } = await sb.from("lead_documents").delete().eq("id", docId);
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true });
  }

  if (action === "update_deal_commission") {
    const leadId = body.lead_id as string | undefined;
    if (!leadId) return json({ error: "Need lead_id" }, 400);
    const leadR = await sb
      .from("leads")
      .select("id, lead_code, source_channel, commission_eligible")
      .eq("id", leadId)
      .single();
    if (leadR.error || !leadR.data) return json({ error: leadR.error?.message ?? "Lead not found" }, 404);
    if (leadR.data.source_channel !== "tender" || !leadR.data.commission_eligible) {
      return json({ error: "Commission is available only for eligible tender leads" }, 400);
    }

    const rate = optionalNumber(body.commission_rate);
    const kpAmount = optionalNumber(body.kp_amount);
    const invoiceAmount = optionalNumber(body.invoice_amount);
    const paidAmount = optionalNumber(body.paid_amount);
    const commissionPaid = optionalNumber(body.commission_paid);
    const paymentStatus = body.payment_status as string | undefined;
    if (rate == null || rate < 0 || rate > 1) return json({ error: "Bad commission_rate" }, 400);
    if (kpAmount == null || invoiceAmount == null || paidAmount == null || commissionPaid == null) {
      return json({ error: "Amounts must be numbers" }, 400);
    }
    if (!paymentStatus || !ALLOWED_PAYMENT_STATUSES.has(paymentStatus)) return json({ error: "Bad payment_status" }, 400);

    const { data, error } = await sb.from("deal_commissions").upsert({
      lead_id: leadId,
      lead_code: leadR.data.lead_code,
      commission_rate: rate,
      kp_amount: kpAmount,
      invoice_amount: invoiceAmount,
      paid_amount: paidAmount,
      commission_paid: commissionPaid,
      payment_status: paymentStatus,
      notes: nullableString(body.notes),
    }, { onConflict: "lead_id" }).select("*").single();
    if (error) return json({ error: error.message }, 500);

    await sb.from("leads").update({
      commission_rate: rate,
      payment_status: paymentStatus,
    }).eq("id", leadId);
    return json({ ok: true, commission: data });
  }

  if (action === "send_to_accountant") {
    const { id } = body;
    if (!id) return json({ error: "Need id" }, 400);
    const leadR = await sb.from("leads").select("*").eq("id", id).single();
    if (leadR.error || !leadR.data) return json({ error: leadR.error?.message ?? "Lead not found" }, 404);
    const docsR = await sb.from("lead_documents").select("*").eq("lead_id", id).order("created_at", { ascending: false });
    if (docsR.error) return json({ error: docsR.error.message }, 500);

    const notice = composeAccountantNotice(leadR.data, docsR.data ?? []);
    let delivery = "manual";
    let deliveryError: string | null = null;
    if (ACCOUNTANT_EMAIL && RESEND_API_KEY) {
      const result = await sendEmail(ACCOUNTANT_EMAIL, "Нужно выставить счет - AZIMER", notice);
      delivery = result.ok ? "email" : "manual";
      deliveryError = result.error;
    } else if (ACCOUNTANT_PHONE && SMSC_LOGIN && SMSC_PSW) {
      const phone = normalizePhone(ACCOUNTANT_PHONE);
      if (phone) {
        const result = await sendSms(phone, notice);
        delivery = result.ok ? "sms" : "manual";
        deliveryError = result.error;
      }
    }

    const { error } = await sb.from("leads").update(pipelinePatchForStatus("sent_to_accountant")).eq("id", id);
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true, delivery, delivery_error: deliveryError, notification_text: notice });
  }

  //   DASHBOARD
  // ════════════════════════════════════════════════════════════════

  if (action === "dashboard_stats") {
    // Параллельно: counts by period, by status, by source, avg ticket, recent 10
    const now = new Date();
    const startToday = new Date(now); startToday.setHours(0, 0, 0, 0);
    const startWeek  = new Date(startToday); startWeek.setDate(startWeek.getDate() - 6);   // последние 7 дней включая сегодня
    const startMonth = new Date(startToday); startMonth.setDate(startMonth.getDate() - 29);

    const [todayQ, weekQ, monthQ, totalQ, byStatusQ, bySourceQ, recentQ, allEstQ] = await Promise.all([
      sb.from("leads").select("id", { count: "exact", head: true }).gte("created_at", startToday.toISOString()),
      sb.from("leads").select("id", { count: "exact", head: true }).gte("created_at", startWeek.toISOString()),
      sb.from("leads").select("id", { count: "exact", head: true }).gte("created_at", startMonth.toISOString()),
      sb.from("leads").select("id", { count: "exact", head: true }),
      sb.from("leads").select("status"),
      sb.from("leads").select("utm_source, source"),
      sb.from("leads").select("id, created_at, source, status, name, phone, estimate").order("created_at", { ascending: false }).limit(10),
      sb.from("leads").select("estimate"),
    ]);

    // Группировка статусов
    const byStatus: Record<string, number> = {};
    for (const r of (byStatusQ.data ?? [])) {
      byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
    }

    // Группировка источников (utm_source если есть, иначе lead.source)
    const bySource: Record<string, number> = {};
    for (const r of (bySourceQ.data ?? [])) {
      const key = (r.utm_source && String(r.utm_source).trim()) || `direct:${r.source}`;
      bySource[key] = (bySource[key] ?? 0) + 1;
    }
    const topSources = Object.entries(bySource)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([source, count]) => ({ source, count }));

    // Средний чек по выданным КП — среднее (low+high)/2 для лидов со status='kp_sent'/'won'
    let avgTicket = 0;
    let avgTicketCount = 0;
    for (const r of (allEstQ.data ?? [])) {
      const e = r.estimate as any;
      if (e && typeof e.low === "number" && typeof e.high === "number") {
        avgTicket += (e.low + e.high) / 2;
        avgTicketCount++;
      }
    }
    if (avgTicketCount > 0) avgTicket = Math.round(avgTicket / avgTicketCount);

    return json({
      ok: true,
      stats: {
        today:  todayQ.count ?? 0,
        week:   weekQ.count  ?? 0,
        month:  monthQ.count ?? 0,
        total:  totalQ.count ?? 0,
        byStatus,
        topSources,
        avgTicket,
        avgTicketCount,
        recent: recentQ.data ?? [],
      },
    });
  }

  // ════════════════════════════════════════════════════════════════
  //   MESSAGE TEMPLATES (SMS/Email) — CRUD
  // ════════════════════════════════════════════════════════════════

  if (action === "list_templates") {
    const channel = body.channel as string | undefined;
    let q = sb.from("message_templates")
      .select("id, channel, slug, name, subject, body, is_active, sort_order, updated_at")
      .order("sort_order", { ascending: true });
    if (channel) q = q.eq("channel", channel);
    if (body.only_active !== false) q = q.eq("is_active", true);
    const { data, error } = await q;
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true, templates: data });
  }

  if (action === "save_template") {
    const { id, channel, slug, name, subject, body: tplBody, is_active, sort_order } = body;
    if (!channel || !slug || !name || !tplBody) return json({ error: "Need channel, slug, name, body" }, 400);
    if (channel !== "sms" && channel !== "email") return json({ error: "channel must be sms or email" }, 400);
    const row = {
      channel, slug, name,
      subject: subject ?? null,
      body: tplBody,
      is_active: is_active !== false,
      sort_order: sort_order ?? 0,
    };
    if (id) {
      const { error } = await sb.from("message_templates").update(row).eq("id", id);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true, id });
    } else {
      const { data, error } = await sb.from("message_templates").insert(row).select("id").single();
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true, id: data.id });
    }
  }

  if (action === "delete_template") {
    const { id } = body;
    if (!id) return json({ error: "Need id" }, 400);
    // soft delete
    const { error } = await sb.from("message_templates").update({ is_active: false }).eq("id", id);
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true });
  }

  // ════════════════════════════════════════════════════════════════
  //   SEND SMS / EMAIL + история отправок
  // ════════════════════════════════════════════════════════════════

  if (action === "send_sms" || action === "send_email") {
    const channel: "sms" | "email" = action === "send_sms" ? "sms" : "email";
    const { lead_id, template_id, template_slug, custom_body, custom_subject } = body;
    if (!lead_id) return json({ error: "Need lead_id" }, 400);

    // 1. Получить lead
    const { data: lead, error: leadErr } = await sb
      .from("leads").select("*").eq("id", lead_id).single();
    if (leadErr || !lead) return json({ error: leadErr?.message ?? "Lead not found" }, 404);

    // 2. Определить тело и subject
    let tpl: any = null;
    if (template_id) {
      const r = await sb.from("message_templates").select("*").eq("id", template_id).single();
      tpl = r.data;
    } else if (template_slug) {
      const r = await sb.from("message_templates").select("*").eq("slug", template_slug).single();
      tpl = r.data;
    }

    const rawBody = custom_body ?? tpl?.body;
    const rawSubject = custom_subject ?? tpl?.subject;
    if (!rawBody) return json({ error: "Need template or custom_body" }, 400);

    // 3. Рендер плейсхолдеров
    const bodyRendered = renderPlaceholders(rawBody, lead);
    const subjectRendered = rawSubject ? renderPlaceholders(rawSubject, lead) : null;

    // 4. Recipient
    const recipient = channel === "sms" ? normalizePhone(lead.phone) : lead.email;
    if (!recipient) {
      return json({ error: `Lead has no ${channel === "sms" ? "phone" : "email"}` }, 400);
    }

    // 5. Создать запись pending
    const { data: msgRow, error: msgErr } = await sb.from("lead_messages").insert({
      lead_id,
      channel,
      template_id: tpl?.id ?? null,
      template_slug: tpl?.slug ?? null,
      recipient,
      subject: subjectRendered,
      body_rendered: bodyRendered,
      status: "pending",
    }).select("id").single();
    if (msgErr) return json({ error: msgErr.message }, 500);
    const msgId = msgRow.id;

    // 6. Отправка
    let status: "sent" | "failed" = "sent";
    let providerResp: any = null;
    let errorMsg: string | null = null;

    if (channel === "sms") {
      const result = await sendSms(recipient, bodyRendered);
      providerResp = result.response;
      if (!result.ok) { status = "failed"; errorMsg = result.error; }
    } else {
      const result = await sendEmail(recipient, subjectRendered ?? "АЗИМЕР", bodyRendered);
      providerResp = result.response;
      if (!result.ok) { status = "failed"; errorMsg = result.error; }
    }

    // 7. Обновить запись результатом
    await sb.from("lead_messages").update({
      status,
      provider_resp: providerResp,
      error_message: errorMsg,
    }).eq("id", msgId);

    return json({
      ok: status === "sent",
      message_id: msgId,
      status,
      error: errorMsg,
      preview: { recipient, subject: subjectRendered, body: bodyRendered.slice(0, 200) },
    });
  }

  if (action === "get_message_context") {
    // Возвращает значения env которые используются в плейсхолдерах шаблонов —
    // для корректного превью в UI (чтобы превью совпадало с реальной отправкой).
    return json({
      ok: true,
      context: {
        manager_phone: MANAGER_PHONE,
        manager_name: MANAGER_NAME,
        azimer_site: SITE_URL,
      },
    });
  }

  if (action === "list_lead_messages") {
    const { lead_id } = body;
    if (!lead_id) return json({ error: "Need lead_id" }, 400);
    const { data, error } = await sb.from("lead_messages")
      .select("id, channel, template_slug, recipient, subject, body_rendered, status, error_message, sent_at")
      .eq("lead_id", lead_id)
      .order("sent_at", { ascending: false });
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true, messages: data });
  }

  // ════════════════════════════════════════════════════════════════
  //   REBUILD — триггер GitLab pipeline для пересборки сайта
  //   (используется когда менеджер изменил цены в каталоге и хочет
  //    выкатить новый snapshot без программиста)
  // ════════════════════════════════════════════════════════════════
  if (action === "trigger_rebuild") {
    const triggerToken = Deno.env.get("GITLAB_TRIGGER_TOKEN") ?? "";
    const projectId    = Deno.env.get("GITLAB_PROJECT_ID")    ?? "";
    const ref          = (body.ref as string | undefined) ?? "main";
    // body.reason пока не передаём в GitLab — trigger token без явной настройки
    // "Allow trigger variables" получает 400 на любую кастомную переменную.
    // Reason достаточно логировать здесь.
    console.log(`[trigger_rebuild] reason=${body.reason ?? "unspecified"}`);

    if (!triggerToken || !projectId) {
      return json({
        error: "GITLAB_TRIGGER_TOKEN или GITLAB_PROJECT_ID не настроены в Secrets",
      }, 500);
    }

    const triggerUrl = `https://gitlab.com/api/v4/projects/${projectId}/trigger/pipeline`;
    const form = new FormData();
    form.append("token", triggerToken);
    form.append("ref", ref);

    const r = await fetch(triggerUrl, { method: "POST", body: form });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      return json({
        error: `GitLab trigger failed: ${r.status} ${r.statusText}`,
        details: data,
      }, 502);
    }
    return json({
      ok: true,
      pipeline: {
        id:        data.id,
        status:    data.status,
        web_url:   data.web_url,
        ref:       data.ref,
        created_at: data.created_at,
      },
    });
  }

  return json({ error: "Unknown action: " + action }, 400);
});

// ════════════════════════════════════════════════════════════════
//   УТИЛИТЫ ДЛЯ ОТПРАВКИ СООБЩЕНИЙ
// ════════════════════════════════════════════════════════════════

const MANAGER_PHONE = Deno.env.get("MANAGER_PHONE") ?? "+7 (391) 000-00-00";
const MANAGER_NAME  = Deno.env.get("MANAGER_NAME")  ?? "Менеджер АЗИМЕР";
const ACCOUNTANT_EMAIL = Deno.env.get("ACCOUNTANT_EMAIL") ?? "";
const ACCOUNTANT_PHONE = Deno.env.get("ACCOUNTANT_PHONE") ?? "";
const SMSC_LOGIN    = Deno.env.get("SMSC_LOGIN")    ?? "";
const SMSC_PSW      = Deno.env.get("SMSC_PSW")      ?? "";
const SMSC_SENDER   = Deno.env.get("SMSC_SENDER")   ?? "SMSC.RU";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const EMAIL_FROM = Deno.env.get("EMAIL_FROM") ?? "АЗИМЕР <onboarding@resend.dev>";

const REGION_LABELS_MSG: Record<string, string> = {
  krsk_city: "Красноярск + пригороды",
  krsk_south: "Юг края / Хакасия",
  krsk_kansk: "Канск / Ачинск",
  krsk_north_pre: "Лесосибирск / Енисейск",
  krsk_priangar: "Богучаны / Кодинск",
  krsk_evenkia: "Эвенкия (мерзлота)",
  krsk_taymyr: "Таймыр / Норильск",
  tuva: "Тува",
  kemerovo: "Кемеровская область",
  irkutsk: "Иркутская область",
  altai: "Алтай",
  other: "Другое направление",
};
const OBJECT_LABELS_MSG: Record<string, string> = {
  sklad: "Склад",
  angar: "Ангар",
  production: "Производственное здание",
  commercial: "Коммерческое здание",
  naves: "Навес",
  modular: "Модульное здание",
  residential: "Жилой модуль",
  tent_arched: "Арочный тент-каркас",
};

function fmtRubMsg(n: number | null | undefined): string {
  if (typeof n !== "number") return "—";
  return new Intl.NumberFormat("ru-RU").format(Math.round(n)) + " ₽";
}

function buildKpUrlForLead(lead: any): string {
  const est = lead?.estimate;
  if (!est) return SITE_URL + "/kp/";
  try {
    const input = est.input ?? estimateStateToInput(est.state ?? {}, lead);
    const payload = {
      input,
      client: { name: lead?.name, phone: lead?.phone },
      leadId: lead?.id,
      catalogVersion: lead?.catalog_version ?? est.catalogVersion ?? null,
      issuedAt: lead?.created_at ?? new Date().toISOString(),
      mode: "current-recalc",
    };
    const json = JSON.stringify(payload);
    const b64 = btoa(unescape(encodeURIComponent(json)));
    return `${SITE_URL}/kp/#data=${b64}`;
  } catch {
    return SITE_URL + "/kp/";
  }
}

function estimateStateToInput(state: any, lead: any): any {
  const cladding = mapKpCladding(state.cladding);
  const roofing = mapKpRoofing(state.roofing, cladding);
  const claddingThk = state.claddingThk ?? state.cladding_thk ?? 150;
  const options = state.options ?? {};
  return {
    region: state.region ?? "krsk_city",
    objectType: state.objectType ?? state.object_type ?? lead?.object_type ?? "sklad",
    length: Number(state.length ?? 0),
    width: Number(state.width ?? 0),
    height: Number(state.height ?? 0),
    frame: state.frame === "lstk" || state.frame === "modular" ? state.frame : "metal",
    cladding,
    claddingThk: cladding.startsWith("sandwich") ? claddingThk : undefined,
    roofing,
    roofingThk: roofing.startsWith("sandwich") ? claddingThk : undefined,
    foundation: mapKpFoundation(state.foundation),
    gates: Number(options.gate ?? 0) > 0 ? [{ size: "4x4", count: Number(options.gate) }] : [],
    windows: Number(options.window ?? 0) > 0 ? [{ size: "1500x2000", count: Number(options.window) }] : [],
    doors: { count: Number(options.door ?? 0) },
  };
}

function mapKpCladding(value: string | undefined): string {
  if (value === "sandwich_minvata" || value === "sandwich_pir" || value === "proflist") return value;
  return "none";
}

function mapKpRoofing(value: string | undefined, cladding: string): string {
  if (value === "sandwich") return cladding === "sandwich_pir" ? "sandwich_pir" : "sandwich_minvata";
  if (value === "sandwich_minvata" || value === "sandwich_pir") return value;
  return "proflist";
}

function mapKpFoundation(value: string | undefined): string {
  if (value === "pile" || value === "pile_screw") return "pile_screw";
  if (value === "strip") return "strip";
  if (value === "slab" || value === "slab_200") return "slab_200";
  if (value === "slab_300" || value === "pile_grillage") return value;
  return "none";
}

function renderPlaceholders(body: string, lead: any): string {
  const est = lead?.estimate ?? {};
  const state = est?.state ?? {};
  const today = new Date();
  const dd = String(today.getDate()).padStart(2, "0");
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const yyyy = today.getFullYear();

  const map: Record<string, string> = {
    client_name: (lead.name ?? "клиент").split(" ")[0] || "клиент",
    name: lead.name ?? "",
    phone: lead.phone ?? "",
    email: lead.email ?? "",
    object_type: OBJECT_LABELS_MSG[state.objectType ?? state.object_type ?? lead.object_type] ?? (lead.object_type ?? "—"),
    region: REGION_LABELS_MSG[state.region ?? ""] ?? "Красноярский край",
    kp_url: buildKpUrlForLead(lead),
    kp_total: fmtRubMsg(est.base ?? est.totals?.final),
    kp_range: (typeof est.low === "number" && typeof est.high === "number")
      ? `${fmtRubMsg(est.low)} — ${fmtRubMsg(est.high)}`
      : "—",
    manager_phone: MANAGER_PHONE,
    manager_name: MANAGER_NAME,
    date: `${dd}.${mm}.${yyyy}`,
    azimer_site: SITE_URL,
  };

  return body.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    if (key in map) return map[key];
    return `{{${key}}}`; // оставляем как есть, видно что не сматчилось
  });
}

function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let digits = raw.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("8")) digits = "7" + digits.slice(1);
  if (digits.length === 10) digits = "7" + digits;
  if (digits.length === 11 && digits.startsWith("7")) return digits;
  return null;
}

async function sendSms(phone: string, text: string): Promise<{ ok: boolean; response: any; error: string | null }> {
  if (!SMSC_LOGIN || !SMSC_PSW) {
    return { ok: false, response: null, error: "SMSC credentials missing in Supabase Secrets" };
  }
  const params = new URLSearchParams({
    login: SMSC_LOGIN, psw: SMSC_PSW, phones: phone, mes: text,
    sender: SMSC_SENDER, charset: "utf-8", fmt: "3",
  });
  try {
    const r = await fetch(`https://smsc.ru/sys/send.php?${params}`);
    const data = await r.json().catch(() => null);
    // smsc.ru fmt=3 при успехе возвращает { id, cnt }; при ошибке { error, error_code }
    if (data && data.error) {
      return { ok: false, response: data, error: `smsc.ru: ${data.error}` };
    }
    return { ok: true, response: data, error: null };
  } catch (e: any) {
    return { ok: false, response: null, error: e.message };
  }
}

async function sendEmail(to: string, subject: string, body: string): Promise<{ ok: boolean; response: any; error: string | null }> {
  if (!RESEND_API_KEY) {
    return { ok: false, response: null, error: "RESEND_API_KEY not configured. Sign up at resend.com, verify azimer.ru domain, set Supabase secret." };
  }
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: [to],
        subject,
        text: body,
      }),
    });
    const data = await r.json().catch(() => null);
    if (!r.ok) {
      return { ok: false, response: data, error: `Resend ${r.status}: ${data?.message ?? r.statusText}` };
    }
    return { ok: true, response: data, error: null };
  } catch (e: any) {
    return { ok: false, response: null, error: e.message };
  }
}

// Если в files лежит URL — вытащим path внутри bucket lead-files; иначе вернём как есть.
function extractStoragePath(s: string): string | null {
  if (!s) return null;
  // Уже path
  if (!s.startsWith("http")) return s;
  // URL: ищем /lead-files/<path>?token=...
  const m = s.match(/\/lead-files\/([^?]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}
