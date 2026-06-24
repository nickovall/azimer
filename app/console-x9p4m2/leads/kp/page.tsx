"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAdmin } from "@/components/admin/AdminShell";
import { adminFetch, fmtRub, type LeadFull } from "@/lib/admin-api";
import { calculate } from "@/lib/calculator";
import {
  calcEstimate,
  stateToInput,
  initialState,
  regionTypes,
  objectTypes,
  frameTypes,
  claddingTypes,
  roofingTypes,
  foundationTypes,
  optionItems,
  type WizardState,
} from "@/lib/pricing";
import {
  type KpSpecLine,
  buildDraftSpec,
  specTotal,
  isSpecArray,
  blankSpecLine,
  SPEC_GROUP_OPTIONS,
} from "@/lib/kp-spec";

export default function AdminKpEditorPageWrapper() {
  return (
    <Suspense fallback={<p className="py-16 text-center text-graphite-900/40">Загружаем…</p>}>
      <AdminKpEditorPage />
    </Suspense>
  );
}

function AdminKpEditorPage() {
  const { token } = useAdmin();
  const params = useSearchParams();
  const id = params.get("id");

  const [lead, setLead] = useState<LeadFull | null>(null);
  const [state, setState] = useState<WizardState>(initialState);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [versionLabel, setVersionLabel] = useState("после разговора с клиентом");
  // Ручная смета. null = авто-расчёт движком; массив = ручной режим (правим строки).
  const [spec, setSpec] = useState<KpSpecLine[] | null>(null);

  // Загрузить лида и пред-заполнить state
  const load = useCallback(async () => {
    if (!id) {
      setError("Не указан id заявки");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const r = await adminFetch<{ ok: true; lead: LeadFull }>(token, { action: "get_lead", id });
      setLead(r.lead);
      const savedSpec = (r.lead.estimate as Record<string, unknown> | null)?.spec;
      setSpec(isSpecArray(savedSpec) ? savedSpec : null);
      const existing = (r.lead.estimate as Record<string, unknown> | null)?.state as Partial<WizardState> | undefined;
      if (existing) {
        setState({
          objectType: existing.objectType ?? initialState.objectType,
          region:     existing.region     ?? initialState.region,
          frame:      existing.frame      ?? initialState.frame,
          length:     Number(existing.length) || 0,
          width:      Number(existing.width)  || 0,
          height:     Number(existing.height) || 0,
          cladding:   existing.cladding   ?? initialState.cladding,
          roofing:    existing.roofing    ?? initialState.roofing,
          foundation: existing.foundation ?? initialState.foundation,
          options:    {
            gate:   Number((existing.options as Record<string, unknown> | undefined)?.gate)   || 0,
            window: Number((existing.options as Record<string, unknown> | undefined)?.window) || 0,
            door:   Number((existing.options as Record<string, unknown> | undefined)?.door)   || 0,
          },
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [id, token]);

  useEffect(() => { load(); }, [load]);

  // Пересчёт на каждое изменение — engine v3 быстрый
  const estimate = useMemo(() => {
    const valid = state.objectType && state.region && state.frame && state.length > 0 && state.width > 0 && state.height > 0;
    if (!valid) return null;
    try {
      return calcEstimate(state);
    } catch {
      return null;
    }
  }, [state]);

  // Детальный расчёт движка (строки name/qty/unit с ценами) — нужен для черновика сметы.
  const engineEstimate = useMemo(() => {
    const valid = state.objectType && state.region && state.frame && state.length > 0 && state.width > 0 && state.height > 0;
    if (!valid) return null;
    try { return calculate(stateToInput(state)); } catch { return null; }
  }, [state]);

  const specSum = spec ? specTotal(spec) : 0;
  const effectiveTotal = spec ? specSum : (estimate?.base ?? 0);

  const totalArea = state.length * state.width;
  const perM2 = effectiveTotal > 0 && totalArea > 0 ? effectiveTotal / totalArea : 0;

  // ─── Управление ручной сметой ───
  function enableManualSpec() {
    if (engineEstimate) setSpec(buildDraftSpec(engineEstimate));
  }
  function reseedSpec() {
    if (!engineEstimate) return;
    if (!confirm("Пересобрать смету из расчёта движка? Ручные правки будут потеряны.")) return;
    setSpec(buildDraftSpec(engineEstimate));
  }
  function updateLine(lineId: string, patch: Partial<KpSpecLine>) {
    setSpec((cur) => cur ? cur.map((l) => (l.id === lineId ? { ...l, ...patch } : l)) : cur);
  }
  function removeLine(lineId: string) {
    setSpec((cur) => cur ? cur.filter((l) => l.id !== lineId) : cur);
  }
  function addLine() {
    setSpec((cur) => (cur ? [...cur, blankSpecLine()] : [blankSpecLine()]));
  }

  async function handleSave() {
    if (!lead || !estimate) return;
    setSaving(true);
    setSaveResult(null);
    try {
      // Ручная смета (если включена) задаёт итог; иначе берём расчёт движка.
      const useSpec = !!spec && spec.length > 0;
      const baseFinal = useSpec ? specSum : estimate.base;
      const r = await adminFetch<{ ok: true; version: number }>(token, {
        action: "save_lead_estimate",
        id: lead.id,
        estimate: {
          state,
          base: baseFinal,
          low:  useSpec ? Math.round(baseFinal * 0.9) : estimate.low,
          high: useSpec ? Math.round(baseFinal * 1.1) : estimate.high,
          area: estimate.area,
          wallArea: estimate.wallArea,
          lines: estimate.lines,
          spec: useSpec ? spec : undefined,   // undefined → ключ не сохранится (вернули авто-расчёт)
          complexity: estimate.complexity,
          flags: estimate.flags,
          regionLabel: estimate.regionLabel,
          catalogVersion: estimate.catalogVersion,
        },
        version_label: versionLabel,
      });
      setSaveResult({ ok: true, text: `✅ Сохранено как КП v${r.version}` });
      await load();
    } catch (e) {
      setSaveResult({ ok: false, text: "❌ " + (e instanceof Error ? e.message : String(e)) });
    } finally {
      setSaving(false);
    }
  }

  function buildKpUrl(): string {
    if (!estimate || !lead) return "";
    // Формат payload ОБЯЗАН совпадать с серверным buildKpUrlForLead:
    // /kp ждёт { input: BuildingInput } и сам пересчитывает по текущему каталогу.
    // Раньше клали { state, ... } — /kp не мог распарсить и падал в «Ошибка».
    const payload = {
      input: stateToInput(state),
      spec: spec && spec.length > 0 ? spec : undefined,  // ручная смета → /kp покажет её
      client: { name: lead.company || lead.name, phone: lead.phone },
      leadId: lead.id,
      catalogVersion: estimate.catalogVersion ?? lead.catalog_version ?? null,
      issuedAt: lead.created_at,
      mode: "current-recalc",
    };
    const json = JSON.stringify(payload);
    const b64 = typeof window !== "undefined"
      ? btoa(unescape(encodeURIComponent(json)))
      : "";
    return `/kp/#data=${b64}`;
  }

  if (loading) return <p className="py-16 text-center text-graphite-900/40">Загружаем…</p>;
  if (error) return (
    <div className="rounded-2xl border border-red-300 bg-red-50 p-6 text-sm text-red-800">
      ❌ {error}
      <div className="mt-3">
        <Link href="/console-x9p4m2/leads/" className="text-xs text-orange hover:underline">← К списку</Link>
      </div>
    </div>
  );
  if (!lead) return null;

  return (
    <div>
      <div className="flex items-center justify-between">
        <Link href={`/console-x9p4m2/leads/view/?id=${lead.id}`} className="text-xs text-orange hover:underline">
          ← К карточке
        </Link>
        <span className="font-mono text-xs text-graphite-900/30">{lead.lead_code ?? lead.id.slice(0, 8)}</span>
      </div>

      <header className="mt-3 border-b border-line pb-5">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-orange">🧮 Редактор КП</p>
        <h1 className="mt-1 text-3xl font-bold text-graphite-900">{lead.company || lead.name}</h1>
        <p className="mt-1 text-sm text-graphite-900/60">
          Тот же движок что на сайте · 117 тестов СНиП · меняй параметры — цифры справа обновляются на лету
        </p>
      </header>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Форма */}
        <div className="space-y-5">
          <FieldGroup title="📍 Регион">
            <SelectChips
              value={state.region}
              onChange={(v) => setState((s) => ({ ...s, region: v }))}
              options={regionTypes.map((r) => ({ id: r.id, label: r.label, desc: r.desc }))}
            />
          </FieldGroup>

          <FieldGroup title="🏗 Тип объекта">
            <SelectChips
              value={state.objectType}
              onChange={(v) => setState((s) => ({ ...s, objectType: v }))}
              options={objectTypes.map((r) => ({ id: r.id, label: r.label, desc: r.desc }))}
            />
          </FieldGroup>

          <FieldGroup title="📐 Размеры">
            <div className="grid grid-cols-3 gap-3">
              <NumberInput label="Длина, м" value={state.length} onChange={(v) => setState((s) => ({ ...s, length: v }))} min={1} max={200} />
              <NumberInput label="Ширина, м" value={state.width} onChange={(v) => setState((s) => ({ ...s, width: v }))} min={1} max={200} />
              <NumberInput label="Высота, м" value={state.height} onChange={(v) => setState((s) => ({ ...s, height: v }))} min={1} max={30} step={0.5} />
            </div>
            <p className="mt-2 text-xs text-graphite-900/45">
              Площадь: <span className="font-mono">{totalArea > 0 ? totalArea.toFixed(1) : "—"} м²</span>
            </p>
          </FieldGroup>

          <FieldGroup title="🔩 Каркас">
            <SelectChips
              value={state.frame}
              onChange={(v) => setState((s) => ({ ...s, frame: v }))}
              options={frameTypes.map((r) => ({ id: r.id, label: r.label, desc: r.desc, badge: r.rate ? `${r.rate.toLocaleString("ru-RU")} ₽/м²` : undefined }))}
            />
          </FieldGroup>

          <FieldGroup title="🧱 Стены">
            <SelectChips
              value={state.cladding}
              onChange={(v) => setState((s) => ({ ...s, cladding: v }))}
              options={claddingTypes.map((r) => ({ id: r.id, label: r.label, desc: r.desc, badge: r.rate ? `${r.rate.toLocaleString("ru-RU")} ₽/м²` : undefined }))}
            />
          </FieldGroup>

          <FieldGroup title="🏠 Кровля">
            <SelectChips
              value={state.roofing}
              onChange={(v) => setState((s) => ({ ...s, roofing: v }))}
              options={roofingTypes.map((r) => ({ id: r.id, label: r.label, desc: r.desc, badge: r.rate ? `${r.rate.toLocaleString("ru-RU")} ₽/м²` : undefined }))}
            />
          </FieldGroup>

          <FieldGroup title="🏗 Фундамент">
            <SelectChips
              value={state.foundation}
              onChange={(v) => setState((s) => ({ ...s, foundation: v }))}
              options={foundationTypes.map((r) => ({ id: r.id, label: r.label, desc: r.desc, badge: r.rate ? `${r.rate.toLocaleString("ru-RU")} ₽/м²` : undefined }))}
            />
          </FieldGroup>

          <FieldGroup title="🚪 Доборные">
            <div className="grid grid-cols-3 gap-3">
              {optionItems.map((opt) => (
                <NumberInput
                  key={opt.id}
                  label={`${opt.label}, шт`}
                  value={state.options[opt.id] ?? 0}
                  onChange={(v) => setState((s) => ({ ...s, options: { ...s.options, [opt.id]: v } }))}
                  min={0}
                  max={50}
                />
              ))}
            </div>
            <p className="mt-2 text-xs text-graphite-900/45">
              {optionItems.map((o) => `${o.label} ≈ ${fmtRub(o.price)}/шт`).join(" · ")}
            </p>
          </FieldGroup>
        </div>

        {/* Итог */}
        <aside className="space-y-4 lg:sticky lg:top-24 lg:h-fit">
          <section className="rounded-2xl border border-line bg-white p-5">
            <p className="text-xs uppercase tracking-wider text-graphite-900/40">Итог</p>
            {estimate ? (
              <>
                <p className="mt-1 text-3xl font-bold text-graphite-900 tabular-nums">{fmtRub(effectiveTotal)}</p>
                {spec ? (
                  <p className="mt-1 text-xs font-medium text-orange">✎ ручная смета ({spec.length} строк)</p>
                ) : (
                  <p className="mt-1 text-xs text-graphite-900/50">
                    Диапазон <span className="font-mono">{fmtRub(estimate.low)} — {fmtRub(estimate.high)}</span>
                  </p>
                )}
                {perM2 > 0 && (
                  <p className="mt-1 text-xs text-graphite-900/50">
                    ≈ <span className="font-mono">{perM2.toLocaleString("ru-RU", { maximumFractionDigits: 0 })} ₽/м²</span>
                  </p>
                )}
                {estimate.complexity !== "TYPICAL" && (
                  <p className={`mt-3 rounded-lg p-2 text-xs ${
                    estimate.complexity === "ENGINEER_REQUIRED"
                      ? "bg-red-50 text-red-800"
                      : "bg-amber-50 text-amber-900"
                  }`}>
                    {estimate.complexity === "ENGINEER_REQUIRED"
                      ? "⚠ Требуется инженерная проверка"
                      : "💡 Расширенный сценарий — уточни параметры"}
                    {estimate.flags.length > 0 && (
                      <span className="mt-1 block opacity-75">{estimate.flags.join(", ")}</span>
                    )}
                  </p>
                )}
              </>
            ) : (
              <p className="mt-2 text-sm text-graphite-900/40">Заполни все поля — расчёт появится здесь</p>
            )}
          </section>

          {estimate && (
            <section className="rounded-2xl border border-line bg-white p-5">
              <p className="text-xs uppercase tracking-wider text-graphite-900/40">Строки расчёта</p>
              <ul className="mt-2 max-h-72 overflow-y-auto space-y-1 text-xs">
                {estimate.lines.map((line, i) => (
                  <li key={i} className="flex items-baseline gap-2">
                    <span className="flex-1 truncate text-graphite-900/80">{line.label}</span>
                    <span className="font-mono tabular-nums text-graphite-900/70">{fmtRub(line.value)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {estimate && (
            <section className="rounded-2xl border border-orange/40 bg-orange/5 p-5">
              <p className="text-xs uppercase tracking-wider text-graphite-900/60">Сохранить версию</p>
              <input
                value={versionLabel}
                onChange={(e) => setVersionLabel(e.target.value)}
                placeholder="Метка версии"
                className="mt-2 w-full rounded-xl border border-line bg-white px-3 py-2 text-sm focus:border-orange focus:outline-none"
              />
              <button
                onClick={handleSave}
                disabled={saving}
                className="mt-3 w-full rounded-full bg-orange py-2.5 text-sm font-semibold text-white hover:bg-orange-bright disabled:opacity-50"
              >
                {saving ? "Сохраняем…" : "💾 Сохранить как новую версию"}
              </button>
              <a
                href={buildKpUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 block rounded-full border border-line bg-white py-2 text-center text-sm font-medium text-orange hover:bg-light"
              >
                📄 Открыть готовый КП →
              </a>
              <p className="mt-2 text-xs text-graphite-900/45">
                Печатная форма с разбивкой. Дальше → распечатать в PDF и положить в 02_КП.
              </p>
              {saveResult && (
                <p className={`mt-2 text-xs ${saveResult.ok ? "text-green-700" : "text-red-700"}`}>
                  {saveResult.text}
                </p>
              )}
            </section>
          )}
        </aside>
      </div>

      {/* ───────── Редактируемая смета (полная смета вручную) ───────── */}
      <section className="mt-8 rounded-2xl border border-line bg-white p-5">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-graphite-900">📋 Смета — позиции КП</h2>
            <p className="mt-0.5 max-w-2xl text-xs text-graphite-900/50">
              {spec
                ? "Ручной режим: правь строки свободно, итог КП = сумма строк. Клиент видит группы и итог по группам, цену по строкам — нет."
                : "Сейчас КП считает движок. Включи ручной режим, чтобы добавлять/удалять/переименовывать позиции и задавать цены."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {!spec ? (
              <button
                onClick={enableManualSpec}
                disabled={!engineEstimate}
                className="rounded-full bg-graphite-950 px-4 py-2 text-xs font-semibold text-light hover:bg-orange disabled:opacity-50"
              >
                ✎ Редактировать смету вручную
              </button>
            ) : (
              <>
                <button
                  onClick={reseedSpec}
                  disabled={!engineEstimate}
                  className="rounded-full border border-line px-4 py-2 text-xs font-medium text-graphite-900/70 hover:border-orange disabled:opacity-50"
                >
                  ↻ Пересобрать из расчёта
                </button>
                <button
                  onClick={() => setSpec(null)}
                  className="rounded-full border border-line px-4 py-2 text-xs font-medium text-graphite-900/70 hover:border-orange"
                >
                  ↩ Вернуть авто-расчёт
                </button>
              </>
            )}
          </div>
        </header>

        {spec && (
          <div className="mt-4 space-y-2">
            <div className="hidden gap-2 px-1 text-[10px] uppercase tracking-wider text-graphite-900/40 md:grid md:grid-cols-[1.5fr_84px_64px_120px_120px_28px]">
              <span>Наименование</span>
              <span className="text-right">Кол-во</span>
              <span>Ед.</span>
              <span>Группа</span>
              <span className="text-right">Сумма ₽</span>
              <span />
            </div>

            {spec.map((line) => (
              <div
                key={line.id}
                className="grid grid-cols-2 gap-2 rounded-xl border border-line bg-light/20 p-2 md:grid-cols-[1.5fr_84px_64px_120px_120px_28px] md:items-center md:border-0 md:bg-transparent md:p-0"
              >
                <input
                  value={line.name}
                  onChange={(e) => updateLine(line.id, { name: e.target.value })}
                  placeholder="Наименование"
                  className="col-span-2 rounded-lg border border-line px-2 py-1.5 text-sm focus:border-orange focus:outline-none md:col-span-1"
                />
                <input
                  type="number"
                  inputMode="decimal"
                  value={line.quantity === 0 ? "" : line.quantity}
                  onChange={(e) => updateLine(line.id, { quantity: e.target.value === "" ? 0 : Number(e.target.value) })}
                  placeholder="Кол-во"
                  className="rounded-lg border border-line px-2 py-1.5 text-right text-sm tabular-nums focus:border-orange focus:outline-none"
                />
                <input
                  value={line.unit}
                  onChange={(e) => updateLine(line.id, { unit: e.target.value })}
                  placeholder="ед"
                  className="rounded-lg border border-line px-2 py-1.5 text-sm focus:border-orange focus:outline-none"
                />
                <select
                  value={line.group}
                  onChange={(e) => updateLine(line.id, { group: e.target.value })}
                  className="rounded-lg border border-line bg-white px-2 py-1.5 text-sm focus:border-orange focus:outline-none"
                >
                  {SPEC_GROUP_OPTIONS.map((o) => (
                    <option key={o.id} value={o.id}>{o.label}</option>
                  ))}
                </select>
                <input
                  type="number"
                  inputMode="decimal"
                  value={line.total === 0 ? "" : line.total}
                  onChange={(e) => updateLine(line.id, { total: e.target.value === "" ? 0 : Number(e.target.value) })}
                  placeholder="₽"
                  className="rounded-lg border border-line px-2 py-1.5 text-right text-sm tabular-nums focus:border-orange focus:outline-none"
                />
                <button
                  onClick={() => removeLine(line.id)}
                  title="Удалить строку"
                  className="justify-self-end rounded-lg px-2 text-graphite-900/40 hover:text-red-600"
                >
                  ✕
                </button>
              </div>
            ))}

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <button
                onClick={addLine}
                className="rounded-full border border-dashed border-line px-4 py-2 text-xs font-medium text-graphite-900/70 hover:border-orange"
              >
                + Добавить строку
              </button>
              <p className="text-sm">
                <span className="text-graphite-900/50">Итог сметы: </span>
                <span className="font-bold text-graphite-900 tabular-nums">{fmtRub(specSum)}</span>
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//   Поля формы
// ═══════════════════════════════════════════════════════════════

function FieldGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-white p-5">
      <h2 className="text-sm font-semibold text-graphite-900">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function NumberInput({
  label, value, onChange, min, max, step,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-wider text-graphite-900/45">{label}</span>
      <input
        type="number"
        inputMode="decimal"
        value={value === 0 ? "" : value}
        onChange={(e) => {
          const v = e.target.value === "" ? 0 : Number(e.target.value);
          if (Number.isFinite(v)) onChange(v);
        }}
        min={min}
        max={max}
        step={step ?? 1}
        className="mt-1 w-full rounded-xl border border-line bg-white px-3 py-2 text-base tabular-nums focus:border-orange focus:outline-none"
      />
    </label>
  );
}

function SelectChips({
  value, onChange, options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Array<{ id: string; label: string; desc?: string; badge?: string }>;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {options.map((opt) => {
        const active = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={`rounded-xl border p-3 text-left transition-colors ${
              active
                ? "border-orange bg-orange/5 ring-2 ring-orange"
                : "border-line bg-white hover:border-orange/50"
            }`}
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-sm font-medium text-graphite-900">{opt.label}</span>
              {opt.badge && (
                <span className="shrink-0 font-mono text-[10px] text-graphite-900/50">{opt.badge}</span>
              )}
            </div>
            {opt.desc && <p className="mt-0.5 text-xs text-graphite-900/55">{opt.desc}</p>}
          </button>
        );
      })}
    </div>
  );
}
