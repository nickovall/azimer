import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

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
}

/**
 * Записать заявку в Supabase.
 *
 * ВАЖНО: НЕ используем .select() — иначе supabase-js шлёт
 * `Prefer: return=representation`, PostgREST после INSERT пытается прочитать
 * строку обратно и спотыкается о SELECT-политику (anon без прав на чтение).
 * Без .select() запрос идёт с `return=minimal` → INSERT проходит чисто.
 */
export async function submitLead(data: LeadInsert): Promise<void> {
  if (!supabase) {
    console.warn("[supabase] not configured — skipping insert");
    return;
  }
  const { error } = await supabase.from("leads").insert(data);
  if (error) {
    console.error("[supabase] insert error:", error.message);
    throw error;
  }
}

/**
 * Загрузить файл в storage bucket lead-files.
 * Возвращает signed URL (30 дней) или null если supabase не настроен.
 */
export async function uploadLeadFile(file: File): Promise<string | null> {
  if (!supabase) return null;

  const safeName = file.name.replace(/[^\w.\-]/g, "_");
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;

  const { error: upErr } = await supabase.storage
    .from("lead-files")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (upErr) {
    console.error("[supabase] upload error:", upErr.message);
    throw upErr;
  }

  const { data, error: urlErr } = await supabase.storage
    .from("lead-files")
    .createSignedUrl(path, 60 * 60 * 24 * 30);
  if (urlErr) {
    console.error("[supabase] signedUrl error:", urlErr.message);
    return null;
  }
  return data.signedUrl;
}
