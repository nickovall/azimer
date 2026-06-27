// АЗИМЕР — публичный приём заявок с проверкой Cloudflare Turnstile.
// Боты отсекаются на входе: без валидного turnstile-токена вставки нет.
// Вставляет лид под service_role (RLS обходит), поэтому после ввода этой функции
// прямую anon-вставку в leads можно (и нужно) отозвать.
//
// Деплой:  supabase functions deploy submit-lead --no-verify-jwt --project-ref <ref>
// Secret:  TURNSTILE_SECRET_KEY (supabase secrets set ... / Management API)
//          SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY инжектятся Supabase автоматически.
//
// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL  = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const TURNSTILE_SECRET = Deno.env.get("TURNSTILE_SECRET_KEY") ?? "";
const SITE_URL      = Deno.env.get("SITE_URL") ?? "https://azimer.ru";

const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const ALLOWED_ORIGINS = new Set<string>([
  "https://azimer.ru",
  "https://www.azimer.ru",
  "http://localhost:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3000",
]);
try { ALLOWED_ORIGINS.add(new URL(SITE_URL).origin); } catch { /* noop */ }

const CORS_BASE = {
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function corsFor(req: Request) {
  const origin = req.headers.get("Origin");
  if (!origin) return { allowed: true, headers: { ...CORS_BASE, "Access-Control-Allow-Origin": SITE_URL } };
  const allowed = ALLOWED_ORIGINS.has(origin);
  return {
    allowed,
    headers: { ...CORS_BASE, ...(allowed ? { "Access-Control-Allow-Origin": origin } : {}) },
  };
}

const ALLOWED_SOURCES = new Set(["contact", "project", "estimate", "partner"]);

// Только эти поля принимаем от клиента (зеркало grant-whitelist в RLS).
const ALLOWED_FIELDS = [
  "client_type", "name", "phone", "email", "company", "direction",
  "object_type", "message", "estimate", "files",
  "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term",
  "referrer", "landing_page",
] as const;

function str(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t ? t : null;
}

function normalizePhone(raw: string): string {
  const d = raw.replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("8")) return "+7" + d.slice(1);
  if (d.length === 11 && d.startsWith("7")) return "+" + d;
  if (d.length === 10) return "+7" + d;
  return raw.trim();
}

async function verifyTurnstile(token: string, ip: string | null): Promise<boolean> {
  if (!TURNSTILE_SECRET) return false;
  const form = new URLSearchParams();
  form.set("secret", TURNSTILE_SECRET);
  form.set("response", token);
  if (ip) form.set("remoteip", ip);
  try {
    const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
    });
    const out = await r.json();
    return out?.success === true;
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  const cors = corsFor(req);
  const json = (body: any, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...cors.headers } });

  if (req.method === "OPTIONS") return new Response(null, { status: cors.allowed ? 204 : 403, headers: cors.headers });
  if (!cors.allowed) return json({ error: "Origin not allowed" }, 403);
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  const token = typeof body?.token === "string" ? body.token : "";
  if (!token) return json({ error: "Captcha required" }, 400);

  const ip = req.headers.get("CF-Connecting-IP") ?? req.headers.get("x-forwarded-for");
  const ok = await verifyTurnstile(token, ip);
  if (!ok) return json({ error: "Captcha failed" }, 403);

  const lead = body?.lead ?? {};
  const source = typeof lead.source === "string" ? lead.source : "";
  if (!ALLOWED_SOURCES.has(source)) return json({ error: "Bad source" }, 400);

  const name = str(lead.name);
  const phoneRaw = str(lead.phone);
  if (!name) return json({ error: "Нужно имя" }, 400);
  if (!phoneRaw || phoneRaw.replace(/\D/g, "").length < 10) {
    return json({ error: "Проверьте номер телефона" }, 400);
  }

  // Сервер-owned поля НЕ принимаем от клиента — ставим сами.
  const insert: Record<string, unknown> = {
    source,
    status: "new",
    source_channel: "site",
    name,
    phone: normalizePhone(phoneRaw),
  };
  for (const f of ALLOWED_FIELDS) {
    if (f === "name" || f === "phone") continue;
    const v = (lead as any)[f];
    if (v !== undefined && v !== null && v !== "") insert[f] = v;
  }

  const { error } = await sb.from("leads").insert(insert);
  if (error) {
    console.error("[submit-lead] insert error:", error.message);
    return json({ error: "Не удалось сохранить заявку" }, 500);
  }
  return json({ ok: true });
});
