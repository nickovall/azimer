"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import Container from "../ui/Container";
import Button from "../ui/Button";

const EASE = [0.22, 1, 0.36, 1] as const;

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.11, delayChildren: 0.15 } },
};
const item = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.85, ease: EASE } },
};

const facts = ["Металл · ЛСТК · Модульные", "Проект → Монтаж → Акты", "Красноярск"];

export default function Hero() {
  return (
    <section className="relative flex min-h-screen flex-col overflow-hidden bg-graphite-950 text-light">
      {/* background photo */}
      <Image
        src="/photos/hero.jpg"
        alt="Монтаж металлокаркаса"
        fill
        priority
        sizes="100vw"
        className="object-cover object-center"
      />
      {/* overlays */}
      <div className="absolute inset-0 bg-graphite-950/80" />
      <div className="absolute inset-0 bg-gradient-to-r from-graphite-950 via-graphite-950/85 to-graphite-950/35" />
      <div className="absolute inset-0 bg-gradient-to-t from-graphite-950 via-transparent to-graphite-950/40" />
      <div className="absolute inset-0 blueprint-grid opacity-50" />
      {/* orange glow */}
      <div className="absolute -bottom-40 -left-40 h-[520px] w-[520px] rounded-full bg-orange/20 blur-[150px]" />

      <Container className="relative z-10 flex flex-1 flex-col justify-center pt-28 pb-16">
        <motion.div variants={container} initial="hidden" animate="show">
          <motion.div variants={item} className="mb-7">
            <span className="inline-flex items-center gap-3 font-mono text-xs uppercase tracking-[0.22em] text-orange">
              <span className="h-px w-8 bg-orange" />
              ООО «АЗИМЕР» · Красноярск
            </span>
          </motion.div>

          <h1 className="text-[2.65rem] font-extrabold leading-[1.03] tracking-[-0.02em] sm:text-6xl md:text-7xl lg:text-[5rem]">
            <motion.span variants={item} className="block">
              Каркасные здания
            </motion.span>
            <motion.span variants={item} className="block">
              <span className="text-orange">под ключ</span>
            </motion.span>
          </h1>

          <motion.p
            variants={item}
            className="mt-8 max-w-xl text-base leading-relaxed text-light/65 md:text-lg"
          >
            Полный цикл — от проекта до сдачи объекта. Жилые дома, склады,
            ангары, производственные и коммерческие здания. Договор, реальные
            сроки, фиксированная цена в КП.
          </motion.p>

          <motion.div variants={item} className="mt-10 flex flex-wrap gap-4">
            <Button href="/estimate" variant="primary" arrow>
              Получить расчёт
            </Button>
            <Button href="/projects" variant="outline">
              Смотреть объекты
            </Button>
          </motion.div>
        </motion.div>
      </Container>

      {/* bottom technical strip */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.1, duration: 0.8 }}
        className="relative z-10 border-t border-white/10"
      >
        <Container>
          <div className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-x-7 gap-y-2">
              {facts.map((f) => (
                <span
                  key={f}
                  className="font-mono text-xs uppercase tracking-[0.14em] text-light/45"
                >
                  {f}
                </span>
              ))}
            </div>
            <span className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.14em] text-light/45">
              Листайте ниже
              <motion.svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                animate={{ y: [0, 4, 0] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
              >
                <path
                  d="M7 2v10M3 8l4 4 4-4"
                  stroke="#ED6629"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </motion.svg>
            </span>
          </div>
        </Container>
      </motion.div>
    </section>
  );
}
