"use client";

import { useEffect, useState, useMemo } from "react";
import Container from "@/components/ui/Container";
import { supabase } from "@/lib/supabase";

const ADMIN_FN_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "") + "/functions/v1/catalog-admin";
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

interface CatalogItem {
  category:   string;
  key:        string;
  label:      string;
  unit:       string;
  price:      number;
  vendor:     string | null;
  comment:    string | null;
  valid_from: string;
  source:     string;
}

interface Category {
  id: string;
  label: string;
  sort_order: number;
}

export default function AdminCatalogPage() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [activeCat, setActiveCat] = useState<string>("sandwich");
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState<string>("");
  const [editVendor, setEditVendor] = useState<string>("");
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  // Восстанавливаем пароль из sessionStorage
  useEffect(() => {
    const saved = typeof window !== "undefined" ? sessionStorage.getItem("admin_pw") : null;
    if (saved) {
      setPassword(saved);
      verifyPassword(saved);
    }
  }, []);

  async function verifyPassword(pw: string) {
    try {
      const r = await fetch(ADMIN_FN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + ANON_KEY,
          "x-admin-password": pw,
        },
        body: JSON.stringify({ action: "verify_password" }),
      });
      if (r.ok) {
        setAuthed(true);
        sessionStorage.setItem("admin_pw", pw);
        await loadCatalog();
      } else {
        setError("Неверный пароль");
        setAuthed(false);
      }
    } catch (e: any) {
      setError("Ошибка: " + e.message);
    }
  }

  async function loadCatalog() {
    if (!supabase) return;
    const { data: cats } = await supabase
      .from("catalog_categories")
      .select("*")
      .order("sort_order");
    if (cats) setCategories(cats as Category[]);

    const { data: rows } = await supabase
      .from("catalog_current")
      .select("*")
      .order("category")
      .order("key");
    if (rows) setItems(rows as CatalogItem[]);
  }

  async function saveItem(it: CatalogItem) {
    setSavingKey(it.key);
    setError(null);
    try {
      const newPrice = parseFloat(editPrice);
      if (isNaN(newPrice) || newPrice < 0) {
        throw new Error("Цена должна быть положительным числом");
      }
      const r = await fetch(ADMIN_FN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + ANON_KEY,
          "x-admin-password": password,
        },
        body: JSON.stringify({
          action:   "update_price",
          category: it.category,
          key:      it.key,
          label:    it.label,
          unit:     it.unit,
          price:    newPrice,
          vendor:   editVendor || null,
          source:   "manual",
        }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error || r.statusText);
      }
      setSavedFlash(it.key);
      setTimeout(() => setSavedFlash(null), 1500);
      setEditingKey(null);
      await loadCatalog();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSavingKey(null);
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items
      .filter(it => activeCat === "all" || it.category === activeCat)
      .filter(it => !q ||
        it.label.toLowerCase().includes(q) ||
        it.key.toLowerCase().includes(q) ||
        (it.vendor ?? "").toLowerCase().includes(q),
      );
  }, [items, activeCat, query]);

  // ─────── Render: Login screen ───────
  if (!authed) {
    return (
      <Container className="py-32">
        <div className="mx-auto max-w-md">
          <h1 className="text-3xl font-bold text-graphite-900">🔒 Админка каталога</h1>
          <p className="mt-2 text-sm text-graphite-900/60">
            Доступ ограничен — введите пароль администратора.
          </p>
          <div className="mt-6 space-y-3">
            <input
              type="password"
              autoFocus
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && verifyPassword(password)}
              placeholder="Пароль"
              className="w-full rounded-2xl border border-line bg-white px-5 py-3 text-base focus:border-orange focus:outline-none"
            />
            <button
              onClick={() => verifyPassword(password)}
              className="w-full rounded-full bg-orange py-3 text-sm font-semibold text-white hover:bg-orange-bright"
            >
              Войти
            </button>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
        </div>
      </Container>
    );
  }

  // ─────── Render: Catalog ───────
  return (
    <div className="bg-light pb-24 pt-28">
      <Container>
        <div className="flex items-end justify-between border-b border-line pb-5">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-orange">Админка</p>
            <h1 className="mt-1 text-3xl font-bold text-graphite-900">Каталог цен</h1>
            <p className="mt-1 text-sm text-graphite-900/60">
              {items.length} позиций · обновления применяются мгновенно для всех расчётов
            </p>
          </div>
          <button
            onClick={() => { sessionStorage.removeItem("admin_pw"); setAuthed(false); setPassword(""); }}
            className="text-xs text-graphite-900/60 hover:text-orange"
          >
            Выйти
          </button>
        </div>

        {/* Поиск + табы категорий */}
        <div className="my-6 flex flex-wrap items-center gap-3">
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="🔍 Поиск по названию, ключу, поставщику..."
            className="w-72 rounded-full border border-line bg-white px-5 py-2 text-sm focus:border-orange focus:outline-none"
          />
          <div className="flex flex-wrap gap-2">
            <CatTab id="all" active={activeCat} onClick={setActiveCat} label="Все" count={items.length} />
            {categories.map(c => {
              const cnt = items.filter(i => i.category === c.id).length;
              return <CatTab key={c.id} id={c.id} active={activeCat} onClick={setActiveCat} label={c.label} count={cnt} />;
            })}
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-800">
            ❌ {error}
          </div>
        )}

        {/* Таблица */}
        <div className="overflow-hidden rounded-2xl border border-line bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-light/50 text-xs uppercase tracking-wider text-graphite-900/60">
                <th className="px-4 py-3 text-left font-medium">Позиция</th>
                <th className="px-2 py-3 text-left font-medium">Ключ</th>
                <th className="px-2 py-3 text-right font-medium">Цена</th>
                <th className="px-2 py-3 text-left font-medium">Ед.</th>
                <th className="px-2 py-3 text-left font-medium">Поставщик</th>
                <th className="px-4 py-3 text-right font-medium">Действие</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(it => {
                const editing = editingKey === it.key;
                const saving = savingKey === it.key;
                const flashed = savedFlash === it.key;
                return (
                  <tr key={`${it.category}_${it.key}`} className={`border-b border-line/40 last:border-0 ${flashed ? "bg-green-50" : ""}`}>
                    <td className="px-4 py-2.5 text-graphite-900">
                      <div>{it.label}</div>
                      <div className="text-xs text-graphite-900/40">{it.category}</div>
                    </td>
                    <td className="px-2 py-2.5 font-mono text-xs text-graphite-900/50">{it.key}</td>
                    <td className="px-2 py-2.5 text-right font-mono">
                      {editing ? (
                        <input
                          type="number"
                          step="0.01"
                          value={editPrice}
                          onChange={e => setEditPrice(e.target.value)}
                          autoFocus
                          className="w-28 rounded border border-orange bg-white px-2 py-1 text-right"
                        />
                      ) : (
                        <span className="font-semibold">{it.price.toLocaleString("ru-RU")}</span>
                      )}
                    </td>
                    <td className="px-2 py-2.5 text-xs text-graphite-900/60">{it.unit}</td>
                    <td className="px-2 py-2.5 text-xs text-graphite-900/60">
                      {editing ? (
                        <input
                          value={editVendor}
                          onChange={e => setEditVendor(e.target.value)}
                          placeholder="Имя поставщика"
                          className="w-32 rounded border border-line bg-white px-2 py-1 text-xs"
                        />
                      ) : (
                        it.vendor ?? <span className="text-graphite-900/30">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {editing ? (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => saveItem(it)}
                            disabled={saving}
                            className="rounded-full bg-orange px-4 py-1 text-xs font-semibold text-white hover:bg-orange-bright disabled:opacity-50"
                          >
                            {saving ? "..." : "Сохранить"}
                          </button>
                          <button
                            onClick={() => { setEditingKey(null); setError(null); }}
                            className="text-xs text-graphite-900/60 hover:text-graphite-900"
                          >
                            Отмена
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingKey(it.key);
                            setEditPrice(String(it.price));
                            setEditVendor(it.vendor ?? "");
                            setError(null);
                          }}
                          className="text-xs text-orange hover:underline"
                        >
                          ✏ Изменить
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="p-12 text-center text-sm text-graphite-900/40">Ничего не найдено</p>
          )}
        </div>
      </Container>
    </div>
  );
}

function CatTab({ id, active, onClick, label, count }: { id: string; active: string; onClick: (id: string) => void; label: string; count: number }) {
  const isActive = id === active;
  return (
    <button
      onClick={() => onClick(id)}
      className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
        isActive ? "bg-graphite-950 text-light" : "bg-white text-graphite-900/70 hover:bg-light"
      }`}
    >
      {label} <span className="text-graphite-900/40">({count})</span>
    </button>
  );
}
