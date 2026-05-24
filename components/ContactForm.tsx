"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { TextField, TextArea, ChoiceField } from "./ui/Field";
import { clientTypes } from "@/lib/content";
import { submitLead } from "@/lib/supabase";

export default function ContactForm() {
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    clientType: "",
    name: "",
    phone: "",
    email: "",
    message: "",
  });

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
        className="flex h-full flex-col items-start justify-center rounded-2xl border border-line bg-white p-8 md:p-10"
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
          Мы свяжемся с вами в течение рабочего дня, уточним детали по объекту и
          подготовим предварительный расчёт.
        </p>
      </motion.div>
    );
  }

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (submitting) return;
        setSubmitting(true);
        try {
          await submitLead({
            source: "contact",
            client_type: form.clientType || undefined,
            name: form.name,
            phone: form.phone,
            email: form.email || undefined,
            message: form.message || undefined,
          });
        } catch (err) {
          console.error(err);
        }
        setSent(true);
      }}
      className="rounded-2xl border border-line bg-white p-7 md:p-9"
    >
      <div className="grid gap-5">
        <ChoiceField
          label="Вы обращаетесь как"
          options={clientTypes}
          value={form.clientType}
          onChange={(v) => setForm((f) => ({ ...f, clientType: v }))}
        />
        <TextField
          label="Имя"
          required
          placeholder="Как к вам обращаться"
          value={form.name}
          onChange={update("name")}
        />
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
        <TextArea
          label="Объект и задача"
          placeholder="Тип объекта, размеры, регион, сроки — что знаете"
          value={form.message}
          onChange={update("message")}
        />
      </div>

      <button
        type="submit"
        className="mt-6 inline-flex w-full items-center justify-center gap-2.5 rounded-full bg-orange px-7 py-4 text-sm font-semibold text-white transition-all duration-300 hover:bg-orange-bright hover:-translate-y-0.5 sm:w-auto"
      >
        Отправить заявку
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

      <p className="mt-4 text-xs leading-relaxed text-graphite-900/45">
        Нажимая кнопку, вы соглашаетесь с{" "}
        <Link href="/privacy" className="text-orange hover:underline">
          политикой конфиденциальности
        </Link>
        .
      </p>
    </form>
  );
}
