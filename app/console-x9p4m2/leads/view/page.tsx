"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAdmin } from "@/components/admin/AdminShell";
import {
  adminFetch,
  fmtDateTime,
  fmtRub,
  STATUS_COLOR,
  STATUS_LABEL,
  SOURCE_LABEL,
  type LeadFull,
  type LeadFileLink,
  type LeadStatus,
  type MessageTemplate,
  type LeadMessage,
} from "@/lib/admin-api";

const STATUSES: LeadStatus[] = ["new", "contacted", "kp_sent", "won", "lost"];

export default function AdminLeadViewPageWrapper() {
  return (
    <Suspense fallback={<p className="py-16 text-center text-graphite-900/40">Загружаем…</p>}>
      <AdminLeadViewPage />
    </Suspense>
  );
}

function AdminLeadViewPage() {
  const { token } = useAdmin();
  const params = useSearchParams();
  const id = params.get("id");

  const [lead, setLead] = useState<LeadFull | null>(null);
  const [files, setFiles] = useState<LeadFileLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editingNotes, setEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [savingStatus, setSavingStatus] = useState<LeadStatus | null>(null);

  // ── Отправка сообщений ──
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [messages, setMessages] = useState<LeadMessage[]>([]);
  const [msgContext, setMsgContext] = useState<{ manager_phone: string; manager_name: string; azimer_site: string }>({
    manager_phone: "—",
    manager_name: "—",
    azimer_site: "https://azimer.ru",
  });
  const [sendChannel, setSendChannel] = useState<"sms" | "email">("sms");
  const [selectedTplId, setSelectedTplId] = useState<string>("");
  const [editingBody, setEditingBody] = useState(false);
  const [bodyDraft, setBodyDraft] = useState("");
  const [subjectDraft, setSubjectDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    if (!id) {
      setError("Не указан id заявки");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [leadR, tplR, msgR, ctxR] = await Promise.all([
        adminFetch<{ ok: true; lead: LeadFull; files: LeadFileLink[] }>(token, { action: "get_lead", id }),
        adminFetch<{ ok: true; templates: MessageTemplate[] }>(token, { action: "list_templates" }),
        adminFetch<{ ok: true; messages: LeadMessage[] }>(token, { action: "list_lead_messages", lead_id: id }),
        adminFetch<{ ok: true; context: { manager_phone: string; manager_name: string; azimer_site: string } }>(
          token, { action: "get_message_context" }
        ).catch(() => ({ ok: true as const, context: msgContext })),
      ]);
      setLead(leadR.lead);
      setFiles(leadR.files ?? []);
      setNotesDraft(leadR.lead.notes ?? "");
      setTemplates(tplR.templates ?? []);
      setMessages(msgR.messages ?? []);
      setMsgContext(ctxR.context);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [id, token]);

  useEffect(() => { load(); }, [load]);

  async function changeStatus(s: LeadStatus) {
    if (!lead || lead.status === s) return;
    setSavingStatus(s);
    try {
      await adminFetch(token, { action: "update_lead_status", id: lead.id, status: s });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSavingStatus(null);
    }
  }

  async function saveNotes() {
    if (!lead) return;
    setSavingNotes(true);
    try {
      await adminFetch(token, { action: "update_lead_notes", id: lead.id, notes: notesDraft });
      setEditingNotes(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSavingNotes(false);
    }
  }

  // ── Помощник: рендер плейсхолдеров локально для превью ──
  function renderPreview(body: string, l: LeadFull | null): string {
    if (!l) return body;
    const est = (l.estimate as any) ?? {};
    const state = est?.state ?? {};
    const map: Record<string, string> = {
      client_name: (l.name ?? "клиент").split(" ")[0] || "клиент",
      name: l.name ?? "",
      phone: l.phone ?? "",
      email: l.email ?? "",
      object_type: state.objectType ?? state.object_type ?? l.object_type ?? "—",
      region: state.region ?? "—",
      kp_total: typeof est.base === "number" ? fmtRub(est.base) : "—",
      kp_range: (typeof est.low === "number" && typeof est.high === "number")
        ? `${fmtRub(est.low)} — ${fmtRub(est.high)}` : "—",
      kp_url: msgContext.azimer_site + "/kp/",
      manager_phone: msgContext.manager_phone,
      manager_name: msgContext.manager_name,
      date: new Date().toLocaleDateString("ru-RU"),
      azimer_site: msgContext.azimer_site,
    };
    return body.replace(/\{\{(\w+)\}\}/g, (_, k) => map[k] ?? `{{${k}}}`);
  }

  const channelTemplates = templates.filter((t) => t.channel === sendChannel);
  const selectedTpl = templates.find((t) => t.id === selectedTplId);
  const effectiveBody = editingBody ? bodyDraft : selectedTpl?.body ?? "";
  const effectiveSubject = editingBody ? subjectDraft : selectedTpl?.subject ?? "";
  const previewBody = renderPreview(effectiveBody, lead);
  const previewSubject = sendChannel === "email" ? renderPreview(effectiveSubject || "", lead) : null;
  const recipientField = sendChannel === "sms" ? lead?.phone : lead?.email;
  const canSend = !!selectedTplId && !!recipientField && !sending;

  function pickTemplate(tplId: string) {
    setSelectedTplId(tplId);
    setEditingBody(false);
    setSendResult(null);
    const t = templates.find((x) => x.id === tplId);
    if (t) {
      setBodyDraft(t.body);
      setSubjectDraft(t.subject ?? "");
    }
  }

  async function handleSend() {
    if (!lead || !selectedTplId) return;
    setSending(true);
    setSendResult(null);
    try {
      const r = await adminFetch<{ ok: boolean; status: string; error?: string }>(token, {
        action: sendChannel === "sms" ? "send_sms" : "send_email",
        lead_id: lead.id,
        template_id: editingBody ? undefined : selectedTplId,
        template_slug: editingBody ? undefined : selectedTpl?.slug,
        custom_body: editingBody ? bodyDraft : undefined,
        custom_subject: editingBody && sendChannel === "email" ? subjectDraft : undefined,
      });
      if (r.ok) {
        setSendResult({ ok: true, text: "✅ Отправлено" });
        setSelectedTplId("");
        setEditingBody(false);
      } else {
        setSendResult({ ok: false, text: "❌ " + (r.error ?? "Ошибка отправки") });
      }
      // обновить историю
      const msgR = await adminFetch<{ ok: true; messages: LeadMessage[] }>(token, {
        action: "list_lead_messages", lead_id: lead.id,
      });
      setMessages(msgR.messages ?? []);
    } catch (e) {
      setSendResult({ ok: false, text: "❌ " + (e instanceof Error ? e.message : String(e)) });
    } finally {
      setSending(false);
    }
  }

  if (loading) return <p className="py-16 text-center text-graphite-900/40">Загружаем…</p>;
  if (error) {
    return (
      <div className="rounded-2xl border border-red-300 bg-red-50 p-6 text-sm text-red-800">
        ❌ {error}
        <div className="mt-3">
          <Link href="/console-x9p4m2/leads/" className="text-xs text-orange hover:underline">
            ← К списку
          </Link>
        </div>
      </div>
    );
  }
  if (!lead) return null;

  const est = lead.estimate as Record<string, unknown> | null;
  const estState = (est?.state ?? {}) as Record<string, unknown>;
  const estLines = Array.isArray(est?.lines) ? (est?.lines as Array<Record<string, unknown>>) : null;

  return (
    <div>
      <div className="flex items-center justify-between">
        <Link href="/console-x9p4m2/leads/" className="text-xs text-orange hover:underline">
          ← К списку
        </Link>
        <span className="font-mono text-xs text-graphite-900/30">{lead.id}</span>
      </div>

      <div className="mt-3 border-b border-line pb-5">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-orange">
          {SOURCE_LABEL[lead.source]}
        </p>
        <h1 className="mt-1 text-3xl font-bold text-graphite-900">{lead.name}</h1>
        <p className="mt-1 text-sm text-graphite-900/60">
          Поступила: <span className="font-mono">{fmtDateTime(lead.created_at)}</span>
          {lead.status_updated_at && lead.status_updated_at !== lead.created_at && (
            <> · статус обновлён: <span className="font-mono">{fmtDateTime(lead.status_updated_at)}</span></>
          )}
        </p>
      </div>

      {/* Смена статуса */}
      <section className="mt-6 rounded-2xl border border-line bg-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-graphite-900/60">
          Статус
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {STATUSES.map((s) => {
            const active = lead.status === s;
            const isLoading = savingStatus === s;
            return (
              <button
                key={s}
                onClick={() => changeStatus(s)}
                disabled={active || isLoading}
                className={`rounded-full px-4 py-2 text-xs font-medium transition-colors ${
                  active
                    ? `${STATUS_COLOR[s]} ring-2 ring-orange ring-offset-2`
                    : "bg-white text-graphite-900/70 border border-line hover:border-orange"
                } ${isLoading ? "opacity-50" : ""}`}
              >
                {isLoading ? "..." : STATUS_LABEL[s]}
              </button>
            );
          })}
        </div>
      </section>

      {/* Отправка SMS / Email клиенту */}
      <section className="mt-6 rounded-2xl border border-line bg-white p-5">
        <header className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-graphite-900/60">
            ✉️ Отправить сообщение клиенту
          </h2>
          <div className="flex gap-1 rounded-full bg-light p-1 text-xs">
            <button
              onClick={() => { setSendChannel("sms"); setSelectedTplId(""); setEditingBody(false); setSendResult(null); }}
              className={`rounded-full px-4 py-1.5 font-medium transition-colors ${sendChannel === "sms" ? "bg-graphite-950 text-light" : "text-graphite-900/60 hover:text-graphite-900"}`}
            >
              📱 SMS
            </button>
            <button
              onClick={() => { setSendChannel("email"); setSelectedTplId(""); setEditingBody(false); setSendResult(null); }}
              className={`rounded-full px-4 py-1.5 font-medium transition-colors ${sendChannel === "email" ? "bg-graphite-950 text-light" : "text-graphite-900/60 hover:text-graphite-900"}`}
            >
              📧 Email
            </button>
          </div>
        </header>

        <p className="mt-3 text-xs text-graphite-900/50">
          Получатель: <span className="font-mono text-graphite-900">{recipientField ?? <span className="text-red-600">— не указан</span>}</span>
          {sendChannel === "email" && !recipientField && (
            <span className="ml-2 italic">Клиент не оставил email — отправка через SMS</span>
          )}
        </p>

        <div className="mt-4 grid gap-2">
          <label className="text-xs uppercase tracking-wider text-graphite-900/40">Шаблон</label>
          <select
            value={selectedTplId}
            onChange={(e) => pickTemplate(e.target.value)}
            className="rounded-xl border border-line bg-light/30 px-3 py-2 text-sm focus:border-orange focus:bg-white focus:outline-none"
          >
            <option value="">— Выберите шаблон —</option>
            {channelTemplates.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        {selectedTplId && (
          <>
            {sendChannel === "email" && (
              <div className="mt-3">
                <label className="text-xs uppercase tracking-wider text-graphite-900/40">Тема</label>
                <input
                  value={editingBody ? subjectDraft : (selectedTpl?.subject ?? "")}
                  onChange={(e) => setSubjectDraft(e.target.value)}
                  onFocus={() => setEditingBody(true)}
                  className="mt-1 w-full rounded-xl border border-line bg-light/30 px-3 py-2 text-sm focus:border-orange focus:bg-white focus:outline-none"
                />
                {editingBody && previewSubject && (
                  <p className="mt-1 text-xs text-graphite-900/40">Превью: <span className="text-graphite-900">{previewSubject}</span></p>
                )}
              </div>
            )}

            <div className="mt-3">
              <div className="flex items-center justify-between">
                <label className="text-xs uppercase tracking-wider text-graphite-900/40">Тело сообщения</label>
                {!editingBody && (
                  <button onClick={() => setEditingBody(true)} className="text-xs text-orange hover:underline">
                    ✏ Изменить перед отправкой
                  </button>
                )}
              </div>
              {editingBody ? (
                <textarea
                  value={bodyDraft}
                  onChange={(e) => setBodyDraft(e.target.value)}
                  rows={sendChannel === "email" ? 10 : 4}
                  className="mt-1 w-full rounded-xl border border-line bg-light/30 px-3 py-2 text-sm font-mono focus:border-orange focus:bg-white focus:outline-none"
                />
              ) : (
                <div className="mt-1 rounded-xl border border-line bg-light/30 px-3 py-2 text-sm font-mono whitespace-pre-wrap text-graphite-900/70">
                  {selectedTpl?.body}
                </div>
              )}
              <p className="mt-2 text-xs text-graphite-900/40">
                Превью с подстановкой:
              </p>
              <div className="mt-1 rounded-xl border border-orange/30 bg-orange/5 px-3 py-2 text-sm whitespace-pre-wrap text-graphite-900">
                {previewBody}
              </div>
              {previewBody.includes("{{") && (
                <p className="mt-1 text-xs text-amber-700">
                  ⚠ Не все плейсхолдеры подставились ({previewBody.match(/\{\{(\w+)\}\}/g)?.join(", ")}). Проверь данные в карточке.
                </p>
              )}
            </div>

            <div className="mt-4 flex items-center justify-between">
              <div>
                {sendResult && (
                  <p className={`text-sm ${sendResult.ok ? "text-green-700" : "text-red-700"}`}>{sendResult.text}</p>
                )}
              </div>
              <div className="flex gap-2">
                {editingBody && (
                  <button
                    onClick={() => { setEditingBody(false); setBodyDraft(selectedTpl?.body ?? ""); setSubjectDraft(selectedTpl?.subject ?? ""); }}
                    className="text-xs text-graphite-900/60 hover:text-graphite-900"
                  >
                    Отмена правки
                  </button>
                )}
                <button
                  onClick={handleSend}
                  disabled={!canSend}
                  className="rounded-full bg-orange px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-bright disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {sending ? "Отправка…" : `🚀 Отправить ${sendChannel === "sms" ? "SMS" : "Email"}`}
                </button>
              </div>
            </div>
          </>
        )}

        {/* История отправок */}
        {messages.length > 0 && (
          <div className="mt-5 border-t border-line pt-4">
            <p className="text-xs uppercase tracking-wider text-graphite-900/40">История ({messages.length})</p>
            <ul className="mt-2 space-y-1.5">
              {messages.map((m) => (
                <li key={m.id} className="flex items-center gap-3 text-xs">
                  <span className="font-mono text-graphite-900/50">{fmtDateTime(m.sent_at)}</span>
                  <span className="rounded bg-light px-2 py-0.5 text-[10px] uppercase tracking-wider">{m.channel}</span>
                  <span className="text-graphite-900/70 truncate flex-1">
                    {m.template_slug ?? "—"} · {m.body_rendered.slice(0, 60)}{m.body_rendered.length > 60 ? "…" : ""}
                  </span>
                  <span className={
                    m.status === "sent" ? "text-green-700" :
                    m.status === "failed" ? "text-red-700" : "text-graphite-900/40"
                  }>
                    {m.status === "sent" ? "✓" : m.status === "failed" ? "✗" : "…"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        {/* Контакт */}
        <section className="rounded-2xl border border-line bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-graphite-900/60">
            Контакт
          </h2>
          <dl className="mt-3 space-y-2 text-sm">
            <Field label="Телефон">
              <a href={`tel:${lead.phone}`} className="font-mono text-graphite-900 hover:text-orange">
                {lead.phone}
              </a>
            </Field>
            <Field label="Email">
              {lead.email ? (
                <a href={`mailto:${lead.email}`} className="text-graphite-900 hover:text-orange">
                  {lead.email}
                </a>
              ) : "—"}
            </Field>
            <Field label="Тип клиента">{lead.client_type ?? "—"}</Field>
            <Field label="Компания">{lead.company ?? "—"}</Field>
            <Field label="Направление">{lead.direction ?? "—"}</Field>
            <Field label="Тип объекта">{lead.object_type ?? "—"}</Field>
          </dl>
        </section>

        {/* Источник трафика */}
        <section className="rounded-2xl border border-line bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-graphite-900/60">
            Откуда пришёл
          </h2>
          <dl className="mt-3 space-y-2 text-sm">
            <Field label="UTM source">{lead.utm_source ?? "—"}</Field>
            <Field label="UTM medium">{lead.utm_medium ?? "—"}</Field>
            <Field label="UTM campaign">{lead.utm_campaign ?? "—"}</Field>
            <Field label="UTM content">{lead.utm_content ?? "—"}</Field>
            <Field label="UTM term">{lead.utm_term ?? "—"}</Field>
            <Field label="Referrer">
              {lead.referrer ? (
                <span className="break-all text-xs">{lead.referrer}</span>
              ) : "—"}
            </Field>
            <Field label="Landing page">
              <span className="font-mono text-xs">{lead.landing_page ?? "—"}</span>
            </Field>
          </dl>
        </section>
      </div>

      {/* Сообщение клиента */}
      {lead.message && (
        <section className="mt-6 rounded-2xl border border-line bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-graphite-900/60">
            Сообщение клиента
          </h2>
          <p className="mt-3 whitespace-pre-wrap text-sm text-graphite-900">{lead.message}</p>
        </section>
      )}

      {/* Заметки менеджера */}
      <section className="mt-6 rounded-2xl border border-line bg-white p-5">
        <header className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-graphite-900/60">
            Заметки менеджера
          </h2>
          {!editingNotes && (
            <button
              onClick={() => setEditingNotes(true)}
              className="text-xs text-orange hover:underline"
            >
              ✏ {lead.notes ? "Изменить" : "Добавить"}
            </button>
          )}
        </header>
        {editingNotes ? (
          <div className="mt-3">
            <textarea
              value={notesDraft}
              onChange={(e) => setNotesDraft(e.target.value)}
              autoFocus
              rows={5}
              className="w-full rounded-xl border border-line bg-light/30 px-3 py-2 text-sm focus:border-orange focus:bg-white focus:outline-none"
              placeholder="Договорились о звонке завтра в 11:00; нужен расчёт ангара 12×24…"
            />
            <div className="mt-3 flex justify-end gap-2">
              <button
                onClick={() => { setEditingNotes(false); setNotesDraft(lead.notes ?? ""); }}
                className="text-xs text-graphite-900/60 hover:text-graphite-900"
              >
                Отмена
              </button>
              <button
                onClick={saveNotes}
                disabled={savingNotes}
                className="rounded-full bg-orange px-4 py-1 text-xs font-semibold text-white hover:bg-orange-bright disabled:opacity-50"
              >
                {savingNotes ? "..." : "Сохранить"}
              </button>
            </div>
          </div>
        ) : (
          <p className="mt-3 whitespace-pre-wrap text-sm text-graphite-900">
            {lead.notes || <span className="text-graphite-900/30">Заметок нет</span>}
          </p>
        )}
      </section>

      {/* Расчёт / estimate */}
      {est && (
        <section className="mt-6 rounded-2xl border border-line bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-graphite-900/60">
            Расчёт калькулятора
          </h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {typeof est.low === "number" && typeof est.high === "number" && (
              <div className="rounded-xl bg-light p-3">
                <p className="text-xs text-graphite-900/50">Диапазон</p>
                <p className="mt-1 font-mono text-sm font-semibold">
                  {fmtRub(est.low as number)} — {fmtRub(est.high as number)}
                </p>
              </div>
            )}
            {typeof est.area === "number" && (
              <div className="rounded-xl bg-light p-3">
                <p className="text-xs text-graphite-900/50">Площадь</p>
                <p className="mt-1 font-mono text-sm font-semibold">{est.area as number} м²</p>
              </div>
            )}
            {typeof estState.length === "number" && typeof estState.width === "number" && (
              <div className="rounded-xl bg-light p-3">
                <p className="text-xs text-graphite-900/50">Размеры</p>
                <p className="mt-1 font-mono text-sm font-semibold">
                  {estState.length as number}×{estState.width as number}
                  {typeof estState.height === "number" ? `×${estState.height}` : ""} м
                </p>
              </div>
            )}
          </div>

          {lead.catalog_version && (
            <p className="mt-3 font-mono text-[11px] text-graphite-900/40">
              Версия каталога: {lead.catalog_version}
            </p>
          )}

          {/* Параметры объекта (state) */}
          {Object.keys(estState).length > 0 && (
            <details className="mt-4">
              <summary className="cursor-pointer text-xs text-graphite-900/60 hover:text-orange">
                Параметры объекта ({Object.keys(estState).length})
              </summary>
              <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                {orderedStateEntries(estState).map(([k, v]) => (
                  <Field key={k} label={prettifyStateKey(k)}>{prettifyStateValue(k, v)}</Field>
                ))}
              </dl>
            </details>
          )}

          {/* Строки расчёта */}
          {estLines && estLines.length > 0 && (
            <details className="mt-4">
              <summary className="cursor-pointer text-xs text-graphite-900/60 hover:text-orange">
                Строки расчёта ({estLines.length})
              </summary>
              <div className="mt-3 max-h-96 overflow-y-auto rounded-xl border border-line bg-light/30">
                <table className="w-full text-xs">
                  <tbody>
                    {estLines.map((l, i) => {
                      // Поддерживаем оба формата:
                      //  • {label, value} — pricing.ts (сайт /estimate) и calcEstimate в боте
                      //  • {name, total} — полные LineItem из engine v3
                      //  • {label, cost} — устаревший формат, на случай старых заявок
                      const label = (l.label ?? l.name ?? l.key ?? "—") as string;
                      const priceRaw = l.value ?? l.total ?? l.cost;
                      const price = typeof priceRaw === "number" ? priceRaw : null;
                      return (
                        <tr key={i} className="border-b border-line/40 last:border-0">
                          <td className="px-3 py-1.5 text-graphite-900">{String(label)}</td>
                          <td className="px-3 py-1.5 text-right font-mono text-graphite-900/70">
                            {price !== null ? fmtRub(price) : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </details>
          )}
        </section>
      )}

      {/* Файлы */}
      {files.length > 0 && (
        <section className="mt-6 rounded-2xl border border-line bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-graphite-900/60">
            Прикреплённые файлы
          </h2>
          <ul className="mt-3 space-y-2">
            {files.map((f, i) => (
              <li key={i} className="flex items-center justify-between rounded-xl bg-light p-3">
                <span className="truncate text-sm text-graphite-900">{f.path.split("/").pop()}</span>
                {f.url ? (
                  <a
                    href={f.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-orange hover:underline whitespace-nowrap"
                  >
                    Скачать →
                  </a>
                ) : (
                  <span className="text-xs text-graphite-900/40">URL недоступен</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-3 items-baseline">
      <dt className="text-xs uppercase tracking-wider text-graphite-900/40">{label}</dt>
      <dd className="text-sm text-graphite-900 break-words">{children}</dd>
    </div>
  );
}

function formatVal(v: unknown): string {
  if (v == null) return "—";
  if (typeof v === "boolean") return v ? "да" : "нет";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

// ────────────────── Человеко-читаемые лейблы параметров заявки ──────────────────

// Лейблы ключей (то что слева)
const STATE_KEY_LABELS: Record<string, string> = {
  objectType: "Тип объекта",
  region:     "Регион",
  frame:      "Каркас",
  length:     "Длина, м",
  width:      "Ширина, м",
  height:     "Высота, м",
  cladding:   "Стены",
  roofing:    "Кровля",
  foundation: "Фундамент",
  options:    "Доборные элементы",
  // на случай если поле уже мапилось до этого через бот:
  object_type: "Тип объекта",
  cladding_thk: "Толщина панели, мм",
  crane_t:    "Мостовой кран, т",
  notes:      "Примечание",
};

// Порядок отображения (что не в списке — в конце алфавитом)
const STATE_KEY_ORDER = [
  "objectType", "object_type", "region",
  "length", "width", "height",
  "frame",
  "cladding", "cladding_thk",
  "roofing",
  "foundation",
  "options",
  "crane_t",
  "notes",
];

// Лейблы значений по полям (frame=metal → "Металлокаркас")
const STATE_VALUE_LABELS: Record<string, Record<string, string>> = {
  objectType: {
    sklad: "Склад", angar: "Ангар", production: "Производство",
    commercial: "Коммерческое", naves: "Навес", modular: "Модульное здание",
    residential: "Жилое (модуль)", tent_arched: "🏕 Арочный тент (эконом)",
  },
  object_type: {
    sklad: "Склад", angar: "Ангар", production: "Производство",
    commercial: "Коммерческое", naves: "Навес", modular: "Модульное здание",
    residential: "Жилое (модуль)", tent_arched: "🏕 Арочный тент (эконом)",
  },
  region: {
    krsk_city:      "Красноярск + пригороды",
    krsk_south:     "Юг края / Хакасия",
    krsk_kansk:     "Канск / Ачинск",
    krsk_north_pre: "Лесосибирск / Енисейск",
    krsk_priangar:  "Богучаны / Кодинск",
    krsk_evenkia:   "❄️ Эвенкия (мерзлота)",
    krsk_taymyr:    "❄️ Таймыр / Норильск",
    tuva:           "Тува (сейсм 8)",
    kemerovo:       "Кемеровская обл.",
    irkutsk:        "Иркутская обл.",
    altai:          "Алтай",
    other:          "Другое направление",
  },
  frame: {
    lstk: "ЛСТК", metal: "Металлокаркас", modular: "Модульный",
  },
  cladding: {
    none: "Без стен", proflist: "Профлист",
    sandwich_minvata: "Сэндвич минвата", sandwich_pir: "Сэндвич PIR",
  },
  roofing: {
    proflist: "Профлист",
    sandwich: "Сэндвич", sandwich_minvata: "Сэндвич минвата", sandwich_pir: "Сэндвич PIR",
  },
  foundation: {
    none: "Без фундамента",
    pile: "Свайно-винтовой", pile_screw: "Свайно-винтовой", pile_grillage: "Свайный ростверк",
    strip: "Ленточный",
    slab: "Плита 200мм", slab_200: "Плита 200мм", slab_300: "Плита 300мм",
  },
};

function prettifyStateKey(k: string): string {
  return STATE_KEY_LABELS[k] ?? k;
}

function prettifyStateValue(k: string, v: unknown): string {
  if (v == null || v === "") return "—";
  // options: { gate: 4, window: 2, door: 1 } → «4 ворот, 2 окна, 1 дверь»
  if (k === "options" && typeof v === "object" && v !== null) {
    const o = v as Record<string, unknown>;
    const parts: string[] = [];
    const g = Number(o.gate ?? 0); if (g > 0) parts.push(`${g} ${plural(g, "ворота", "ворот", "ворот")}`);
    const w = Number(o.window ?? 0); if (w > 0) parts.push(`${w} ${plural(w, "окно", "окна", "окон")}`);
    const d = Number(o.door ?? 0); if (d > 0) parts.push(`${d} ${plural(d, "дверь", "двери", "дверей")}`);
    return parts.length > 0 ? parts.join(", ") : "нет";
  }
  // Маппинг enum → человеко-читаемое значение
  if (typeof v === "string" && STATE_VALUE_LABELS[k]?.[v]) {
    return STATE_VALUE_LABELS[k][v];
  }
  return formatVal(v);
}

function plural(n: number, one: string, few: string, many: string): string {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
  return many;
}

function orderedStateEntries(state: Record<string, unknown>): Array<[string, unknown]> {
  const known = STATE_KEY_ORDER.filter((k) => k in state).map((k) => [k, state[k]] as [string, unknown]);
  const knownSet = new Set(STATE_KEY_ORDER);
  const rest = Object.entries(state)
    .filter(([k]) => !knownSet.has(k))
    .sort(([a], [b]) => a.localeCompare(b));
  return [...known, ...rest];
}
