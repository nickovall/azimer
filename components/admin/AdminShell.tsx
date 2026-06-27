"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { adminFetch, adminLogin } from "@/lib/admin-api";

// Корень админки и gate-key доступа. Без правильного ?k= отдаём 404.
// Gate-key попадает в JS bundle и не заменяет серверную проверку admin token.
export const ADMIN_ROOT = "/console-x9p4m2";
const GATE_KEY = process.env.NEXT_PUBLIC_ADMIN_GATE_KEY ?? "";
const GATE_STORAGE = "az_g";

interface AdminCtx {
  token: string;
  logout: () => void;
}

const Ctx = createContext<AdminCtx | null>(null);

export function useAdmin() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAdmin must be used inside AdminShell");
  return c;
}

// trailingSlash добавлен явно, чтобы избежать 301-redirect и hard refresh,
// который терял бы SPA-state AdminShell (gated/authed) и ломал админку.
const NAV = [
  { href: ADMIN_ROOT + "/",           label: "Дашборд",   mobileLabel: "Даш",    icon: "📊" },
  { href: ADMIN_ROOT + "/leads/",     label: "Заявки",    mobileLabel: "Заявки", icon: "📩" },
  { href: ADMIN_ROOT + "/compose/",   label: "Написать",  mobileLabel: "Письмо", icon: "✏️" },
  { href: ADMIN_ROOT + "/catalog/",   label: "Каталог",   mobileLabel: "Цены",   icon: "🗂" },
  { href: ADMIN_ROOT + "/templates/", label: "Шаблоны",   mobileLabel: "Шабл.",  icon: "✉️" },
];

function normalizePath(pathname: string): string {
  const clean = pathname.replace(/\/+$/, "");
  return clean || "/";
}

function isActiveAdminPath(pathname: string, href: string): boolean {
  const current = normalizePath(pathname);
  const target = normalizePath(href);
  if (target === ADMIN_ROOT) return current === ADMIN_ROOT;
  return current === target || current.startsWith(`${target}/`);
}

export default function AdminShell({ children }: { children: ReactNode }) {
  // Gate: ключ из URL или localStorage (trust-device, переживает закрытие вкладки).
  // Без него — рендерим 404.
  const [gated, setGated] = useState(false);
  const [gateChecked, setGateChecked] = useState(false);

  const [token, setToken] = useState("");
  const [input, setInput] = useState("");
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Шаг 1: проверка gate-ключа (URL ?k= или localStorage trust-device)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const urlKey = new URLSearchParams(window.location.search).get("k");
    const stored = localStorage.getItem(GATE_STORAGE);
    if (GATE_KEY && urlKey === GATE_KEY) {
      localStorage.setItem(GATE_STORAGE, "1");
      // Уберём ?k= из URL чтобы не мелькал в скриншотах/истории
      const url = new URL(window.location.href);
      url.searchParams.delete("k");
      window.history.replaceState({}, "", url.pathname + url.search + url.hash);
      setGated(true);
    } else if (stored === "1") {
      setGated(true);
    }
    setGateChecked(true);
  }, []);

  // Шаг 2 (только если gated): восстановить долгоживущий session token (30 дней)
  // и проверить его на сервере. Если истёк или signing secret ротировали — попросим пароль.
  useEffect(() => {
    if (!gated) { setChecking(false); return; }
    const savedToken = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;
    const savedExp = typeof window !== "undefined" ? Number(localStorage.getItem("admin_token_exp") ?? 0) : 0;
    const now = Math.floor(Date.now() / 1000);
    if (savedToken && savedExp > now + 10) {
      verifySession(savedToken).finally(() => setChecking(false));
    } else {
      localStorage.removeItem("admin_token");
      localStorage.removeItem("admin_token_exp");
      setChecking(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gated]);

  async function verifySession(savedToken: string) {
    setError(null);
    try {
      const r = await adminFetch<{ ok: true; expires_at: number }>(savedToken, { action: "verify_session" });
      localStorage.setItem("admin_token", savedToken);
      localStorage.setItem("admin_token_exp", String(r.expires_at));
      setToken(savedToken);
      setAuthed(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg.includes("Unauthorized") || msg.includes("401") ? "Сессия истекла" : "Ошибка: " + msg);
      setAuthed(false);
      localStorage.removeItem("admin_token");
      localStorage.removeItem("admin_token_exp");
    }
  }

  async function login(pw: string) {
    setError(null);
    try {
      const session = await adminLogin(pw);
      localStorage.setItem("admin_token", session.token);
      localStorage.setItem("admin_token_exp", String(session.expires_at));
      setToken(session.token);
      setInput("");
      setAuthed(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("Unauthorized") || msg.includes("401")) {
        setError("Неверный пароль");
      } else {
        setError("Ошибка: " + msg);
      }
      setAuthed(false);
      localStorage.removeItem("admin_token");
      localStorage.removeItem("admin_token_exp");
    }
  }

  function logout() {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_token_exp");
    setToken("");
    setInput("");
    setAuthed(false);
  }

  // Пока gate-ключ не проверен или не пройден — отдаём 404
  if (!gateChecked || !gated) {
    return <NotFound />;
  }

  if (checking) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-graphite-900/40">
        Проверяем доступ…
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="mx-auto max-w-md px-6 py-32">
        <h1 className="text-3xl font-bold text-graphite-900">🔒 Админка АЗИМЕР</h1>
        <p className="mt-2 text-sm text-graphite-900/60">
          Доступ ограничен — введите пароль администратора.
        </p>
        <div className="mt-6 space-y-3">
          <input
            type="password"
            autoFocus
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && login(input)}
            placeholder="Пароль"
            className="w-full rounded-2xl border border-line bg-white px-5 py-3 text-base focus:border-orange focus:outline-none"
          />
          <button
            onClick={() => login(input)}
            className="w-full rounded-full bg-orange py-3 text-sm font-semibold text-white hover:bg-orange-bright"
          >
            Войти
          </button>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <Ctx.Provider value={{ token, logout }}>
      <div className="bg-light pb-32 pt-24 md:pb-24">
        <div className="mx-auto flex w-full max-w-[1400px] gap-6 px-3 sm:px-4 md:px-6">
          <Sidebar />
          <main className="min-w-0 flex-1">{children}</main>
        </div>
        <MobileAdminNav />
      </div>
    </Ctx.Provider>
  );
}

