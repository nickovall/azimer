import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readUtm } from "@/lib/utm";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const functionsUrl = url ? `${url.replace(/\/$/, "")}/functions/v1` : "";

export const supabaseConfigured = Boolean(url && anonKey);

export const supabase: SupabaseClient | null = supabaseConfigured
  ? createClient(url, anonKey, { auth: { persistSession: false } })
  : null;

export type LeadSource = "contact" | "project" | "partner" | "estimate";

export interface LeadInsert {
  source: LeadSource;
  client_type?: string;
  name: string;
  phone: string;
  email?: string;
  company?: string;
  direction?: string;
  object_type?: string;
  message?: string;
  // deno-lint-ignore no-explicit-any
  estimate?: any;
  files?: string[];
  // UTM и источник трафика
  utm_source?:   string;
  utm_medium?:   string;
  utm_campaign?: string;
  utm_content?:  string;
  utm_term?:     string;
  referrer?:     string;
  landing_page?: string;
  // Антибот-метаданные (в БД НЕ пишутся): honeypot + время рендера формы.
  _hp?: string;
  _t?:  number;
}

// Ошибка валидации, которую форма показывает пользователю как есть
// (в отличие от технических ошибок, где показываем generic-сообщение).
export class LeadValidationError extends Error {}

// Минимальное время заполнения формы (мс). Быстрее — почти наверняка бот.
const ANTIBOT_MIN_FILL_MS = 1500;

const ALLOWED_UPLOAD_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/acad",
  "application/x-acad",
  "application/x-autocad",
  "image/vnd.dwg",
  "application/octet-stream",
]);
const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("8")) return "+7" + digits.slice(1);
  if (digits.length === 11 && digits.startsWith("7")) return "+" + digits;
  if (digits.length === 10) return "+7" + digits;
  return raw.trim();
}

function stripUndefined<T extends Record<string, unknown>>(value: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, v]) => v !== undefined && v !== ""),
  ) as Partial<T>;
}

/**
 * Записать заявку в Supabase.
 *
 * ВАЖНО: НЕ используем .select() — иначе supabase-js шлёт
 * `Prefer: return=representation`, PostgREST после INSERT пытается прочитать
 * строку обратно и спотыкается о SELECT-политику (anon без прав на чтение).
 * Без .select() запрос идёт с `return=minimal` → INSERT проходит чисто.
 */
export async function submitLead(data: LeadInsert, turnstileToken?: string): Promise<void> {
  if (!supabase) {
    throw new Error("Supabase is not configured");
  }

  // ─── Антибот ───
  // 1) Honeypot заполнен → бот. Тихо «успех» (не палим ловушку), в БД не пишем.
  if (typeof data._hp === "string" && data._hp.trim() !== "") return;
  // 2) Форма отправлена мгновенно → бот. Тоже тихо игнорируем.
  if (typeof data._t === "number" && Number.isFinite(data._t) && Date.now() - data._t < ANTIBOT_MIN_FILL_MS) return;
  // 3) Телефон должен содержать минимум 10 цифр (реальный РФ-номер). Боты шлют
  //    мусор вроде "NqvHukzEwpwDBDtFxDSfzjhJ" — отсекаем с понятной ошибкой.
  if ((data.phone ?? "").replace(/\D/g, "").length < 10) {
    throw new LeadValidationError("Проверьте номер телефона — нужно не меньше 10 цифр.");
  }

  // Подмешиваем UTM-метки и landing page — захвачены при первом визите.
  const utm = readUtm();
  const enriched = stripUndefined({
    source: data.source,
    client_type: data.client_type,
    name: data.name.trim(),
    phone: normalizePhone(data.phone),
    email: data.email?.trim(),
    company: data.company?.trim(),
    direction: data.direction?.trim(),
    object_type: data.object_type,
    message: data.message?.trim(),
    estimate: data.estimate,
    files: data.files,
    utm_source: data.utm_source ?? utm.utm_source,
    utm_medium: data.utm_medium ?? utm.utm_medium,
    utm_campaign: data.utm_campaign ?? utm.utm_campaign,
    utm_content: data.utm_content ?? utm.utm_content,
    utm_term: data.utm_term ?? utm.utm_term,
    referrer: data.referrer ?? utm.referrer,
    landing_page: data.landing_page ?? utm.landing_page,
  });
  if (!enriched.name || !enriched.phone) {
    throw new Error("Name and phone are required");
  }

  // 1) Защищённый путь: Edge Function с серверной проверкой Turnstile (если есть токен).
  //    Боты без валидного токена сюда не пройдут.
  if (turnstileToken && functionsUrl && anonKey) {
    try {
      const res = await fetch(`${functionsUrl}/submit-lead`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
        },
        body: JSON.stringify({ token: turnstileToken, lead: enriched }),
      });
      if (res.ok) return;
      // Функция отклонила — во время раскатки лид не теряем: проваливаемся
      // в прямую вставку ниже (RLS ещё открыт). После lockdown прямая вставка
      // не пройдёт и пользователь увидит ошибку.
    } catch {
      // сеть/функция недоступна → fallback
    }
  }

  // 2) Fallback: прямая вставка (текущее поведение). После lockdown anon-insert
  //    закрыт — единственный рабочий путь будет через функцию с токеном.
  const { error } = await supabase.from("leads").insert(enriched);
  if (error) {
    console.error("[supabase] insert error:", error.message);
    throw error;
  }
}

/**
 * Загрузить файл в storage bucket lead-files.
 * Возвращает storage path или null если supabase не настроен.
 */
export async function uploadLeadFile(file: File): Promise<string | null> {
  if (!supabase) return null;
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error(`Файл ${file.name} больше 15 МБ`);
  }
  if (file.type && !ALLOWED_UPLOAD_TYPES.has(file.type)) {
    throw new Error(`Тип файла ${file.name} не поддерживается`);
  }

  const safeName = file.name.replace(/[^\w.\-]/g, "_");
  const path = `lead-uploads/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;

  const { error: upErr } = await supabase.storage
    .from("lead-files")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (upErr) {
    console.error("[supabase] upload error:", upErr.message);
    throw upErr;
  }
  return path;
}
