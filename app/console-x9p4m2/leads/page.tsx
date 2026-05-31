"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAdmin } from "@/components/admin/AdminShell";
import {
  adminFetch,
  fmtDateTime,
  fmtRub,
  STATUS_COLOR,
  STATUS_LABEL,
  SOURCE_LABEL,
  type LeadRow,
  type LeadStatus,
  type LeadSource,
} from "@/lib/admin-api";

const PAGE_SIZE = 50;
const STATUS_OPTIONS: LeadStatus[] = ["new", "contacted", "kp_sent", "won", "lost"];
const SOURCE_OPTIONS: LeadSource[] = ["contact", "project", "estimate", "partner", "kp_bot"];

export default function AdminLeadsListPage() {
  const { password } = useAdmin();
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<LeadStatus | "">("");
  const [sourceFilter, setSourceFilter] = useState<LeadSource | "">("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // reset offset on filter change
  useEffect(() => { setOffset(0); }, [statusFilter, sourceFilter, debouncedSearch]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await adminFetch<{ ok: true; leads: LeadRow[]; total: number }>(password, {
        action: "list_leads",
        limit:  PAGE_SIZE,
        offset,
        status: statusFilter || undefined,
        source: sourceFilter || undefined,
        search: debouncedSearch || undefined,
      });
      setLeads(r.leads);
      setTotal(r.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [password, offset, statusFilter, sourceFilter, debouncedSearch]);

  useEffect(() => { load(); }, [load]);

  const pageInfo = useMemo(() => {
    const from = total === 0 ? 0 : offset + 1;
    const to = Math.min(offset + PAGE_SIZE, total);
    return { from, to };
  }, [offset, total]);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-5">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-orange">Заявки</p>
          <h1 className="mt-1 text-3xl font-bold text-graphite-900">Все обращения</h1>
          <p className="mt-1 text-sm text-graphite-900/60">
            {total > 0
              ? `${pageInfo.from}–${pageInfo.to} из ${total}`
              : loading ? "Загружаем…" : "Заявок не найдено"}
          </p>
        </div>
      </div>

      {/* Фильтры */}
      <div className="my-6 flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 Имя, телефон, email, компания..."
          className="w-72 rounded-full border border-line bg-white px-5 py-2 text-sm focus:border-orange focus:outline-none"
        />

        <div className="flex flex-wrap gap-2">
          <FilterTab
            active={statusFilter === ""}
            onClick={() => setStatusFilter("")}
            label="Все статусы"
          />
          {STATUS_OPTIONS.map((s) => (
            <FilterTab
              key={s}
              active={statusFilter === s}
              onClick={() => setStatusFilter(s)}
              label={STATUS_LABEL[s]}
            />
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <FilterTab
            active={sourceFilter === ""}
            onClick={() => setSourceFilter("")}
            label="Все источники"
          />
          {SOURCE_OPTIONS.map((s) => (
            <FilterTab
              key={s}
              active={sourceFilter === s}
              onClick={() => setSourceFilter(s)}
              label={SOURCE_LABEL[s]}
            />
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-800">
          ❌ {error}
        </div>
      )}

      {/* Таблица */}
      <div className="overflow-hidden rounded-2xl border border-line bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-light/50 text-xs uppercase tracking-wider text-graphite-900/60">
              <th className="px-4 py-3 text-left font-medium">Дата</th>
              <th className="px-2 py-3 text-left font-medium">Статус</th>
              <th className="px-2 py-3 text-left font-medium">Источник</th>
              <th className="px-2 py-3 text-left font-medium">Имя</th>
              <th className="px-2 py-3 text-left font-medium">Телефон</th>
              <th className="px-2 py-3 text-right font-medium">Оценка</th>
              <th className="px-4 py-3 text-left font-medium">UTM</th>
              <th className="px-4 py-3 text-right font-medium" />
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => {
              const est = lead.estimate as { low?: number; high?: number } | null;
              return (
                <tr key={lead.id} className="border-b border-line/40 last:border-0 hover:bg-light/50">
                  <td className="px-4 py-2.5 text-xs text-graphite-900/50 tabular-nums whitespace-nowrap">
                    {fmtDateTime(lead.created_at)}
                  </td>
                  <td className="px-2 py-2.5">
                    <span className={`rounded-full px-2 py-0.5 text-xs whitespace-nowrap ${STATUS_COLOR[lead.status]}`}>
                      {STATUS_LABEL[lead.status]}
                    </span>
                  </td>
                  <td className="px-2 py-2.5 text-xs text-graphite-900/60 whitespace-nowrap">
                    {SOURCE_LABEL[lead.source]}
                  </td>
                  <td className="px-2 py-2.5 font-medium text-graphite-900">
                    {lead.name}
                    {lead.company && (
                      <div className="text-xs text-graphite-900/50">{lead.company}</div>
                    )}
                  </td>
                  <td className="px-2 py-2.5 font-mono text-xs text-graphite-900/80 whitespace-nowrap">
                    {lead.phone}
                  </td>
                  <td className="px-2 py-2.5 text-right font-mono text-xs whitespace-nowrap">
                    {est?.low != null && est?.high != null
                      ? <span>{fmtRub(est.low)}–{fmtRub(est.high)}</span>
                      : <span className="text-graphite-900/30">—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-graphite-900/50">
                    {lead.utm_source ?? <span className="text-graphite-900/30">—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <Link
                      href={`/console-x9p4m2/leads/view?id=${lead.id}`}
                      className="text-xs text-orange hover:underline whitespace-nowrap"
                    >
                      Открыть →
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {leads.length === 0 && !loading && (
          <p className="p-12 text-center text-sm text-graphite-900/40">
            По текущим фильтрам ничего не найдено
          </p>
        )}
        {loading && (
          <p className="p-12 text-center text-sm text-graphite-900/40">Загружаем…</p>
        )}
      </div>

      {/* Пагинация */}
      {total > PAGE_SIZE && (
        <div className="mt-4 flex items-center justify-between">
          <button
            disabled={offset === 0}
            onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
            className="rounded-full border border-line bg-white px-4 py-2 text-xs disabled:opacity-30"
          >
            ← Назад
          </button>
          <p className="text-xs text-graphite-900/50">
            Страница {Math.floor(offset / PAGE_SIZE) + 1} из {Math.ceil(total / PAGE_SIZE)}
          </p>
          <button
            disabled={offset + PAGE_SIZE >= total}
            onClick={() => setOffset(offset + PAGE_SIZE)}
            className="rounded-full border border-line bg-white px-4 py-2 text-xs disabled:opacity-30"
          >
            Вперёд →
          </button>
        </div>
      )}
    </div>
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
