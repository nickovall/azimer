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

const ALLOWED_LEAD_STATUSES = new Set(["new", "contacted", "kp_sent", "won", "lost"]);

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
