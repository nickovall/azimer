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
import {
  STEPS, type StepKey, type Collected,
  parsePhone, parseDimension, parseInt0, parseItems,
  calcEstimate, formatSummary, LOGISTICS,
} from "./wizard.ts";

const SITE_URL = Deno.env.get("SITE_URL") ?? "https://azimer.ru";

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

  const data = cb.data as string;

  // Wizard callbacks (w:field:value)
  if (data.startsWith("w:")) {
    await handleWizardCallback(cb);
    return;
  }

  // Status change callbacks (s:status:leadId)
  const [, newStatus, leadId] = data.split(":");
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

  let [cmd, ...args] = (msg.text as string).split(/\s+/);

  // Алиасы для меню BotFather (без пробелов)
  const aliases: Record<string, [string, string[]]> = {
    "/leadsnew":        ["/leads", ["new"]],
    "/leadscontacted":  ["/leads", ["contacted"]],
    "/leadskpsent":     ["/leads", ["kp_sent"]],
    "/leadswon":        ["/leads", ["won"]],
    "/leadslost":       ["/leads", ["lost"]],
    "/leadstoday":      ["/leads", ["today"]],
    "/leadsweek":       ["/leads", ["week"]],
    "/leadsmonth":      ["/leads", ["month"]],
  };
  // Убираем @botname из команды (Telegram добавляет в групповых чатах)
  cmd = cmd.split("@")[0];
  if (aliases[cmd]) {
    [cmd, args] = aliases[cmd];
  }

  if (cmd === "/start" || cmd === "/help") {
    await sendMessage(chatId,
      `<b>🤖 Бот АЗИМЕР — инструкция</b>\n\n` +
      `Бот ловит заявки с сайта и помогает вести их по воронке.\n\n` +
      `<b>📋 Списки заявок:</b>\n` +
      `<code>/leads</code> — последние 10 заявок\n` +
      `<code>/leadsnew</code> — только новые (не взятые в работу)\n` +
      `<code>/leadscontacted</code> — в работе (взял, но КП ещё не отправил)\n` +
      `<code>/leadskpsent</code> — КП отправлено, ждём решения клиента\n` +
      `<code>/leadswon</code> — закрытые в плюс (договоры)\n` +
      `<code>/leadslost</code> — отказы\n\n` +
      `<b>📅 По датам:</b>\n` +
      `<code>/leadstoday</code> — сегодня\n` +
      `<code>/leadsweek</code> — последние 7 дней\n` +
      `<code>/leadsmonth</code> — последние 30 дней\n\n` +
      `<b>🔍 Поиск:</b>\n` +
      `<code>/find Иванов</code> — по имени, телефону, компании, объекту\n` +
      `<code>/find +79991</code> — по номеру телефона\n\n` +
      `<b>📊 Аналитика:</b>\n` +
      `<code>/stats</code> — статистика за 30 дней (всего заявок, по статусам, по источникам)\n\n` +
      `<b>🧮 Генерация КП:</b>\n` +
      `<code>/kp_new</code> — собрать КП по новому объекту через 14 вопросов с кнопками\n` +
      `<code>/cancel</code> — отменить активную сессию КП\n\n` +
      `<b>🎯 Как работать со статусами:</b>\n` +
      `Под каждой карточкой 4 кнопки — нажимай как только меняется этап:\n` +
      `🟡 <b>Взял в работу</b> — позвонил, начал общение\n` +
      `📄 <b>Отправил КП</b> — клиент получил коммерческое\n` +
      `✅ <b>Договор</b> — сделка состоялась\n` +
      `❌ <b>Отказ</b> — клиент отказался / не отвечает\n\n` +
      `<b>💡 Совет:</b> утром жми <code>/leadsnew</code>, вечером — <code>/stats</code>.\n` +
      `Каждой новой заявке сразу жми 🟡 чтоб не забыть позвонить.`
    );
    return;
  }

  if (cmd === "/leads") {
    const filter = args[0];
    let q = supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);

    // Фильтры по статусу
    if (filter && STATUS_LABEL[filter]) {
      q = q.eq("status", filter);
    }
    // Фильтры по дате
    else if (filter === "today") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      q = q.gte("created_at", today.toISOString()).limit(50);
    } else if (filter === "week") {
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      q = q.gte("created_at", since).limit(50);
    } else if (filter === "month") {
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      q = q.gte("created_at", since).limit(50);
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
    if (data.length > 10) {
      await sendMessage(chatId, `<b>Найдено ${data.length} заявок</b> — показываю по очереди.`);
    }
    for (const lead of data) {
      await sendMessage(chatId, formatLeadCard(lead), { reply_markup: leadButtons(lead.id) });
    }
    return;
  }

  if (cmd === "/find") {
    const query = args.join(" ").trim();
    if (!query) {
      await sendMessage(chatId, "Использование: <code>/find Иванов</code> или <code>/find +7999</code>");
      return;
    }
    const q = `%${query.replace(/[%_]/g, "\\$&")}%`;
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .or(`name.ilike.${q},phone.ilike.${q},company.ilike.${q},object_type.ilike.${q},email.ilike.${q}`)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) {
      await sendMessage(chatId, `Ошибка поиска: ${error.message}`);
      return;
    }
    if (!data || data.length === 0) {
      await sendMessage(chatId, `По запросу <b>${query}</b> ничего не найдено.`);
      return;
    }
    await sendMessage(chatId, `<b>Найдено ${data.length} заявок</b> по запросу <i>${query}</i>:`);
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

  if (cmd === "/kp_new") {
    await startWizard(chatId);
    return;
  }

  if (cmd === "/cancel") {
    const cancelled = await cancelWizard(chatId);
    await sendMessage(chatId,
      cancelled
        ? "❌ Сессия КП отменена."
        : "У тебя нет активной сессии. /kp_new — начать новую."
    );
    return;
  }

  // /kp оставлен как скрытая команда — для поиска заявки по точному ID
  // (полезно когда обсуждаешь заявку в другом канале). В меню BotFather не выносим.
  if (cmd === "/kp") {
    const leadId = args[0];
    if (!leadId) {
      await sendMessage(chatId,
        "Использование: <code>/kp &lt;id заявки&gt;</code>\n" +
        "ID видно под каждой карточкой. Проще искать через <code>/find</code> или <code>/leads</code>."
      );
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

  await sendMessage(chatId, `Команда <code>${cmd}</code> неизвестна. /help — полная инструкция.`);
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
    } else if (update.message?.text) {
      const text = update.message.text as string;
      // Если есть активная wizard-сессия и это НЕ команда — пускаем в wizard
      if (!text.startsWith("/")) {
        const chatId = update.message.chat.id;
        const handled = isAllowed(chatId) ? await handleWizardText(chatId, text) : false;
        if (!handled) {
          // Свободное сообщение без активной сессии — игнорируем (пока)
        }
      } else {
        await handleCommand(update.message);
      }
    }
  } catch (e) {
    console.error("bot error:", e);
  }

  return new Response("ok");
});

