import Container from "../ui/Container";
import Label from "../ui/Label";
import Reveal from "../ui/Reveal";
import { testimonials } from "@/lib/content";

export default function Testimonials() {
  return (
    <section
      id="testimonials"
      className="bg-graphite-900 py-24 text-light md:py-32"
    >
      <Container>
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <Reveal>
            <Label>Нам доверяют</Label>
            <h2 className="mt-6 max-w-[16ch] text-3xl font-extrabold leading-[1.08] tracking-[-0.02em] md:text-[2.7rem]">
              Благодарности от заказчиков
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="max-w-sm text-sm leading-relaxed text-light/55">
              Реальные письма от компаний, с которыми мы работали — модульное
              строительство, монтаж инженерных систем, отделка объектов.
            </p>
          </Reveal>
        </div>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((t, i) => (
            <Reveal key={t.slug} delay={(i % 3) * 0.07}>
              <a
                href={t.pdf}
                target="_blank"
                rel="noopener noreferrer"
                className="group block h-full rounded-2xl bg-white p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_44px_-16px_rgba(0,0,0,0.45)]"
              >
                <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-light">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={t.thumb}
                    alt={`Благодарственное письмо — ${t.company}`}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    loading="lazy"
                  />
                </div>
                <h3 className="mt-5 text-base font-bold text-graphite-900">
                  {t.company}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-graphite-900/65">
                  {t.excerpt}
                </p>
                <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-orange transition-all group-hover:gap-3">
                  Смотреть письмо
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path
                      d="M2 7h9M7 3l4 4-4 4"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </a>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
