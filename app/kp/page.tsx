"use client";

import { useEffect, useState } from "react";
import Container from "@/components/ui/Container";
import { calculate, groupLinesByGroup, groupLabel, formatRub, getRegion, CATALOG_VERSION } from "@/lib/calculator";
import type { BuildingInput, Estimate } from "@/lib/calculator/types";

interface KpPayload {
  input: BuildingInput;
  client?: { name?: string; phone?: string };
  leadId?: string;
  catalogVersion?: string;
  issuedAt?: string;
  mode?: "current-recalc" | string;
}

// Декодирование данных из URL (#data=base64)
function decodeInput(): KpPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const hash = window.location.hash.slice(1);
    const params = new URLSearchParams(hash);
    const dataRaw = params.get("data");
    if (!dataRaw) return null;
    const decoded = decodeURIComponent(escape(atob(dataRaw)));
    const parsed = JSON.parse(decoded);
    if (parsed?.input) return parsed;
    return { input: parsed };
  } catch (e) {
    console.error("Failed to decode input:", e);
    return null;
  }
}

export default function KpPage() {
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [client, setClient] = useState<{ name?: string; phone?: string } | null>(null);
  const [payloadMeta, setPayloadMeta] = useState<Omit<KpPayload, "input" | "client"> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const decoded = decodeInput();
    if (!decoded) {
      setError("Не удалось загрузить данные КП. Проверьте ссылку.");
      return;
    }
    try {
      const est = calculate(decoded.input);
      setEstimate(est);
      setClient(decoded.client ?? null);
      setPayloadMeta({
        leadId: decoded.leadId,
        catalogVersion: decoded.catalogVersion,
        issuedAt: decoded.issuedAt,
        mode: decoded.mode,
      });
    } catch (e: any) {
      setError(`Ошибка расчёта: ${e.message}`);
    }
  }, []);

  if (error) {
    return (
      <Container className="py-32 text-center">
        <h1 className="mb-4 text-3xl font-bold text-graphite-900">Ошибка</h1>
        <p className="text-graphite-900/60">{error}</p>
      </Container>
    );
  }

  if (!estimate) {
    return (
      <Container className="py-32 text-center">
        <p className="text-graphite-900/60">Загрузка...</p>
      </Container>
    );
  }

  const groups = groupLinesByGroup(estimate.lines);
  const today = new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="bg-light pb-24 pt-32 print:pt-0">
      <Container>
        {/* ─────────── Заголовок КП ─────────── */}
        <div className="mb-10 border-b-2 border-orange pb-6 print:mb-6">
          <div className="flex items-end justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-orange">Коммерческое предложение</p>
              <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-graphite-900 md:text-5xl">
                ООО «АЗИМЕР»
              </h1>
              <p className="mt-2 text-sm text-graphite-900/60">Предварительное КП · каркасные здания под ключ</p>
            </div>
            <div className="text-right">
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-graphite-900/40">Дата</p>
              <p className="mt-1 text-sm font-medium text-graphite-900/80">{today}</p>
            </div>
          </div>
        </div>

        {/* ─────────── Кому ─────────── */}
        {client && (client.name || client.phone) && (
          <div className="mb-8 rounded-2xl border border-line bg-white p-6">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-graphite-900/40">Кому</p>
            <p className="mt-2 text-lg font-semibold text-graphite-900">
              {client.name ?? "—"}
            </p>
            {client.phone && (
              <p className="text-sm text-graphite-900/60">{client.phone}</p>
            )}
          </div>
        )}

        <div className="mb-8 rounded-2xl border border-orange/25 bg-orange/[0.06] p-5 text-sm leading-relaxed text-graphite-900/75">
          <p className="font-semibold text-graphite-900">Расчёт пересчитан по текущему каталогу</p>
          <p className="mt-2">
            Параметры в ссылке не являются электронной подписью цены. Итоговая
            стоимость фиксируется менеджером после проверки заявки, нагрузок и
            спецификации.
          </p>
          <p className="mt-2 font-mono text-[11px] text-graphite-900/45">
            Текущий каталог: {CATALOG_VERSION}
            {payloadMeta?.catalogVersion ? ` · каталог ссылки: ${payloadMeta.catalogVersion}` : ""}
          </p>
        </div>

        {/* ─────────── Описание объекта ─────────── */}
        <div className="mb-8 rounded-2xl border border-line bg-white p-7">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-orange">Параметры объекта</p>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <Field label="Тип объекта" value={objectTypeLabel(estimate.input.objectType)} />
            <Field label="Регион" value={getRegion(estimate.input.region).label} />
            <Field label="Размеры (Д×Ш×В)" value={`${estimate.input.length} × ${estimate.input.width} × ${estimate.input.height} м`} />
            <Field label="Площадь" value={`${estimate.metadata.floorArea} м²`} />
            <Field label="Каркас" value={frameLabel(estimate.input.frame)} />
            <Field label="Стены" value={`${claddingLabel(estimate.input.cladding)}${estimate.input.claddingThk ? ` ${estimate.input.claddingThk}мм` : ""}`} />
            <Field label="Кровля" value={`${roofingLabel(estimate.input.roofing)}${estimate.input.roofingThk ? ` ${estimate.input.roofingThk}мм` : ""}`} />
            <Field label="Фундамент" value={foundationLabel(estimate.input.foundation)} />
            <Field label="Стен" value={`${estimate.metadata.wallArea} м²`} />
            <Field label="Кровли" value={`${estimate.metadata.roofArea} м²`} />
          </div>
        </div>

        {/* ─────────── Детализированная смета ─────────── */}
        <div className="mb-8">
          <p className="mb-4 font-mono text-xs uppercase tracking-[0.2em] text-orange">Спецификация и смета</p>

          {(() => {
            // Распределяем НР+СП+маржу+наценку пропорционально на каждую группу
            const directSum = Object.values(groups).reduce(
              (s, ls) => s + ls.reduce((a, l) => a + l.total, 0), 0,
            );
            const mul = directSum > 0 ? estimate.totals.final / directSum : 1;
            return Object.entries(groups).map(([groupKey, lines]) => {
              const groupTotalRaw = lines.reduce((s, l) => s + l.total, 0);
              const groupTotal = Math.round(groupTotalRaw * mul);
              return (
                <div key={groupKey} className="mb-6 rounded-2xl border border-line bg-white overflow-hidden">
                  <div className="flex items-center justify-between border-b border-line bg-light/50 px-6 py-3">
                    <p className="font-semibold text-graphite-900">{groupLabel(groupKey)}</p>
                    <p className="text-sm font-bold text-orange">{formatRub(groupTotal)}</p>
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-line/50 text-xs uppercase tracking-wider text-graphite-900/40">
                        <th className="px-6 py-2 text-left font-medium">Наименование</th>
                        <th className="px-2 py-2 text-right font-medium">Кол-во</th>
                        <th className="px-2 py-2 text-right font-medium">Ед.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map((l, i) => (
                        <tr key={i} className="border-b border-line/30 last:border-0">
                          <td className="px-6 py-2.5">
                            <div className={`${l.category === "work" ? "italic text-graphite-900/70" : "text-graphite-900"}`}>
                              {l.name}
                            </div>
                            {l.note && <div className="mt-0.5 text-xs text-graphite-900/40">{l.note}</div>}
                          </td>
                          <td className="px-2 py-2.5 text-right font-mono">{l.quantity}</td>
                          <td className="px-2 py-2.5 text-right text-graphite-900/60">{l.unit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            });
          })()}
        </div>

        {/* ─────────── Итоги (без раскрытия маржи клиенту) ─────────── */}
        <div className="rounded-2xl bg-graphite-950 p-8 text-light">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-orange">Итого</p>
          {(() => {
            // Распределяем накладные/прибыль/маржу/наценку пропорционально на материалы и работы
            const directSum = estimate.totals.materials + estimate.totals.works + estimate.totals.logistics;
            const mul = directSum > 0 ? estimate.totals.final / directSum : 1;
            const matFinal = Math.round(estimate.totals.materials * mul);
            const wrkFinal = Math.round(estimate.totals.works * mul);
            const logFinal = Math.round(estimate.totals.logistics * mul);
            return (
              <div className="mt-5 space-y-2 text-sm">
                <Row label="Материалы (с доставкой и расходниками)" value={formatRub(matFinal)} />
                <Row label="Работы (монтаж, сборка, отделка)" value={formatRub(wrkFinal)} />
                {logFinal > 0 && <Row label="Логистика по направлению" value={formatRub(logFinal)} />}
              </div>
            );
          })()}
          <div className="mt-6 border-t border-light/20 pt-6">
            <div className="flex items-baseline justify-between">
              <span className="text-lg font-semibold">Итоговая стоимость</span>
              <span className="text-4xl font-extrabold tracking-tight text-orange">{formatRub(estimate.totals.final)}</span>
            </div>
            <p className="mt-2 text-xs text-light/50">
              Диапазон уточнения: {formatRub(estimate.totals.low)} — {formatRub(estimate.totals.high)}
            </p>
          </div>
        </div>

        {estimate.complexity !== "TYPICAL" && (
          <div className="mt-6 rounded-2xl border-l-4 border-orange bg-orange/5 p-5 text-sm leading-relaxed text-graphite-900/75">
            <p className="font-semibold text-graphite-900">
              Требуется инженерная проверка перед фиксацией цены
            </p>
            <p className="mt-2">
              Обнаружены факторы: {estimate.flags.map(flagLabel).join(", ")}.
              Для таких объектов итоговая сумма является ориентиром до проверки
              КМ/КЖ, основания и региональных нагрузок.
            </p>
          </div>
        )}

        {/* ─────────── Что входит / не входит ─────────── */}
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {/* Включено */}
          <div className="rounded-2xl border border-green-700/20 bg-green-50/50 p-6">
            <p className="font-semibold text-green-800">✅ Включено в стоимость</p>
            <ul className="mt-3 space-y-1.5 text-sm text-graphite-900/80">
              {included(estimate.input).map((s, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-green-600">•</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
          {/* Не включено */}
          <div className="rounded-2xl border border-red-700/20 bg-red-50/30 p-6">
            <p className="font-semibold text-red-800">❌ Не входит в стоимость</p>
            <ul className="mt-3 space-y-1.5 text-sm text-graphite-900/80">
              {excluded(estimate.input).map((s, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-red-600">•</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-graphite-900/50">
              Эти позиции можем добавить в КП отдельно — обсудим с менеджером.
            </p>
          </div>
        </div>

        {/* ─────────── Дисклеймер ─────────── */}
        <div className="mt-6 rounded-2xl border-l-4 border-orange bg-orange/5 p-5 text-sm leading-relaxed text-graphite-900/70">
          <p className="font-semibold text-graphite-900">⚠️ Важно:</p>
          <p className="mt-2">
            Расчёт предварительный{estimate.complexity === "TYPICAL" ? (
              <> с точностью <strong>±10%</strong> для типовых объектов</>
            ) : (
              <> и требует инженерной проверки перед фиксацией бюджета</>
            )}.
            Финальная цена утверждается после технического обследования объекта,
            уточнения геологии и согласования спецификации материалов.
            Срок действия КП: <strong>14 рабочих дней</strong> с даты выдачи.
          </p>
        </div>

        {/* ─────────── Кнопки ─────────── */}
        <div className="mt-8 flex flex-wrap justify-center gap-4 print:hidden">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-full bg-orange px-7 py-3.5 text-sm font-semibold text-white transition-all duration-300 hover:bg-orange-bright hover:-translate-y-0.5"
          >
            🖨 Распечатать / Сохранить PDF
          </button>
          <a
            href="/contacts"
            className="inline-flex items-center gap-2 rounded-full border border-graphite-900/20 px-7 py-3.5 text-sm font-semibold text-graphite-900 transition-colors hover:border-orange"
          >
            Связаться с менеджером
          </a>
        </div>

        {/* ─────────── Подпись + QR на сайт ─────────── */}
        <div className="mt-10 flex items-center justify-between gap-6 border-t border-line pt-6 text-xs text-graphite-900/40">
          <div className="text-left">
            <p>ООО «АЗИМЕР» · ИНН 2466294494 · ОГРН 1232400004242 · Красноярск</p>
            <p className="mt-1">azimer.ru · Расчёт: {new Date(estimate.calculatedAt).toLocaleString("ru-RU")}</p>
          </div>
          <div className="flex shrink-0 flex-col items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/qr-azimer-site.png"
              alt="QR на сайт АЗИМЕР"
              width={72}
              height={72}
              className="rounded-md"
            />
            <span className="mt-1 font-mono text-[9px] uppercase tracking-[0.14em]">
              azimer.ru
            </span>
          </div>
        </div>
      </Container>
    </div>
  );
}

// ─────────── Вспомогательные компоненты ───────────

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-wider text-graphite-900/40">{label}</p>
      <p className="mt-1 text-sm font-medium text-graphite-900">{value}</p>
    </div>
  );
}

function Row({ label, value, bold, muted }: { label: string; value: string; bold?: boolean; muted?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between ${bold ? "font-semibold" : ""} ${muted ? "text-light/50 text-xs" : ""}`}>
      <span>{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}

// ─────────── Лейблы ───────────

const objectTypeLabel = (t: string) => ({
  sklad: "Склад", angar: "Ангар", production: "Производство", commercial: "Коммерческое",
  naves: "Навес", modular: "Модульное", residential: "Жилое",
}[t] ?? t);

const frameLabel = (f: string) => ({
  lstk: "ЛСТК", metal: "Металлокаркас", modular: "Модульный",
}[f] ?? f);

const claddingLabel = (c: string) => ({
  none: "Без стен", proflist: "Профлист", sandwich_minvata: "Сэндвич минвата", sandwich_pir: "Сэндвич PIR",
}[c] ?? c);

const roofingLabel = (r: string) => ({
  proflist: "Профлист", sandwich_minvata: "Сэндвич минвата", sandwich_pir: "Сэндвич PIR",
}[r] ?? r);

const foundationLabel = (f: string) => ({
  none: "Без фундамента", pile_screw: "Свайно-винтовой", pile_grillage: "Свайно-ростверковый",
  strip: "Ленточный", slab_200: "Плита 200мм", slab_300: "Плита 300мм",
}[f] ?? f);

const flagLabel = (f: string) => ({
  large_span: "большой пролёт",
  multi_span: "несколько пролётов",
  overhead_crane: "мостовой кран",
  mezzanine: "антресоль",
  non_rectangular: "сложная форма плана",
  large_column_step: "увеличенный шаг колонн",
  high_walls: "высокие стены",
  extreme_snow: "повышенная снеговая нагрузка",
  seismic: "сейсмика",
  high_seismic: "сейсмика 8+",
  permafrost: "вечная мерзлота",
  heavy_insulation: "тяжёлое утепление",
  tall_rack: "высокие стеллажи",
  very_large_object: "крупный объект",
  unsupported_region: "регион требует уточнения",
  non_standard_envelope: "нестандартная оболочка",
}[f] ?? f);

// ─────────── Что входит / не входит ───────────

function included(input: BuildingInput): string[] {
  const list: string[] = [
    "Проектирование (типовая КМ-документация)",
    "Изготовление металлоконструкций каркаса",
    "Антикоррозийная обработка / покраска",
    "Доставка материалов в Красноярск",
    "Монтаж каркаса на готовый фундамент",
    "Гарантия на конструкцию — 7 лет",
  ];
  if (input.foundation !== "none") {
    list.push(`Фундамент: ${foundationLabel(input.foundation)}`);
  }
  if (input.cladding !== "none") {
    list.push(`Облицовка стен: ${claddingLabel(input.cladding)}${input.claddingThk ? ` ${input.claddingThk}мм` : ""}`);
  }
  if (input.roofing) {
    list.push(`Кровля: ${roofingLabel(input.roofing)}${input.roofingThk ? ` ${input.roofingThk}мм` : ""}`);
  }
  const gateCount = (input.gates ?? []).reduce((s, g) => s + g.count, 0);
  if (gateCount > 0) list.push(`Ворота секционные с автоматикой — ${gateCount} шт`);
  const winCount = (input.windows ?? []).reduce((s, w) => s + w.count, 0);
  if (winCount > 0) list.push(`Окна ПВХ — ${winCount} шт`);
  const doorCount = input.doors?.count ?? 0;
  if (doorCount > 0) list.push(`Двери — ${doorCount} шт`);
  if (input.logisticsAdd) {
    list.push(`Доставка в направлении: ${input.logisticsDest === "other" ? "по согласованию" : input.logisticsDest}`);
  }
  return list;
}

function excluded(input: BuildingInput): string[] {
  const list: string[] = [];
  if (input.foundation === "none") {
    list.push("Фундамент (требует отдельного расчёта по геологии)");
  }
  // Внутренние работы
  list.push("Электрика, освещение, силовая разводка");
  list.push("Отопление и вентиляция");
  list.push("Внутренняя отделка стен и потолка");
  list.push("Бетонные полы / промышленный наливной пол");
  list.push("Сантехника, водоснабжение, канализация");
  list.push("Слаботочные системы (видеонаблюдение, охрана)");
  list.push("Подключение к внешним сетям");

  // Гео
  if (!input.logisticsAdd) {
    list.push("Доставка за пределы Красноярска");
  }
  // Документы
  list.push("Экспертиза проекта, разрешения, ИРД");
  list.push("Кран-балки, мостовые краны");
  list.push("Антресоли, второй этаж, мезонин");

  return list;
}
