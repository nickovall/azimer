"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAdmin } from "@/components/admin/AdminShell";
import {
  adminFetch,
  deleteLead,
  deleteLeadDocument,
  fmtBytes,
  fmtDateTime,
  fmtRub,
  getLeadDocumentUrl,
  uploadLeadFileDirect,
  CONTRACT_STATUS_LABEL,
  DOCUMENT_TYPE_LABEL,
  INVOICE_STATUS_LABEL,
  KP_STATUS_LABEL,
  PAYMENT_STATUS_LABEL,
  SOURCE_CHANNEL_LABEL,
  STATUS_COLOR,
  STATUS_LABEL,
  SOURCE_LABEL,
  type DealCommission,
  type LeadDocument,
  type LeadDocumentType,
  type LeadFull,
  type LeadFileLink,
  type LeadStatus,
  type MessageTemplate,
  type LeadMessage,
} from "@/lib/admin-api";
import {
  NEXT_STEP_HINT,
  NEXT_STEP_BUTTON,
  NEXT_STATUS,
  STATUS_FRIENDLY,
  URGENCY_BADGE,
  URGENCY_BORDER,
  URGENCY_DOT,
  URGENCY_LABEL,
  computeUrgency,
} from "@/lib/admin-pipeline";

const STATUSES: LeadStatus[] = [
  "new",
  "accepted",
  "tz_received",
  "kp_preparing",
  "kp_sent",
  "kp_approved",
  "sent_to_accountant",
  "invoice_issued",
  "paid_partial",
  "paid_full",
  "won",
  "lost",
  "commission_paid",
];
const DOC_TYPES: LeadDocumentType[] = ["tz", "kp", "contract", "invoice", "act", "payment", "mail", "drawing", "other"];

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
  const [documents, setDocuments] = useState<LeadDocument[]>([]);
  const [commission, setCommission] = useState<DealCommission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editingNotes, setEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [savingStatus, setSavingStatus] = useState<LeadStatus | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [folderDraft, setFolderDraft] = useState("");
  const [savingFolder, setSavingFolder] = useState(false);
  const [docDraft, setDocDraft] = useState({
    doc_type: "kp" as LeadDocumentType,
    title: "",
    file_url: "",
    amount: "",
    uploaded_by: "",
    notes: "",
  });
  const [savingDocument, setSavingDocument] = useState(false);
  const [actionResult, setActionResult] = useState<string | null>(null);
  const [commissionDraft, setCommissionDraft] = useState({
    commission_rate: "0.05",
    kp_amount: "0",
    invoice_amount: "0",
    paid_amount: "0",
    commission_paid: "0",
    payment_status: "not_paid" as "not_paid" | "partial" | "paid",
    notes: "",
  });
  const [savingCommission, setSavingCommission] = useState(false);

  // День 5 — модалка закрытия сделки
  const [closeModalOpen, setCloseModalOpen] = useState(false);
  const [closing, setClosing] = useState(false);

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
        adminFetch<{
          ok: true;
          lead: LeadFull;
          files: LeadFileLink[];
          documents: LeadDocument[];
          commission: DealCommission | null;
        }>(token, { action: "get_lead", id }),
        adminFetch<{ ok: true; templates: MessageTemplate[] }>(token, { action: "list_templates" }),
        adminFetch<{ ok: true; messages: LeadMessage[] }>(token, { action: "list_lead_messages", lead_id: id }),
        adminFetch<{ ok: true; context: { manager_phone: string; manager_name: string; azimer_site: string } }>(
          token, { action: "get_message_context" }
        ).catch(() => ({ ok: true as const, context: msgContext })),
      ]);
      setLead(leadR.lead);
      setFiles(leadR.files ?? []);
      setDocuments(leadR.documents ?? []);
      setCommission(leadR.commission ?? null);
      setNotesDraft(leadR.lead.notes ?? "");
      setFolderDraft(leadR.lead.project_folder_url ?? "");
      setCommissionDraft({
        commission_rate: String(leadR.commission?.commission_rate ?? leadR.lead.commission_rate ?? 0.05),
        kp_amount: String(leadR.commission?.kp_amount ?? 0),
        invoice_amount: String(leadR.commission?.invoice_amount ?? 0),
        paid_amount: String(leadR.commission?.paid_amount ?? 0),
        commission_paid: String(leadR.commission?.commission_paid ?? 0),
        payment_status: leadR.commission?.payment_status ?? leadR.lead.payment_status ?? "not_paid",
        notes: leadR.commission?.notes ?? leadR.lead.commission_notes ?? "",
      });
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

  async function handleDelete() {
    if (!lead) return;
    const ok = window.confirm(
      `Удалить заявку «${lead.name}» безвозвратно?\n\nВместе с ней удалятся связанные документы, сообщения и комиссия. Отменить нельзя.`,
    );
    if (!ok) return;
    setDeleting(true);
    try {
      await deleteLead(token, lead.id);
      window.location.href = "/console-x9p4m2/leads/";
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setDeleting(false);
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

  async function saveFolder() {
    if (!lead) return;
    setSavingFolder(true);
    setActionResult(null);
    try {
      await adminFetch(token, {
        action: "update_lead_deal_fields",
        id: lead.id,
        project_folder_url: folderDraft,
      });
      setActionResult("Папка сделки сохранена");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSavingFolder(false);
    }
  }

  async function markTenderLead() {
    if (!lead) return;
    setActionResult(null);
    try {
      await adminFetch(token, {
        action: "update_lead_deal_fields",
        id: lead.id,
        source_channel: "tender",
        commission_eligible: true,
        commission_rate: 0.05,
      });
      setActionResult("Лид отмечен как тендерный, комиссия включена");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function addDocument() {
    if (!lead) return;
    setSavingDocument(true);
    setActionResult(null);
    try {
      await adminFetch(token, {
        action: "add_lead_document",
        lead_id: lead.id,
        ...docDraft,
      });
      setDocDraft({
        doc_type: "kp",
        title: "",
        file_url: "",
        amount: "",
        uploaded_by: "",
        notes: "",
      });
      setActionResult("Документ добавлен");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSavingDocument(false);
    }
  }

  async function sendToAccountant() {
    if (!lead) return;
    setSavingStatus("sent_to_accountant");
    setActionResult(null);
    try {
      const r = await adminFetch<{ ok: true; delivery: string; notification_text: string; delivery_error?: string | null }>(token, {
        action: "send_to_accountant",
        id: lead.id,
      });
      setActionResult(
        r.delivery === "manual"
          ? `Статус обновлен. Уведомление для ручной отправки:\n${r.notification_text}`
          : `Бухгалтеру отправлено через ${r.delivery}`,
      );
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSavingStatus(null);
    }
  }

  async function saveCommission() {
    if (!lead) return;
    setSavingCommission(true);
    setActionResult(null);
    try {
      await adminFetch(token, {
        action: "update_deal_commission",
        lead_id: lead.id,
        ...commissionDraft,
      });
      setActionResult("Комиссия обновлена");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSavingCommission(false);
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

  const currentStatus = (lead.deal_status ?? lead.status) as LeadStatus;
  const urgency = computeUrgency({ status: currentStatus, statusUpdatedAt: lead.status_updated_at });
  const nextStatus = NEXT_STATUS[currentStatus];
  const nextStepLabel = NEXT_STEP_BUTTON[currentStatus];

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

      {/* CTA hero — что делать дальше */}
      <section className={`mt-6 rounded-2xl border border-line bg-white p-5 ${URGENCY_BORDER[urgency]}`}>
        <div className="flex flex-wrap items-start gap-4">
          <span className={`mt-2 inline-block h-3 w-3 shrink-0 rounded-full ${URGENCY_DOT[urgency]}`} />
          <div className="min-w-0 flex-1">
            <p className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider ${URGENCY_BADGE[urgency]}`}>
              {URGENCY_LABEL[urgency]} · {STATUS_FRIENDLY[currentStatus]}
            </p>
            <h2 className="mt-2 text-xl font-bold text-graphite-900 sm:text-2xl">
              {NEXT_STEP_HINT[currentStatus]}
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {nextStatus && nextStepLabel && (
              <button
                onClick={() => changeStatus(nextStatus)}
                disabled={savingStatus !== null}
                className="rounded-full bg-orange px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-bright disabled:opacity-50"
              >
                {savingStatus === nextStatus ? "..." : nextStepLabel}
              </button>
            )}
            {currentStatus !== "commission_paid" && currentStatus !== "lost" && (
              <button
                onClick={() => setCloseModalOpen(true)}
                className="rounded-full border-2 border-graphite-950 bg-white px-5 py-2 text-sm font-semibold text-graphite-900 transition-colors hover:bg-graphite-950 hover:text-light"
              >
                Закрыть сделку
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Смена статуса */}
      <section className="mt-6 rounded-2xl border border-line bg-white p-5">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-graphite-900/60">
            Атрибуция сделки
          </h2>
          {lead.source_channel !== "tender" && (
            <button
              onClick={markTenderLead}
              className="rounded-full border border-line px-4 py-2 text-xs font-medium text-graphite-900/70 hover:border-orange"
            >
              Сделать тендерным лидом
            </button>
          )}
        </header>
        <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2">
          <Field label="Lead ID">{lead.lead_code ?? lead.id}</Field>
          <Field label="Канал">{SOURCE_CHANNEL_LABEL[lead.source_channel]}</Field>
          <Field label="Источник">
            {lead.external_source_url ? (
              <a href={lead.external_source_url} target="_blank" rel="noopener noreferrer" className="break-all text-orange hover:underline">
                {lead.external_source || lead.external_source_url}
              </a>
            ) : lead.external_source || SOURCE_LABEL[lead.source]}
          </Field>
          <Field label="Кем создан">{lead.created_by_system ?? lead.source}</Field>
          <Field label="КП">{KP_STATUS_LABEL[lead.kp_status]}</Field>
          <Field label="Договор">{CONTRACT_STATUS_LABEL[lead.contract_status]}</Field>
          <Field label="Счет">{INVOICE_STATUS_LABEL[lead.invoice_status]}</Field>
          <Field label="Оплата">{PAYMENT_STATUS_LABEL[lead.payment_status]}</Field>
          <Field label="Комиссия">
            {lead.commission_eligible ? `да, ${formatPercent(lead.commission_rate)}` : "нет"}
          </Field>
        </dl>

        <div className="mt-4 flex flex-col gap-2 border-t border-line pt-4 sm:flex-row">
          <input
            value={folderDraft}
            onChange={(e) => setFolderDraft(e.target.value)}
            placeholder="Ссылка на папку сделки в Google Drive"
            className="min-w-0 flex-1 rounded-xl border border-line bg-light/30 px-3 py-2 text-sm focus:border-orange focus:bg-white focus:outline-none"
          />
          <button
            onClick={saveFolder}
            disabled={savingFolder}
            className="rounded-full bg-graphite-950 px-4 py-2 text-xs font-semibold text-light disabled:opacity-50"
          >
            {savingFolder ? "..." : "Сохранить папку"}
          </button>
          {lead.project_folder_url && (
            <a
              href={lead.project_folder_url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-line px-4 py-2 text-center text-xs font-medium text-orange hover:bg-light"
            >
              Открыть Drive
            </a>
          )}
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-line bg-white p-5">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-graphite-900/60">
              📁 Документы сделки
            </h2>
            <p className="mt-0.5 text-xs text-graphite-900/45">
              Файлы хранятся в Supabase под Lead ID. Перетащи или нажми «+ Файл» на нужную папку.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/console-x9p4m2/leads/kp/?id=${lead.id}`}
              className="rounded-full bg-graphite-950 px-4 py-2 text-xs font-semibold text-light hover:bg-orange"
            >
              🧮 Редактор КП
            </Link>
            <button
              onClick={sendToAccountant}
              disabled={savingStatus === "sent_to_accountant"}
              className="rounded-full bg-orange px-4 py-2 text-xs font-semibold text-white hover:bg-orange-bright disabled:opacity-50"
            >
              {savingStatus === "sent_to_accountant" ? "..." : "📤 Передать бухгалтеру"}
            </button>
          </div>
        </header>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {DOC_FOLDERS.map((folder) => (
            <DocFolder
              key={folder.docType}
              folder={folder}
              documents={documents.filter((d) => d.doc_type === folder.docType)}
              leadId={lead.id}
              token={token}
              onChange={load}
            />
          ))}
        </div>

        {/* Внешние ссылки на Drive — для случая «файл уже там, не хочу заливать» */}
        <details className="mt-4 rounded-xl border border-line bg-light/30 p-3">
          <summary className="cursor-pointer text-xs text-graphite-900/60 hover:text-graphite-900">
            🔗 Добавить ссылкой на Google Drive (если файл уже там)
          </summary>
          <div className="mt-3 grid gap-2 md:grid-cols-[140px_1fr_1fr_120px]">
            <select
              value={docDraft.doc_type}
              onChange={(e) => setDocDraft((d) => ({ ...d, doc_type: e.target.value as LeadDocumentType }))}
              className="rounded-xl border border-line bg-white px-3 py-2 text-sm focus:border-orange focus:outline-none"
            >
              {DOC_TYPES.map((t) => (
                <option key={t} value={t}>{DOCUMENT_TYPE_LABEL[t]}</option>
              ))}
            </select>
            <input
              value={docDraft.title}
              onChange={(e) => setDocDraft((d) => ({ ...d, title: e.target.value }))}
              placeholder="Название"
              className="rounded-xl border border-line bg-white px-3 py-2 text-sm focus:border-orange focus:outline-none"
            />
            <input
              value={docDraft.file_url}
              onChange={(e) => setDocDraft((d) => ({ ...d, file_url: e.target.value }))}
              placeholder="https://drive.google.com/…"
              className="rounded-xl border border-line bg-white px-3 py-2 text-sm focus:border-orange focus:outline-none"
            />
            <button
              onClick={addDocument}
              disabled={savingDocument || !docDraft.title.trim() || !docDraft.file_url.trim()}
              className="rounded-full bg-graphite-950 px-4 py-2 text-xs font-semibold text-light disabled:opacity-50"
            >
              {savingDocument ? "..." : "Добавить ссылку"}
            </button>
            <input
              value={docDraft.amount}
              onChange={(e) => setDocDraft((d) => ({ ...d, amount: e.target.value }))}
              placeholder="Сумма ₽"
              className="rounded-xl border border-line bg-white px-3 py-2 text-sm focus:border-orange focus:outline-none md:col-span-1"
            />
            <input
              value={docDraft.notes}
              onChange={(e) => setDocDraft((d) => ({ ...d, notes: e.target.value }))}
              placeholder="Комментарий"
              className="rounded-xl border border-line bg-white px-3 py-2 text-sm focus:border-orange focus:outline-none md:col-span-3"
            />
          </div>
        </details>
      </section>

      {lead.source_channel === "tender" && (
        <section className="mt-6 rounded-2xl border border-line bg-white p-5">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-graphite-900/60">
              Комиссия по тендеру
            </h2>
            {!lead.commission_eligible && (
              <button
                onClick={markTenderLead}
                className="rounded-full border border-line px-4 py-2 text-xs font-medium text-graphite-900/70 hover:border-orange"
              >
                Включить 5%
              </button>
            )}
          </header>
          {lead.commission_eligible ? (
            <>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <MoneyInput label="Ставка" value={commissionDraft.commission_rate} onChange={(v) => setCommissionDraft((d) => ({ ...d, commission_rate: v }))} />
                <MoneyInput label="Сумма КП" value={commissionDraft.kp_amount} onChange={(v) => setCommissionDraft((d) => ({ ...d, kp_amount: v }))} />
                <MoneyInput label="Сумма счета" value={commissionDraft.invoice_amount} onChange={(v) => setCommissionDraft((d) => ({ ...d, invoice_amount: v }))} />
                <MoneyInput label="Оплачено" value={commissionDraft.paid_amount} onChange={(v) => setCommissionDraft((d) => ({ ...d, paid_amount: v }))} />
                <MoneyInput label="Комиссия выплачена" value={commissionDraft.commission_paid} onChange={(v) => setCommissionDraft((d) => ({ ...d, commission_paid: v }))} />
                <label className="grid gap-1 text-xs uppercase tracking-wider text-graphite-900/40">
                  Оплата
                  <select
                    value={commissionDraft.payment_status}
                    onChange={(e) => setCommissionDraft((d) => ({ ...d, payment_status: e.target.value as "not_paid" | "partial" | "paid" }))}
                    className="rounded-xl border border-line bg-light/30 px-3 py-2 text-sm normal-case tracking-normal text-graphite-900 focus:border-orange focus:bg-white focus:outline-none"
                  >
                    <option value="not_paid">нет</option>
                    <option value="partial">частично</option>
                    <option value="paid">оплачено</option>
                  </select>
                </label>
              </div>
              <textarea
                value={commissionDraft.notes}
                onChange={(e) => setCommissionDraft((d) => ({ ...d, notes: e.target.value }))}
                placeholder="Заметки по комиссии"
                rows={2}
                className="mt-3 w-full rounded-xl border border-line bg-light/30 px-3 py-2 text-sm focus:border-orange focus:bg-white focus:outline-none"
              />
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-graphite-900/60">
                  К выплате: <span className="font-mono text-graphite-900">{fmtRub(commission?.commission_due ?? Number(commissionDraft.paid_amount || 0) * Number(commissionDraft.commission_rate || 0))}</span>
                </p>
                <button
                  onClick={saveCommission}
                  disabled={savingCommission}
                  className="rounded-full bg-graphite-950 px-4 py-2 text-xs font-semibold text-light disabled:opacity-50"
                >
                  {savingCommission ? "..." : "Сохранить комиссию"}
                </button>
              </div>
            </>
          ) : (
            <p className="mt-4 text-sm text-graphite-900/50">
              Тендерный канал включен, но комиссия пока не отмечена.
            </p>
          )}
        </section>
      )}

      {actionResult && (
        <div className="mt-6 whitespace-pre-wrap rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          {actionResult}
        </div>
      )}

      <section className="mt-6 rounded-2xl border border-line bg-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-graphite-900/60">
          Статус
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {STATUSES.map((s) => {
            const active = (lead.deal_status ?? lead.status) === s;
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

      {/* Опасная зона — удаление мусорного/спам-лида */}
      <section className="mt-6 rounded-2xl border border-red-200 bg-red-50/40 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-red-800">Удалить заявку</h2>
            <p className="mt-0.5 text-xs text-red-700/70">
              Безвозвратно — для мусора и спама. Удалятся также документы, сообщения и комиссия этого лида.
            </p>
          </div>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="shrink-0 rounded-full border border-red-300 bg-white px-5 py-2.5 text-sm font-semibold text-red-700 transition-colors hover:bg-red-600 hover:text-white disabled:opacity-50"
          >
            {deleting ? "Удаляем…" : "🗑 Удалить безвозвратно"}
          </button>
        </div>
      </section>

      {closeModalOpen && (
        <CloseDealModal
          lead={lead}
          token={token}
          closing={closing}
          setClosing={setClosing}
          onClose={() => setCloseModalOpen(false)}
          onDone={async () => {
            setCloseModalOpen(false);
            await load();
          }}
        />
      )}
    </div>
  );
}

function CloseDealModal({
  lead, token, closing, setClosing, onClose, onDone,
}: {
  lead: LeadFull;
  token: string;
  closing: boolean;
  setClosing: (b: boolean) => void;
  onClose: () => void;
  onDone: () => void | Promise<void>;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [outcome, setOutcome] = useState<"won" | "lost">("won");
  const [finalAmount, setFinalAmount] = useState<string>(() => {
    const kp = (lead as any).commission?.kp_amount ?? (lead as any).doc_summary?.kp_amount ?? "";
    return kp ? String(kp) : "";
  });
  const [paidAmount, setPaidAmount] = useState<string>("");
  const [contractDate, setContractDate] = useState(today);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [err, setErr] = useState<string | null>(null);

  async function handleSubmit() {
    setClosing(true);
    setErr(null);
    try {
      const payload: { action: string; [k: string]: unknown } = {
        action: "close_lead",
        id: lead.id,
        outcome,
      };
      if (outcome === "won") {
        payload.final_amount = finalAmount ? Number(finalAmount) : null;
        payload.paid_amount = paidAmount ? Number(paidAmount) : null;
        payload.contract_date = contractDate || null;
        payload.note = note || null;
      } else {
        payload.reason = reason || null;
        payload.note = note || null;
      }
      await adminFetch(token, payload);
      await onDone();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setClosing(false);
    }
  }

  const finalN = Number(finalAmount) || 0;
  const paidN = Number(paidAmount) || 0;
  const previewStatus = finalN > 0 && paidN >= finalN
    ? (lead.source_channel === "tender" && lead.commission_eligible ? "Закрыто (комиссия выплачена)" : "Оплачено полностью")
    : paidN > 0
    ? "Оплачено частично"
    : "Договор подписан";

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end justify-center bg-graphite-950/40 backdrop-blur-sm sm:items-center"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
      >
        <header className="border-b border-line px-5 py-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-wider text-graphite-900/50">
                {lead.lead_code ?? lead.id.slice(0, 8)}
              </p>
              <h2 className="mt-0.5 text-lg font-bold text-graphite-900">
                Закрыть сделку
              </h2>
              <p className="mt-0.5 text-xs text-graphite-900/60">{lead.company || lead.name}</p>
            </div>
            <button onClick={onClose} className="text-graphite-900/50 hover:text-graphite-900">✕</button>
          </div>
        </header>

        <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Тоггл исхода */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setOutcome("won")}
              className={`rounded-xl border-2 px-4 py-3 text-sm font-semibold transition-colors ${
                outcome === "won"
                  ? "border-green-500 bg-green-50 text-green-900"
                  : "border-line bg-white text-graphite-900/60 hover:border-green-300"
              }`}
            >
              ✅ Выиграли
            </button>
            <button
              onClick={() => setOutcome("lost")}
              className={`rounded-xl border-2 px-4 py-3 text-sm font-semibold transition-colors ${
                outcome === "lost"
                  ? "border-red-500 bg-red-50 text-red-900"
                  : "border-line bg-white text-graphite-900/60 hover:border-red-300"
              }`}
            >
              ❌ Отказали
            </button>
          </div>

          {outcome === "won" ? (
            <>
              <label className="block">
                <span className="text-xs uppercase tracking-wider text-graphite-900/45">Финальная сумма договора, ₽</span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={finalAmount}
                  onChange={(e) => setFinalAmount(e.target.value)}
                  placeholder="4 800 000"
                  className="mt-1 w-full rounded-xl border border-line bg-white px-3 py-2.5 text-base tabular-nums focus:border-orange focus:outline-none"
                />
              </label>

              <label className="block">
                <span className="text-xs uppercase tracking-wider text-graphite-900/45">Дата подписания договора</span>
                <input
                  type="date"
                  value={contractDate}
                  onChange={(e) => setContractDate(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-line bg-white px-3 py-2.5 text-base focus:border-orange focus:outline-none"
                />
              </label>

              <label className="block">
                <span className="text-xs uppercase tracking-wider text-graphite-900/45">Оплачено уже, ₽</span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  placeholder="0 — если оплата ещё не пришла"
                  className="mt-1 w-full rounded-xl border border-line bg-white px-3 py-2.5 text-base tabular-nums focus:border-orange focus:outline-none"
                />
                <p className="mt-1 text-xs text-graphite-900/45">
                  Оставь 0 если оплата ещё впереди. Когда придёт — закроешь второй раз с полной суммой.
                </p>
              </label>

              <div className="rounded-xl bg-orange/5 border border-orange/30 p-3 text-sm">
                <p className="text-xs uppercase tracking-wider text-graphite-900/60">После закрытия:</p>
                <p className="mt-1 font-semibold text-graphite-900">{previewStatus}</p>
                {lead.source_channel === "tender" && lead.commission_eligible && paidN > 0 && (
                  <p className="mt-1 text-xs text-graphite-900/60 font-mono">
                    Комиссия: {fmtRub(paidN * (lead.commission_rate || 0.05))}
                  </p>
                )}
              </div>
            </>
          ) : (
            <label className="block">
              <span className="text-xs uppercase tracking-wider text-graphite-900/45">Причина отказа</span>
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Дорого, выбрали другого, сроки, и т.д."
                className="mt-1 w-full rounded-xl border border-line bg-white px-3 py-2.5 text-base focus:border-orange focus:outline-none"
              />
              <p className="mt-1 text-xs text-graphite-900/45">
                Сохраняется в заметках для аналитики. Не обязательно.
              </p>
            </label>
          )}

          <label className="block">
            <span className="text-xs uppercase tracking-wider text-graphite-900/45">Комментарий (опционально)</span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Любая важная деталь"
              className="mt-1 w-full rounded-xl border border-line bg-white px-3 py-2 text-sm focus:border-orange focus:outline-none"
            />
          </label>

          {err && <p className="text-sm text-red-700">{err}</p>}
        </div>

        <footer className="flex justify-end gap-2 border-t border-line bg-light/30 px-5 py-3">
          <button
            onClick={onClose}
            disabled={closing}
            className="rounded-full border border-line bg-white px-5 py-2 text-sm font-medium text-graphite-900/70 hover:border-graphite-950"
          >
            Отмена
          </button>
          <button
            onClick={handleSubmit}
            disabled={closing || (outcome === "won" && !finalAmount)}
            className={`rounded-full px-5 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-50 ${
              outcome === "won" ? "bg-green-600 hover:bg-green-700" : "bg-graphite-950 hover:bg-red-700"
            }`}
          >
            {closing ? "..." : outcome === "won" ? "✅ Закрыть как выигрыш" : "❌ Закрыть как отказ"}
          </button>
        </footer>
      </div>
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

function MoneyInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-1 text-xs uppercase tracking-wider text-graphite-900/40">
      {label}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        inputMode="decimal"
        className="rounded-xl border border-line bg-light/30 px-3 py-2 text-sm normal-case tracking-normal text-graphite-900 focus:border-orange focus:bg-white focus:outline-none"
      />
    </label>
  );
}

function formatPercent(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0%";
  return `${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(value * 100)}%`;
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

// ════════════════════════════════════════════════════════════════
//   ПАПКИ ДОКУМЕНТОВ — Supabase Storage, как в Drive шаблоне
// ════════════════════════════════════════════════════════════════

interface DocFolderDef {
  docType: LeadDocumentType;
  emoji: string;
  title: string;
}

const DOC_FOLDERS: DocFolderDef[] = [
  { docType: "tz",       emoji: "📋", title: "01_ТЗ" },
  { docType: "kp",       emoji: "🧮", title: "02_КП и сметы" },
  { docType: "contract", emoji: "📜", title: "03_Договоры" },
  { docType: "invoice",  emoji: "🧾", title: "04_Счета" },
  { docType: "act",      emoji: "✍",  title: "05_Акты" },
  { docType: "payment",  emoji: "💰", title: "06_Оплаты" },
  { docType: "mail",     emoji: "✉",  title: "07_Переписка" },
  { docType: "drawing",  emoji: "📐", title: "08_Фото и чертежи" },
];

function DocFolder({
  folder, documents, leadId, token, onChange,
}: {
  folder: DocFolderDef;
  documents: LeadDocument[];
  leadId: string;
  token: string;
  onChange: () => void | Promise<void>;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      for (const file of Array.from(fileList)) {
        await uploadLeadFileDirect({
          token,
          leadId,
          docType: folder.docType,
          file,
          title: file.name,
        });
      }
      await onChange();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div
      onDragEnter={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
      className={`rounded-xl border bg-white p-3 transition-colors ${
        dragOver ? "border-orange bg-orange/5" : "border-line"
      }`}
    >
      <header className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-sm font-medium text-graphite-900">
          <span>{folder.emoji}</span>
          <span>{folder.title}</span>
          {documents.length > 0 && (
            <span className="rounded-full bg-light px-1.5 py-0.5 text-[10px] font-mono tabular-nums text-graphite-900/60">
              {documents.length}
            </span>
          )}
        </h3>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="rounded-full bg-graphite-950 px-3 py-1 text-[11px] font-medium text-light transition-colors hover:bg-orange disabled:opacity-50"
        >
          {uploading ? "⏳" : "+ Файл"}
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          hidden
          onChange={(e) => handleFiles(e.target.files)}
        />
      </header>

      {documents.length === 0 ? (
        <p className="mt-2 rounded-lg border border-dashed border-line/60 bg-light/30 py-3 text-center text-[11px] text-graphite-900/40">
          Перетащи файл или нажми «+ Файл»
        </p>
      ) : (
        <ul className="mt-2 space-y-1">
          {documents.map((doc) => (
            <DocItem key={doc.id} doc={doc} token={token} onChanged={onChange} />
          ))}
        </ul>
      )}

      {error && <p className="mt-2 text-[11px] text-red-700">{error}</p>}
    </div>
  );
}

function DocItem({
  doc, token, onChanged,
}: {
  doc: LeadDocument;
  token: string;
  onChanged: () => void | Promise<void>;
}) {
  const [busy, setBusy] = useState<"download" | "delete" | null>(null);

  async function handleDownload() {
    setBusy("download");
    try {
      if (doc.storage_provider === "supabase") {
        const url = await getLeadDocumentUrl(token, doc.id);
        window.open(url, "_blank");
      } else if (doc.file_url) {
        window.open(doc.file_url, "_blank");
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  async function handleDelete() {
    if (!confirm(`Удалить «${doc.title}»?`)) return;
    setBusy("delete");
    try {
      await deleteLeadDocument(token, doc.id);
      await onChanged();
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
      setBusy(null);
    }
  }

  const name = doc.original_filename || doc.title;
  const isDrive = doc.storage_provider === "google_drive";

  return (
    <li className="flex items-center gap-2 rounded-lg bg-light/40 px-2 py-1.5 text-xs">
      <span className="text-[10px]">{isDrive ? "🔗" : "📄"}</span>
      <span className="min-w-0 flex-1 truncate text-graphite-900" title={name}>
        {name}
      </span>
      {doc.file_size_bytes != null && (
        <span className="font-mono text-[10px] text-graphite-900/40 tabular-nums">
          {fmtBytes(doc.file_size_bytes)}
        </span>
      )}
      <button
        type="button"
        onClick={handleDownload}
        disabled={busy !== null}
        className="text-orange hover:underline disabled:opacity-50"
        title="Скачать"
      >
        ↓
      </button>
      <button
        type="button"
        onClick={handleDelete}
        disabled={busy !== null}
        className="text-red-600 hover:underline disabled:opacity-50"
        title="Удалить"
      >
        ×
      </button>
    </li>
  );
}
