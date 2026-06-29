"use client";

import { useCallback, useEffect, useState } from "react";
import { useAdmin } from "@/components/admin/AdminShell";
import {
  createAdminUser,
  fmtDateTime,
  listAdminUsers,
  updateAdminUser,
  type AdminRole,
  type AdminUser,
} from "@/lib/admin-api";

const EMPTY_CREATE = {
  login: "",
  display_name: "",
  phone: "",
  email: "",
  role: "manager" as AdminRole,
  password: "",
  notes: "",
};

export default function AdminTeamPage() {
  const { token, actor } = useAdmin();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [draft, setDraft] = useState(EMPTY_CREATE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setUsers(await listAdminUsers(token));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  async function createUser() {
    setError(null);
    setOk(null);
    if (!draft.login.trim() || !draft.display_name.trim() || draft.password.length < 8) {
      setError("Нужны логин, имя и пароль минимум 8 символов");
      return;
    }
    setSaving(true);
    try {
      await createAdminUser(token, {
        login: draft.login,
        display_name: draft.display_name,
        phone: draft.phone,
        email: draft.email,
        role: draft.role,
        password: draft.password,
        notes: draft.notes,
      });
      setDraft(EMPTY_CREATE);
      setOk("Профиль создан");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  if (actor.role !== "owner") {
    return (
      <div className="rounded-2xl border border-line bg-white p-6 text-sm text-graphite-900/70">
        Недостаточно прав для управления командой.
      </div>
    );
  }

  return (
    <div>
      <header className="border-b border-line pb-5">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-orange">Команда</p>
        <h1 className="mt-1 text-3xl font-bold text-graphite-900">Профили менеджеров</h1>
        <p className="mt-1 text-sm text-graphite-900/60">
          Вход по логину и паролю, роль и имя сохраняются в истории действий.
        </p>
      </header>

      {(error || ok) && (
        <div className={`mt-5 rounded-2xl border p-4 text-sm ${error ? "border-red-300 bg-red-50 text-red-800" : "border-green-200 bg-green-50 text-green-800"}`}>
          {error || ok}
        </div>
      )}

      <section className="mt-6 rounded-2xl border border-line bg-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-graphite-900/60">
          Новый профиль
        </h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <TextInput label="Логин" value={draft.login} onChange={(v) => setDraft((d) => ({ ...d, login: v }))} placeholder="romar" />
          <TextInput label="Имя" value={draft.display_name} onChange={(v) => setDraft((d) => ({ ...d, display_name: v }))} placeholder="Ромар" />
          <TextInput label="Пароль" type="password" value={draft.password} onChange={(v) => setDraft((d) => ({ ...d, password: v }))} />
          <TextInput label="Телефон" value={draft.phone} onChange={(v) => setDraft((d) => ({ ...d, phone: v }))} placeholder="+7..." />
          <TextInput label="Email" type="email" value={draft.email} onChange={(v) => setDraft((d) => ({ ...d, email: v }))} placeholder="name@example.ru" />
          <label className="grid gap-1 text-xs uppercase tracking-wider text-graphite-900/40">
            Роль
            <select
              value={draft.role}
              onChange={(e) => setDraft((d) => ({ ...d, role: e.target.value as AdminRole }))}
              className="rounded-xl border border-line bg-light/30 px-3 py-2 text-sm normal-case tracking-normal text-graphite-900 focus:border-orange focus:bg-white focus:outline-none"
            >
              <option value="manager">Менеджер</option>
              <option value="owner">Владелец</option>
            </select>
          </label>
          <label className="grid gap-1 text-xs uppercase tracking-wider text-graphite-900/40 md:col-span-3">
            Заметка
            <textarea
              value={draft.notes}
              onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
              rows={2}
              className="rounded-xl border border-line bg-light/30 px-3 py-2 text-sm normal-case tracking-normal text-graphite-900 focus:border-orange focus:bg-white focus:outline-none"
            />
          </label>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            onClick={createUser}
            disabled={saving}
            className="rounded-full bg-orange px-5 py-2 text-sm font-semibold text-white hover:bg-orange-bright disabled:opacity-50"
          >
            {saving ? "..." : "Создать профиль"}
          </button>
        </div>
      </section>

      <section className="mt-6 grid gap-3">
        {loading ? (
          <p className="rounded-2xl border border-line bg-white p-8 text-center text-sm text-graphite-900/40">
            Загружаем...
          </p>
        ) : users.map((user) => (
          <UserCard
            key={user.id}
            user={user}
            currentUserId={actor.user_id}
            token={token}
            onSaved={load}
          />
        ))}
      </section>
    </div>
  );
}

function UserCard({
  user,
  currentUserId,
  token,
  onSaved,
}: {
  user: AdminUser;
  currentUserId: string | null;
  token: string;
  onSaved: () => void | Promise<void>;
}) {
  const isCurrent = currentUserId === user.id;
  const [draft, setDraft] = useState({
    display_name: user.display_name,
    phone: user.phone ?? "",
    email: user.email ?? "",
    role: user.role,
    is_active: user.is_active,
    notes: user.notes ?? "",
    password: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await updateAdminUser(token, {
        id: user.id,
        display_name: draft.display_name,
        phone: draft.phone,
        email: draft.email,
        role: draft.role,
        is_active: isCurrent ? true : draft.is_active,
        notes: draft.notes,
        password: draft.password || undefined,
      });
      setDraft((d) => ({ ...d, password: "" }));
      await onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className={`rounded-2xl border bg-white p-5 ${user.is_active ? "border-line" : "border-line/40 opacity-65"}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-bold text-graphite-900">{user.display_name}</h3>
            <span className="rounded bg-light px-2 py-0.5 text-[10px] uppercase tracking-wider text-graphite-900/60">
              {user.role === "owner" ? "owner" : "manager"}
            </span>
            {!user.is_active && <span className="text-xs text-red-600">выключен</span>}
            {isCurrent && <span className="text-xs text-orange">это вы</span>}
          </div>
          <p className="mt-1 font-mono text-xs text-graphite-900/45">{user.login}</p>
          <p className="mt-1 text-xs text-graphite-900/45">
            Последний вход: {fmtDateTime(user.last_login_at)}
          </p>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="rounded-full bg-graphite-950 px-4 py-2 text-xs font-semibold text-light hover:bg-orange disabled:opacity-50"
        >
          {saving ? "..." : "Сохранить"}
        </button>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <TextInput label="Имя" value={draft.display_name} onChange={(v) => setDraft((d) => ({ ...d, display_name: v }))} />
        <TextInput label="Телефон" value={draft.phone} onChange={(v) => setDraft((d) => ({ ...d, phone: v }))} />
        <TextInput label="Email" type="email" value={draft.email} onChange={(v) => setDraft((d) => ({ ...d, email: v }))} />
        <label className="grid gap-1 text-xs uppercase tracking-wider text-graphite-900/40">
          Роль
          <select
            value={draft.role}
            onChange={(e) => setDraft((d) => ({ ...d, role: e.target.value as AdminRole }))}
            className="rounded-xl border border-line bg-light/30 px-3 py-2 text-sm normal-case tracking-normal text-graphite-900 focus:border-orange focus:bg-white focus:outline-none"
          >
            <option value="manager">Менеджер</option>
            <option value="owner">Владелец</option>
          </select>
        </label>
        <TextInput label="Новый пароль" type="password" value={draft.password} onChange={(v) => setDraft((d) => ({ ...d, password: v }))} placeholder="не менять" />
        <label className="flex items-center gap-2 pt-6 text-sm text-graphite-900">
          <input
            type="checkbox"
            checked={isCurrent || draft.is_active}
            disabled={isCurrent}
            onChange={(e) => setDraft((d) => ({ ...d, is_active: e.target.checked }))}
          />
          Активен
        </label>
        <label className="grid gap-1 text-xs uppercase tracking-wider text-graphite-900/40 md:col-span-3">
          Заметка
          <textarea
            value={draft.notes}
            onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
            rows={2}
            className="rounded-xl border border-line bg-light/30 px-3 py-2 text-sm normal-case tracking-normal text-graphite-900 focus:border-orange focus:bg-white focus:outline-none"
          />
        </label>
      </div>
      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
    </article>
  );
}

function TextInput({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="grid gap-1 text-xs uppercase tracking-wider text-graphite-900/40">
      {label}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="rounded-xl border border-line bg-light/30 px-3 py-2 text-sm normal-case tracking-normal text-graphite-900 focus:border-orange focus:bg-white focus:outline-none"
      />
    </label>
  );
}
