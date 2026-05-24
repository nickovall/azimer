import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import Container from "@/components/ui/Container";
import Label from "@/components/ui/Label";
import Reveal from "@/components/ui/Reveal";
import ContactForm from "@/components/ContactForm";

export const metadata: Metadata = {
  title: "Контакты — АЗИМЕР",
  description:
    "Связаться с ООО «АЗИМЕР» — каркасное строительство в Красноярске. Оставьте заявку на расчёт объекта.",
};

const info = [
  { label: "Город", value: "Красноярск и регион" },
  { label: "Заказчики", value: "Юрлица, ИП, частные лица" },
  { label: "Ответ на заявку", value: "В течение рабочего дня" },
];

export default function ContactsPage() {
  return (
    <>
      <PageHero
        crumb="Контакты"
        title="Связаться с АЗИМЕР"
        subtitle="Оставьте заявку — уточним детали по объекту, обсудим задачу и подготовим предварительный расчёт."
      />

      <section className="bg-light py-24 md:py-32">
        <Container>
          <div className="grid gap-12 md:grid-cols-12 md:gap-10">
            <div className="md:col-span-5">
              <Reveal>
                <Label>Контакты</Label>
                <h2 className="mt-6 text-3xl font-extrabold leading-[1.1] tracking-[-0.02em] text-graphite-900 md:text-4xl">
                  Оставьте заявку — свяжемся
                </h2>
                <p className="mt-5 text-base leading-relaxed text-graphite-900/70">
                  Основной способ связи — заявка через сайт. Опишите объект, и
                  мы свяжемся, чтобы уточнить детали и подготовить расчёт.
                </p>
              </Reveal>

              <div className="mt-9 border-y border-line">
                {info.map((it, i) => (
                  <Reveal
                    key={it.label}
                    delay={0.1 + i * 0.07}
                    className="flex items-baseline justify-between gap-6 border-b border-line py-4 last:border-b-0"
                  >
                    <span className="font-mono text-xs uppercase tracking-[0.14em] text-graphite-900/50">
                      {it.label}
                    </span>
                    <span className="text-right text-sm font-medium text-graphite-900">
                      {it.value}
                    </span>
                  </Reveal>
                ))}
              </div>

              <Reveal delay={0.32}>
                <p className="mt-6 text-xs leading-relaxed text-graphite-900/45">
                  Прямые контакты — телефон и мессенджеры — добавим после
                  согласования.
                </p>
              </Reveal>
            </div>

            <div className="md:col-span-7">
              <Reveal delay={0.12}>
                <ContactForm />
              </Reveal>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