// ═══════════════════════════════════════════════════════════════
// WIZARD — пошаговый сбор параметров КП и генерация заявки
// ═══════════════════════════════════════════════════════════════

async function getActiveSession(chatId: number) {
  const { data } = await supabase
    .from("kp_sessions")
    .select("*")
    .eq("chat_id", chatId)
    .in("status", ["collecting", "confirming"])
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data as any | null;
}

async function startWizard(chatId: number) {
  // Если есть активная — спросить
  const existing = await getActiveSession(chatId);
  if (existing) {
    await sendMessage(chatId,
      `У тебя уже есть незавершённая сессия (шаг: <code>${existing.current_step}</code>).\n` +
      `Чтобы продолжить — просто ответь на последний вопрос.\n` +
      `Чтобы отменить — <code>/cancel</code> и потом снова <code>/kp_new</code>.`
    );
    return;
  }

  const { data, error } = await supabase
    .from("kp_sessions")
    .insert({ chat_id: chatId, current_step: "client_name", collected: {} })
    .select("*")
    .single();

  if (error || !data) {
    await sendMessage(chatId, `Ошибка создания сессии: ${error?.message ?? "?"}`);
    return;
  }

  await sendMessage(chatId,
    `<b>🧮 Новая сессия КП</b>\n\n` +
    `Соберём 14 параметров с кнопками и короткими ответами. ` +
    `Если ошибся — пиши <code>/cancel</code> и начинай заново.\n\n` +
    `<i>Сессия живёт 24 часа.</i>`
  );

  await askStep(chatId, "client_name", data.id);
}

async function cancelWizard(chatId: number): Promise<boolean> {
  const session = await getActiveSession(chatId);
  if (!session) return false;
  await supabase.from("kp_sessions").update({ status: "cancelled" }).eq("id", session.id);
  return true;
}

