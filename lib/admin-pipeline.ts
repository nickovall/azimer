// Воронка AZIMER глазами Азамата.
// Группирует 15 БД-статусов в 5 рабочих колонок Канбана + отдельный архив отказов.
// Маркирует срочность светофором (🔴/🟡/🔵/⚪) и подсказывает следующий шаг.

import type { LeadStatus } from "@/lib/admin-api";

export type PipelineColumn =
  | "fresh"     // Свежие — что-то надо сделать
  | "working"   // В работе — мы внутри
  | "client"    // У клиента — ждём его
  | "accounting" // У бухгалтерии — ждём её
  | "closed"    // Закрыто — деньги пришли
  | "rejected"; // Отказ — отдельная вкладка

export type Urgency = "urgent" | "on_you" | "waiting" | "archived";

interface ColumnDef {
  key: PipelineColumn;
  title: string;
  subtitle: string;
  emoji: string;
  statuses: LeadStatus[];
  /** статус по умолчанию при перемещении карточки в эту колонку */
  entryStatus: LeadStatus;
}

export const PIPELINE_COLUMNS: ColumnDef[] = [
  {
    key: "fresh",
    title: "Свежие",
    subtitle: "Позвонить",
    emoji: "🆕",
    statuses: ["new", "contacted"],
    entryStatus: "new",
  },
  {
    key: "working",
    title: "В работе",
    subtitle: "Считаем КП",
    emoji: "🛠",
    statuses: ["accepted", "measurement_done", "tz_received", "kp_preparing"],
    entryStatus: "accepted",
  },
  {
    key: "client",
    title: "У клиента",
    subtitle: "Ждём ответ",
    emoji: "📤",
    statuses: ["kp_sent", "kp_approved"],
    entryStatus: "kp_sent",
  },
  {
    key: "accounting",
    title: "У бухгалтерии",
    subtitle: "Ждём счёт / оплату",
    emoji: "💼",
    statuses: ["sent_to_accountant", "invoice_issued", "paid_partial"],
    entryStatus: "sent_to_accountant",
  },
  {
    key: "closed",
    title: "Закрыто",
    subtitle: "Деньги пришли",
    emoji: "✅",
    statuses: ["paid_full", "won", "commission_paid"],
    entryStatus: "won",
  },
  {
    key: "rejected",
    title: "Отказ",
    subtitle: "Архив",
    emoji: "🗂",
    statuses: ["lost"],
    entryStatus: "lost",
  },
];

export const STATUS_TO_COLUMN: Record<LeadStatus, PipelineColumn> = (() => {
  const map = {} as Record<LeadStatus, PipelineColumn>;
  for (const col of PIPELINE_COLUMNS) {
    for (const s of col.statuses) map[s] = col.key;
  }
  return map;
})();

// Понятные человеческие лейблы — переопределение для UI карточки.
// Codex'овский STATUS_LABEL оставляем для совместимости с админ-API.
export const STATUS_FRIENDLY: Record<LeadStatus, string> = {
  new: "Новая заявка",
  contacted: "В разговоре",
  accepted: "Принято в работу",
  measurement_done: "Замеры сделаны",
  tz_received: "ТЗ получено",
  kp_preparing: "Готовлю КП",
  kp_sent: "КП у клиента",
  kp_approved: "КП одобрен",
  sent_to_accountant: "У бухгалтерии",
  invoice_issued: "Счёт выставлен",
  paid_partial: "Оплачено частично",
  paid_full: "Оплачено полностью",
  won: "Договор подписан",
  commission_paid: "Закрыто",
  lost: "Отказ",
};

// Подсказка «что делать дальше» прямо на карточке.
export const NEXT_STEP_HINT: Record<LeadStatus, string> = {
  new: "Позвонить, уточнить детали",
  contacted: "Принять в работу или отказать",
  accepted: "Назначить замер на объекте",
  measurement_done: "Получить ТЗ от клиента",
  tz_received: "Подготовить КП",
  kp_preparing: "Отправить КП клиенту",
  kp_sent: "Ждём ответа клиента",
  kp_approved: "Передать бухгалтеру",
  sent_to_accountant: "Ждём счёт от бухгалтера",
  invoice_issued: "Ждём оплату клиента",
  paid_partial: "Ждём дооплату",
  paid_full: "Закрыть сделку",
  won: "Зафиксировать комиссию",
  commission_paid: "Сделка завершена",
  lost: "Сделка не состоялась",
};

