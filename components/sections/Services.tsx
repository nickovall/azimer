import Container from "../ui/Container";
import Label from "../ui/Label";
import Reveal from "../ui/Reveal";
import { services } from "@/lib/content";

export default function Services() {
  return (
    <section id="services" className="bg-graphite-950 py-24 text-light md:py-32">
      <Container>
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <Reveal>
            <Label>Что делаем</Label>
            <h2 className="mt-6 max-w-[16ch] text-3xl font-extrabold leading-[1.08] tracking-[-0.02em] md:text-[2.7rem]">
              Полный цикл по каркасным конструкциям
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="max-w-sm text-sm leading-relaxed text-light/55">
              Берём объект целиком: конструкция, ограждающие элементы, кровля и
              закрытие контура — без дробления ответственности между
              подрядчиками.
            </p>
          </Reveal>
        </div>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s, i) => (
            <Reveal
              key={s.n}
              delay={(i % 3) * 0.08}
              className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-graphite-900 p-7 transition-all duration-400 hover:-translate-y-1.5 hover:border-orange/40 md:p-8"
            >
              <span className="font-mono text-sm text-light/30 transition-colors duration-300 group-hover:text-orange">
                {s.n}
              </span>
              <h3 className="mt-5 text-xl font-bold">{s.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-light/55">
                {s.text}
              </p>
              <span className="mt-7 h-px w-10 bg-white/15 transition-all duration-400 group-hover:w-full group-hover:bg-orange" />
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
