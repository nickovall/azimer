import type { ReactNode } from "react";

export default function Label({
  children,
  tone = "orange",
}: {
  children: ReactNode;
  tone?: "orange" | "muted";
}) {
  const color = tone === "orange" ? "text-orange" : "text-graphite-900/50";
  return (
    <span
      className={`inline-flex items-center gap-3 font-mono text-xs uppercase tracking-[0.2em] ${color}`}
    >
      <span className="h-px w-7 bg-orange" />
      {children}
    </span>
  );
}
