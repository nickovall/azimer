import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import Container from "@/components/ui/Container";
import Label from "@/components/ui/Label";
import Reveal from "@/components/ui/Reveal";
import ContactForm from "@/components/ContactForm";
import JsonLd from "@/components/seo/JsonLd";
import { company } from "@/lib/content";
import { breadcrumbJsonLd } from "@/lib/seo-jsonld";

export const metadata: Metadata = {
  title: "Контакты — АЗИМЕР Красноярск",
  description:
    "Связаться с ООО «АЗИМЕР» — каркасное строительство Красноярск. Телефон: +7 901 600-05-65. Заявка на расчёт объекта в течение рабочего дня.",
  alternates: { canonical: "https://azimer.ru/contacts" },
  openGraph: {
    type: "website",
    locale: "ru_RU",
    url: "https://azimer.ru/contacts",
    siteName: "АЗИМЕР",
    title: "Контакты — АЗИМЕР Красноярск",
    description:
      "Связаться с ООО «АЗИМЕР» — каркасное строительство Красноярск. Телефон: +7 901 600-05-65. Заявка на расчёт объекта в течение рабочего дня.",
    images: [
      {
        url: "/og-image.png?v=2",
        width: 1200,
        height: 630,
        alt: "АЗИМЕР — каркасные здания под ключ",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Контакты — АЗИМЕР Красноярск",
    description:
      "Связаться с ООО «АЗИМЕР» — каркасное строительство Красноярск. Телефон: +7 901 600-05-65. Заявка на расчёт объекта в течение рабочего дня.",
    images: ["/og-image.png?v=2"],
  },
};

const info = [
  { label: "Город", value: "Красноярск и регион" },
  { label: "Заказчики", value: "Юрлица, ИП, частные лица" },
  { label: "Ответ на заявку", value: "В течение рабочего дня" },
];

export default function ContactsPage() {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd("Контакты", "https://azimer.ru/contacts")} />
      <PageHero
        crumb="Контакты"
        title="Связаться с АЗИМЕР"
        subtitle="Позвоните, напишите в VK или оставьте заявку — уточним детали по объекту и подготовим предварительный расчёт."
      />

      <section className="bg-light py-24 md:py-32">
        <Container>
          <div className="grid gap-12 md:grid-cols-12 md:gap-10">
            <div className="md:col-span-5">
              <Reveal>
                <Label>Контакты</Label>
                <h2 className="mt-6 text-3xl font-extrabold leading-[1.1] tracking-[-0.02em] text-graphite-900 md:text-4xl">
                  Как связаться
                </h2>
                <p className="mt-5 text-base leading-relaxed text-graphite-900/70">
                  Прямой телефон менеджера и VK-чат — для быстрых вопросов.
                  Заявка через форму — если нужно подготовить расчёт по объекту.
                </p>
              </Reveal>

              {/* Quick actions */}
              <Reveal delay={0.06}>
                <div className="mt-8 grid gap-3 sm:grid-cols-2">
                  {company.phoneHref && company.phoneLabel ? (
                    <a
                      href={company.phoneHref}
                      className="group rounded-xl border border-line bg-white p-5 transition-colors hover:border-orange"
                    >
                      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-graphite-900/50">
                        Позвонить
                      </p>
                      <p className="mt-2 text-lg font-bold text-graphite-900 group-hover:text-orange">
                        {company.phoneLabel}
                      </p>
                    </a>
                  ) : null}

                  {company.vkChatHref ? (
                    <a
                      href={company.vkChatHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group rounded-xl border border-line bg-white p-5 transition-colors hover:border-orange"
                    >
                      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-graphite-900/50">
                        Написать
                      </p>
                      <p className="mt-2 text-lg font-bold text-graphite-900 group-hover:text-orange">
                        VK-чат
                      </p>
                    </a>
                  ) : null}

                  {company.emailHref && company.email ? (
                    <a
                      href={company.emailHref}
                      className="group rounded-xl border border-line bg-white p-5 transition-colors hover:border-orange sm:col-span-2"
                    >
                      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-graphite-900/50">
                        Email
                      </p>
                      <p className="mt-2 break-all text-lg font-bold text-graphite-900 group-hover:text-orange">
                        {company.email}
                      </p>
                      <p className="mt-1 text-xs text-graphite-900/55">
                        Для документов и КП
                      </p>
                    </a>
                  ) : null}

                  <a
                    href="/estimate"
                    className="group rounded-xl border border-line bg-white p-5 transition-colors hover:border-orange sm:col-span-2"
                  >
                    <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-graphite-900/50">
                      Заявка на расчёт
                    </p>
                    <p className="mt-2 text-lg font-bold text-graphite-900 group-hover:text-orange">
                      Получить предварительную оценку →
                    </p>
                    <p className="mt-1 text-xs text-graphite-900/55">
                      3–5 минут на параметры объекта
                    </p>
                  </a>
                </div>
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
                <div className="mt-8 space-y-2 text-xs leading-relaxed text-graphite-900/55">
                  <p className="font-semibold text-graphite-900/80">
                    {company.legalName}
                  </p>
                  {company.legalAddress ? <p>{company.legalAddress}</p> : null}
                  <p className="font-mono uppercase tracking-[0.12em] text-graphite-900/55">
                    ИНН {company.inn} · ОГРН {company.ogrn}
                  </p>
                </div>
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
