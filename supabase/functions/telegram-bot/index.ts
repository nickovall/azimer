// АЗИМЕР — Telegram bot webhook handler.
// Обрабатывает callback-кнопки (смена статуса заявки) и команды (/leads, /stats, /kp, /help).
//
// Деплой: supabase functions deploy telegram-bot --no-verify-jwt
// Env:    supabase secrets set TELEGRAM_BOT_TOKEN=... TELEGRAM_WEBHOOK_SECRET=... ALLOWED_CHAT_IDS=8614558675,123456
// Webhook: curl https://api.telegram.org/bot<TOKEN>/setWebhook \
//            -d url=https://<ref>.supabase.co/functions/v1/telegram-bot \
//            -d secret_token=<SECRET>
//
// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BOT_TOKEN        = Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "";
const WEBHOOK_SECRET   = Deno.env.get("TELEGRAM_WEBHOOK_SECRET") ?? "";
const ALLOWED_CHAT_IDS = (Deno.env.get("ALLOWED_CHAT_IDS") ?? "")
  .split(",")
  .map((x) => Number(x.trim()))
  .filter(Boolean);
const SUPABASE_URL  = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

const TG_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

// ─────────────────────────── helpers ───────────────────────────

const STATUS_LABEL: Record<string, string> = {
  new:       "🆕 Новая",
  contacted: "🟡 В работе",
  kp_sent:   "📄 КП отправлено",
  won:       "✅ Договор",
  lost:      "❌ Отказ",
};

const SOURCE_LABEL: Record<string, string> = {
  contact:  "💬 Контактная форма",
  project:  "📐 Готовый проект",
  partner:  "🤝 Партнёрство",
  estimate: "🧮 Мастер расчёта",
};

function leadButtons(leadId: string) {
  return {
    inline_keyboard: [
      [
        { text: "🟡 Взял в работу", callback_data: `s:contacted:${leadId}` },
        { text: "📄 Отправил КП",   callback_data: `s:kp_sent:${leadId}` },
      ],
      [
        { text: "✅ Договор",        callback_data: `s:won:${leadId}` },
        { text: "❌ Отказ",          callback_data: `s:lost:${leadId}` },
      ],
    ],
  };
}

function isAllowed(chatId: number) {
  return ALLOWED_CHAT_IDS.length === 0 || ALLOWED_CHAT_IDS.includes(chatId);
}

async function tg(method: string, payload: Record<string, unknown>) {
  const r = await fetch(`${TG_API}/${method}`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(payload),
  });
  return r.json();
}

const sendMessage = (chat_id: number | string, text: string, extra: Record<string, unknown> = {}) =>
  tg("sendMessage", { chat_id, text, parse_mode: "HTML", disable_web_page_preview: true, ...extra });

const answerCallback = (callback_query_id: string, text?: string) =>
  tg("answerCallbackQuery", { callback_query_id, text: text ?? "", show_alert: false });

const editMessageText = (
  chat_id: number | string,
  message_id: number,
  text: string,
  reply_markup?: Record<string, unknown>,
) => tg("editMessageText", {
  chat_id,
  message_id,
  text,
  parse_mode: "HTML",
  disable_web_page_preview: true,
  ...(reply_markup ? { reply_markup } : {}),
});

function fmtRub(n: number | null) {
  if (n == null) return "—";
  return new Intl.NumberFormat("ru-RU").format(Math.round(n)) + " ₽";
}

function fmtDate(s: string) {
  const d = new Date(s);
  return d.toLocaleString("ru-RU", { timeZone: "Asia/Krasnoyarsk", dateStyle: "short", timeStyle: "short" });
}

function formatLeadCard(lead: any) {
  const status = STATUS_LABEL[lead.status] || lead.status;
  const source = SOURCE_LABEL[lead.source] || lead.source;
  const est = lead.estimate as any;
  let msg = `<b>${source}</b>  ·  ${status}\n\n`;
  msg += `<b>Имя:</b> ${lead.name ?? "—"}\n`;
  msg += `<b>Телефон:</b> <code>${lead.phone ?? "—"}</code>`;
  if (lead.email)       msg += `\n<b>Email:</b> ${lead.email}`;
  if (lead.client_type) msg += `\n<b>Тип:</b> ${lead.client_type}`;
  if (lead.company)     msg += `\n<b>Компания:</b> ${lead.company}`;
  if (lead.direction)   msg += `\n<b>Направление:</b> ${lead.direction}`;
  if (lead.object_type) msg += `\n<b>Объект:</b> ${lead.object_type}`;
  if (lead.message)     msg += `\n\n<i>${lead.message}</i>`;

  if (est?.low != null && est?.high != null) {
    msg += `\n\n<b>Оценка:</b> ${fmtRub(est.low)} — ${fmtRub(est.high)}`;
  }
  if (est?.state) {
    const s = est.state;
    if (s.length && s.width) {
      msg += `\n<b>Размеры:</b> ${s.length}×${s.width}×${s.height ?? "?"} м`;
    }
  }
  if (Array.isArray(lead.files) && lead.files.length > 0) {
    msg += `\n<b>Файлов:</b> ${lead.files.length}`;
  }
  msg += `\n\n<code>${lead.id}</code>  ·  <i>${fmtDate(lead.created_at)}</i>`;
  return msg;
}

