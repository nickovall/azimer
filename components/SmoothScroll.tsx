"use client";

import { ReactLenis, type LenisRef } from "lenis/react";
import { MotionConfig } from "framer-motion";
import { useEffect, useRef, type ReactNode } from "react";

export default function SmoothScroll({ children }: { children: ReactNode }) {
  const lenisRef = useRef<LenisRef>(null);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    const id = setInterval(() => {
      const l = lenisRef.current?.lenis;
      if (l) {
        (window as unknown as { __lenis?: unknown }).__lenis = l;
        clearInterval(id);
      }
    }, 80);
    return () => clearInterval(id);
  }, []);

  return (
    <ReactLenis
      root
      ref={lenisRef}
      options={{ lerp: 0.1, duration: 1.2, smoothWheel: true }}
    >
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </ReactLenis>
  );
}
