import type { Metadata } from "next";
import Image from "next/image";
import PageHero from "@/components/PageHero";
import Container from "@/components/ui/Container";
import Label from "@/components/ui/Label";
import Reveal from "@/components/ui/Reveal";
import CtaFinal from "@/components/sections/CtaFinal";
import { projects } from "@/lib/content";

// Mapping imgPos → Tailwind class. Literal mapping чтобы Tailwind не выкосил из bundle.
const POS_CLASS: Record<string, string> = {
  top:    "object-top",
  center: "object-center",
  bottom: "object-bottom",
  left:   "object-left",
  right:  "object-right",
};

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
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-graphite-900/65">
              Реальные объекты — фото с площадок. Регион, площадь и состав
              работ для каждого объекта уточним по запросу на КП.
            </p>
          </Reveal>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p, i) => {
              const hasFacts = !!(p.region || p.size || p.area || p.status);
              const hasScope = !!(p.scope && p.scope.length);
              return (
                <Reveal
                  key={`${p.title}-${i}`}
                  delay={(i % 3) * 0.06}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-white"
                >
                  {/* Фото — реальное, без сильного затемнения */}
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <Image
                      src={p.img}
                      alt={p.title}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className={`object-cover ${POS_CLASS[p.imgPos ?? "center"]} transition-transform duration-700 ease-out group-hover:scale-[1.04]`}
                    />
                    <span className="absolute left-4 top-4 inline-flex items-center rounded-full bg-white/90 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.14em] text-graphite-900">
                      {p.tag}
                    </span>
                  </div>

                  {/* Текст-кейс */}
                  <div className="flex flex-1 flex-col p-5 md:p-6">
                    <h3 className="text-lg font-bold leading-snug text-graphite-900">
                      {p.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-graphite-900/65">
                      {p.text}
                    </p>

                    {/* Facts row — рендерим только подтверждённые поля */}
                    {hasFacts ? (
                      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-line pt-4 text-xs">
                        {p.region ? (
                          <div>
                            <dt className="font-mono uppercase tracking-[0.12em] text-graphite-900/45">
                              Регион
                            </dt>
                            <dd className="mt-0.5 font-semibold text-graphite-900">
                              {p.region}
                            </dd>
                          </div>
                        ) : null}
                        {p.size ? (
                          <div>
                            <dt className="font-mono uppercase tracking-[0.12em] text-graphite-900/45">
                              Размер
                            </dt>
                            <dd className="mt-0.5 font-semibold text-graphite-900">
                              {p.size}
                            </dd>
                          </div>
                        ) : null}
                        {p.area ? (
                          <div>
                            <dt className="font-mono uppercase tracking-[0.12em] text-graphite-900/45">
                              Площадь
                            </dt>
                            <dd className="mt-0.5 font-semibold text-graphite-900">
                              {p.area}
                            </dd>
                          </div>
                        ) : null}
                        {p.status ? (
                          <div>
                            <dt className="font-mono uppercase tracking-[0.12em] text-graphite-900/45">
                              Статус
                            </dt>
                            <dd className="mt-0.5 font-semibold text-graphite-900">
                              {p.status}
                            </dd>
                          </div>
                        ) : null}
                      </dl>
                    ) : (
                      <p className="mt-4 border-t border-line pt-4 font-mono text-[11px] uppercase tracking-[0.12em] text-graphite-900/40">
                        Регион и параметры — уточним по запросу
                      </p>
                    )}

                    {hasScope ? (
                      <ul className="mt-3 flex flex-wrap gap-1.5">
                        {p.scope!.map((s) => (
                          <li
                            key={s}
                            className="rounded-full bg-light px-2.5 py-1 text-[11px] font-medium text-graphite-900/70"
                          >
                            {s}
                          </li>
                        ))}
                      </ul>
                    ) : null}

                    {p.highlight ? (
                      <p className="mt-3 text-xs leading-relaxed text-orange">
                        {p.highlight}
                      </p>
                    ) : null}
                  </div>
                </Reveal>
              );
            })}
          </div>

          <Reveal delay={0.1}>
            <p className="mt-10 font-mono text-xs uppercase tracking-[0.14em] text-graphite-900/45">
              Фотографии — реальные объекты компании · детальные параметры
              проектов уточняйте у менеджера
            </p>
          </Reveal>
        </Container>
      </section>

      <CtaFinal />
    </>
  );
}
