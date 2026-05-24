import Container from "../ui/Container";
import Counter from "../ui/Counter";
import Reveal from "../ui/Reveal";
import { stats } from "@/lib/content";

export default function Stats() {
  return (
    <section className="bg-graphite-900 text-light">
      <Container>
        <div className="grid grid-cols-2 gap-px bg-white/10 lg:grid-cols-4">
          {stats.map((s, i) => (
            <Reveal
              key={s.label}
              delay={i * 0.08}
              className="bg-graphite-900 p-7 md:p-10"
            >
              <div className="text-5xl font-extrabold tracking-tight md:text-6xl">
                <Counter to={s.value} suffix={s.suffix} />
              </div>
              <p className="mt-4 text-sm font-semibold text-light">{s.label}</p>
              <p className="mt-1.5 text-xs leading-relaxed text-light/45">
                {s.sub}
              </p>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
