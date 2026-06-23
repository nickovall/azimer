"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAdmin } from "@/components/admin/AdminShell";
import { createLead, type NewLeadInput } from "@/lib/admin-api";

const CLIENT_TYPES = ["Частное лицо", "Компания или ИП"];

// Метки совпадают с типами объектов в калькуляторе — но это просто подсказка,
// окончательный тип объекта выбирается в редакторе КП.
const OBJECT_TYPE_HINTS = [
  "Склад / ангар",
  "Производство",
  "Коммерческое здание",
  "Сельхоз / агро",
  "Модульное здание",
  "Холодный навес / тент",
  "Другое",
];

export default function AdminNewLeadPage() {
  const { token } = useAdmin();
  const router = useRouter();

  const [form, setForm] = useState<NewLeadInput>({
    name: "",
    phone: "",
    email: "",
    company: "",
    client_type: "",
    object_type: "",
    message: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof NewLeadInput>(key: K, value: NewLeadInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const canSubmit = form.name.trim().length > 0 && form.phone.trim().length > 0 && !saving;

  // then="card" → в карточку лида; then="kp" → сразу в редактор КП.
  async function submit(then: "card" | "kp") {
    if (!canSubmit) return;
    setSaving(true);
    setError(null);
    try {
      // Пустые строки не шлём — пусть в БД лягут NULL.
      const payload: NewLeadInput = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email?.trim() || undefined,
        company: form.company?.trim() || undefined,
        client_type: form.client_type?.trim() || undefined,
        object_type: form.object_type?.trim() || undefined,
        message: form.message?.trim() || undefined,
      };
      const { id } = await createLead(token, payload);
      const dest =
        then === "kp"
          ? `/console-x9p4m2/leads/kp/?id=${id}`
          : `/console-x9p4m2/leads/view/?id=${id}`;
      router.push(dest);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <Link href="/console-x9p4m2/leads/" className="text-xs text-orange hover:underline">
          ← К списку
        </Link>
        <span className="font-mono text-xs uppercase tracking-wider text-graphite-900/30">Ручной лид</span>
      </div>

      <header className="mt-3 border-b border-line pb-5">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-orange">➕ Новая заявка</p>
        <h1 className="mt-1 text-3xl font-bold text-graphite-900">Добавить вручную</h1>
        <p className="mt-1 text-sm text-graphite-900/60">
          Для лидов со звонка, выставки или оффлайн-контакта. Клиенту НЕ уходит авто-SMS — отправишь сам из карточки.
          Lead ID присвоится автоматически (MAN-…).
        </p>
      </header>

      <div className="mt-6 max-w-2xl space-y-5">
        <FieldGroup title="👤 Контакт">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput label="Имя *" value={form.name} onChange={(v) => set("name", v)} placeholder="Как зовут клиента" required />
            <TextInput label="Телефон *" value={form.phone} onChange={(v) => set("phone", v)} placeholder="+7 …" type="tel" required />
            <TextInput label="Email" value={form.email ?? ""} onChange={(v) => set("email", v)} placeholder="—" type="email" />
            <SelectInput
              label="Тип клиента"
              value={form.client_type ?? ""}
              onChange={(v) => set("client_type", v)}
              options={CLIENT_TYPES}
              placeholder="Не указан"
            />
          </div>
        </FieldGroup>

        <FieldGroup title="🏢 Объект">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput label="Компания" value={form.company ?? ""} onChange={(v) => set("company", v)} placeholder="ООО / ИП (если есть)" />
            <SelectInput
              label="Тип объекта"
              value={form.object_type ?? ""}
              onChange={(v) => set("object_type", v)}
              options={OBJECT_TYPE_HINTS}
              placeholder="Не указан"
            />
          </div>
        </FieldGroup>

        <FieldGroup title="📝 Комментарий">
          <textarea
            value={form.message ?? ""}
            onChange={(e) => set("message", e.target.value)}
            placeholder="Что хочет клиент, габариты, договорённости, откуда пришёл…"
            rows={4}
            className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm focus:border-orange focus:outline-none"
          />
        </FieldGroup>

        {error && (
          <div className="rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-800">
            ❌ {error}
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => submit("card")}
            disabled={!canSubmit}
            className="rounded-full bg-graphite-950 px-6 py-2.5 text-sm font-semibold text-light hover:bg-orange disabled:opacity-50"
          >
            {saving ? "Создаём…" : "Создать заявку"}
          </button>
          <button
            onClick={() => submit("kp")}
            disabled={!canSubmit}
            className="rounded-full bg-orange px-6 py-2.5 text-sm font-semibold text-white hover:bg-orange-bright disabled:opacity-50"
          >
            {saving ? "Создаём…" : "🧮 Создать и собрать КП"}
          </button>
        </div>
        <p className="text-xs text-graphite-900/45">
          «Создать и собрать КП» откроет редактор расчёта сразу после создания заявки.
        </p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════

function FieldGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-white p-5">
      <h2 className="text-sm font-semibold text-graphite-900">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function TextInput({
  label, value, onChange, placeholder, type, required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-wider text-graphite-900/45">{label}</span>
      <input
        type={type ?? "text"}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-xl border border-line bg-white px-3 py-2 text-base focus:border-orange focus:outline-none"
      />
    </label>
  );
}

function SelectInput({
  label, value, onChange, options, placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-wider text-graphite-900/45">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-line bg-white px-3 py-2 text-base focus:border-orange focus:outline-none"
      >
        <option value="">{placeholder ?? "—"}</option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </label>
  );
}