// ─────────────────────────── handlers ───────────────────────────

async function handleCallback(cb: any) {
  const chatId = cb.message.chat.id;
  const msgId  = cb.message.message_id;
  if (!isAllowed(chatId)) {
    await answerCallback(cb.id, "🚫 Доступ запрещён");
    return;
  }
  const [, newStatus, leadId] = (cb.data as string).split(":");
  if (!newStatus || !leadId) {
    await answerCallback(cb.id, "Не могу разобрать кнопку");
    return;
  }

  const { error: upErr } = await supabase
    .from("leads")
    .update({ status: newStatus })
    .eq("id", leadId);

  if (upErr) {
    await answerCallback(cb.id, `Ошибка: ${upErr.message}`);
    return;
  }

  const { data: lead } = await supabase
    .from("leads")
    .select("*")
    .eq("id", leadId)
    .single();

  if (lead) {
    await editMessageText(chatId, msgId, formatLeadCard(lead), leadButtons(leadId));
  }
  await answerCallback(cb.id, `Статус: ${STATUS_LABEL[newStatus] ?? newStatus}`);
}

async function handleCommand(msg: any) {
  const chatId = msg.chat.id;
  if (!isAllowed(chatId)) {
    await sendMessage(chatId, `🚫 Доступ запрещён. Твой chat_id: <code>${chatId}</code>`);
    return;
  }

  const [cmd, ...args] = (msg.text as string).split(/\s+/);

  if (cmd === "/start" || cmd === "/help") {
    await sendMessage(chatId,
      `<b>Бот АЗИМЕР</b>\n\n` +
      `Команды:\n` +
      `/leads — последние 10 заявок\n` +
      `/leads new — только новые\n` +
      `/leads contacted — в работе\n` +
      `/stats — статистика за 30 дней\n` +
      `/kp &lt;id&gt; — данные по заявке для КП\n` +
      `/help — эта подсказка\n\n` +
      `Кнопки под каждой заявкой меняют её статус.`
    );
    return;
  }

  if (cmd === "/leads") {
    const filterStatus = args[0];
    let q = supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);
    if (filterStatus && STATUS_LABEL[filterStatus]) {
      q = q.eq("status", filterStatus);
    }
    const { data, error } = await q;
    if (error) {
      await sendMessage(chatId, `Ошибка: ${error.message}`);
      return;
    }
    if (!data || data.length === 0) {
      await sendMessage(chatId, "Заявок не найдено.");
      return;
    }
    for (const lead of data) {
      await sendMessage(chatId, formatLeadCard(lead), { reply_markup: leadButtons(lead.id) });
    }
    return;
  }

  if (cmd === "/stats") {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from("leads")
      .select("status, source")
      .gte("created_at", since);
    if (error) {
      await sendMessage(chatId, `Ошибка: ${error.message}`);
      return;
    }
    const total = data?.length ?? 0;
    const byStatus: Record<string, number> = {};
    const bySource: Record<string, number> = {};
    for (const l of data ?? []) {
      byStatus[l.status] = (byStatus[l.status] ?? 0) + 1;
      bySource[l.source] = (bySource[l.source] ?? 0) + 1;
    }
    let txt = `<b>📊 Статистика за 30 дней</b>\n\n`;
    txt += `Всего заявок: <b>${total}</b>\n\n`;
    txt += `<b>По статусам:</b>\n`;
    for (const [k, v] of Object.entries(byStatus)) {
      txt += `• ${STATUS_LABEL[k] ?? k}: ${v}\n`;
    }
    txt += `\n<b>По источникам:</b>\n`;
    for (const [k, v] of Object.entries(bySource)) {
      txt += `• ${SOURCE_LABEL[k] ?? k}: ${v}\n`;
    }
    await sendMessage(chatId, txt);
    return;
  }

  if (cmd === "/kp") {
    const leadId = args[0];
    if (!leadId) {
      await sendMessage(chatId, "Использование: <code>/kp &lt;id заявки&gt;</code>\nID видно под каждой карточкой.");
      return;
    }
    const { data, error } = await supabase.from("leads").select("*").eq("id", leadId).single();
    if (error || !data) {
      await sendMessage(chatId, `Заявка <code>${leadId}</code> не найдена.`);
      return;
    }
    await sendMessage(chatId, formatLeadCard(data), { reply_markup: leadButtons(data.id) });
    return;
  }

  await sendMessage(chatId, `Команда <code>${cmd}</code> неизвестна. /help — список.`);
}

// ─────────────────────────── entry ───────────────────────────

Deno.serve(async (req) => {
  // Защита от не-Telegram запросов через secret_token (Telegram добавляет этот заголовок)
  if (WEBHOOK_SECRET) {
    const got = req.headers.get("x-telegram-bot-api-secret-token");
    if (got !== WEBHOOK_SECRET) {
      return new Response("forbidden", { status: 403 });
    }
  }

  let update: any;
  try { update = await req.json(); }
  catch { return new Response("bad request", { status: 400 }); }

  try {
    if (update.callback_query) {
      await handleCallback(update.callback_query);
    } else if (update.message?.text?.startsWith("/")) {
      await handleCommand(update.message);
    }
  } catch (e) {
    console.error("bot error:", e);
  }

  return new Response("ok");
});
