"use client";

import { useState } from "react";
import Link from "next/link";
import { useLenis } from "lenis/react";
import { motion } from "framer-motion";
import Container from "./ui/Container";
import Logo from "./ui/Logo";
import { company, nav } from "@/lib/content";

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Hysteresis: переключаемся только когда scroll пересекает разные границы вверх/вниз.
  // Это убирает дёрганье шапки на iOS при momentum-scroll рядом со значением 24.
  // Плюс игнорируем отрицательные значения (iOS overscroll bounce) и сравниваем
  // через функциональный setter, чтобы избежать лишних ре-рендеров на каждом scroll-кадре.
  useLenis(({ scroll }) => {
    setScrolled((prev) => {
      if (scroll < 0) return prev;             // iOS bounce — игнорируем
      if (prev && scroll < 12) return false;   // нижний порог
      if (!prev && scroll > 24) return true;   // верхний порог (зона покоя 12-24)
      return prev;
    });
  });

  return (
    <header
      // translate3d принудительно поднимает шапку в GPU-слой — Safari перестаёт
      // перерендеривать её на каждый scroll-кадр, плюс убирается subpixel-дрожание.
      style={{ transform: "translate3d(0,0,0)", willChange: "box-shadow" }}
      className={`fixed inset-x-0 top-0 z-50 border-b border-line bg-white transition-shadow duration-500 ${
        scrolled ? "shadow-[0_6px_28px_-14px_rgba(0,0,0,0.22)]" : ""
      }`}
    >
      <Container>
        <div className="flex h-20 items-center justify-between">
          <Link href="/" aria-label="АЗИМЕР — на главную" className="inline-flex">
            <Logo tone="dark" className="h-14 w-auto" />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-9 lg:flex">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group relative text-sm font-medium text-graphite-900/70 transition-colors hover:text-graphite-900"
              >
                {item.label}
                <span className="absolute -bottom-1.5 left-0 h-px w-0 bg-orange transition-all duration-300 group-hover:w-full" />
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            {company.phoneHref && company.phoneLabel ? (
              <a
                href={company.phoneHref}
                className="hidden text-sm font-semibold text-graphite-900 transition-colors hover:text-orange xl:inline-flex"
                aria-label={`Позвонить ${company.phoneLabel}`}
              >
                {company.phoneLabel}
              </a>
            ) : null}

            <Link
              href="/estimate"
              className="hidden rounded-full bg-orange px-6 py-3 text-sm font-semibold text-white transition-all duration-300 hover:bg-orange-bright hover:-translate-y-0.5 sm:inline-flex"
            >
              Получить расчёт
            </Link>

            {/* Burger */}
            <button
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Меню"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-graphite-900/15 lg:hidden"
            >
              <div className="flex flex-col gap-[5px]">
                <span
                  className={`block h-[1.6px] w-5 bg-graphite-900 transition-all duration-300 ${
                    menuOpen ? "translate-y-[6.6px] rotate-45" : ""
                  }`}
                />
                <span
                  className={`block h-[1.6px] w-5 bg-graphite-900 transition-all duration-300 ${
                    menuOpen ? "opacity-0" : ""
                  }`}
                />
                <span
                  className={`block h-[1.6px] w-5 bg-graphite-900 transition-all duration-300 ${
                    menuOpen ? "-translate-y-[6.6px] -rotate-45" : ""
                  }`}
                />
              </div>
            </button>
          </div>
        </div>
      </Container>

      {/* Mobile menu */}
      {menuOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="overflow-hidden border-t border-line bg-white lg:hidden"
        >
          <Container className="flex flex-col gap-1 py-5">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className="py-3 text-base font-medium text-graphite-900/80"
              >
                {item.label}
              </Link>
            ))}

            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {company.phoneHref && company.phoneLabel ? (
                <a
                  href={company.phoneHref}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center justify-center gap-2 rounded-full border border-graphite-900/15 px-5 py-3 text-sm font-semibold text-graphite-900"
                >
                  Позвонить
                </a>
              ) : null}
              {company.vkChatHref ? (
                <a
                  href={company.vkChatHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center justify-center gap-2 rounded-full border border-graphite-900/15 px-5 py-3 text-sm font-semibold text-graphite-900"
                >
                  Написать в VK
                </a>
              ) : null}
            </div>

            <Link
              href="/estimate"
              onClick={() => setMenuOpen(false)}
              className="mt-3 rounded-full bg-orange px-6 py-3.5 text-center text-sm font-semibold text-white"
            >
              Получить расчёт
            </Link>
          </Container>
        </motion.div>
      )}
    </header>
  );
}