// Следующий статус по кнопке «→ Дальше» на карточке.
// null = терминальный, кнопки нет.
export const NEXT_STATUS: Record<LeadStatus, LeadStatus | null> = {
  new: "contacted",
  contacted: "accepted",
  accepted: "measurement_done",
  measurement_done: "tz_received",
  tz_received: "kp_preparing",
  kp_preparing: "kp_sent",
  kp_sent: "kp_approved",
  kp_approved: "sent_to_accountant",
  sent_to_accountant: "invoice_issued",
  invoice_issued: "paid_partial",
  paid_partial: "paid_full",
  paid_full: "won",
  won: "commission_paid",
  commission_paid: null,
  lost: null,
};

// Текст на кнопке «→ Дальше» — что произойдёт по клику.
export const NEXT_STEP_BUTTON: Record<LeadStatus, string | null> = {
  new: "→ Позвонил",
  contacted: "→ Принять в работу",
  accepted: "→ Замер сделан",
  measurement_done: "→ ТЗ получено",
  tz_received: "→ Готовлю КП",
  kp_preparing: "→ КП отправлен",
  kp_sent: "→ КП одобрен",
  kp_approved: "→ Передать бухгалтеру",
  sent_to_accountant: "→ Счёт выставлен",
  invoice_issued: "→ Оплачено частично",
  paid_partial: "→ Оплачено полностью",
  paid_full: "→ Договор подписан",
  won: "→ Комиссия выплачена",
  commission_paid: null,
  lost: null,
};

const DAYS_TO_URGENT = 7;

// Логика «светофора» — в каком цвете показывать карточку.
//   urgent  🔴 — дедлайн прошёл, или ждём клиента 7+ дней
//   on_you  🟡 — мяч на стороне Азамата
//   waiting 🔵 — ждём ответа извне (норма)
//   archived ⚪ — закрытая сделка или отказ
export function computeUrgency(args: {
  status: LeadStatus;
  statusUpdatedAt: string | null;
  deadlineAt?: string | null;
}): Urgency {
  const { status, statusUpdatedAt, deadlineAt } = args;
  const col = STATUS_TO_COLUMN[status];

  if (col === "closed") return "archived";
  if (col === "rejected") return "archived";

  // Просроченный дедлайн (для тендеров)
  if (deadlineAt && new Date(deadlineAt) < new Date()) return "urgent";

  const waitingForOthers: LeadStatus[] = [
    "kp_sent",
    "kp_approved",
    "sent_to_accountant",
    "invoice_issued",
    "paid_partial",
  ];

  if (waitingForOthers.includes(status)) {
    // Молчание >7 дней — становится срочным
    if (statusUpdatedAt) {
      const daysSince = (Date.now() - new Date(statusUpdatedAt).getTime()) / 86_400_000;
      if (daysSince >= DAYS_TO_URGENT) return "urgent";
    }
    return "waiting";
  }

  return "on_you";
}

// Tailwind-классы для всей карточки по urgency.
export const URGENCY_BORDER: Record<Urgency, string> = {
  urgent: "border-l-4 border-l-red-500",
  on_you: "border-l-4 border-l-amber-400",
  waiting: "border-l-4 border-l-sky-400",
  archived: "border-l-4 border-l-gray-300",
};

export const URGENCY_DOT: Record<Urgency, string> = {
  urgent: "bg-red-500",
  on_you: "bg-amber-400",
  waiting: "bg-sky-400",
  archived: "bg-gray-300",
};

export const URGENCY_BADGE: Record<Urgency, string> = {
  urgent: "bg-red-50 text-red-800",
  on_you: "bg-amber-50 text-amber-900",
  waiting: "bg-sky-50 text-sky-800",
  archived: "bg-gray-100 text-gray-600",
};

export const URGENCY_LABEL: Record<Urgency, string> = {
  urgent: "🔴 Срочно",
  on_you: "🟡 На тебе",
  waiting: "🔵 Ждём",
  archived: "⚪ Архив",
};
