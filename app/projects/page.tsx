import type { Metadata } from "next";
import Image from "next/image";
import PageHero from "@/components/PageHero";
import Container from "@/components/ui/Container";
import Label from "@/components/ui/Label";
import Reveal from "@/components/ui/Reveal";
import CtaFinal from "@/components/sections/CtaFinal";
import { projects } from "@/lib/content";

export const metadata: Metadata = {
  title: "Объекты — АЗИМЕР",
  description:
    "Реализованные объекты ООО «АЗИМЕР»: склады, ангары, производственные корпуса, коммерческие и модульные здания. Красноярск.",
};

export default function ObektyPage() {
  return (
    <>
      <PageHero
        crumb="Объекты"
        title="Реализованные объекты"
        subtitle="Каркасные здания и металлоконструкции, которые мы спроектировали, изготовили и смонтировали. Реальные фотографии с площадок."
        image="/photos/interior.jpg"
      />

      <section className="bg-light py-24 md:py-32">
        <Container>
          <Reveal>
            <Label>Портфолио</Label>
            <h2 className="mt-6 max-w-[16ch] text-3xl font-extrabold leading-[1.08] tracking-[-0.02em] text-graphite-900 md:text-[2.7rem]">
              Объекты и работы компании
            </h2>
          </Reveal>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p, i) => (
              <Reveal
                key={p.title}
                delay={(i % 3) * 0.08}
                className="group relative aspect-[4/3] overflow-hidden rounded-2xl"
              >
                <Image
                  src={p.img}
                  alt={p.title}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-graphite-950 via-graphite-950/45 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-6 text-light">
                  <span className="font-mono text-xs uppercase tracking-[0.16em] text-orange">
                    {p.tag}
                  </span>
                  <h3 className="mt-2 text-xl font-bold">{p.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-light/65">
                    {p.text}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={0.1}>
            <p className="mt-10 font-mono text-xs uppercase tracking-[0.14em] text-graphite-900/45">
              Фотографии — реальные объекты компании · детали по проектам
              уточняйте у менеджера
            </p>
          </Reveal>
        </Container>
      </section>

      <CtaFinal />
    </>
  );
}
