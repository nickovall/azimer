"use client";

import Link from "next/link";
import { useLenis } from "lenis/react";
import type { ReactNode } from "react";

type Variant = "primary" | "outline" | "dark";

const base =
  "group inline-flex items-center justify-center gap-2.5 rounded-full px-7 py-3.5 text-sm font-semibold transition-all duration-300 ease-out";

const variants: Record<Variant, string> = {
  primary:
    "bg-orange text-white hover:bg-orange-bright hover:-translate-y-0.5 hover:shadow-[0_14px_34px_-12px_rgba(237,102,41,0.7)]",
  outline:
    "border border-white/20 text-light hover:border-orange hover:bg-white/[0.04]",
  dark: "border border-graphite-900/20 text-graphite-900 hover:border-orange hover:text-orange",
};

export default function Button({
  href,
  variant = "primary",
  children,
  className = "",
  arrow = false,
}: {
  href: string;
  variant?: Variant;
  children: ReactNode;
  className?: string;
  arrow?: boolean;
}) {
  const lenis = useLenis();
  const isAnchor = href.startsWith("#");

  return (
    <Link
      href={href}
      onClick={(e) => {
        if (isAnchor && lenis) {
          e.preventDefault();
          lenis.scrollTo(href, { offset: -90 });
        }
      }}
      className={`${base} ${variants[variant]} ${className}`}
    >
      {children}
      {arrow && (
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          className="transition-transform duration-300 ease-out group-hover:translate-x-1"
        >
          <path
            d="M2 8h11M9 4l4 4-4 4"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </Link>
  );
}
