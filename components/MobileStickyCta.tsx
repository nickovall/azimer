"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { company } from "@/lib/content";
import ContactMenu from "./ContactMenu";

// Скрываем sticky CTA на admin-консоли и странице KP/PDF.
// На /kp баннер ломает деловой вид при печати, в /console-x9p4m2/* он
// перекрывает админ-таблицы и не имеет смысла для внутренних пользователей.
const HIDDEN_PREFIXES = ["/console-x9p4m2", "/kp", "/thanks"];

export default function MobileStickyCta() {
  const pathname = usePathname() ?? "/";

  if (HIDDEN_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return null;
  }

  const hasContact = !!(company.phoneHref || company.vkChatHref);

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 backdrop-blur-md shadow-[0_-6px_24px_-12px_rgba(0,0,0,0.18)] lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      role="navigation"
      aria-label="Быстрые действия"
    >
      <div className="mx-auto flex max-w-md items-center gap-2 px-3 py-2.5">
        {hasContact ? (
          <ContactMenu
            variant="sticky"
            trigger={
              <span className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full border border-graphite-900/15 bg-white px-4 text-sm font-semibold text-graphite-900">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M5 4h3l2 5-2.5 1.5a11 11 0 0 0 6 6L15 14l5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span>Связаться</span>
              </span>
            }
          />
        ) : null}

        <Link
          href="/estimate"
          className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-orange px-4 text-sm font-semibold text-white shadow-[0_8px_22px_-12px_rgba(255,107,0,0.65)]"
          aria-label="Получить расчёт"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M4 5h16v14H4V5Zm0 4h16M8 13h2m4 0h2m-8 3h2m4 0h2"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>Расчёт</span>
        </Link>
      </div>
    </div>
  );
}
