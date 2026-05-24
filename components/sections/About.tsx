import Image from "next/image";
import Container from "../ui/Container";
import Label from "../ui/Label";
import Reveal from "../ui/Reveal";

const aboutFacts = [
  { k: "Заказчики", v: "Юрлица, ИП и частные заказчики" },
  { k: "Документы", v: "Договор, КП-приложение, акты" },
  { k: "Подход", v: "Понятный состав работ и сроки" },
];

export default function About() {
  return (
    <section id="about" className="blueprint-paper py-24 md:py-32">
      <Container>
        <div className="grid gap-12 md:grid-cols-12 md:gap-10">
          <div className="md:col-span-5">
            <Reveal>
              <Label>О компании</Label>
              <h2 className="mt-6 text-3xl font-extrabold leading-[1.08] tracking-[-0.02em] text-graphite-900 md:text-[2.7rem]">
                От расчёта до закрытия актами
              </h2>
            </Reveal>
            <Reveal
              delay={0.15}
              className="relative mt-8 hidden aspect-[4/3] overflow-hidden rounded-2xl md:block"
            >
              <Image
                src="/photos/about.jpg"
                alt="Монтаж металлокаркаса"
                fill
                sizes="(max-width: 768px) 100vw, 40vw"
                className="object-cover"
              />
            </Reveal>
          </div>

          <div className="md:col-span-7">
            <Reveal delay={0.1}>
              <p className="text-lg leading-relaxed text-graphite-900/75">
                ООО «АЗИМЕР» строит каркасные здания и металлоконструкции —
                жилые дома, склады, ангары, производственные и коммерческие
                объекты. От предварительного расчёта и подготовки КП до
                изготовления, поставки и монтажа.
              </p>
              <p className="mt-5 text-lg leading-relaxed text-graphite-900/75">
                Работаем с юрлицами, ИП и частными заказчиками, которым нужен
                понятный состав работ, реальные сроки и документальное
                оформление.
              </p>
            </Reveal>

            <div className="mt-10 grid gap-px bg-line sm:grid-cols-3">
              {aboutFacts.map((f, i) => (
                <Reveal
                  key={f.k}
                  delay={0.15 + i * 0.08}
                  className="bg-light pt-6"
                >
                  <p className="font-mono text-xs uppercase tracking-[0.16em] text-orange">
                    {f.k}
                  </p>
                  <p className="mt-2 text-sm font-medium text-graphite-900/80">
                    {f.v}
                  </p>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
