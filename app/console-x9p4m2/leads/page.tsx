"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAdmin } from "@/components/admin/AdminShell";
import {
  adminFetch,
  fmtDateTime,
  fmtRub,
  CONTRACT_STATUS_LABEL,
  INVOICE_STATUS_LABEL,
  KP_STATUS_LABEL,
  PAYMENT_STATUS_LABEL,
  SOURCE_CHANNEL_LABEL,
  SOURCE_LABEL,
  STATUS_COLOR,
  STATUS_LABEL,
  type LeadRow,
  type LeadSource,
  type LeadStatus,
  type PaymentStatus,
  type SourceChannel,
} from "@/lib/admin-api";
import {
  PIPELINE_COLUMNS,
  STATUS_TO_COLUMN,
  STATUS_FRIENDLY,
  NEXT_STEP_HINT,
  NEXT_STATUS,
  NEXT_STEP_BUTTON,
  URGENCY_BORDER,
  URGENCY_DOT,
  URGENCY_BADGE,
  URGENCY_LABEL,
  computeUrgency,
  type PipelineColumn,
} from "@/lib/admin-pipeline";

type ViewMode = "board" | "table";
const VIEW_STORAGE = "az_leads_view";
const PAGE_SIZE = 200; // в Канбан грузим больше — нужны все колонки сразу

const STATUS_OPTIONS: LeadStatus[] = [
  "new", "accepted", "tz_received", "kp_preparing", "kp_sent", "kp_approved",
  "sent_to_accountant", "invoice_issued", "paid_partial", "paid_full",
  "won", "lost", "commission_paid",
];
const SOURCE_OPTIONS: LeadSource[] = ["contact", "project", "estimate", "partner", "kp_bot"];
const CHANNEL_OPTIONS: SourceChannel[] = ["site", "tender", "manual"];
const PAYMENT_OPTIONS: PaymentStatus[] = ["not_paid", "partial", "paid"];

