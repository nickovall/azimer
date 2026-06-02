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
  const { password } = useAdmin();
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

  const load = useCallback(async () => {
    if (!id) {
      setError("Не указан id заявки");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const r = await adminFetch<{ ok: true; lead: LeadFull; files: LeadFileLink[] }>(password, {
        action: "get_lead",
        id,
      });
      setLead(r.lead);
      setFiles(r.files ?? []);
      setNotesDraft(r.lead.notes ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [id, password]);

  useEffect(() => { load(); }, [load]);

  async function changeStatus(s: LeadStatus) {
    if (!lead || lead.status === s) return;
    setSavingStatus(s);
    try {
      await adminFetch(password, { action: "update_lead_status", id: lead.id, status: s });
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
      await adminFetch(password, { action: "update_lead_notes", id: lead.id, notes: notesDraft });
      setEditingNotes(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSavingNotes(false);
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
                {Object.entries(estState).map(([k, v]) => (
                  <Field key={k} label={k}>{formatVal(v)}</Field>
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
                    {estLines.map((l, i) => (
                      <tr key={i} className="border-b border-line/40 last:border-0">
                        <td className="px-3 py-1.5 text-graphite-900">
                          {String(l.label ?? l.key ?? "—")}
                        </td>
                        <td className="px-3 py-1.5 text-right font-mono text-graphite-900/70">
                          {typeof l.cost === "number" ? fmtRub(l.cost) : "—"}
                        </td>
                      </tr>
                    ))}
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
