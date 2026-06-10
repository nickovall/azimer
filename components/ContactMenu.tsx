"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { company } from "@/lib/content";

type Variant = "header" | "burger" | "sticky";

const COMMON_OPTION =
  "flex items-center gap-3 px-4 py-3 text-sm font-medium text-graphite-900 transition-colors hover:bg-orange/10";

function PhoneIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 4h3l2 5-2.5 1.5a11 11 0 0 0 6 6L15 14l5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function VkIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden>
      <path
        d="M16.42 22.5c-7.13 0-11.2-4.95-11.37-13.18h3.58c.12 6.04 2.77 8.6 4.87 9.13V9.32h3.37v5.17c2.07-.22 4.25-2.58 4.98-5.17h3.37c-.56 3.2-2.92 5.56-4.6 6.54 1.68.79 4.36 2.85 5.38 6.64h-3.72c-.8-2.49-2.81-4.42-5.41-4.68v4.68h-.45Z"
        fill="currentColor"
      />
    </svg>
  );
}

function ChatIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-7l-4 3.5V17H6a2 2 0 0 1-2-2V6Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function ContactMenu({
  variant,
  trigger,
  onAction,
}: {
  variant: Variant;
  trigger: ReactNode;
  onAction?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const hasPhone = !!company.phoneHref;
  const hasVk = !!company.vkChatHref;

  const close = () => {
    setOpen(false);
    onAction?.();
  };

  const panelClass =
    variant === "sticky"
      ? "absolute left-1/2 bottom-[calc(100%+8px)] z-50 w-[min(92vw,320px)] -translate-x-1/2 overflow-hidden rounded-2xl border border-line bg-white shadow-[0_18px_44px_-18px_rgba(0,0,0,0.28)]"
      : variant === "burger"
      ? "mt-2 overflow-hidden rounded-2xl border border-line bg-white"
      : "absolute right-0 top-[calc(100%+10px)] z-50 w-64 overflow-hidden rounded-2xl border border-line bg-white shadow-[0_18px_44px_-18px_rgba(0,0,0,0.28)]";

  const wrapClass =
    variant === "sticky"
      ? "relative flex-1"
      : variant === "burger"
      ? "relative"
      : "relative inline-block";

  const buttonClass = variant === "sticky" || variant === "burger" ? "block w-full" : "contents";

  return (
    <div ref={wrapRef} className={wrapClass}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={buttonClass}
      >
        {trigger}
      </button>

      {open ? (
        <div role="menu" className={panelClass}>
          {hasPhone ? (
            <a
              role="menuitem"
              href={company.phoneHref}
              onClick={close}
              className={COMMON_OPTION}
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-orange/10 text-orange">
                <PhoneIcon />
              </span>
              <span className="flex flex-col">
                <span>Позвонить</span>
                <span className="text-xs font-normal text-graphite-900/60">
                  {company.phoneLabel}
                </span>
              </span>
            </a>
          ) : null}

          {hasVk ? (
            <a
              role="menuitem"
              href={company.vkChatHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={close}
              className={`${COMMON_OPTION} border-t border-line`}
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0077FF]/10 text-[#0077FF]">
                <VkIcon />
              </span>
              <span>Написать в ВКонтакте</span>
            </a>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export { PhoneIcon, VkIcon, ChatIcon };
