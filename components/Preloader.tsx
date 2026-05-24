"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Logo from "./ui/Logo";

const EASE = [0.22, 1, 0.36, 1] as const;

export default function Preloader() {
  const [done, setDone] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("azimer_loaded")) {
      setHidden(true);
      return;
    }
    const t1 = setTimeout(() => setDone(true), 1100);
    const t2 = setTimeout(() => {
      setHidden(true);
      sessionStorage.setItem("azimer_loaded", "1");
    }, 1800);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  if (hidden) return null;

  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: done ? 0 : 1, y: done ? -40 : 0 }}
      transition={{ duration: 0.65, ease: EASE }}
      style={{ pointerEvents: done ? "none" : "auto" }}
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden blueprint-paper"
    >
      <div className="absolute -bottom-40 -left-40 h-[440px] w-[440px] rounded-full bg-orange/10 blur-[150px]" />

      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: EASE }}
        className="relative"
      >
        <Logo tone="dark" className="h-20 w-auto md:h-28" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.6 }}
        className="absolute bottom-16 font-mono text-xs uppercase tracking-[0.24em] text-graphite-900/40"
      >
        Каркасные здания под ключ
      </motion.div>
    </motion.div>
  );
}
