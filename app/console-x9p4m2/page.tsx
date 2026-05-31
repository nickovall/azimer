"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAdmin } from "@/components/admin/AdminShell";
import {
  adminFetch,
  fmtDateTime,
  fmtRub,
  STATUS_COLOR,
  STATUS_LABEL,
  SOURCE_LABEL,
  type DashboardStats,
  type LeadStatus,
} from "@/lib/admin-api";

export default function AdminDashboardPage() {
  const { password } = useAdmin();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    adminFetch<{ ok: true; stats: DashboardStats }>(password, { action: "dashboard_stats" })
      .then((r) => { if (!cancelled) setStats(r.stats); })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : String(e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [password]);

  if (loading) {
    return <p className="py-16 text-center text-graphite-900/40">Загружаем статистику…</p>;
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-300 bg-red-50 p-6 text-sm text-red-800">
        ❌ {error}
      </div>
    );
  }

  if (!stats) return null;

  const conv = stats.total > 0
    ? Math.round(((stats.byStatus.won ?? 0) / stats.total) * 100)
    : 0;

  return (
    <div>
      <div className="border-b border-line pb-5">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-orange">Дашборд</p>
        <h1 className="mt-1 text-3xl font-bold text-graphite-900">Воронка заявок</h1>
        <p className="mt-1 text-sm text-graphite-900/60">
          Сводка по активности · все цифры считаются в реальном времени
        </p>
      </div>

      {/* Числовые карточки */}
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Сегодня" value={stats.today} sub="заявок" />
        <StatCard label="7 дней" value={stats.week} sub="заявок" />
        <StatCard label="30 дней" value={stats.month} sub="заявок" />
        <StatCard label="Всего" value={stats.total} sub={`конверсия ${conv}%`} />
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        {/* Воронка по статусам */}
        <section className="rounded-2xl border border-line bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-graphite-900/60">
            По статусам
          </h2>
          <div className="mt-3 space-y-2">
            {(["new", "contacted", "kp_sent", "won", "lost"] as LeadStatus[]).map((s) => {
              const n = stats.byStatus[s] ?? 0;
              const pct = stats.total > 0 ? Math.round((n / stats.total) * 100) : 0;
              return (
                <div key={s} className="flex items-center gap-3">
                  <div className={`w-32 shrink-0 rounded-full px-3 py-1 text-xs font-medium ${STATUS_COLOR[s]}`}>
                    {STATUS_LABEL[s]}
                  </div>
                  <div className="flex-1">
                    <div className="h-2 overflow-hidden rounded-full bg-light">
                      <div
                        className="h-full bg-orange"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  <div className="w-16 text-right font-mono text-sm tabular-nums">
                    {n}
                    <span className="ml-1 text-xs text-graphite-900/40">{pct}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Топ-источники */}
        <section className="rounded-2xl border border-line bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-graphite-900/60">
            Источники
          </h2>
          {stats.topSources.length === 0 ? (
            <p className="mt-3 text-sm text-graphite-900/40">Ещё нет данных</p>
          ) : (
            <div className="mt-3 space-y-2">
              {stats.topSources.map((s) => (
                <div key={s.source} className="flex items-center justify-between text-sm">
                  <div className="truncate text-graphite-900/80">{prettySource(s.source)}</div>
                  <div className="font-mono text-graphite-900/60">{s.count}</div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Средний чек */}
      <section className="mt-6 rounded-2xl border border-line bg-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-graphite-900/60">
          Средний чек по выданным расчётам
        </h2>
        <p className="mt-2 text-3xl font-bold text-graphite-900">
          {stats.avgTicketCount > 0 ? fmtRub(stats.avgTicket) : "—"}
        </p>
        <p className="mt-1 text-xs text-graphite-900/40">
          {stats.avgTicketCount > 0
            ? `Среднее по ${stats.avgTicketCount} расчёту${plural(stats.avgTicketCount, ["", "ам", "ам"])}`
            : "Пока нет расчётов в заявках"}
        </p>
      </section>

      {/* Последние 10 заявок */}
      <section className="mt-6 rounded-2xl border border-line bg-white">
        <header className="flex items-center justify-between border-b border-line px-5 py-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-graphite-900/60">
            Последние заявки
          </h2>
          <Link href="/console-x9p4m2/leads/" className="text-xs text-orange hover:underline">
            Все заявки →
          </Link>
        </header>
        {stats.recent.length === 0 ? (
          <p className="p-12 text-center text-sm text-graphite-900/40">Заявок пока нет</p>
        ) : (
          <table className="w-full text-sm">
            <tbody>
              {stats.recent.map((lead) => (
                <tr key={lead.id} className="border-b border-line/40 last:border-0 hover:bg-light/50">
                  <td className="px-5 py-2.5 text-xs text-graphite-900/50 tabular-nums">
                    {fmtDateTime(lead.created_at)}
                  </td>
                  <td className="px-2 py-2.5">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_COLOR[lead.status]}`}>
                      {STATUS_LABEL[lead.status]}
                    </span>
                  </td>
                  <td className="px-2 py-2.5 text-xs text-graphite-900/60">
                    {SOURCE_LABEL[lead.source]}
                  </td>
                  <td className="px-2 py-2.5 font-medium text-graphite-900">{lead.name}</td>
                  <td className="px-2 py-2.5 font-mono text-xs text-graphite-900/70">{lead.phone}</td>
                  <td className="px-5 py-2.5 text-right">
                    <Link
                      href={`/console-x9p4m2/leads/view/?id=${lead.id}`}
                      className="text-xs text-orange hover:underline"
                    >
                      Открыть →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-4">
      <p className="text-xs uppercase tracking-wider text-graphite-900/50">{label}</p>
      <p className="mt-1 text-3xl font-bold text-graphite-900 tabular-nums">{value}</p>
      {sub && <p className="mt-1 text-xs text-graphite-900/40">{sub}</p>}
    </div>
  );
}

function prettySource(src: string): string {
  if (src.startsWith("direct:")) {
    const inner = src.slice(7);
    const map: Record<string, string> = {
      contact:  "🟢 Прямой · форма",
      estimate: "🟢 Прямой · калькулятор",
      project:  "🟢 Прямой · проект",
      partner:  "🟢 Прямой · партнёрство",
    };
    return map[inner] ?? `🟢 Прямой · ${inner}`;
  }
  return src;
}

function plural(n: number, forms: [string, string, string]): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return forms[1];
  return forms[2];
}