function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 py-32 text-center">
      <p className="font-mono text-6xl font-bold text-graphite-900/20">404</p>
      <h1 className="mt-4 text-2xl font-bold text-graphite-900">Страница не найдена</h1>
      <p className="mt-2 text-sm text-graphite-900/60">
        Запрошенной страницы не существует или она была перемещена.
      </p>
      <Link href="/" className="mt-6 text-sm text-orange hover:underline">
        ← Вернуться на главную
      </Link>
    </div>
  );
}

function Sidebar() {
  const pathname = usePathname();
  const { logout } = useAdmin();

  return (
    <aside className="sticky top-24 hidden h-fit w-56 shrink-0 rounded-2xl border border-line bg-white p-3 md:block">
      <div className="border-b border-line px-2 pb-3 pt-1">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-orange">Админка</p>
        <p className="text-sm font-semibold text-graphite-900">АЗИМЕР</p>
      </div>
      <nav className="mt-3 flex flex-col gap-1">
        {NAV.map((item) => {
          const active = isActiveAdminPath(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-graphite-950 text-light"
                  : "text-graphite-900/80 hover:bg-light"
              }`}
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <button
        onClick={logout}
        className="mt-3 w-full rounded-xl px-3 py-2 text-left text-xs text-graphite-900/50 hover:bg-light hover:text-graphite-900"
      >
        ⏏ Выйти
      </button>
    </aside>
  );
}

function MobileAdminNav() {
  const pathname = usePathname();
  const { logout } = useAdmin();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-[55] border-t border-line bg-white/95 px-2 pb-2 pt-2 shadow-[0_-8px_24px_-16px_rgba(0,0,0,0.35)] backdrop-blur md:hidden"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.5rem)" }}
      aria-label="Навигация админки"
    >
      <div className="mx-auto flex max-w-md items-stretch gap-1">
        {NAV.map((item) => {
          const active = isActiveAdminPath(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-w-0 flex-1 flex-col items-center justify-center rounded-xl px-1.5 py-2 text-[10px] font-medium leading-none transition-colors ${
                active
                  ? "bg-graphite-950 text-light"
                  : "text-graphite-900/60 active:bg-light"
              }`}
            >
              <span className="text-base leading-none">{item.icon}</span>
              <span className="mt-1 truncate">{item.mobileLabel}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={logout}
          className="flex min-w-0 flex-1 flex-col items-center justify-center rounded-xl px-1.5 py-2 text-[10px] font-medium leading-none text-graphite-900/60 active:bg-light"
        >
          <span className="text-base leading-none">⏏</span>
          <span className="mt-1 truncate">Выйти</span>
        </button>
      </div>
    </nav>
  );
}
