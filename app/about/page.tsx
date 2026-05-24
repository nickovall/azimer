import type { Metadata } from "next";
import Image from "next/image";
import PageHero from "@/components/PageHero";
import Container from "@/components/ui/Container";
import Label from "@/components/ui/Label";
import Reveal from "@/components/ui/Reveal";
import Process from "@/components/sections/Process";
import Testimonials from "@/components/sections/Testimonials";
import Trust from "@/components/sections/Trust";
import CtaFinal from "@/components/sections/CtaFinal";
import { principles } from "@/lib/content";

export const metadata: Metadata = {
  title: "О компании — АЗИМЕР",
  description:
    "ООО «АЗИМЕР» — подрядчик по каркасным объектам в Красноярске: жилые дома, склады, ангары, производство, коммерция. Проектирование, изготовление и монтаж с документальным оформлением.",
};

export default function AboutPage() {
  return (
    <>
      <PageHero
        crumb="О компании"
        title="Каркасное строительство полного цикла"
        subtitle="ООО «АЗИМЕР» проектирует, изготавливает и монтирует каркасные здания и металлоконструкции — для жилья, бизнеса и промышленности в Красноярске и регионе."
        image="/photos/about.jpg"
      />

      {/* Интро */}
      <section className="bg-light py-24 md:py-32">
        <Container>
          <div className="grid gap-12 md:grid-cols-12 md:gap-10">
            <div className="md:col-span-6">
              <Reveal>
                <Label>О компании</Label>
                <h2 className="mt-6 text-3xl font-extrabold leading-[1.1] tracking-[-0.02em] text-graphite-900 md:text-[2.5rem]">
                  Каркасное строительство полного цикла
                </h2>
                <p className="mt-6 text-base leading-relaxed text-graphite-900/75 md:text-lg">
                  Компания строит каркасные здания и металлоконструкции —
                  жилые дома, склады, ангары, производственные и коммерческие
                  объекты. Цикл от предварительного расчёта и подготовки
                  коммерческого предложения до изготовления, поставки и монтажа.
                </p>
                <p className="mt-5 text-base leading-relaxed text-graphite-900/75 md:text-lg">
                  Работаем с юрлицами, ИП и частными заказчиками, которым нужен
                  понятный состав работ, реальные сроки и документальное
                  оформление на каждом этапе.
                </p>
              </Reveal>
            </div>
            <div className="md:col-span-6">
              <Reveal
                delay={0.12}
                className="relative aspect-[4/3] overflow-hidden rounded-2xl"
              >
                <Image
                  src="/photos/proc-frame.jpg"
                  alt="Монтаж металлокаркаса"
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover"
                />
              </Reveal>
            </div>
          </div>
        </Container>
      </section>

      <Process />

      {/* Принципы */}
      <section className="bg-light py-24 md:py-32">
        <Container>
          <Reveal>
            <Label>Принципы</Label>
            <h2 className="mt-6 max-w-[16ch] text-3xl font-extrabold leading-[1.08] tracking-[-0.02em] text-graphite-900 md:text-[2.7rem]">
              Как мы работаем с заказчиком
            </h2>
          </Reveal>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {principles.map((p, i) => (
              <Reveal
                key={p.n}
                delay={(i % 3) * 0.08}
                className="group rounded-2xl border border-line bg-white p-7 transition-colors duration-300 hover:border-orange/50"
              >
                <span className="font-mono text-sm text-orange">{p.n}</span>
                <h3 className="mt-4 text-lg font-bold text-graphite-900">
                  {p.title}
                </h3>
                <p className="mt-2.5 text-sm leading-relaxed text-graphite-900/65">
                  {p.text}
                </p>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      <Testimonials />
      <Trust />
      <CtaFinal />
    </>
  );
}
