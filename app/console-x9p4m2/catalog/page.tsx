"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAdmin } from "@/components/admin/AdminShell";
import { adminFetch } from "@/lib/admin-api";

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
  const { token } = useAdmin();
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [activeCat, setActiveCat] = useState<string>("all");
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState<string>("");
  const [editVendor, setEditVendor] = useState<string>("");
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [rebuilding, setRebuilding] = useState(false);
  const [rebuildInfo, setRebuildInfo] = useState<{ web_url: string; id: number } | null>(null);

  const loadCatalog = useCallback(async () => {
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
  }, []);

  useEffect(() => { loadCatalog(); }, [loadCatalog]);

  async function saveItem(it: CatalogItem) {
    setSavingKey(it.key);
    setError(null);
    try {
      const newPrice = parseFloat(editPrice);
      if (isNaN(newPrice) || newPrice < 0) {
        throw new Error("Цена должна быть положительным числом");
      }
      await adminFetch(token, {
        action:   "update_price",
        category: it.category,
        key:      it.key,
        label:    it.label,
        unit:     it.unit,
        price:    newPrice,
        vendor:   editVendor || null,
        source:   "manual",
      });
      setSavedFlash(it.key);
      setTimeout(() => setSavedFlash(null), 1500);
      setEditingKey(null);
      await loadCatalog();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSavingKey(null);
    }
  }

  async function triggerRebuild() {
    if (rebuilding) return;
    if (!confirm("Запустить пересборку сайта? Изменения цен поедут в прод примерно через 5 минут.")) return;
    setRebuilding(true);
    setError(null);
    setRebuildInfo(null);
    try {
      const r = await adminFetch<{ ok: true; pipeline: { id: number; web_url: string } }>(
        token,
        { action: "trigger_rebuild", reason: "catalog_update" },
      );
      setRebuildInfo(r.pipeline);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRebuilding(false);
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items
      .filter((it) => activeCat === "all" || it.category === activeCat)
      .filter((it) => !q
        || it.label.toLowerCase().includes(q)
        || it.key.toLowerCase().includes(q)
        || (it.vendor ?? "").toLowerCase().includes(q),
      );
  }, [items, activeCat, query]);

  return (
    <div>
      <div className="flex items-end justify-between border-b border-line pb-5">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-orange">Каталог</p>
          <h1 className="mt-1 text-3xl font-bold text-graphite-900">Цены</h1>
          <p className="mt-1 text-sm text-graphite-900/60">
            {items.length} позиций · правки попадают в прод после пересборки сайта (~5 мин)
          </p>
        </div>
        <button
          onClick={triggerRebuild}
          disabled={rebuilding}
          className="rounded-full bg-graphite-950 px-5 py-2.5 text-sm font-semibold text-light transition-colors hover:bg-orange disabled:opacity-50"
          title="Запустить GitLab CI: сгенерировать новый snapshot цен и задеплоить сайт"
        >
          {rebuilding ? "Запускаем..." : "🚀 Опубликовать на сайте"}
        </button>
      </div>

      {rebuildInfo && (
        <div className="mt-4 rounded-2xl border border-green-300 bg-green-50 p-4 text-sm text-green-900">
          ✅ Pipeline #{rebuildInfo.id} запущен. Через ~5 мин новые цены будут на сайте.{" "}
          <a
            href={rebuildInfo.web_url}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-orange"
          >
            Следить за прогрессом →
          </a>
        </div>
      )}

      <div className="my-6 flex flex-wrap items-center gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="🔍 Поиск по названию, ключу, поставщику..."
          className="w-72 rounded-full border border-line bg-white px-5 py-2 text-sm focus:border-orange focus:outline-none"
        />
        <div className="flex flex-wrap gap-2">
          <CatTab id="all" active={activeCat} onClick={setActiveCat} label="Все" count={items.length} />
          {categories.map((c) => {
            const cnt = items.filter((i) => i.category === c.id).length;
            return (
              <CatTab key={c.id} id={c.id} active={activeCat} onClick={setActiveCat} label={c.label} count={cnt} />
            );
          })}
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-800">
          ❌ {error}
        </div>
      )}

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
            {filtered.map((it) => {
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
                        onChange={(e) => setEditPrice(e.target.value)}
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
                        onChange={(e) => setEditVendor(e.target.value)}
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
