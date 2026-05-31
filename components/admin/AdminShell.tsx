"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { adminFetch } from "@/lib/admin-api";

// Корень админки и секретный ключ доступа. URL для входа:
//   azimer.ru/console-x9p4m2?k=Az9pK2m4Tn7Wq3
// Без правильного ?k= отдаём 404 — посторонний не узнает что эта страница вообще существует.
export const ADMIN_ROOT = "/console-x9p4m2";
const GATE_KEY = "Az9pK2m4Tn7Wq3";
const GATE_STORAGE = "az_g";

interface AdminCtx {
  password: string;
  logout: () => void;
}

const Ctx = createContext<AdminCtx | null>(null);

export function useAdmin() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAdmin must be used inside AdminShell");
  return c;
}

const NAV = [
  { href: ADMIN_ROOT,              label: "Дашборд",  icon: "📊" },
  { href: ADMIN_ROOT + "/leads",   label: "Заявки",   icon: "📩" },
  { href: ADMIN_ROOT + "/catalog", label: "Каталог",  icon: "🗂" },
];

export default function AdminShell({ children }: { children: ReactNode }) {
  // Gate: ключ из URL или sessionStorage. Без него — рендерим 404.
  const [gated, setGated] = useState(false);
  const [gateChecked, setGateChecked] = useState(false);

  const [password, setPassword] = useState("");
  const [input, setInput] = useState("");
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Шаг 1: проверка gate-ключа (URL ?k= или sessionStorage)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const urlKey = new URLSearchParams(window.location.search).get("k");
    const stored = sessionStorage.getItem(GATE_STORAGE);
    if (urlKey === GATE_KEY) {
      sessionStorage.setItem(GATE_STORAGE, "1");
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

  // Шаг 2 (только если gated): восстановить пароль из sessionStorage и проверить его на сервере
  useEffect(() => {
    if (!gated) { setChecking(false); return; }
    const saved = typeof window !== "undefined" ? sessionStorage.getItem("admin_pw") : null;
    if (saved) {
      verify(saved).finally(() => setChecking(false));
    } else {
      setChecking(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gated]);

  async function verify(pw: string) {
    setError(null);
    try {
      await adminFetch(pw, { action: "verify_password" });
      sessionStorage.setItem("admin_pw", pw);
      setPassword(pw);
      setAuthed(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("Forbidden") || msg.includes("403")) {
        setError("Неверный пароль");
      } else {
        setError("Ошибка: " + msg);
      }
      setAuthed(false);
      sessionStorage.removeItem("admin_pw");
    }
  }

  function logout() {
    sessionStorage.removeItem("admin_pw");
    setPassword("");
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
            onKeyDown={(e) => e.key === "Enter" && verify(input)}
            placeholder="Пароль"
            className="w-full rounded-2xl border border-line bg-white px-5 py-3 text-base focus:border-orange focus:outline-none"
          />
          <button
            onClick={() => verify(input)}
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
    <Ctx.Provider value={{ password, logout }}>
      <div className="bg-light pb-24 pt-24">
        <div className="mx-auto flex w-full max-w-[1400px] gap-6 px-6">
          <Sidebar />
          <main className="min-w-0 flex-1">{children}</main>
        </div>
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
          const active = item.href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(item.href);
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
