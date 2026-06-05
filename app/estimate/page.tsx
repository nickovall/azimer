import type { Metadata } from "next";
import Link from "next/link";
import PageHero from "@/components/PageHero";
import Container from "@/components/ui/Container";
import RaschetWizard from "@/components/estimate/RaschetWizard";
import { company } from "@/lib/content";

export const metadata: Metadata = {
  title: "Мастер расчёта — АЗИМЕР",
  description:
    "Рассчитайте предварительную стоимость каркасного здания онлайн. Укажите параметры объекта по шагам и получите оценку и заявку на КП.",
};

const promiseItems = [
  { title: "3–5 минут", text: "Шаги по объекту: назначение, размеры, материалы." },
  { title: "Предварительная вилка", text: "Сразу видите диапазон стоимости по рыночным ставкам." },
  { title: "Заявка на КП", text: "Менеджер уточнит детали и подготовит коммерческое предложение." },
];

export default function RaschetPage() {
  return (
    <>
      <PageHero
        crumb="Мастер расчёта"
        title="Предварительный расчёт объекта"
        subtitle="3–5 минут параметров здания — и вы получаете предварительную вилку стоимости и заявку на детальное коммерческое предложение."
        image="/photos/proc-frame.jpg"
      />
      <section className="bg-light py-20 md:py-28">
        <Container>
          <div className="mx-auto max-w-3xl">
            {/* Promise — что получает пользователь до первого клика */}
            <div className="mb-8 grid gap-3 sm:grid-cols-3">
              {promiseItems.map((p) => (
                <div
                  key={p.title}
                  className="rounded-xl border border-line bg-white p-4"
                >
                  <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-orange">
                    {p.title}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-graphite-900/70">
                    {p.text}
                  </p>
                </div>
              ))}
            </div>

            <RaschetWizard />

            {/* Fallback для тех, кто не знает параметры */}
            <div className="mt-8 rounded-2xl border border-line bg-white p-6 text-sm leading-relaxed text-graphite-900/70 md:p-7">
              <p className="font-semibold text-graphite-900">
                Не знаете параметры?
              </p>
              <p className="mt-2">
                Оставьте телефон — менеджер свяжется, уточнит вводные и сам
                подберёт конструкцию под задачу.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Link
                  href="/contacts"
                  className="inline-flex items-center gap-2 rounded-full bg-graphite-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-graphite-950"
                >
                  Оставить заявку →
                </Link>
                {company.phoneHref && company.phoneLabel ? (
                  <a
                    href={company.phoneHref}
                    className="text-sm font-semibold text-graphite-900 transition-colors hover:text-orange"
                  >
                    или позвоните: {company.phoneLabel}
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
