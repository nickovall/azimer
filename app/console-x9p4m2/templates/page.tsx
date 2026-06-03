"use client";

import { useCallback, useEffect, useState } from "react";
import { useAdmin } from "@/components/admin/AdminShell";
import { adminFetch, type MessageTemplate } from "@/lib/admin-api";

const PLACEHOLDERS = [
  { key: "{{client_name}}",   desc: "Имя клиента (первое слово)" },
  { key: "{{name}}",          desc: "Полное имя клиента" },
  { key: "{{phone}}",         desc: "Телефон клиента" },
  { key: "{{email}}",         desc: "Email клиента" },
  { key: "{{object_type}}",   desc: "Тип объекта" },
  { key: "{{region}}",        desc: "Регион" },
  { key: "{{kp_url}}",        desc: "Ссылка на КП" },
  { key: "{{kp_total}}",      desc: "Итоговая стоимость" },
  { key: "{{kp_range}}",      desc: "Диапазон цены" },
  { key: "{{manager_phone}}", desc: "Тел. менеджера" },
  { key: "{{manager_name}}",  desc: "Имя менеджера" },
  { key: "{{date}}",          desc: "Дата ДД.ММ.ГГГГ" },
  { key: "{{azimer_site}}",   desc: "azimer.ru" },
];

