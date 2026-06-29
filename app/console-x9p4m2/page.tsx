"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAdmin } from "@/components/admin/AdminShell";
import {
  adminFetch,
  fmtDateTime,
  fmtRub,
  type LeadRow,
  type LeadStatus,
} from "@/lib/admin-api";
import {
  computeUrgency,
  NEXT_STEP_HINT,
  STATUS_FRIENDLY,
  STATUS_TO_COLUMN,
  URGENCY_BORDER,
  URGENCY_DOT,
  type Urgency,
} from "@/lib/admin-pipeline";

const DAYS_30 = 30 * 86_400_000;
const DAYS_7 = 7 * 86_400_000;

type DayPart = "morning" | "day" | "evening" | "night";

export default function AdminDashboardPage() {
  const { token } = useAdmin();
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    adminFetch<{ ok: true; leads: LeadRow[]; total: number }>(token, {
      action: "list_leads",
      limit: 500,
    })
      .then((r) => { if (!cancelled) setLeads(r.leads); })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : String(e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token]);

  const grouped = useMemo(() => groupByUrgency(leads), [leads]);
  const money = useMemo(() => computeMoney(leads), [leads]);
  const greeting = useMemo(() => getGreeting(), []);

  // Активные напоминания: просроченные, сегодняшние и будущие запланированные касания.
  const dueFollowUps = useMemo(() => {
    return leads
      .filter((l) => l.follow_up_at && Number.isFinite(new Date(l.follow_up_at).getTime()))
      .sort((a, b) => new Date(a.follow_up_at!).getTime() - new Date(b.follow_up_at!).getTime());
  }, [leads]);

  if (loading) {
    return <p className="py-16 text-center text-graphite-900/40">Загружаем…</p>;
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-300 bg-red-50 p-6 text-sm text-red-800">
        ❌ {error}
      </div>
    );
  }

  return (
    <div>
      {/* Привет + сегодняшний день */}
      <header className="border-b border-line pb-5">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-orange">
          {formatDate()}
        </p>
        <h1 className="mt-1 text-3xl font-bold text-graphite-900">
          {greeting}, Азамат
        </h1>
        <p className="mt-1 text-sm text-graphite-900/60">
          {leads.length === 0
            ? "Заявок пока нет — ждём первых лидов"
            : summarizeDay(grouped)}
        </p>
      </header>

      {/* Деньги */}
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <MoneyCard
          label="В работе"
          value={money.inWorkAmount}
          sub={`${money.inWorkCount} сделок`}
        />
        <MoneyCard
          label="За 30 дней"
          value={money.closed30Amount}
          sub={`${money.closed30Count} закрыто`}
          accent={money.closed30Count > 0}
        />
        <MoneyCard
          label="Комиссия"
          value={money.commissionDue}
          sub="к получению"
          accent={money.commissionDue > 0}
        />
        <MoneyCard
          label="За 7 дней"
          value={money.new7Count}
          sub="новых заявок"
          isCount
        />
      </div>

      {/* Напоминания на сегодня / просроченные */}
      {dueFollowUps.length > 0 && (
        <section className="mt-6 overflow-hidden rounded-2xl border border-orange/40 bg-white">
          <header className="flex items-center justify-between bg-orange/10 px-5 py-3">
            <div>
              <h2 className="text-sm font-bold text-graphite-900">🔔 Напоминания на сегодня</h2>
              <p className="mt-0.5 text-xs text-graphite-900/60">Запланированные звонки и касания — пора заняться</p>
            </div>
            <span className="rounded-full bg-white px-2 py-0.5 font-mono text-xs tabular-nums">{dueFollowUps.length}</span>
          </header>
          <ul className="divide-y divide-line/60">
            {dueFollowUps.map((lead) => {
              const overdue = new Date(lead.follow_up_at!).getTime() < Date.now();
              const customer = lead.company || lead.name || "Без имени";
              return (
                <li key={lead.id}>
                  <Link
                    href={`/console-x9p4m2/leads/view/?id=${lead.id}`}
                    className="flex items-start gap-3 px-5 py-3 transition-colors hover:bg-light/50"
                  >
                    <span className={`mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full ${overdue ? "bg-red-500" : "bg-amber-500"}`} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-graphite-900">{customer}</p>
                      <p className="mt-0.5 truncate text-xs text-graphite-900/60">
                        {lead.follow_up_note || "Напоминание"}
                      </p>
                    </div>
                    <span className={`shrink-0 font-mono text-xs tabular-nums ${overdue ? "font-semibold text-red-700" : "text-graphite-900/60"}`}>
                      {fmtDateTime(lead.follow_up_at)}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Срочно */}
      <UrgencyBlock
        title="🔴 Срочно"
        subtitle="Дедлайны прошли или клиент молчит больше недели"
        leads={grouped.urgent}
        color="red"
      />

      {/* На тебе */}
      <UrgencyBlock
        title="🟡 На тебе"
        subtitle="Ждут твоего действия"
        leads={grouped.on_you}
        color="amber"
      />

      {/* Ждём */}
      <UrgencyBlock
        title="🔵 Ждём"
        subtitle="В ответ от клиента или бухгалтера"
        leads={grouped.waiting}
        color="sky"
        defaultClosed
      />

      {/* Архив — свёрнут */}
      {grouped.archived.length > 0 && (
        <UrgencyBlock
          title="⚪ Архив"
          subtitle="Закрытые сделки и отказы"
          leads={grouped.archived}
          color="gray"
          defaultClosed
        />
      )}

      <div className="mt-8 flex justify-end">
        <Link
          href="/console-x9p4m2/leads/"
          className="text-xs text-orange hover:underline"
        >
          Открыть всю воронку →
        </Link>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//   Карточки денег + блоки лидов
// ═══════════════════════════════════════════════════════════════

function MoneyCard({
  label, value, sub, accent, isCount,
}: {
  label: string;
  value: number;
  sub?: string;
  accent?: boolean;
  isCount?: boolean;
}) {
  return (
    <div className={`rounded-2xl border p-4 ${accent ? "border-orange/40 bg-orange/5" : "border-line bg-white"}`}>
      <p className="text-xs uppercase tracking-wider text-graphite-900/50">{label}</p>
      <p className="mt-1 text-2xl font-bold text-graphite-900 tabular-nums">
        {isCount ? value : value > 0 ? fmtRub(value) : "—"}
      </p>
      {sub && <p className="mt-1 text-xs text-graphite-900/40">{sub}</p>}
    </div>
  );
}

function UrgencyBlock({
  title, subtitle, leads, color, defaultClosed,
}: {
  title: string;
  subtitle: string;
  leads: LeadRow[];
  color: "red" | "amber" | "sky" | "gray";
  defaultClosed?: boolean;
}) {
  if (leads.length === 0) return null;
  const headerBg = {
    red: "bg-red-50",
    amber: "bg-amber-50",
    sky: "bg-sky-50",
    gray: "bg-gray-50",
  }[color];

  const Shown = ({ children }: { children: React.ReactNode }) => defaultClosed ? (
    <details className="mt-6 overflow-hidden rounded-2xl border border-line bg-white">
      <summary className={`cursor-pointer flex items-center justify-between px-5 py-3 ${headerBg}`}>
        <div>
          <h2 className="text-sm font-bold text-graphite-900">{title}</h2>
          <p className="mt-0.5 text-xs text-graphite-900/60">{subtitle}</p>
        </div>
        <span className="rounded-full bg-white px-2 py-0.5 font-mono text-xs tabular-nums">{leads.length}</span>
      </summary>
      <div className="border-t border-line">{children}</div>
    </details>
  ) : (
    <section className="mt-6 overflow-hidden rounded-2xl border border-line bg-white">
      <header className={`flex items-center justify-between px-5 py-3 ${headerBg}`}>
        <div>
          <h2 className="text-sm font-bold text-graphite-900">{title}</h2>
          <p className="mt-0.5 text-xs text-graphite-900/60">{subtitle}</p>
        </div>
        <span className="rounded-full bg-white px-2 py-0.5 font-mono text-xs tabular-nums">{leads.length}</span>
      </header>
      <div className="border-t border-line">{children}</div>
    </section>
  );

  const showLimit = 6;
  const visible = leads.slice(0, showLimit);
  const rest = leads.length - visible.length;

  return (
    <Shown>
      <ul className="divide-y divide-line/60">
        {visible.map((lead) => (
          <DashboardLeadRow key={lead.id} lead={lead} />
        ))}
      </ul>
      {rest > 0 && (
        <div className="border-t border-line px-5 py-2 text-center">
          <Link
            href="/console-x9p4m2/leads/"
            className="text-xs text-orange hover:underline"
          >
            Ещё {rest} в воронке →
          </Link>
        </div>
      )}
    </Shown>
  );
}

function DashboardLeadRow({ lead }: { lead: LeadRow }) {
  const status = (lead.deal_status ?? lead.status) as LeadStatus;
  const urgency = computeUrgency({ status, statusUpdatedAt: lead.status_updated_at });
  const customer = lead.company || lead.name || "Без имени";
  const kpAmount = lead.commission?.kp_amount || lead.doc_summary?.kp_amount;
  const days = lead.status_updated_at
    ? Math.floor((Date.now() - new Date(lead.status_updated_at).getTime()) / 86_400_000)
    : 0;

  return (
    <li>
      <Link
        href={`/console-x9p4m2/leads/view/?id=${lead.id}`}
        className={`block px-5 py-3 transition-colors hover:bg-light/50 ${URGENCY_BORDER[urgency]}`}
      >
        <div className="flex items-start gap-3">
          <span className={`mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full ${URGENCY_DOT[urgency]}`} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-graphite-900">
              {NEXT_STEP_HINT[status]}
            </p>
            <p className="mt-0.5 truncate text-xs text-graphite-900/60">
              {customer} · {STATUS_FRIENDLY[status]}
              {days > 0 && (
                <span className={days >= 7 ? "ml-2 font-semibold text-red-700" : "ml-2"}>
                  · {days === 1 ? "вчера" : `${days} дн.`}
                </span>
              )}
            </p>
          </div>
          {kpAmount && (
            <span className="shrink-0 font-mono text-xs tabular-nums text-graphite-900/70">
              {fmtRub(kpAmount)}
            </span>
          )}
        </div>
      </Link>
    </li>
  );
}

// ═══════════════════════════════════════════════════════════════
//   Хелперы
// ═══════════════════════════════════════════════════════════════

function groupByUrgency(leads: LeadRow[]): Record<Urgency, LeadRow[]> {
  const groups: Record<Urgency, LeadRow[]> = {
    urgent: [],
    on_you: [],
    waiting: [],
    archived: [],
  };
  for (const lead of leads) {
    const status = (lead.deal_status ?? lead.status) as LeadStatus;
    const urgency = computeUrgency({ status, statusUpdatedAt: lead.status_updated_at });
    groups[urgency].push(lead);
  }
  // Внутри каждой группы — самые старые сверху (где висим дольше — те важнее)
  for (const key of Object.keys(groups) as Urgency[]) {
    groups[key].sort((a, b) => {
      const ta = a.status_updated_at ? new Date(a.status_updated_at).getTime() : 0;
      const tb = b.status_updated_at ? new Date(b.status_updated_at).getTime() : 0;
      return ta - tb;
    });
  }
  return groups;
}

function computeMoney(leads: LeadRow[]) {
  const now = Date.now();
  let inWorkAmount = 0;
  let inWorkCount = 0;
  let closed30Amount = 0;
  let closed30Count = 0;
  let commissionDue = 0;
  let new7Count = 0;

  for (const lead of leads) {
    const status = (lead.deal_status ?? lead.status) as LeadStatus;
    const col = STATUS_TO_COLUMN[status];
    const kpAmount = lead.commission?.kp_amount || lead.doc_summary?.kp_amount || 0;
    const created = new Date(lead.created_at).getTime();
    const updated = lead.status_updated_at ? new Date(lead.status_updated_at).getTime() : created;

    if (now - created < DAYS_7) new7Count++;

    if (col === "closed") {
      if (now - updated < DAYS_30) {
        closed30Amount += kpAmount;
        closed30Count++;
      }
    } else if (col !== "rejected") {
      inWorkAmount += kpAmount;
      inWorkCount++;
    }

    if (lead.commission && lead.commission_eligible) {
      const due = lead.commission.commission_due ?? 0;
      const paid = lead.commission.commission_paid ?? 0;
      commissionDue += Math.max(0, due - paid);
    }
  }

  return { inWorkAmount, inWorkCount, closed30Amount, closed30Count, commissionDue, new7Count };
}

function summarizeDay(grouped: Record<Urgency, LeadRow[]>): string {
  const parts: string[] = [];
  if (grouped.urgent.length > 0) parts.push(`🔴 ${grouped.urgent.length} срочно`);
  if (grouped.on_you.length > 0) parts.push(`🟡 ${grouped.on_you.length} на тебе`);
  if (grouped.waiting.length > 0) parts.push(`🔵 ${grouped.waiting.length} в ожидании`);
  if (parts.length === 0) return "Всё спокойно — нет активных сделок";
  return parts.join(" · ");
}

function getGreeting(): string {
  // Текущий час в часовом поясе Красноярска (UTC+7)
  const krs = new Date(Date.now() + (new Date().getTimezoneOffset() + 7 * 60) * 60_000);
  const h = krs.getHours();
  if (h >= 5 && h < 12) return "Доброе утро";
  if (h >= 12 && h < 18) return "Добрый день";
  if (h >= 18 && h < 23) return "Добрый вечер";
  return "Доброй ночи";
}

function formatDate(): string {
  return new Date().toLocaleDateString("ru-RU", {
    timeZone: "Asia/Krasnoyarsk",
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}