export default function AdminLeadsListPage() {
  const { token } = useAdmin();
  const [view, setView] = useState<ViewMode>("board");
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeColumn, setActiveColumn] = useState<PipelineColumn>("fresh");

  // Фильтры — для табличного режима
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "">("");
  const [sourceFilter, setSourceFilter] = useState<LeadSource | "">("");
  const [channelFilter, setChannelFilter] = useState<SourceChannel | "">("");
  const [paymentFilter, setPaymentFilter] = useState<PaymentStatus | "">("");
  const [commissionFilter, setCommissionFilter] = useState<"yes" | "no" | "">("");

  // Восстановить выбор вида
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(VIEW_STORAGE);
    if (saved === "board" || saved === "table") setView(saved);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(VIEW_STORAGE, view);
  }, [view]);

  // Debounce поиска
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setOffset(0);
  }, [statusFilter, sourceFilter, channelFilter, paymentFilter, commissionFilter, debouncedSearch, view]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await adminFetch<{ ok: true; leads: LeadRow[]; total: number }>(token, {
        action: "list_leads",
        limit: view === "board" ? PAGE_SIZE : 50,
        offset,
        status: view === "table" ? (statusFilter || undefined) : undefined,
        source: view === "table" ? (sourceFilter || undefined) : undefined,
        source_channel: view === "table" ? (channelFilter || undefined) : undefined,
        payment_status: view === "table" ? (paymentFilter || undefined) : undefined,
        commission: view === "table" ? (commissionFilter || undefined) : undefined,
        search: debouncedSearch || undefined,
      });
      setLeads(r.leads);
      setTotal(r.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [token, offset, view, statusFilter, sourceFilter, channelFilter, paymentFilter, commissionFilter, debouncedSearch]);

  useEffect(() => { load(); }, [load]);

  async function advance(lead: LeadRow) {
    const status = (lead.deal_status ?? lead.status) as LeadStatus;
    const next = NEXT_STATUS[status];
    if (!next) return;
    // Оптимистичное обновление — карточка сразу прыгает
    setLeads((prev) => prev.map((l) => l.id === lead.id ? { ...l, deal_status: next, status: next, status_updated_at: new Date().toISOString() } : l));
    try {
      await adminFetch(token, { action: "update_lead_status", id: lead.id, status: next });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      // Откатить
      setLeads((prev) => prev.map((l) => l.id === lead.id ? { ...l, deal_status: status, status } : l));
    }
  }

  return (
    <div>
      <header className="border-b border-line pb-5">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-orange">Воронка</p>
        <h1 className="mt-1 text-3xl font-bold text-graphite-900">Заявки и сделки</h1>
        <p className="mt-1 text-sm text-graphite-900/60">
          {loading ? "Загружаем…" : total === 0 ? "Заявок не найдено" : `${total} заявок в воронке`}
        </p>
      </header>

      {/* Переключатель вида + поиск */}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-full border border-line bg-white p-0.5 text-xs font-medium">
          <button
            onClick={() => setView("board")}
            className={`rounded-full px-4 py-1.5 transition-colors ${view === "board" ? "bg-graphite-950 text-light" : "text-graphite-900/70 hover:text-graphite-900"}`}
          >
            🗂 Канбан
          </button>
          <button
            onClick={() => setView("table")}
            className={`rounded-full px-4 py-1.5 transition-colors ${view === "table" ? "bg-graphite-950 text-light" : "text-graphite-900/70 hover:text-graphite-900"}`}
          >
            📋 Таблица
          </button>
        </div>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={view === "board" ? "Поиск по имени, телефону, Lead ID…" : "Lead ID, имя, телефон, email…"}
          className="min-w-0 flex-1 rounded-full border border-line bg-white px-4 py-2 text-sm focus:border-orange focus:outline-none"
        />
      </div>

      {error && (
        <div className="mt-4 rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      {view === "board" ? (
        <BoardView
          leads={leads}
          loading={loading}
          activeColumn={activeColumn}
          onColumnChange={setActiveColumn}
          onAdvance={advance}
        />
      ) : (
        <TableView
          leads={leads}
          loading={loading}
          total={total}
          offset={offset}
          onPage={setOffset}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          sourceFilter={sourceFilter}
          setSourceFilter={setSourceFilter}
          channelFilter={channelFilter}
          setChannelFilter={setChannelFilter}
          paymentFilter={paymentFilter}
          setPaymentFilter={setPaymentFilter}
          commissionFilter={commissionFilter}
          setCommissionFilter={setCommissionFilter}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//   КАНБАН
// ═══════════════════════════════════════════════════════════════

function BoardView({
  leads, loading, activeColumn, onColumnChange, onAdvance,
}: {
  leads: LeadRow[];
  loading: boolean;
  activeColumn: PipelineColumn;
  onColumnChange: (c: PipelineColumn) => void;
  onAdvance: (l: LeadRow) => void;
}) {
  // Разложить лиды по колонкам
  const byColumn = useMemo(() => {
    const map = new Map<PipelineColumn, LeadRow[]>();
    for (const col of PIPELINE_COLUMNS) map.set(col.key, []);
    for (const lead of leads) {
      const status = (lead.deal_status ?? lead.status) as LeadStatus;
      const col = STATUS_TO_COLUMN[status] ?? "fresh";
      map.get(col)?.push(lead);
    }
    return map;
  }, [leads]);

  return (
    <div className="mt-6">
      {/* Mobile: вкладки колонок */}
      <nav className="-mx-2 flex gap-1 overflow-x-auto pb-3 lg:hidden">
        {PIPELINE_COLUMNS.map((col) => {
          const count = byColumn.get(col.key)?.length ?? 0;
          const active = activeColumn === col.key;
          return (
            <button
              key={col.key}
              onClick={() => onColumnChange(col.key)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                active ? "bg-graphite-950 text-light" : "bg-white text-graphite-900/70 hover:bg-light"
              }`}
            >
              <span>{col.emoji}</span>
              <span>{col.title}</span>
              <span className={`rounded-full px-1.5 text-[10px] tabular-nums ${active ? "bg-light/20" : "bg-graphite-900/10"}`}>
                {count}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Mobile: один столбец */}
      <div className="lg:hidden">
        <BoardColumn
          column={PIPELINE_COLUMNS.find((c) => c.key === activeColumn)!}
          leads={byColumn.get(activeColumn) ?? []}
          loading={loading}
          onAdvance={onAdvance}
        />
      </div>

      {/* Desktop: 5 колонок + архив отказов отдельно */}
      <div className="hidden gap-4 lg:grid lg:grid-cols-5">
        {PIPELINE_COLUMNS.filter((c) => c.key !== "rejected").map((col) => (
          <BoardColumn
            key={col.key}
            column={col}
            leads={byColumn.get(col.key) ?? []}
            loading={loading}
            onAdvance={onAdvance}
            compact
          />
        ))}
      </div>

      {/* Архив отказов — свёрнут */}
      {byColumn.get("rejected")?.length! > 0 && (
        <details className="mt-6 rounded-2xl border border-line bg-white">
          <summary className="cursor-pointer px-5 py-3 text-sm font-medium text-graphite-900/70 hover:text-graphite-900">
            🗂 Отказы ({byColumn.get("rejected")?.length})
          </summary>
          <div className="border-t border-line p-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {(byColumn.get("rejected") ?? []).map((lead) => (
                <LeadCard key={lead.id} lead={lead} onAdvance={onAdvance} compact />
              ))}
            </div>
          </div>
        </details>
      )}
    </div>
  );
}

function BoardColumn({
  column, leads, loading, onAdvance, compact,
}: {
  column: typeof PIPELINE_COLUMNS[number];
  leads: LeadRow[];
  loading: boolean;
  onAdvance: (l: LeadRow) => void;
  compact?: boolean;
}) {
  return (
    <section className="rounded-2xl bg-light/40 p-3">
      <header className="mb-3 px-1">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-graphite-900">
            <span>{column.emoji}</span>
            <span>{column.title}</span>
          </h2>
          <span className="rounded-full bg-white px-2 py-0.5 text-xs font-mono tabular-nums text-graphite-900/70">
            {leads.length}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-graphite-900/45">{column.subtitle}</p>
      </header>

      {loading && leads.length === 0 ? (
        <p className="py-8 text-center text-xs text-graphite-900/30">Загружаем…</p>
      ) : leads.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line/60 py-6 text-center text-xs text-graphite-900/30">
          Пусто
        </p>
      ) : (
        <div className="space-y-2">
          {leads.map((lead) => (
            <LeadCard key={lead.id} lead={lead} onAdvance={onAdvance} compact={compact} />
          ))}
        </div>
      )}
    </section>
  );
}

function LeadCard({
  lead, onAdvance, compact,
}: {
  lead: LeadRow;
  onAdvance: (l: LeadRow) => void;
  compact?: boolean;
}) {
  const status = (lead.deal_status ?? lead.status) as LeadStatus;
  const urgency = computeUrgency({
    status,
    statusUpdatedAt: lead.status_updated_at,
  });
  const nextLabel = NEXT_STEP_BUTTON[status];
  const customer = lead.company || lead.name || "Без имени";
  const object = lead.object_type || lead.message?.slice(0, 60) || null;
  const kpAmount = lead.commission?.kp_amount || lead.doc_summary?.kp_amount;
  const code = lead.lead_code ?? lead.id.slice(0, 8);
  const days = lead.status_updated_at
    ? Math.floor((Date.now() - new Date(lead.status_updated_at).getTime()) / 86_400_000)
    : 0;

  return (
    <article className={`group rounded-xl bg-white p-3 shadow-sm transition-all hover:shadow-md ${URGENCY_BORDER[urgency]}`}>
      <Link href={`/console-x9p4m2/leads/view/?id=${lead.id}`} className="block">
        {/* Главное — что делать дальше */}
        <div className="flex items-start gap-2">
          <span className={`mt-0.5 inline-block h-2 w-2 shrink-0 rounded-full ${URGENCY_DOT[urgency]}`} />
          <p className={`flex-1 text-sm font-medium leading-tight ${urgency === "archived" ? "text-graphite-900/50" : "text-graphite-900"}`}>
            {NEXT_STEP_HINT[status]}
          </p>
        </div>

        {/* Кто / что / сколько */}
        <div className="mt-3 space-y-0.5">
          <p className="break-words text-sm font-semibold text-graphite-900">{customer}</p>
          {object && !compact && (
            <p className="line-clamp-1 text-xs text-graphite-900/60">{object}</p>
          )}
          {kpAmount && (
            <p className="text-xs font-mono tabular-nums text-graphite-900/70">≈ {fmtRub(kpAmount)}</p>
          )}
        </div>

        {/* Подвал — мелким */}
        <div className="mt-2 flex items-center justify-between gap-2 border-t border-line/50 pt-2 text-[10px] text-graphite-900/45">
          <span className="font-mono">{code}</span>
          {days > 0 && (
            <span className={urgency === "urgent" ? "font-semibold text-red-700" : ""}>
              {days === 1 ? "вчера" : `${days} дн.`}
            </span>
          )}
        </div>
      </Link>

      {/* Кнопка «следующий шаг» */}
      {nextLabel && (
        <button
          onClick={(e) => { e.stopPropagation(); onAdvance(lead); }}
          className="mt-2 w-full rounded-lg bg-graphite-950 px-3 py-1.5 text-xs font-medium text-light transition-colors hover:bg-orange"
        >
          {nextLabel}
        </button>
      )}
    </article>
  );
}

// ═══════════════════════════════════════════════════════════════
//   ТАБЛИЦА (legacy view, для тех кому привычнее)
// ═══════════════════════════════════════════════════════════════

function TableView(props: {
  leads: LeadRow[];
  loading: boolean;
  total: number;
  offset: number;
  onPage: (n: number) => void;
  statusFilter: LeadStatus | "";
  setStatusFilter: (s: LeadStatus | "") => void;
  sourceFilter: LeadSource | "";
  setSourceFilter: (s: LeadSource | "") => void;
  channelFilter: SourceChannel | "";
  setChannelFilter: (s: SourceChannel | "") => void;
  paymentFilter: PaymentStatus | "";
  setPaymentFilter: (s: PaymentStatus | "") => void;
  commissionFilter: "yes" | "no" | "";
  setCommissionFilter: (s: "yes" | "no" | "") => void;
}) {
  const {
    leads, loading, total, offset, onPage,
    statusFilter, setStatusFilter,
    sourceFilter, setSourceFilter,
    channelFilter, setChannelFilter,
    paymentFilter, setPaymentFilter,
    commissionFilter, setCommissionFilter,
  } = props;

  return (
    <>
      <div className="mt-5 space-y-3">
        <div className="flex flex-wrap gap-2">
          <FilterTab active={channelFilter === ""} onClick={() => setChannelFilter("")} label="Все каналы" />
          {CHANNEL_OPTIONS.map((c) => (
            <FilterTab key={c} active={channelFilter === c} onClick={() => setChannelFilter(c)} label={SOURCE_CHANNEL_LABEL[c]} />
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <FilterTab active={statusFilter === ""} onClick={() => setStatusFilter("")} label="Все статусы" />
          {STATUS_OPTIONS.map((s) => (
            <FilterTab key={s} active={statusFilter === s} onClick={() => setStatusFilter(s)} label={STATUS_FRIENDLY[s]} />
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <FilterTab active={sourceFilter === ""} onClick={() => setSourceFilter("")} label="Все источники" />
          {SOURCE_OPTIONS.map((s) => (
            <FilterTab key={s} active={sourceFilter === s} onClick={() => setSourceFilter(s)} label={SOURCE_LABEL[s]} />
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <FilterTab active={paymentFilter === ""} onClick={() => setPaymentFilter("")} label="Любая оплата" />
          {PAYMENT_OPTIONS.map((p) => (
            <FilterTab key={p} active={paymentFilter === p} onClick={() => setPaymentFilter(p)} label={PAYMENT_STATUS_LABEL[p]} />
          ))}
          <FilterTab active={commissionFilter === ""} onClick={() => setCommissionFilter("")} label="Все комиссии" />
          <FilterTab active={commissionFilter === "yes"} onClick={() => setCommissionFilter("yes")} label="С комиссией" />
          <FilterTab active={commissionFilter === "no"} onClick={() => setCommissionFilter("no")} label="Без комиссии" />
        </div>
      </div>

      <div className="mt-5 overflow-x-auto rounded-2xl border border-line bg-white">
        <table className="min-w-[1180px] w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-light/50 text-xs uppercase tracking-wider text-graphite-900/60">
              <th className="px-4 py-3 text-left font-medium">Дата</th>
              <th className="px-3 py-3 text-left font-medium">Канал / Lead ID</th>
              <th className="px-3 py-3 text-left font-medium">Источник</th>
              <th className="px-3 py-3 text-left font-medium">Заказчик</th>
              <th className="px-3 py-3 text-left font-medium">Статус</th>
              <th className="px-3 py-3 text-left font-medium">Документы</th>
              <th className="px-3 py-3 text-right font-medium">КП</th>
              <th className="px-3 py-3 text-left font-medium">Оплата</th>
              <th className="px-3 py-3 text-left font-medium">Комиссия</th>
              <th className="px-4 py-3 text-right font-medium" />
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => <LeadTableRow key={lead.id} lead={lead} />)}
          </tbody>
        </table>
        {leads.length === 0 && !loading && (
          <p className="p-12 text-center text-sm text-graphite-900/40">По текущим фильтрам ничего не найдено</p>
        )}
        {loading && <p className="p-12 text-center text-sm text-graphite-900/40">Загружаем…</p>}
      </div>

      {total > 50 && (
        <div className="mt-4 flex items-center justify-between">
          <button
            disabled={offset === 0}
            onClick={() => onPage(Math.max(0, offset - 50))}
            className="rounded-full border border-line bg-white px-4 py-2 text-xs disabled:opacity-30"
          >
            Назад
          </button>
          <p className="text-xs text-graphite-900/50">
            Страница {Math.floor(offset / 50) + 1} из {Math.ceil(total / 50)}
          </p>
          <button
            disabled={offset + 50 >= total}
            onClick={() => onPage(offset + 50)}
            className="rounded-full border border-line bg-white px-4 py-2 text-xs disabled:opacity-30"
          >
            Вперёд
          </button>
        </div>
      )}
    </>
  );
}

function LeadTableRow({ lead }: { lead: LeadRow }) {
  const status = (lead.deal_status ?? lead.status) as LeadStatus;
  const doc = lead.doc_summary;
  const kpAmount = lead.commission?.kp_amount || doc?.kp_amount;
  const sourceLabel = lead.external_source || SOURCE_LABEL[lead.source];

  return (
    <tr className="border-b border-line/40 last:border-0 hover:bg-light/50">
      <td className="px-4 py-2.5 text-xs text-graphite-900/50 tabular-nums whitespace-nowrap">
        {fmtDateTime(lead.created_at)}
      </td>
      <td className="px-3 py-2.5">
        <span className="inline-flex rounded-full bg-graphite-950 px-2 py-0.5 text-[11px] font-medium text-light">
          {SOURCE_CHANNEL_LABEL[lead.source_channel]}
        </span>
        <div className="mt-1 font-mono text-xs text-graphite-900/70">{lead.lead_code ?? lead.id.slice(0, 8)}</div>
      </td>
      <td className="px-3 py-2.5 text-xs text-graphite-900/70">
        {lead.external_source_url ? (
          <a href={lead.external_source_url} target="_blank" rel="noopener noreferrer" className="hover:text-orange hover:underline">
            {sourceLabel}
          </a>
        ) : sourceLabel}
        <div className="mt-0.5 text-graphite-900/40">{lead.created_by_system ?? lead.source}</div>
      </td>
      <td className="px-3 py-2.5">
        <div className="font-medium text-graphite-900">{lead.company || lead.name}</div>
        <div className="mt-0.5 font-mono text-xs text-graphite-900/50">{lead.phone}</div>
      </td>
      <td className="px-3 py-2.5">
        <span className={`rounded-full px-2 py-0.5 text-xs whitespace-nowrap ${STATUS_COLOR[status]}`}>
          {STATUS_FRIENDLY[status] ?? STATUS_LABEL[status]}
        </span>
      </td>
      <td className="px-3 py-2.5 text-xs text-graphite-900/70">
        <div>{doc?.document_count ?? 0} файлов</div>
        <div className="mt-0.5 text-graphite-900/45">
          КП: {KP_STATUS_LABEL[lead.kp_status]} · Договор: {CONTRACT_STATUS_LABEL[lead.contract_status]}
        </div>
        <div className="text-graphite-900/45">Счёт: {INVOICE_STATUS_LABEL[lead.invoice_status]}</div>
      </td>
      <td className="px-3 py-2.5 text-right font-mono text-xs whitespace-nowrap">
        {kpAmount ? fmtRub(kpAmount) : <span className="text-graphite-900/30">—</span>}
      </td>
      <td className="px-3 py-2.5 text-xs text-graphite-900/70">
        {PAYMENT_STATUS_LABEL[lead.payment_status]}
      </td>
      <td className="px-3 py-2.5 text-xs text-graphite-900/70">
        {lead.commission_eligible ? (
          <>
            <span className="font-medium text-green-700">да</span>
            <div className="text-graphite-900/40">{formatPercent(lead.commission_rate)}</div>
          </>
        ) : "нет"}
      </td>
      <td className="px-4 py-2.5 text-right">
        <Link
          href={`/console-x9p4m2/leads/view/?id=${lead.id}`}
          className="text-xs text-orange hover:underline whitespace-nowrap"
        >
          Открыть
        </Link>
      </td>
    </tr>
  );
}

function FilterTab({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
        active ? "bg-graphite-950 text-light" : "bg-white text-graphite-900/70 hover:bg-light"
      }`}
    >
      {label}
    </button>
  );
}

function formatPercent(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0%";
  return `${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(value * 100)}%`;
}
