"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const STORAGE_KEY = "azimer_cookie_ack";
const HIDDEN_PREFIXES = ["/console-x9p4m2"];

/**
 * Информационный баннер о cookie и веб-аналитике (152-ФЗ).
 * Российский формат — уведомление со ссылкой на политику, а не GDPR-портянка
 * с гранулярным согласием. Закрывается кнопкой, выбор хранится в localStorage.
 */
export default function CookieBanner() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const hidden = HIDDEN_PREFIXES.some((prefix) => pathname?.startsWith(prefix));

  useEffect(() => {
    if (hidden) return;
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
    } catch {
      // localStorage недоступен (приватный режим) — баннер просто не показываем
    }
  }, [hidden]);

  const accept = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* игнорируем */
    }
    setVisible(false);
  };

  if (hidden || !visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] px-4 pb-4 lg:px-6 lg:pb-6">
      <div className="mx-auto flex max-w-3xl flex-col gap-3 rounded-2xl border border-line bg-white p-5 shadow-lg shadow-graphite-900/10 sm:flex-row sm:items-center sm:gap-5 sm:p-6">
        <p className="text-xs leading-relaxed text-graphite-900/65 sm:text-[13px]">
          Мы используем файлы cookie и системы веб-аналитики, чтобы сайт работал
          корректно и для оценки посещаемости. Продолжая пользоваться сайтом, вы
          соглашаетесь с этим. Подробнее — в{" "}
          <Link href="/privacy" className="text-orange hover:underline">
            политике конфиденциальности
          </Link>
          .
        </p>
        <button
          type="button"
          onClick={accept}
          className="shrink-0 self-start rounded-full bg-orange px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-bright sm:self-auto"
        >
          Принять
        </button>
      </div>
    </div>
  );
}
