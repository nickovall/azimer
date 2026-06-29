import type { Metadata } from "next";
import Link from "next/link";
import PageHero from "@/components/PageHero";
import Container from "@/components/ui/Container";
import Label from "@/components/ui/Label";
import Reveal from "@/components/ui/Reveal";
import Button from "@/components/ui/Button";
import CtaFinal from "@/components/sections/CtaFinal";
import JsonLd from "@/components/seo/JsonLd";
import { servicesDetailed, objectTypesFull, b2bAdvantages } from "@/lib/content";
import { breadcrumbJsonLd, faqPageJsonLd, serviceJsonLd } from "@/lib/seo-jsonld";
import { serviceLandingPages } from "@/lib/service-landing-pages";

export const metadata: Metadata = {
  title: "Услуги — Каркасное строительство · АЗИМЕР",
  description:
    "Проектирование, изготовление и монтаж металлокаркасов, ЛСТК, модульных зданий, сэндвич-панелей. Работаем с юрлицами и ИП. АЗИМЕР, Красноярск.",
  alternates: { canonical: "https://azimer.ru/services" },
  openGraph: {
    type: "website",
    locale: "ru_RU",
    url: "https://azimer.ru/services",
    siteName: "АЗИМЕР",
    title: "Услуги — Каркасное строительство · АЗИМЕР",
    description:
      "Проектирование, изготовление и монтаж металлокаркасов, ЛСТК, модульных зданий, сэндвич-панелей. Работаем с юрлицами и ИП. АЗИМЕР, Красноярск.",
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
    title: "Услуги — Каркасное строительство · АЗИМЕР",
    description:
      "Проектирование, изготовление и монтаж металлокаркасов, ЛСТК, модульных зданий, сэндвич-панелей. Работаем с юрлицами и ИП. АЗИМЕР, Красноярск.",
    images: ["/og-image.png?v=2"],
  },
};

export default function UslugiPage() {
  return (
    <>
      <JsonLd data={serviceJsonLd} />
      <JsonLd data={faqPageJsonLd} />
      <JsonLd data={breadcrumbJsonLd("Услуги", "https://azimer.ru/services")} />
      <PageHero
        crumb="Услуги"
        title="Полный цикл по каркасным конструкциям"
        subtitle="Берём объект целиком — от проектирования и изготовления до монтажа и закрытия контура. Без дробления ответственности между подрядчиками."
        image="/photos/proc-panel.jpg"
      />

      <section className="bg-light py-20 md:py-28">
        <Container>
          <Reveal>
            <Label>Направления</Label>
            <h2 className="mt-6 max-w-[18ch] text-3xl font-extrabold leading-[1.08] text-graphite-900 md:text-[2.7rem]">
              Отдельные страницы под задачи бизнеса
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-graphite-900/65">
              Выберите тип объекта, чтобы сразу увидеть состав работ, фото и
              вопросы для расчета коммерческого предложения.
            </p>
          </Reveal>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {serviceLandingPages.map((page, index) => (
              <Reveal
                key={page.slug}
                delay={(index % 3) * 0.06}
                className="group rounded-2xl border border-line bg-white p-6 transition-colors hover:border-orange/50"
              >
                <Link href={`/uslugi/${page.slug}`} className="block">
                  <span className="font-mono text-xs uppercase tracking-[0.14em] text-orange">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-4 text-xl font-bold leading-snug text-graphite-900">
                    {page.navLabel}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-graphite-900/65">
                    {page.description}
                  </p>
                  <span className="mt-5 inline-flex text-sm font-semibold text-orange transition-colors group-hover:text-orange-bright">
                    Открыть направление
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      {/* Услуги детально */}
      <section className="bg-light py-24 md:py-32">
        <Container>
          <Reveal>
            <Label>Что мы делаем</Label>
          </Reveal>

          <div className="mt-12">
            {servicesDetailed.map((s, i) => (
              <Reveal
                key={s.n}
                delay={(i % 3) * 0.06}
                className="grid gap-6 border-t border-line py-10 first:border-t-0 first:pt-0 md:grid-cols-12 md:gap-10 md:py-12"
              >
                <div className="md:col-span-4">
                  <span className="font-mono text-sm text-orange">{s.n}</span>
                  <h2 className="mt-3 text-2xl font-bold leading-tight tracking-[-0.01em] text-graphite-900 md:text-[1.7rem]">
                    {s.title}
                  </h2>
                </div>
                <div className="md:col-span-8">
                  <p className="text-base leading-relaxed text-graphite-900/70 md:text-lg">
                    {s.text}
                  </p>
                  <div className="mt-6 flex flex-wrap gap-2.5">
                    {s.items.map((it) => (
                      <span
                        key={it}
                        className="rounded-full border border-line bg-white px-4 py-2 text-sm text-graphite-900/75"
                      >
                        {it}
                      </span>
                    ))}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      {/* Для юридических лиц */}
      <section className="blueprint-paper py-24 md:py-32">
        <Container>
          <div className="grid gap-12 md:grid-cols-12 md:gap-10">
            <div className="md:col-span-5">
              <Reveal>
                <Label>Для бизнеса</Label>
                <h2 className="mt-6 text-3xl font-extrabold leading-[1.08] tracking-[-0.02em] text-graphite-900 md:text-[2.7rem]">
                  Юрлицам — с НДС и закрывающими документами
                </h2>
                <p className="mt-5 text-base leading-relaxed text-graphite-900/70">
                  Работаем с организациями и ИП официально: НДС к вычету, полный
                  пакет документов и безналичный расчёт по договору.
                </p>
                <div className="mt-8">
                  <Button href="/estimate" variant="primary" arrow>
                    Запросить КП для организации
                  </Button>
                </div>
              </Reveal>
            </div>

            <div className="md:col-span-7">
              <div className="grid gap-4 sm:grid-cols-2">
                {b2bAdvantages.map((b, i) => (
                  <Reveal
                    key={b.title}
                    delay={(i % 2) * 0.08}
                    className="rounded-2xl border border-line bg-white p-6"
                  >
                    <h3 className="text-base font-bold text-graphite-900">
                      {b.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-graphite-900/65">
                      {b.text}
                    </p>
                  </Reveal>
                ))}
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Типы объектов */}
      <section className="bg-graphite-950 py-24 text-light md:py-32">
        <Container>
          <Reveal>
            <Label>Типы объектов</Label>
            <h2 className="mt-6 max-w-[18ch] text-3xl font-extrabold leading-[1.08] tracking-[-0.02em] md:text-[2.7rem]">
              Объекты, которые мы строим
            </h2>
          </Reveal>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {objectTypesFull.map((o, i) => (
              <Reveal
                key={o.title}
                delay={(i % 3) * 0.08}
                className="group rounded-2xl border border-white/10 bg-graphite-900 p-7 transition-colors duration-300 hover:border-orange/40"
              >
                <span className="block h-px w-9 bg-orange transition-all duration-400 group-hover:w-16" />
                <h3 className="mt-5 text-lg font-bold">{o.title}</h3>
                <p className="mt-2.5 text-sm leading-relaxed text-light/55">
                  {o.text}
                </p>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      <CtaFinal />
    </>
  );
}
