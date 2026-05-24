import type { ReactNode } from "react";
import Container from "../ui/Container";
import Label from "../ui/Label";
import Reveal from "../ui/Reveal";
import { audiences } from "@/lib/content";

const icons: Record<string, ReactNode> = {
  warehouse: (
    <>
      <path d="M3 12 14 5l11 7" />
      <path d="M5 12v12h18V12" />
      <path d="M10 24v-7h8v7" />
      <path d="M10 20.5h8" />
    </>
  ),
  factory: (
    <>
      <path d="M4 24V13l5 4v-4l5 4v-4l5 4v7z" />
      <path d="M19 24V8h3v16" />
      <path d="M3 24h22" />
    </>
  ),
  agro: (
    <>
      <path d="M5 24V11l9-6 9 6v13z" />
      <path d="M5 11h18" />
      <path d="M11 24v-7h6v7" />
    </>
  ),
  retail: (
    <>
      <path d="M5 24V14h18v10" />
      <path d="M4 14l2-6h16l2 6" />
      <path d="M4 14h20" />
      <path d="M11 24v-6h5v6" />
    </>
  ),
  office: (
    <>
      <path d="M7 24V5h14v19" />
      <path d="M7 11h14M7 17h14" />
      <path d="M5 24h18" />
    </>
  ),
  home: (
    <>
      <path d="M5 24V12l9-7 9 7v12z" />
      <path d="M11 24v-8h6v8" />
    </>
  ),
};

export default function Audiences() {
  return (
    <section id="audiences" className="bg-graphite-900 py-24 text-light md:py-32">
      <Container>
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <Reveal>
            <Label>Для кого</Label>
            <h2 className="mt-6 max-w-[15ch] text-3xl font-extrabold leading-[1.08] tracking-[-0.02em] md:text-[2.7rem]">
              Строим для бизнеса и частных задач
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="max-w-sm text-sm leading-relaxed text-light/55">
              Каркасные здания под задачи разных отраслей — от складов и
              производств до жилых домов.
            </p>
          </Reveal>
        </div>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {audiences.map((a, i) => (
            <Reveal
              key={a.title}
              delay={(i % 3) * 0.08}
              className="group rounded-2xl border border-white/10 bg-graphite-950 p-7 transition-colors duration-300 hover:border-orange/40"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange/10 text-orange transition-colors duration-300 group-hover:bg-orange group-hover:text-white">
                <svg
                  width="26"
                  height="26"
                  viewBox="0 0 28 28"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {icons[a.icon]}
                </svg>
              </span>
              <h3 className="mt-5 text-lg font-bold">{a.title}</h3>
              <p className="mt-2.5 text-sm leading-relaxed text-light/55">
                {a.text}
              </p>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
