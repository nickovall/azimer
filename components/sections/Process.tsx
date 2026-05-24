import Container from "../ui/Container";
import Label from "../ui/Label";
import Reveal from "../ui/Reveal";
import { processSteps } from "@/lib/content";

export default function Process() {
  return (
    <section id="process" className="bg-graphite-900 py-24 text-light md:py-32">
      <Container>
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <Reveal>
            <Label>Как проходит работа</Label>
            <h2 className="mt-6 max-w-[18ch] text-3xl font-extrabold leading-[1.08] tracking-[-0.02em] md:text-[2.7rem]">
              Восемь шагов от заявки до закрытия
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="max-w-sm text-sm leading-relaxed text-light/55">
              Каждый шаг понятен заказчику заранее: что происходит, какие
              документы и что дальше.
            </p>
          </Reveal>
        </div>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {processSteps.map((s, i) => (
            <Reveal
              key={s.n}
              delay={(i % 4) * 0.07}
              className="group relative overflow-hidden rounded-xl border border-white/10 bg-graphite-950 p-6 transition-colors duration-300 hover:border-white/25"
            >
              <span className="absolute left-0 top-0 h-[3px] w-12 bg-orange transition-all duration-400 group-hover:w-full" />
              <span className="font-mono text-sm text-orange">{s.n}</span>
              <h3 className="mt-4 text-base font-bold">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-light/55">
                {s.text}
              </p>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
