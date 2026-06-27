"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAdmin } from "@/components/admin/AdminShell";
import { adminFetch, type MessageTemplate } from "@/lib/admin-api";

type Channel = "email" | "sms";

export default function AdminComposePage() {
  const { token } = useAdmin();
  const [channel, setChannel] = useState<Channel>("email");
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [selectedTplId, setSelectedTplId] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    adminFetch<{ ok: true; templates: MessageTemplate[] }>(token, { action: "list_templates" })
      .then((r) => setTemplates(r.templates))
      .catch(() => setTemplates([]));
  }, [token]);

  const channelTemplates = useMemo(
    () => templates.filter((t) => t.channel === channel),
    [templates, channel],
  );

  function applyTemplate(tplId: string) {
    setSelectedTplId(tplId);
    const t = templates.find((x) => x.id === tplId);
    if (!t) return;
    setBody(t.body);
    if (channel === "email" && t.subject) setSubject(t.subject);
  }

  function resetForm() {
    setTo("");
    setSubject("");
    setBody("");
    setSelectedTplId("");
    setResult(null);
  }

  async function handleSend() {
    setSending(true);
    setResult(null);
    try {
      if (channel === "email") {
        await adminFetch(token, {
          action: "send_freeform_email",
          to: to.trim(),
          subject: subject.trim(),
          body,
        });
      } else {
        await adminFetch(token, {
          action: "send_freeform_sms",
          to: to.trim(),
          body,
        });
      }
      setResult({ ok: true, text: "✅ Отправлено" });
      setTimeout(() => resetForm(), 1500);
    } catch (e) {
      setResult({ ok: false, text: "❌ " + (e instanceof Error ? e.message : String(e)) });
    } finally {
      setSending(false);
    }
  }

  const canSend = !!to.trim() && !!body.trim() && (channel === "sms" || !!subject.trim()) && !sending;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center justify-between gap-3">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-orange">Новое сообщение</p>
        <Link href="/console-x9p4m2/" className="text-xs text-orange hover:underline">← На дашборд</Link>
      </div>
      <h1 className="mt-1 text-2xl font-bold text-graphite-900 sm:text-3xl">✉️ Написать кому угодно</h1>
      <p className="mt-1 text-sm text-graphite-900/60">
        Email уходит с <span className="font-mono">info@azimer.ru</span> с фирменной обёрткой и логотипом.
        SMS — через smsc.ru (если пополнен баланс).
      </p>

      {/* Канал */}
      <div className="mt-6 inline-flex rounded-full border border-line bg-white p-0.5 text-xs font-medium">
        <button
          onClick={() => { setChannel("email"); setSelectedTplId(""); setResult(null); }}
          className={`rounded-full px-5 py-1.5 transition-colors ${channel === "email" ? "bg-graphite-950 text-light" : "text-graphite-900/70"}`}
        >
          📧 Email
        </button>
        <button
          onClick={() => { setChannel("sms"); setSelectedTplId(""); setResult(null); }}
          className={`rounded-full px-5 py-1.5 transition-colors ${channel === "sms" ? "bg-graphite-950 text-light" : "text-graphite-900/70"}`}
        >
          📱 SMS
        </button>
      </div>

      <div className="mt-6 space-y-4">
        {/* Кому */}
        <label className="block">
          <span className="text-xs uppercase tracking-wider text-graphite-900/45">
            {channel === "email" ? "Кому (email)" : "Кому (телефон)"}
          </span>
          <input
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder={channel === "email" ? "client@company.ru" : "+7 901 234-56-78"}
            inputMode={channel === "email" ? "email" : "tel"}
            className="mt-1 w-full rounded-xl border border-line bg-white px-4 py-3 text-base focus:border-orange focus:outline-none"
          />
        </label>

        {/* Шаблон (опц.) */}
        {channelTemplates.length > 0 && (
          <label className="block">
            <span className="text-xs uppercase tracking-wider text-graphite-900/45">Подгрузить шаблон (опц.)</span>
            <select
              value={selectedTplId}
              onChange={(e) => applyTemplate(e.target.value)}
              className="mt-1 w-full rounded-xl border border-line bg-white px-4 py-3 text-base focus:border-orange focus:outline-none"
            >
              <option value="">— Без шаблона, начать с пустого —</option>
              {channelTemplates.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            {selectedTplId && (
              <p className="mt-1 text-xs text-graphite-900/45">
                Плейсхолдеры типа <code>{"{{client_name}}"}</code> подставлять руками — лида в системе нет.
              </p>
            )}
          </label>
        )}

        {/* Тема (только email) */}
        {channel === "email" && (
          <label className="block">
            <span className="text-xs uppercase tracking-wider text-graphite-900/45">Тема</span>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Здравствуйте, пишем по поводу процедуры …"
              className="mt-1 w-full rounded-xl border border-line bg-white px-4 py-3 text-base focus:border-orange focus:outline-none"
            />
          </label>
        )}

        {/* Текст */}
        <label className="block">
          <span className="text-xs uppercase tracking-wider text-graphite-900/45">
            Текст
            {channel === "sms" && (
              <span className="ml-2 font-mono normal-case text-graphite-900/40">
                {body.length} / 70 символов
              </span>
            )}
          </span>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={channel === "email" ? 12 : 4}
            placeholder={channel === "email"
              ? "Здравствуйте!\n\nУвидели вашу процедуру № ХХХ — АЗИМЕР делает каркасные здания и ангары под ключ: проектирование, поставка, монтаж.\n\nГотовы оперативно посмотреть ТЗ и дать КП. Куда направить запрос?\n\nС уважением,\nАЗИМЕР · Красноярск"
              : "AZIMER: краткое сообщение до 70 символов."
            }
            className="mt-1 w-full rounded-xl border border-line bg-white px-4 py-3 text-base font-sans focus:border-orange focus:outline-none"
          />
          {channel === "email" && (
            <p className="mt-1 text-xs text-graphite-900/45">
              Письмо отправляется с брендированным HTML-шаблоном — логотип, оранжевая линия, футер с контактами добавляются автоматически.
            </p>
          )}
        </label>

        {/* Превью footer'а для email */}
        {channel === "email" && body && (
          <details className="rounded-xl border border-line bg-light/30 p-3">
            <summary className="cursor-pointer text-xs text-graphite-900/60">📄 Что увидит получатель (превью обёртки)</summary>
            <div className="mt-3 rounded-lg border border-line bg-white p-4 text-sm">
              <div className="border-b-2 border-orange pb-3 mb-3">
                <div className="text-xs font-mono text-graphite-900/40">[ логотип АЗИМЕР ]</div>
              </div>
              <pre className="whitespace-pre-wrap font-sans text-graphite-900">{body}</pre>
              <div className="border-t border-line mt-3 pt-3 text-xs text-graphite-900/60">
                <strong>ООО «АЗИМЕР»</strong> · Каркасные здания под ключ<br />
                Красноярск · <span className="text-orange">+7 901 600-05-65</span> · <span className="text-orange">azimer.ru</span>
              </div>
            </div>
          </details>
        )}

        {result && (
          <div className={`rounded-xl p-3 text-sm ${result.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
            {result.text}
          </div>
        )}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            onClick={resetForm}
            disabled={sending}
            className="rounded-full border border-line px-5 py-2.5 text-sm text-graphite-900/60 hover:text-graphite-900 sm:border-0 sm:px-0 sm:py-0 sm:text-xs"
          >
            Очистить форму
          </button>
          <button
            onClick={handleSend}
            disabled={!canSend}
            className="rounded-full bg-orange px-6 py-3 text-sm font-semibold text-white hover:bg-orange-bright disabled:opacity-50"
          >
            {sending ? "Отправка…" : `🚀 Отправить ${channel === "email" ? "Email" : "SMS"}`}
          </button>
        </div>
      </div>
    </div>
  );
}
