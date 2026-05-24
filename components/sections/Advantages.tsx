import Container from "../ui/Container";
import Label from "../ui/Label";
import Reveal from "../ui/Reveal";
import { advantages } from "@/lib/content";

export default function Advantages() {
  return (
    <section id="advantages" className="blueprint-paper py-24 md:py-32">
      <Container>
        <div className="grid gap-12 md:grid-cols-12 md:gap-10">
          <div className="md:col-span-4">
            <div className="md:sticky md:top-28">
              <Reveal>
                <Label>Почему удобно</Label>
                <h2 className="mt-6 text-3xl font-extrabold leading-[1.08] tracking-[-0.02em] text-graphite-900 md:text-[2.7rem]">
                  Прозрачно на каждом этапе
                </h2>
                <p className="mt-5 max-w-xs text-sm leading-relaxed text-graphite-900/60">
                  Договорённости фиксируются документами, а работа идёт
                  понятными и контролируемыми шагами.
                </p>
              </Reveal>
            </div>
          </div>

          <div className="md:col-span-8">
            <ul>
              {advantages.map((a, i) => (
                <Reveal
                  as="li"
                  key={a.n}
                  delay={i * 0.06}
                  className="flex gap-6 border-t border-line py-7 first:border-t-0 first:pt-0 md:gap-10 md:py-9"
                >
                  <span className="font-mono text-2xl font-medium text-orange md:text-3xl">
                    {a.n}
                  </span>
                  <div>
                    <h3 className="text-lg font-bold text-graphite-900 md:text-xl">
                      {a.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-graphite-900/65 md:text-base">
                      {a.text}
                    </p>
                  </div>
                </Reveal>
              ))}
            </ul>
          </div>
        </div>
      </Container>
    </section>
  );
}
