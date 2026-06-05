"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

const EASE = [0.22, 1, 0.36, 1] as const;

// Reveal usage rule: контент должен быть виден по умолчанию.
// Анимация — только лёгкое усиление при появлении, не gate.
// Большой нижний margin у viewport триггерит whileInView даже для
// блоков ниже фолда, поэтому full-page screenshots не остаются пустыми.
// prefers-reduced-motion полностью отключает анимацию.
export default function Reveal({
  children,
  delay = 0,
  y = 18,
  className = "",
  as = "div",
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  as?: "div" | "li" | "span";
}) {
  const reduce = useReducedMotion();

  if (reduce) {
    if (as === "li") return <li className={className}>{children}</li>;
    if (as === "span") return <span className={className}>{children}</span>;
    return <div className={className}>{children}</div>;
  }

  const MotionTag = motion[as];

  return (
    <MotionTag
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0, margin: "0px 0px 2000px 0px" }}
      transition={{ duration: 0.6, delay, ease: EASE }}
    >
      {children}
    </MotionTag>
  );
}
