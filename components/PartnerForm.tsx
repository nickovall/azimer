"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { TextField, TextArea } from "./ui/Field";
import ConsentCheckbox from "./ui/ConsentCheckbox";
import { submitLead, LeadValidationError } from "@/lib/supabase";
import { useAntibot, Honeypot } from "./Antibot";

export default function PartnerForm() {
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [form, setForm] = useState({
    name: "",
    company: "",
    phone: "",
    email: "",
    direction: "",
    message: "",
  });
  const { honeypot, setHoneypot, guard } = useAntibot();

  const update =
    (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  if (sent) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col items-start rounded-2xl border border-line bg-white p-8 md:p-10"
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-orange/10">
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <path
              d="M4 11.5l4.5 4.5L18 6"
              stroke="#ED6629"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <h3 className="mt-5 text-xl font-bold text-graphite-900">
          Заявка отправлена
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-graphite-900/65">
          Мы рассмотрим предложение о сотрудничестве и свяжемся с вами для
          обсуждения деталей.
        </p>
      </motion.div>
    );
  }

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (submitting || !consent) return;
        setSubmitting(true);
        setError(null);
        try {
          await submitLead({
            source: "partner",
            name: form.name,
            phone: form.phone,
            email: form.email || undefined,
            company: form.company || undefined,
            direction: form.direction || undefined,
            message: form.message || undefined,
            ...guard(),
          });
          setSent(true);
        } catch (err) {
          console.error(err);
          setError(err instanceof LeadValidationError
            ? err.message
            : "Не удалось отправить заявку. Проверьте связь и попробуйте ещё раз.");
        } finally {
          setSubmitting(false);
        }
      }}
      className="rounded-2xl border border-line bg-white p-7 md:p-9"
    >
      <div className="grid gap-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            label="Имя"
            required
            placeholder="Контактное лицо"
            value={form.name}
            onChange={update("name")}
          />
          <TextField
            label="Компания"
            placeholder="Название организации"
            value={form.company}
            onChange={update("company")}
          />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            label="Телефон"
            required
            type="tel"
            placeholder="+7"
            value={form.phone}
            onChange={update("phone")}
          />
          <TextField
            label="Email"
            type="email"
            placeholder="необязательно"
            value={form.email}
            onChange={update("email")}
          />
        </div>
        <TextField
          label="Направление сотрудничества"
          placeholder="Монтаж, поставка материалов, спецтехника…"
          value={form.direction}
          onChange={update("direction")}
        />
        <TextArea
          label="О сотрудничестве"
          required
          placeholder="Расскажите, что вы предлагаете и чем можете быть полезны"
          value={form.message}
          onChange={update("message")}
        />
      </div>

      <Honeypot value={honeypot} onChange={setHoneypot} />

      <ConsentCheckbox checked={consent} onChange={setConsent} />

      <button
        type="submit"
        disabled={submitting || !consent}
        className="mt-6 inline-flex w-full items-center justify-center gap-2.5 rounded-full bg-orange px-7 py-4 text-sm font-semibold text-white transition-all duration-300 hover:bg-orange-bright hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 sm:w-auto"
      >
        {submitting ? "Отправляем…" : "Отправить заявку"}
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path
            d="M2 8h11M9 4l4 4-4 4"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
    </form>
  );
}
