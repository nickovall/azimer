import Image from "next/image";
import Container from "../ui/Container";
import Label from "../ui/Label";
import Reveal from "../ui/Reveal";
import { objectTypes } from "@/lib/content";

// Mapping imgPos → Tailwind class. Literal mapping чтобы Tailwind не выкосил классы из bundle.
const POS_CLASS: Record<string, string> = {
  top:    "object-top",
  center: "object-center",
  bottom: "object-bottom",
  left:   "object-left",
  right:  "object-right",
};

export default function Objects() {
  return (
    <section id="objects" className="blueprint-paper py-24 md:py-32">
      <Container>
        <div className="max-w-2xl">
          <Reveal>
            <Label>Объекты</Label>
            <h2 className="mt-6 text-3xl font-extrabold leading-[1.08] tracking-[-0.02em] text-graphite-900 md:text-[2.7rem]">
              Здания и объекты разного назначения
            </h2>
            <p className="mt-5 text-base leading-relaxed text-graphite-900/65">
              Проектируем и строим объекты разного назначения — от складов и
              ангаров до производственных корпусов и модульных зданий.
            </p>
          </Reveal>
        </div>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {objectTypes.map((o, i) => {
            const feature = i === 0;
            return (
              <Reveal
                key={o.title}
                delay={(i % 3) * 0.08}
                className={`group relative overflow-hidden rounded-2xl ${
                  feature
                    ? "min-h-[320px] sm:col-span-2 lg:col-span-2 lg:min-h-[300px]"
                    : "min-h-[280px]"
                }`}
              >
                <Image
                  src={o.img}
                  alt={o.title}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className={`object-cover ${POS_CLASS[o.imgPos ?? "center"]} transition-transform duration-700 ease-out group-hover:scale-105`}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-graphite-950 via-graphite-950/55 to-graphite-950/10" />
                <div className="relative flex h-full flex-col justify-between p-7 text-light">
                  <span className="font-mono text-xs uppercase tracking-[0.16em] text-orange">
                    {o.tag}
                  </span>
                  <div>
                    <h3
                      className={`font-bold ${
                        feature ? "text-2xl md:text-3xl" : "text-xl"
                      }`}
                    >
                      {o.title}
                    </h3>
                    <p className="mt-2.5 max-w-md text-sm leading-relaxed text-light/70">
                      {o.text}
                    </p>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
