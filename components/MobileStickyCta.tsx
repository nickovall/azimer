"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { company } from "@/lib/content";

// Скрываем sticky CTA на admin-консоли и странице KP/PDF.
// На /kp баннер ломает деловой вид при печати, в /console-x9p4m2/* он
// перекрывает админ-таблицы и не имеет смысла для внутренних пользователей.
const HIDDEN_PREFIXES = ["/console-x9p4m2", "/kp", "/thanks"];

export default function MobileStickyCta() {
  const pathname = usePathname() ?? "/";

  if (HIDDEN_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return null;
  }

  const showPhone = !!company.phoneHref;
  const showVk = !!company.vkChatHref;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 backdrop-blur-md shadow-[0_-6px_24px_-12px_rgba(0,0,0,0.18)] lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      role="navigation"
      aria-label="Быстрые действия"
    >
      <div className="grid grid-cols-3 items-stretch">
        {showPhone ? (
          <a
            href={company.phoneHref}
            className="flex flex-col items-center justify-center gap-1 py-2.5 text-xs font-medium text-graphite-900"
            aria-label={`Позвонить ${company.phoneLabel}`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M5 4h3l2 5-2.5 1.5a11 11 0 0 0 6 6L15 14l5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span>Позвонить</span>
          </a>
        ) : (
          <span aria-hidden />
        )}

        {showVk ? (
          <a
            href={company.vkChatHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center justify-center gap-1 border-x border-line py-2.5 text-xs font-medium text-graphite-900"
            aria-label="Написать в VK"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M4 6h2.5l2 4 2-4H13l-3 5.5L13.5 18H11l-2-3.5L7 18H4l3.5-6L4 6Zm12 0h2v12h-2V6Z"
                fill="currentColor"
              />
            </svg>
            <span>Написать</span>
          </a>
        ) : (
          <span aria-hidden />
        )}

        <Link
          href="/estimate"
          className="flex flex-col items-center justify-center gap-1 bg-orange py-2.5 text-xs font-semibold text-white"
          aria-label="Получить расчёт"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
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
