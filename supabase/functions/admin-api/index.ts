// АЗИМЕР — единая Edge Function для админ-операций (каталог + заявки + дашборд)
// Заменяет старую catalog-admin. После деплоя catalog-admin можно удалить.
//
// Деплой: Supabase Dashboard → Edge Functions → Deploy new function → имя admin-api
// Verify JWT: отключить (используем свой пароль)
// Env: ADMIN_PASSWORD

// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL    = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY     = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ADMIN_PASSWORD  = Deno.env.get("ADMIN_PASSWORD") ?? "";

const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  // x-admin-password больше не используется — пароль теперь в body как __pw,
  // потому что Supabase Gateway не пропускает custom headers через preflight.
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey",
};

const ALLOWED_LEAD_STATUSES = new Set(["new", "contacted", "kp_sent", "won", "lost"]);

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST")    return json({ error: "POST only" }, 405);

  let body: any;
  try { body = await req.json(); }
  catch { return json({ error: "Invalid JSON" }, 400); }

  // ─── Auth: пароль в body (__pw) ───
  const pw = typeof body?.__pw === "string" ? body.__pw : "";
  if (!ADMIN_PASSWORD || pw !== ADMIN_PASSWORD) {
    return json({ error: "Forbidden" }, 403);
  }

  const action = body?.action;

  // ════════════════════════════════════════════════════════════════
  //   AUTH
  // ════════════════════════════════════════════════════════════════
  if (action === "verify_password") {
    return json({ ok: true });
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
      const { data: signed } = await sb.storage
        .from("lead-files")
        .createSignedUrl(path, 60 * 60); // 1h
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

  return json({ error: "Unknown action: " + action }, 400);
});

// Если в files лежит URL — вытащим path внутри bucket lead-files; иначе вернём как есть.
function extractStoragePath(s: string): string | null {
  if (!s) return null;
  // Уже path
  if (!s.startsWith("http")) return s;
  // URL: ищем /lead-files/<path>?token=...
  const m = s.match(/\/lead-files\/([^?]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}
