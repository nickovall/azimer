import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import Container from "@/components/ui/Container";
import Label from "@/components/ui/Label";
import Reveal from "@/components/ui/Reveal";
import PartnerForm from "@/components/PartnerForm";

export const metadata: Metadata = {
  title: "Партнёрство — АЗИМЕР",
  description:
    "Сотрудничество с ООО «АЗИМЕР»: монтажные бригады, поставщики материалов, проектировщики, спецтехника.",
};

const partners = [
  "Монтажные бригады и подрядчики",
  "Поставщики металлопроката и материалов",
  "Проектировщики и конструкторы",
  "Владельцы спецтехники",
];

export default function PartnyorstvoPage() {
  return (
    <>
      <PageHero
        crumb="Партнёрство"
        title="Сотрудничество с АЗИМЕР"
        subtitle="Мы открыты к работе с подрядчиками, поставщиками и проектировщиками. Оставьте заявку — обсудим условия."
        image="/photos/proc-welding.jpg"
      />

      <section className="bg-light py-24 md:py-32">
        <Container>
          <div className="grid gap-12 md:grid-cols-12 md:gap-10">
            <div className="md:col-span-5">
              <Reveal>
                <Label>Кого мы ищем</Label>
                <h2 className="mt-6 text-3xl font-extrabold leading-[1.1] tracking-[-0.02em] text-graphite-900 md:text-4xl">
                  Партнёры и подрядчики
                </h2>
                <p className="mt-5 text-base leading-relaxed text-graphite-900/70">
                  Растущий объём работ требует надёжных партнёров. Если ваше
                  направление совпадает с нашим — расскажите о себе.
                </p>
              </Reveal>

              <ul className="mt-9 border-y border-line">
                {partners.map((p, i) => (
                  <Reveal
                    key={p}
                    as="li"
                    delay={0.1 + i * 0.07}
                    className="flex items-center gap-4 border-b border-line py-4 last:border-b-0"
                  >
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-orange" />
                    <span className="text-sm font-medium text-graphite-900/80">
                      {p}
                    </span>
                  </Reveal>
                ))}
              </ul>
            </div>

            <div className="md:col-span-7">
              <Reveal delay={0.12}>
                <PartnerForm />
              </Reveal>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
