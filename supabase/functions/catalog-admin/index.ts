// АЗИМЕР — Edge Function для административных операций над каталогом цен
// Защищена общим паролем (env: ADMIN_PASSWORD)
// Деплой: через Supabase Dashboard → Edge Functions → Deploy a new function → имя catalog-admin
// Verify JWT: отключить (мы используем свой пароль)
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
  "Access-Control-Allow-Headers": "Content-Type, x-admin-password",
};

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST")   return json({ error: "POST only" }, 405);

  // Проверка пароля
  const pw = req.headers.get("x-admin-password") ?? "";
  if (!ADMIN_PASSWORD || pw !== ADMIN_PASSWORD) {
    return json({ error: "Forbidden" }, 403);
  }

  let body: any;
  try { body = await req.json(); }
  catch { return json({ error: "Invalid JSON" }, 400); }

  const action = body?.action;

  // ───────── ACTION: update_price ─────────
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

  // ───────── ACTION: bulk_update — массовое обновление ─────────
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

  // ───────── ACTION: get_history — получить историю цен ─────────
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

  // ───────── ACTION: verify_password ─────────
  if (action === "verify_password") {
    return json({ ok: true });
  }

  return json({ error: "Unknown action" }, 400);
});
