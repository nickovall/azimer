"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

const HIDDEN_PREFIXES = ["/console-x9p4m2"];

export default function HideOnAdminRoutes({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/";
  const hidden = HIDDEN_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

  if (hidden) return null;
  return <>{children}</>;
}
