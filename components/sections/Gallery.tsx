import Image from "next/image";
import Container from "../ui/Container";
import Label from "../ui/Label";
import Reveal from "../ui/Reveal";
import { gallery } from "@/lib/content";

export default function Gallery() {
  return (
    <section id="gallery" className="bg-graphite-950 py-24 text-light md:py-32">
      <Container>
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <Reveal>
            <Label>Объекты в работе</Label>
            <h2 className="mt-6 max-w-[15ch] text-3xl font-extrabold leading-[1.08] tracking-[-0.02em] md:text-[2.7rem]">
              Реальные объекты и монтаж
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="max-w-sm text-sm leading-relaxed text-light/55">
              Фотографии с площадок: монтаж каркасов, сэндвич-панелей, кровли и
              сварочные работы на объектах в Красноярском крае.
            </p>
          </Reveal>
        </div>

        <div className="mt-14 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {gallery.map((g, i) => (
            <Reveal
              key={g.img}
              delay={(i % 4) * 0.07}
              className={`group relative overflow-hidden rounded-2xl ${
                g.feature
                  ? "col-span-2 row-span-2 min-h-[320px] lg:min-h-[424px]"
                  : "min-h-[180px] lg:min-h-[204px]"
              }`}
            >
              <Image
                src={g.img}
                alt={g.caption}
                fill
                sizes={
                  g.feature
                    ? "(max-width: 768px) 100vw, 50vw"
                    : "(max-width: 768px) 50vw, 25vw"
                }
                className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-graphite-950/90 via-graphite-950/15 to-transparent" />
              <span className="absolute bottom-4 left-4 right-4 font-mono text-xs uppercase tracking-[0.14em] text-light">
                {g.caption}
              </span>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
