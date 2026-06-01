"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  objectTypes,
  regionTypes,
  frameTypes,
  claddingTypes,
  roofingTypes,
  foundationTypes,
  optionItems,
  initialState,
  calcEstimate,
  formatRub,
  type OptionCard,
  type WizardState,
} from "@/lib/pricing";
import { TextField, ChoiceField } from "../ui/Field";
import { clientTypes } from "@/lib/content";
import { submitLead } from "@/lib/supabase";
import dynamic from "next/dynamic";

const KpDownloadButton = dynamic(() => import("./KpDownloadButton"), {
  ssr: false,
  loading: () => (
    <span className="text-sm text-graphite-900/50">Загрузка PDF…</span>
  ),
});

const EASE = [0.22, 1, 0.36, 1] as const;

type StepId =
  | "object"
  | "region"
  | "frame"
  | "size"
  | "cladding"
  | "roofing"
  | "foundation"
  | "options"
  | "result";

const STEP_TITLES: Record<StepId, string> = {
  object: "Тип объекта",
  region: "Регион строительства",
  frame: "Тип каркаса",
  size: "Размеры здания",
  cladding: "Стеновое ограждение",
  roofing: "Кровля",
  foundation: "Фундамент",
  options: "Доборные элементы",
  result: "Предварительный расчёт",
};

