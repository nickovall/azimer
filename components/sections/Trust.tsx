import Container from "../ui/Container";
import Label from "../ui/Label";
import Reveal from "../ui/Reveal";
import { trustDocs } from "@/lib/content";

export default function Trust() {
  return (
    <section id="trust" className="bg-graphite-950 py-24 text-light md:py-32">
      <Container>
        <div className="grid gap-12 md:grid-cols-12 md:gap-10">
          <div className="md:col-span-5">
            <Reveal>
              <Label>Доверие</Label>
              <h2 className="mt-6 text-3xl font-extrabold leading-[1.08] tracking-[-0.02em] md:text-[2.7rem]">
                Договор, приложение и акты
              </h2>
              <p className="mt-6 text-base leading-relaxed text-light/65">
                Нам доверяют компании и частные заказчики, которым важны сроки,
                понятный состав работ и документальное оформление.
              </p>
              <p className="mt-4 text-base leading-relaxed text-light/65">
                Работаем с договором, приложением к КП, промежуточными актами,
                актами скрытых работ и итоговым закрытием.
              </p>
            </Reveal>
          </div>

          <div className="md:col-span-7">
            <div className="grid gap-px overflow-hidden rounded-2xl bg-white/10 sm:grid-cols-2">
              {trustDocs.map((d, i) => (
                <Reveal
                  key={d.title}
                  delay={(i % 2) * 0.08}
                  className="bg-graphite-900 p-7 md:p-8"
                >
                  <svg
                    width="34"
                    height="34"
                    viewBox="0 0 34 34"
                    fill="none"
                    aria-hidden
                  >
                    <rect
                      x="7"
                      y="4"
                      width="20"
                      height="26"
                      rx="2.5"
                      stroke="#ED6629"
                      strokeWidth="2"
                    />
                    <path
                      d="M12 13h10M12 18h10M12 23h6"
                      stroke="#ED6629"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                  <h3 className="mt-5 text-lg font-bold">{d.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-light/55">
                    {d.text}
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