async function askStep(chatId: number, stepKey: StepKey, sessionId: string) {
  const step = STEPS[stepKey];
  const replyMarkup = step.buttons ? { inline_keyboard: step.buttons.map(row => row.map(b => ({ text: b.text, callback_data: b.data }))) } : undefined;
  const sent: any = await sendMessage(chatId, step.prompt, replyMarkup ? { reply_markup: replyMarkup } : {});
  // Сохраняем message_id вопроса (для возможного редактирования)
  if (sent?.result?.message_id) {
    await supabase.from("kp_sessions")
      .update({
        current_step: stepKey,
        last_question_message_id: sent.result.message_id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionId);
  }
}

async function saveAndAdvance(chatId: number, session: any, fieldKey: string, value: any, nextStep: StepKey) {
  const collected = { ...(session.collected ?? {}), [fieldKey]: value };
  if (nextStep === "confirm") {
    await supabase.from("kp_sessions")
      .update({ collected, current_step: "confirm", status: "confirming", updated_at: new Date().toISOString() })
      .eq("id", session.id);
    await showConfirmation(chatId, session.id, collected);
    return;
  }
  await supabase.from("kp_sessions")
    .update({ collected, current_step: nextStep, updated_at: new Date().toISOString() })
    .eq("id", session.id);
  await askStep(chatId, nextStep, session.id);
}

async function showConfirmation(chatId: number, sessionId: string, collected: Collected) {
  const summary = formatSummary(collected);
  const buttons = STEPS.confirm.buttons!.map(row => row.map(b => ({ text: b.text, callback_data: b.data })));
  await sendMessage(chatId, summary + `\n<i>Подтверди — и создам заявку + ссылку на КП.</i>`, {
    reply_markup: { inline_keyboard: buttons },
  });
}

async function handleWizardText(chatId: number, text: string): Promise<boolean> {
  const session = await getActiveSession(chatId);
  if (!session) return false;

  const stepKey = session.current_step as StepKey;
  const step = STEPS[stepKey];
  if (!step) return false;

  const tNorm = text.trim();
  const collected = session.collected as Collected;

  // text / numeric / optional_text
  switch (stepKey) {
    case "client_name": {
      if (tNorm.length < 2) {
        await sendMessage(chatId, "Слишком короткое имя. Попробуй ещё раз.");
        return true;
      }
      await saveAndAdvance(chatId, session, "client_name", tNorm, "phone");
      return true;
    }
    case "phone": {
      const p = parsePhone(tNorm);
      if (!p) {
        await sendMessage(chatId, "Не похоже на телефон. Пример: <code>+79991234567</code>");
        return true;
      }
      await saveAndAdvance(chatId, session, "phone", p, "object_type");
      return true;
    }
    case "length":
    case "width":
    case "height": {
      const n = parseDimension(tNorm);
      if (!n) {
        await sendMessage(chatId, "Не понял число. Просто метраж, например: <code>18</code>");
        return true;
      }
      const next = stepKey === "length" ? "width" : stepKey === "width" ? "height" : "frame";
      await saveAndAdvance(chatId, session, stepKey, n, next);
      return true;
    }
    case "gates":
    case "windows": {
      const items = parseItems(tNorm);
      if (items === null) {
        await sendMessage(chatId, "Не разобрал. Пример: <code>1x4x4</code> или <code>нет</code>");
        return true;
      }
      const next = stepKey === "gates" ? "windows" : "doors";
      await saveAndAdvance(chatId, session, stepKey, items, next);
      return true;
    }
    case "doors": {
      let count = 0;
      const low = tNorm.toLowerCase();
      if (low === "нет" || low === "не нужно" || low === "-") count = 0;
      else {
        const n = parseInt0(tNorm);
        if (n === null) {
          await sendMessage(chatId, "Сколько дверей? Пример: <code>2</code> или <code>нет</code>");
          return true;
        }
        count = n;
      }
      await saveAndAdvance(chatId, session, "doors", { count }, "logistics_choice");
      return true;
    }
    case "notes": {
      const low = tNorm.toLowerCase();
      const value = (low === "нет" || low === "-") ? undefined : tNorm;
      await saveAndAdvance(chatId, session, "notes", value, "confirm");
      return true;
    }
    case "object_type":
    case "frame":
    case "cladding":
    case "roofing":
    case "foundation":
    case "logistics_choice":
    case "logistics_dest":
    case "confirm":
      await sendMessage(chatId, "Здесь нужно нажать кнопку выше ↑");
      return true;
  }
  return true;
}

async function handleWizardCallback(cb: any) {
  const chatId = cb.message.chat.id;
  const data = cb.data as string;
  const [, field, value] = data.split(":");

  const session = await getActiveSession(chatId);
  if (!session) {
    await answerCallback(cb.id, "Сессия истекла. /kp_new — начать новую.");
    return;
  }

  // Подтверждение
  if (field === "confirm") {
    if (value === "cancel") {
      await supabase.from("kp_sessions").update({ status: "cancelled" }).eq("id", session.id);
      await answerCallback(cb.id, "Отменено");
      await sendMessage(chatId, "❌ КП отменено. /kp_new — начать заново.");
      return;
    }
    if (value === "edit") {
      await answerCallback(cb.id, "Какой шаг править?");
      // Простой вариант: предлагаем начать заново
      await sendMessage(chatId,
        "Чтобы исправить — отмени и начни заново: <code>/cancel</code> → <code>/kp_new</code>.\n" +
        "<i>В следующей версии добавим точечную правку каждого шага.</i>"
      );
      return;
    }
    if (value === "yes") {
      await answerCallback(cb.id, "Создаю КП...");
      await finalizeKpAndCreateLead(chatId, session);
      return;
    }
  }

  // Логистика — особый случай
  if (field === "logistics_choice") {
    if (value === "yes") {
      await answerCallback(cb.id, "Куда?");
      await supabase.from("kp_sessions")
        .update({ collected: { ...session.collected, logistics_add: true }, current_step: "logistics_dest", updated_at: new Date().toISOString() })
        .eq("id", session.id);
      await askStep(chatId, "logistics_dest", session.id);
      return;
    } else {
      // Без доставки — сразу к notes
      await saveAndAdvance(chatId, { ...session, collected: { ...session.collected, logistics_add: false } }, "logistics_add", false, "notes");
      await answerCallback(cb.id, "Без доставки");
      return;
    }
  }

  if (field === "logistics_dest") {
    const dest = LOGISTICS.find(l => l.id === value);
    if (!dest) {
      await answerCallback(cb.id, "Не понял направление");
      return;
    }
    const collected = { ...session.collected, logistics_dest: value, logistics_amount: dest.amount };
    await supabase.from("kp_sessions")
      .update({ collected, current_step: "notes", updated_at: new Date().toISOString() })
      .eq("id", session.id);
    await answerCallback(cb.id, dest.label);
    await askStep(chatId, "notes", session.id);
    return;
  }

  // Обычные buttons-поля (object_type / frame / cladding / roofing / foundation)
  const stepKey = session.current_step as StepKey;
  const step = STEPS[stepKey];
  if (!step || step.type !== "buttons") {
    await answerCallback(cb.id, "Не тот шаг");
    return;
  }

  await answerCallback(cb.id, value);
  await saveAndAdvance(chatId, session, field, value, step.next);
}

async function finalizeKpAndCreateLead(chatId: number, session: any) {
  const c = session.collected as Collected;
  const estimate = calcEstimate(c);

  // Собираем estimate-объект как с сайта
  const estimateData = {
    state: {
      objectType: c.object_type,
      frame: c.frame,
      length: c.length,
      width:  c.width,
      height: c.height,
      cladding:   c.cladding,
      roofing:    c.roofing,
      foundation: c.foundation,
      options: {
        gate:   c.gates?.reduce((a, g) => a + g.count, 0) ?? 0,
        window: c.windows?.reduce((a, w) => a + w.count, 0) ?? 0,
        door:   c.doors?.count ?? 0,
      },
    },
    area:     (c.length ?? 0) * (c.width ?? 0),
    wallArea: 2 * ((c.length ?? 0) + (c.width ?? 0)) * (c.height ?? 0),
    lines:    estimate.lines,
    base:     estimate.total,
    low:      estimate.low,
    high:     estimate.high,
  };

  const noteParts: string[] = [];
  if (c.notes) noteParts.push(c.notes);
  if (c.logistics_add && c.logistics_dest === "other") noteParts.push("Логистика: уточнить направление и стоимость");

  const { data: lead, error } = await supabase
    .from("leads")
    .insert({
      source:      "kp_bot",
      status:      "kp_sent",
      name:        c.client_name,
      phone:       c.phone,
      object_type: c.object_type,
      message:     noteParts.join("\n") || null,
      estimate:    estimateData,
    })
    .select("id")
    .single();

  if (error || !lead) {
    await sendMessage(chatId, `❌ Ошибка создания заявки: ${error?.message ?? "?"}`);
    return;
  }

  await supabase.from("kp_sessions")
    .update({ status: "done", created_lead_id: lead.id, updated_at: new Date().toISOString() })
    .eq("id", session.id);

  const kpUrl = `${SITE_URL}/kp/${lead.id}`;

  await sendMessage(chatId,
    `✅ <b>КП готово!</b>\n\n` +
    formatSummary(c) +
    `\n\n📎 <b>Открыть и скачать PDF:</b>\n${kpUrl}\n\n` +
    `Заявка в БД: <code>${lead.id}</code>\n` +
    `Статус: 📄 КП отправлено (нажми ✅ Договор когда подпишете).`,
    { disable_web_page_preview: false }
  );
}
