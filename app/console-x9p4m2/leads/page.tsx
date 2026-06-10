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

const PAGE_SIZE = 50;
const STATUS_OPTIONS: LeadStatus[] = [
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
const SOURCE_OPTIONS: LeadSource[] = ["contact", "project", "estimate", "partner", "kp_bot"];
const CHANNEL_OPTIONS: SourceChannel[] = ["site", "tender", "manual"];
const PAYMENT_OPTIONS: PaymentStatus[] = ["not_paid", "partial", "paid"];

export default function AdminLeadsListPage() {
  const { token } = useAdmin();
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<LeadStatus | "">("");
  const [sourceFilter, setSourceFilter] = useState<LeadSource | "">("");
  const [channelFilter, setChannelFilter] = useState<SourceChannel | "">("");
  const [paymentFilter, setPaymentFilter] = useState<PaymentStatus | "">("");
  const [commissionFilter, setCommissionFilter] = useState<"yes" | "no" | "">("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setOffset(0);
  }, [statusFilter, sourceFilter, channelFilter, paymentFilter, commissionFilter, debouncedSearch]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await adminFetch<{ ok: true; leads: LeadRow[]; total: number }>(token, {
        action: "list_leads",
        limit: PAGE_SIZE,
        offset,
        status: statusFilter || undefined,
        source: sourceFilter || undefined,
        source_channel: channelFilter || undefined,
        payment_status: paymentFilter || undefined,
        commission: commissionFilter || undefined,
        search: debouncedSearch || undefined,
      });
      setLeads(r.leads);
      setTotal(r.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [token, offset, statusFilter, sourceFilter, channelFilter, paymentFilter, commissionFilter, debouncedSearch]);

  useEffect(() => {
    load();
  }, [load]);

  const pageInfo = useMemo(() => {
    const from = total === 0 ? 0 : offset + 1;
    const to = Math.min(offset + PAGE_SIZE, total);
    return { from, to };
  }, [offset, total]);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-5">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-orange">Заявки и сделки</p>
          <h1 className="mt-1 text-3xl font-bold text-graphite-900">Воронка AZIMER</h1>
          <p className="mt-1 text-sm text-graphite-900/60">
            {total > 0
              ? `${pageInfo.from}-${pageInfo.to} из ${total}`
              : loading ? "Загружаем..." : "Заявок не найдено"}
          </p>
        </div>
      </div>

      <div className="my-6 space-y-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Lead ID, имя, телефон, email, компания, источник..."
          className="w-full max-w-xl rounded-full border border-line bg-white px-5 py-2 text-sm focus:border-orange focus:outline-none"
        />

        <div className="flex flex-wrap gap-2">
          <FilterTab active={channelFilter === ""} onClick={() => setChannelFilter("")} label="Все каналы" />
          {CHANNEL_OPTIONS.map((c) => (
            <FilterTab
              key={c}
              active={channelFilter === c}
              onClick={() => setChannelFilter(c)}
              label={SOURCE_CHANNEL_LABEL[c]}
            />
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <FilterTab active={statusFilter === ""} onClick={() => setStatusFilter("")} label="Все статусы" />
          {STATUS_OPTIONS.map((s) => (
            <FilterTab key={s} active={statusFilter === s} onClick={() => setStatusFilter(s)} label={STATUS_LABEL[s]} />
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
          <FilterTab active={commissionFilter === "yes"} onClick={() => setCommissionFilter("yes")} label="Комиссия: да" />
          <FilterTab active={commissionFilter === "no"} onClick={() => setCommissionFilter("no")} label="Комиссия: нет" />
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-line bg-white">
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
            {leads.map((lead) => (
              <LeadTableRow key={lead.id} lead={lead} />
            ))}
          </tbody>
        </table>

        {leads.length === 0 && !loading && (
          <p className="p-12 text-center text-sm text-graphite-900/40">
            По текущим фильтрам ничего не найдено
          </p>
        )}
        {loading && (
          <p className="p-12 text-center text-sm text-graphite-900/40">Загружаем...</p>
        )}
      </div>

      {total > PAGE_SIZE && (
        <div className="mt-4 flex items-center justify-between">
          <button
            disabled={offset === 0}
            onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
            className="rounded-full border border-line bg-white px-4 py-2 text-xs disabled:opacity-30"
          >
            Назад
          </button>
          <p className="text-xs text-graphite-900/50">
            Страница {Math.floor(offset / PAGE_SIZE) + 1} из {Math.ceil(total / PAGE_SIZE)}
          </p>
          <button
            disabled={offset + PAGE_SIZE >= total}
            onClick={() => setOffset(offset + PAGE_SIZE)}
            className="rounded-full border border-line bg-white px-4 py-2 text-xs disabled:opacity-30"
          >
            Вперед
          </button>
        </div>
      )}
    </div>
  );
}

function LeadTableRow({ lead }: { lead: LeadRow }) {
  const status = lead.deal_status ?? lead.status;
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
          {STATUS_LABEL[status]}
        </span>
      </td>
      <td className="px-3 py-2.5 text-xs text-graphite-900/70">
        <div>{doc?.document_count ?? 0} файлов</div>
        <div className="mt-0.5 text-graphite-900/45">
          КП: {KP_STATUS_LABEL[lead.kp_status]} · Договор: {CONTRACT_STATUS_LABEL[lead.contract_status]}
        </div>
        <div className="text-graphite-900/45">
          Счет: {INVOICE_STATUS_LABEL[lead.invoice_status]}
        </div>
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
