"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { TextField, TextArea, FieldLabel, ChoiceField } from "./ui/Field";
import { clientTypes } from "@/lib/content";
import { submitLead, uploadLeadFile, LeadValidationError } from "@/lib/supabase";
import { useAntibot, Honeypot } from "./Antibot";

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + " КБ";
  return (bytes / (1024 * 1024)).toFixed(1) + " МБ";
}

export default function ProjectForm() {
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    clientType: "",
    name: "",
    phone: "",
    email: "",
    objectType: "",
    description: "",
  });
  const [files, setFiles] = useState<File[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const { honeypot, setHoneypot, guard } = useAntibot();

  const update =
    (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    setFiles((prev) => [...prev, ...Array.from(list)].slice(0, 10));
  };

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
          Проект отправлен
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-graphite-900/65">
          Мы изучим документацию, уточним детали и подготовим коммерческое
          предложение по вашему проекту.
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
        setError(null);
        try {
          // Сначала загружаем файлы и собираем signed URLs
          const fileUrls: string[] = [];
          for (const f of files) {
            const url = await uploadLeadFile(f);
            if (url) fileUrls.push(url);
          }
          await submitLead({
            source: "project",
            client_type: form.clientType || undefined,
            name: form.name,
            phone: form.phone,
            email: form.email || undefined,
            object_type: form.objectType || undefined,
            message: form.description || undefined,
            files: fileUrls.length ? fileUrls : undefined,
            ...guard(),
          });
          setSent(true);
        } catch (err) {
          console.error(err);
          setError(err instanceof LeadValidationError
            ? err.message
            : "Не удалось отправить проект. Проверьте файлы и попробуйте ещё раз.");
        } finally {
          setSubmitting(false);
        }
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
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            label="Имя"
            required
            placeholder="Как к вам обращаться"
            value={form.name}
            onChange={update("name")}
          />
          <TextField
            label="Телефон"
            required
            type="tel"
            placeholder="+7"
            value={form.phone}
            onChange={update("phone")}
          />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            label="Email"
            type="email"
            placeholder="необязательно"
            value={form.email}
            onChange={update("email")}
          />
          <TextField
            label="Тип объекта"
            placeholder="Склад, ангар, цех…"
            value={form.objectType}
            onChange={update("objectType")}
          />
        </div>
        <TextArea
          label="Описание проекта"
          required
          placeholder="Что нужно сделать, сроки, особенности объекта"
          value={form.description}
          onChange={update("description")}
        />

        {/* File upload */}
        <div>
          <FieldLabel>Чертежи, проект, ТЗ</FieldLabel>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line bg-light px-4 py-8 text-center transition-colors hover:border-orange"
          >
            <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
              <path
                d="M13 17V5M8 10l5-5 5 5M5 19v2h16v-2"
                stroke="#ED6629"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="text-sm font-medium text-graphite-900">
              Выберите файлы
            </span>
            <span className="text-xs text-graphite-900/45">
              PDF, DWG, изображения · до 10 файлов
            </span>
          </button>
          <input
            ref={fileRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => addFiles(e.target.files)}
          />

          {files.length > 0 && (
            <ul className="mt-3 space-y-2">
              {files.map((f, i) => (
                <li
                  key={`${f.name}-${i}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-line bg-light px-3.5 py-2.5"
                >
                  <span className="truncate text-sm text-graphite-900">
                    {f.name}
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="shrink-0 font-mono text-xs text-graphite-900/45">
                      {formatSize(f.size)}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setFiles((prev) => prev.filter((_, j) => j !== i))
                      }
                      className="text-graphite-900/40 transition-colors hover:text-orange"
                      aria-label="Удалить"
                    >
                      ✕
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <Honeypot value={honeypot} onChange={setHoneypot} />

      <button
        type="submit"
        disabled={submitting}
        className="mt-6 inline-flex w-full items-center justify-center gap-2.5 rounded-full bg-orange px-7 py-4 text-sm font-semibold text-white transition-all duration-300 hover:bg-orange-bright hover:-translate-y-0.5 sm:w-auto"
      >
        {submitting ? "Отправляем…" : "Отправить проект"}
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
