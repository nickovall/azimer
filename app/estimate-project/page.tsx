import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import Container from "@/components/ui/Container";
import Label from "@/components/ui/Label";
import Reveal from "@/components/ui/Reveal";
import ProjectForm from "@/components/ProjectForm";
import JsonLd from "@/components/seo/JsonLd";
import { breadcrumbJsonLd } from "@/lib/seo-jsonld";

export const metadata: Metadata = {
  title: "Расчёт по готовому проекту — АЗИМЕР",
  description:
    "Есть проект или чертежи? Загрузите документацию — подготовим коммерческое предложение по вашему проекту каркасного здания. АЗИМЕР, Красноярск.",
  alternates: { canonical: "https://azimer.ru/estimate-project" },
  openGraph: {
    type: "website",
    locale: "ru_RU",
    url: "https://azimer.ru/estimate-project",
    siteName: "АЗИМЕР",
    title: "Расчёт по готовому проекту — АЗИМЕР",
    description:
      "Есть проект или чертежи? Загрузите документацию — подготовим коммерческое предложение по вашему проекту каркасного здания. АЗИМЕР, Красноярск.",
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
    title: "Расчёт по готовому проекту — АЗИМЕР",
    description:
      "Есть проект или чертежи? Загрузите документацию — подготовим коммерческое предложение по вашему проекту каркасного здания. АЗИМЕР, Красноярск.",
    images: ["/og-image.png?v=2"],
  },
};

const steps = [
  "Загрузите чертежи, проект или техническое задание",
  "Мы изучаем документацию и уточняем детали",
  "Готовим коммерческое предложение по вашему проекту",
];

export default function RaschetProektPage() {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd("Расчёт по проекту", "https://azimer.ru/estimate-project")} />
      <PageHero
        crumb="Расчёт по проекту"
        title="Расчёт по готовому проекту"
        subtitle="Если у вас уже есть проект, чертежи или техническое задание — загрузите файлы, и мы подготовим КП по вашей документации."
        image="/photos/interior.jpg"
      />

      <section className="bg-light py-24 md:py-32">
        <Container>
          <div className="grid gap-12 md:grid-cols-12 md:gap-10">
            <div className="md:col-span-5">
              <Reveal>
                <Label>Как это работает</Label>
                <h2 className="mt-6 text-3xl font-extrabold leading-[1.1] tracking-[-0.02em] text-graphite-900 md:text-4xl">
                  Уже есть проект?
                </h2>
                <p className="mt-5 text-base leading-relaxed text-graphite-900/70">
                  Этот вариант — для заказчиков с готовой документацией. Не нужно
                  заново описывать объект по шагам.
                </p>
              </Reveal>

              <div className="mt-9 space-y-5">
                {steps.map((s, i) => (
                  <Reveal
                    key={s}
                    delay={0.1 + i * 0.08}
                    className="flex gap-4"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange/10 font-mono text-sm text-orange">
                      {i + 1}
                    </span>
                    <p className="pt-1 text-sm leading-relaxed text-graphite-900/75">
                      {s}
                    </p>
                  </Reveal>
                ))}
              </div>
            </div>

            <div className="md:col-span-7">
              <Reveal delay={0.12}>
                <ProjectForm />
              </Reveal>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
