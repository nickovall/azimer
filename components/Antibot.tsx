"use client";

import { useRef, useState } from "react";

// Антибот для публичных форм: honeypot-поле + отметка времени рендера.
// Боты заполняют скрытое поле и/или сабмитят мгновенно — submitLead это
// ловит и тихо отбрасывает (см. lib/supabase.ts). Реальный фильтр телефона
// (только цифры) тоже в submitLead. Это срезает массовый спам с форм.
//
// Использование в форме:
//   const { honeypot, setHoneypot, guard } = useAntibot();
//   <Honeypot value={honeypot} onChange={setHoneypot} />
//   await submitLead({ source: "...", ..., ...guard() });

export function useAntibot() {
  const startedAt = useRef(Date.now());
  const [honeypot, setHoneypot] = useState("");
  return {
    honeypot,
    setHoneypot,
    // Поля-метаданные для submitLead (в БД НЕ пишутся).
    guard: () => ({ _hp: honeypot, _t: startedAt.current }),
  };
}

// Скрытое поле-ловушка. Невидимо людям (в т.ч. скринридерам и по Tab),
// но присутствует в DOM — автозаполнялки ботов его заполняют.
export function Honeypot({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div
      aria-hidden="true"
      style={{ position: "absolute", left: "-9999px", top: "auto", height: 0, width: 0, overflow: "hidden" }}
    >
      <label>
        Не заполняйте это поле
        <input
          type="text"
          name="company_website"
          tabIndex={-1}
          autoComplete="off"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </label>
    </div>
  );
}