/* ── Card selection grid ─────────────────────────────── */
function CardGrid({
  options,
  value,
  onSelect,
}: {
  options: OptionCard[];
  value: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {options.map((o) => {
        const active = value === o.id;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onSelect(o.id)}
            className={`rounded-xl border p-5 text-left transition-all duration-200 ${
              active
                ? "border-orange bg-orange/[0.06]"
                : "border-line bg-white hover:border-graphite-900/25"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <span className="font-semibold text-graphite-900">{o.label}</span>
              <span
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
                  active ? "border-orange bg-orange" : "border-graphite-900/25"
                }`}
              >
                {active && (
                  <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                    <path
                      d="M2 5.5l2.5 2.5L9 3"
                      stroke="#fff"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </span>
            </div>
            <p className="mt-1.5 text-sm leading-relaxed text-graphite-900/55">
              {o.desc}
            </p>
            {o.rate ? (
              <p className="mt-2.5 font-mono text-xs uppercase tracking-[0.1em] text-orange">
                от {new Intl.NumberFormat("ru-RU").format(o.rate)} ₽/м²
              </p>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/* ── Number field for sizes ──────────────────────────── */
function NumberField({
  label,
  value,
  onChange,
  unit = "м",
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  unit?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block font-mono text-xs uppercase tracking-[0.14em] text-graphite-900/55">
        {label}
      </span>
      <div className="relative">
        <input
          type="number"
          min={0}
          inputMode="decimal"
          value={value || ""}
          onChange={(e) => onChange(Math.max(0, Number(e.target.value)))}
          placeholder="0"
          className="w-full rounded-xl border border-line bg-white px-4 py-3.5 pr-12 text-[15px] text-graphite-900 outline-none transition-colors focus:border-orange"
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 font-mono text-xs text-graphite-900/40">
          {unit}
        </span>
      </div>
    </label>
  );
}

/* ── Counter for option items ────────────────────────── */
function Stepper({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const btn =
    "flex h-9 w-9 items-center justify-center rounded-lg border border-line text-graphite-900 transition-colors hover:border-orange hover:text-orange disabled:opacity-30 disabled:hover:border-line disabled:hover:text-graphite-900";
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => onChange(Math.max(0, value - 1))}
        disabled={value === 0}
        className={btn}
        aria-label="Убрать"
      >
        −
      </button>
      <span className="w-6 text-center text-base font-semibold text-graphite-900">
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        className={btn}
        aria-label="Добавить"
      >
        +
      </button>
    </div>
  );
}

/* ── Main wizard ─────────────────────────────────────── */
export default function RaschetWizard() {
  const [state, setState] = useState<WizardState>(initialState);
  const [stepIndex, setStepIndex] = useState(0);
  const [contact, setContact] = useState({
    name: "",
    phone: "",
    clientType: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const steps: StepId[] =
    state.frame === "modular"
      ? ["object", "region", "frame", "size", "foundation", "options", "result"]
      : [
          "object",
          "region",
          "frame",
          "size",
          "cladding",
          "roofing",
          "foundation",
          "options",
          "result",
        ];

  const safeIndex = Math.min(stepIndex, steps.length - 1);
  const current = steps[safeIndex];
  const totalSteps = steps.length;
  const estimate = calcEstimate(state);

  const set = (patch: Partial<WizardState>) =>
    setState((s) => ({ ...s, ...patch }));

  const canNext = (() => {
    switch (current) {
      case "object":
        return !!state.objectType;
      case "region":
        return !!state.region;
      case "frame":
        return !!state.frame;
      case "size":
        return state.length > 0 && state.width > 0 && state.height > 0;
      case "cladding":
        return !!state.cladding;
      case "roofing":
        return !!state.roofing;
      case "foundation":
        return !!state.foundation;
      default:
        return true;
    }
  })();

  const next = () => setStepIndex((i) => Math.min(i + 1, steps.length - 1));
  const back = () => setStepIndex((i) => Math.max(i - 1, 0));

  /* ── Submitted state ──────────────────────────────── */
  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE }}
        className="rounded-2xl border border-line bg-white p-8 text-center md:p-12"
      >
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-orange/10">
          <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
            <path
              d="M5 13.5l5 5L21 7"
              stroke="#ED6629"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <h3 className="mt-6 text-2xl font-bold text-graphite-900">
          Заявка отправлена
        </h3>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-graphite-900/65">
          Предварительная оценка вашего объекта —{" "}
          <span className="font-semibold text-graphite-900">
            {formatRub(estimate.low)} — {formatRub(estimate.high)}
          </span>
          . Мы свяжемся с вами, уточним детали и подготовим точное коммерческое
          предложение.
        </p>
        <div className="mt-6">
          <KpDownloadButton
            state={state}
            estimate={estimate}
            contact={contact}
          />
        </div>
      </motion.div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white">
      {/* Progress */}
      <div className="border-b border-line px-6 py-5 md:px-9">
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs uppercase tracking-[0.14em] text-graphite-900/50">
            Шаг {safeIndex + 1} из {totalSteps}
          </span>
          <span className="font-mono text-xs uppercase tracking-[0.14em] text-orange">
            {STEP_TITLES[current]}
          </span>
        </div>
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-line">
          <motion.div
            className="h-full bg-orange"
            animate={{ width: `${(safeIndex / (totalSteps - 1)) * 100}%` }}
            transition={{ duration: 0.5, ease: EASE }}
          />
        </div>
      </div>

      {/* Step content */}
      <div className="px-6 py-8 md:px-9 md:py-10">
        <motion.div
          key={current}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, ease: EASE }}
        >
            <h2 className="text-xl font-bold text-graphite-900 md:text-2xl">
              {STEP_TITLES[current]}
            </h2>

            {current === "object" && (
              <div className="mt-6">
                <CardGrid
                  options={objectTypes}
                  value={state.objectType}
                  onSelect={(id) => set({ objectType: id })}
                />
              </div>
            )}

            {current === "region" && (
              <div className="mt-6">
                <p className="mb-4 text-sm leading-relaxed text-graphite-900/60">
                  Регион влияет на снеговые и ветровые нагрузки, сейсмику, тип фундамента и зимнюю надбавку к работам.
                </p>
                <CardGrid
                  options={regionTypes}
                  value={state.region}
                  onSelect={(id) => set({ region: id })}
                />
              </div>
            )}

            {current === "frame" && (
              <div className="mt-6">
                <CardGrid
                  options={frameTypes}
                  value={state.frame}
                  onSelect={(id) => set({ frame: id })}
                />
              </div>
            )}

            {current === "size" && (
              <div className="mt-6">
                <div className="grid gap-4 sm:grid-cols-3">
                  <NumberField
                    label="Длина"
                    value={state.length}
                    onChange={(v) => set({ length: v })}
                  />
                  <NumberField
                    label="Ширина"
                    value={state.width}
                    onChange={(v) => set({ width: v })}
                  />
                  <NumberField
                    label="Высота"
                    value={state.height}
                    onChange={(v) => set({ height: v })}
                  />
                </div>
                {estimate.area > 0 && (
                  <p className="mt-5 rounded-xl bg-light px-4 py-3 text-sm text-graphite-900/70">
                    Площадь застройки:{" "}
                    <span className="font-semibold text-graphite-900">
                      {estimate.area.toLocaleString("ru-RU")} м²
                    </span>
                  </p>
                )}
              </div>
            )}

            {current === "cladding" && (
              <div className="mt-6">
                <CardGrid
                  options={claddingTypes}
                  value={state.cladding}
                  onSelect={(id) => set({ cladding: id })}
                />
              </div>
            )}

            {current === "roofing" && (
              <div className="mt-6">
                <CardGrid
                  options={roofingTypes}
                  value={state.roofing}
                  onSelect={(id) => set({ roofing: id })}
                />
              </div>
            )}

            {current === "foundation" && (
              <div className="mt-6">
                <CardGrid
                  options={foundationTypes}
                  value={state.foundation}
                  onSelect={(id) => set({ foundation: id })}
                />
              </div>
            )}

            {current === "options" && (
              <div className="mt-6 divide-y divide-line border-y border-line">
                {optionItems.map((o) => (
                  <div
                    key={o.id}
                    className="flex items-center justify-between gap-6 py-4"
                  >
                    <div>
                      <p className="font-semibold text-graphite-900">
                        {o.label}
                      </p>
                      <p className="mt-0.5 text-sm text-graphite-900/55">
                        {o.desc} · от{" "}
                        {new Intl.NumberFormat("ru-RU").format(o.price)} ₽/шт
                      </p>
                    </div>
                    <Stepper
                      value={state.options[o.id] || 0}
                      onChange={(v) =>
                        set({ options: { ...state.options, [o.id]: v } })
                      }
                    />
                  </div>
                ))}
              </div>
            )}

            {current === "result" && (
              <div className="mt-6">
                <div className="rounded-xl bg-graphite-950 p-6 text-light md:p-8">
                  <p className="font-mono text-xs uppercase tracking-[0.16em] text-orange">
                    Предварительная оценка
                  </p>
                  <p className="mt-3 text-3xl font-extrabold tracking-tight md:text-4xl">
                    {formatRub(estimate.low)} — {formatRub(estimate.high)}
                  </p>
                  <div className="mt-5 space-y-2 border-t border-white/10 pt-5">
                    {estimate.lines.map((l) => (
                      <div
                        key={l.label}
                        className="flex justify-between text-sm"
                      >
                        <span className="text-light/55">{l.label}</span>
                        <span className="font-medium">{formatRub(l.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <p className="mt-4 text-xs leading-relaxed text-graphite-900/50">
                  Это предварительная оценка по рыночным ставкам. Точная
                  стоимость зависит от снеговых и ветровых нагрузок, рельефа,
                  удалённости объекта и фиксируется в коммерческом предложении.
                </p>

                {estimate.complexity !== "TYPICAL" && (
                  <div className="mt-4 rounded-xl border border-orange/25 bg-orange/[0.06] px-4 py-3 text-sm leading-relaxed text-graphite-900/75">
                    <span className="font-semibold text-graphite-900">
                      {estimate.complexity === "ENGINEER_REQUIRED"
                        ? "Нужна проверка инженера-конструктора."
                        : "Расширенный расчёт."}
                    </span>{" "}
                    Вилка ниже остаётся ориентиром для разговора, но финальную
                    цену нельзя фиксировать без проверки нагрузок и узлов.
                  </div>
                )}

                <div className="mt-5">
                  <KpDownloadButton
                    state={state}
                    estimate={estimate}
                    contact={contact}
                  />
                </div>

                <div className="mt-6">
                  <ChoiceField
                    label="Вы обращаетесь как"
                    options={clientTypes}
                    value={contact.clientType}
                    onChange={(v) =>
                      setContact((c) => ({ ...c, clientType: v }))
                    }
                  />
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <TextField
                    label="Имя"
                    required
                    placeholder="Как к вам обращаться"
                    value={contact.name}
                    onChange={(e) =>
                      setContact((c) => ({ ...c, name: e.target.value }))
                    }
                  />
                  <TextField
                    label="Телефон"
                    required
                    type="tel"
                    placeholder="+7"
                    value={contact.phone}
                    onChange={(e) =>
                      setContact((c) => ({ ...c, phone: e.target.value }))
                    }
                  />
                </div>
              </div>
            )}
        </motion.div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between gap-4 border-t border-line px-6 py-5 md:px-9">
        <button
          type="button"
          onClick={back}
          disabled={safeIndex === 0}
          className="text-sm font-medium text-graphite-900/60 transition-colors hover:text-graphite-900 disabled:opacity-0"
        >
          ← Назад
        </button>

        {current === "result" ? (
          <button
            type="button"
            disabled={!contact.name || !contact.phone}
            onClick={async () => {
              try {
                await submitLead({
                  source: "estimate",
                  client_type: contact.clientType || undefined,
                  name: contact.name,
                  phone: contact.phone,
                  object_type: state.objectType || undefined,
                  estimate: { state, ...estimate },
                });
              } catch (err) {
                console.error(err);
              }
              setSubmitted(true);
            }}
            className="inline-flex items-center gap-2 rounded-full bg-orange px-7 py-3.5 text-sm font-semibold text-white transition-all duration-300 hover:bg-orange-bright hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
          >
            Отправить заявку
          </button>
        ) : (
          <button
            type="button"
            onClick={next}
            disabled={!canNext}
            className="inline-flex items-center gap-2 rounded-full bg-orange px-7 py-3.5 text-sm font-semibold text-white transition-all duration-300 hover:bg-orange-bright hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
          >
            Далее →
          </button>
        )}
      </div>
    </div>
  );
}
