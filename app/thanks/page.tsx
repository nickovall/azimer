import type { Metadata } from "next";
import Link from "next/link";
import Container from "@/components/ui/Container";

export const metadata: Metadata = {
  title: "Спасибо — АЗИМЕР",
  description: "Заявка принята. Мы свяжемся с вами в течение рабочего дня.",
};

export default function SpasiboPage() {
  return (
    <section className="relative flex min-h-screen items-center overflow-hidden bg-graphite-950 text-light">
      <div className="absolute inset-0 blueprint-grid opacity-50" />
      <div className="absolute -bottom-40 -left-40 h-[480px] w-[480px] rounded-full bg-orange/15 blur-[160px]" />

      <Container className="relative">
        <div className="mx-auto max-w-xl py-32 text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-orange/15">
            <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
              <path
                d="M6 15.5l6 6L24 8"
                stroke="#ED6629"
                strokeWidth="2.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <h1 className="mt-8 text-4xl font-extrabold tracking-[-0.02em] md:text-5xl">
            Спасибо за заявку
          </h1>
          <p className="mt-5 text-base leading-relaxed text-light/65 md:text-lg">
            Мы получили вашу заявку и свяжемся с вами в течение рабочего дня —
            уточним детали по объекту и подготовим предварительный расчёт.
          </p>
          <Link
            href="/"
            className="mt-9 inline-flex items-center gap-2.5 rounded-full bg-orange px-7 py-3.5 text-sm font-semibold text-white transition-all duration-300 hover:bg-orange-bright hover:-translate-y-0.5"
          >
            Вернуться на главную
          </Link>
        </div>
      </Container>
    </section>
  );
}