export default function AdminTemplatesPage() {
  const { password } = useAdmin();
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [filter, setFilter] = useState<"all" | "sms" | "email">("all");
  const [editing, setEditing] = useState<MessageTemplate | null>(null);
  const [draft, setDraft] = useState<Partial<MessageTemplate>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const r = await adminFetch<{ ok: true; templates: MessageTemplate[] }>(password, {
        action: "list_templates", only_active: false,
      });
      setTemplates(r.templates ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [password]);

  useEffect(() => { load(); }, [load]);

  function startEdit(t: MessageTemplate) {
    setEditing(t);
    setDraft({ ...t });
  }

  function startNew(channel: "sms" | "email") {
    setEditing({ id: "", channel, slug: "", name: "", subject: null, body: "", is_active: true, sort_order: 100 });
    setDraft({ channel, slug: "", name: "", subject: "", body: "", is_active: true, sort_order: 100 });
  }

  async function save() {
    if (!draft.channel || !draft.slug || !draft.name || !draft.body) {
      setError("channel, slug, name, body обязательны");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await adminFetch(password, {
        action: "save_template",
        id: editing?.id || undefined,
        channel: draft.channel,
        slug: draft.slug,
        name: draft.name,
        subject: draft.subject || null,
        body: draft.body,
        is_active: draft.is_active !== false,
        sort_order: draft.sort_order ?? 100,
      });
      setEditing(null);
      setDraft({});
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Деактивировать шаблон?")) return;
    try {
      await adminFetch(password, { action: "delete_template", id });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  const filtered = templates.filter((t) => filter === "all" || t.channel === filter);

  return (
    <div>
      <div className="border-b border-line pb-5">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-orange">Шаблоны</p>
        <h1 className="mt-1 text-3xl font-bold text-graphite-900">Сообщения клиентам</h1>
        <p className="mt-1 text-sm text-graphite-900/60">
          Шаблоны SMS и Email с плейсхолдерами. Применяются в карточке заявки при отправке.
        </p>
      </div>

      <div className="my-6 flex flex-wrap items-center gap-3">
        <div className="flex gap-2">
          {(["all", "sms", "email"] as const).map((c) => (
            <button
              key={c}
              onClick={() => setFilter(c)}
              className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
                filter === c ? "bg-graphite-950 text-light" : "bg-white text-graphite-900/70 border border-line hover:bg-light"
              }`}
            >
              {c === "all" ? "Все" : c === "sms" ? "📱 SMS" : "📧 Email"}
              <span className="ml-1.5 text-graphite-900/40">
                ({c === "all" ? templates.length : templates.filter((t) => t.channel === c).length})
              </span>
            </button>
          ))}
        </div>
        <div className="ml-auto flex gap-2">
          <button onClick={() => startNew("sms")} className="rounded-full bg-orange px-4 py-2 text-xs font-semibold text-white hover:bg-orange-bright">
            + Новый SMS
          </button>
          <button onClick={() => startNew("email")} className="rounded-full bg-graphite-950 px-4 py-2 text-xs font-semibold text-light hover:bg-graphite-900">
            + Новый Email
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-800">❌ {error}</div>
      )}

      <div className="grid gap-3">
        {filtered.map((t) => (
          <div
            key={t.id}
            className={`rounded-2xl border bg-white p-4 ${t.is_active ? "border-line" : "border-line/40 opacity-50"}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-light px-2 py-0.5 text-[10px] uppercase tracking-wider">{t.channel}</span>
                  <span className="font-mono text-xs text-graphite-900/40">{t.slug}</span>
                  {!t.is_active && <span className="text-xs text-red-600">(деактивирован)</span>}
                </div>
                <h3 className="mt-1 text-sm font-semibold text-graphite-900">{t.name}</h3>
                {t.subject && <p className="mt-0.5 text-xs text-graphite-900/60">Тема: {t.subject}</p>}
                <p className="mt-2 whitespace-pre-wrap text-xs font-mono text-graphite-900/70 line-clamp-2">{t.body}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => startEdit(t)} className="text-xs text-orange hover:underline">✏ Изменить</button>
                {t.is_active && (
                  <button onClick={() => remove(t.id)} className="text-xs text-red-600 hover:underline">🗑 Удалить</button>
                )}
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="rounded-2xl border border-line bg-white p-12 text-center text-sm text-graphite-900/40">
            Шаблонов в этой категории нет.
          </p>
        )}
      </div>

      {/* Редактор */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-graphite-950/70 p-6" onClick={() => setEditing(null)}>
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h2 className="text-xl font-bold text-graphite-900">
                {editing.id ? "Редактировать шаблон" : "Новый шаблон"}
              </h2>
              <button onClick={() => setEditing(null)} className="text-graphite-900/40 hover:text-graphite-900">✕</button>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-[1fr_220px]">
              <div className="grid gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs uppercase tracking-wider text-graphite-900/40">Канал</label>
                    <select
                      value={draft.channel ?? "sms"}
                      onChange={(e) => setDraft({ ...draft, channel: e.target.value as "sms" | "email" })}
                      className="mt-1 w-full rounded-xl border border-line bg-light/30 px-3 py-2 text-sm focus:border-orange focus:bg-white focus:outline-none"
                    >
                      <option value="sms">SMS</option>
                      <option value="email">Email</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-wider text-graphite-900/40">Slug (англ., уникальный)</label>
                    <input
                      value={draft.slug ?? ""}
                      onChange={(e) => setDraft({ ...draft, slug: e.target.value })}
                      placeholder="my_template"
                      className="mt-1 w-full rounded-xl border border-line bg-light/30 px-3 py-2 text-sm font-mono focus:border-orange focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs uppercase tracking-wider text-graphite-900/40">Название</label>
                  <input
                    value={draft.name ?? ""}
                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                    placeholder="📄 КП готово"
                    className="mt-1 w-full rounded-xl border border-line bg-light/30 px-3 py-2 text-sm focus:border-orange focus:bg-white focus:outline-none"
                  />
                </div>

                {draft.channel === "email" && (
                  <div>
                    <label className="text-xs uppercase tracking-wider text-graphite-900/40">Тема письма</label>
                    <input
                      value={draft.subject ?? ""}
                      onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
                      placeholder="Коммерческое предложение от АЗИМЕР"
                      className="mt-1 w-full rounded-xl border border-line bg-light/30 px-3 py-2 text-sm focus:border-orange focus:bg-white focus:outline-none"
                    />
                  </div>
                )}

                <div>
                  <label className="text-xs uppercase tracking-wider text-graphite-900/40">Тело сообщения</label>
                  <textarea
                    value={draft.body ?? ""}
                    onChange={(e) => setDraft({ ...draft, body: e.target.value })}
                    rows={draft.channel === "email" ? 12 : 5}
                    className="mt-1 w-full rounded-xl border border-line bg-light/30 px-3 py-2 text-sm font-mono focus:border-orange focus:bg-white focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs uppercase tracking-wider text-graphite-900/40">Порядок</label>
                    <input
                      type="number"
                      value={draft.sort_order ?? 100}
                      onChange={(e) => setDraft({ ...draft, sort_order: parseInt(e.target.value) || 0 })}
                      className="mt-1 w-full rounded-xl border border-line bg-light/30 px-3 py-2 text-sm focus:border-orange focus:bg-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-wider text-graphite-900/40">Активен</label>
                    <div className="mt-2">
                      <input
                        type="checkbox"
                        checked={draft.is_active !== false}
                        onChange={(e) => setDraft({ ...draft, is_active: e.target.checked })}
                        className="mr-2"
                      />
                      <span className="text-sm">Доступен для отправки</span>
                    </div>
                  </div>
                </div>
              </div>

              <aside className="rounded-xl bg-light/40 p-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-graphite-900/60">Плейсхолдеры</p>
                <p className="mt-1 text-[10px] text-graphite-900/40">Кликни — добавится в тело</p>
                <ul className="mt-2 space-y-1">
                  {PLACEHOLDERS.map((p) => (
                    <li key={p.key}>
                      <button
                        type="button"
                        onClick={() => setDraft({ ...draft, body: (draft.body ?? "") + p.key })}
                        className="block w-full text-left text-xs"
                      >
                        <span className="font-mono text-orange">{p.key}</span>
                        <span className="block text-[10px] text-graphite-900/50">{p.desc}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </aside>
            </div>

            <div className="mt-5 flex justify-end gap-2 border-t border-line pt-4">
              <button onClick={() => setEditing(null)} className="text-sm text-graphite-900/60 hover:text-graphite-900">
                Отмена
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="rounded-full bg-orange px-5 py-2 text-sm font-semibold text-white hover:bg-orange-bright disabled:opacity-50"
              >
                {saving ? "Сохранение…" : "💾 Сохранить"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
