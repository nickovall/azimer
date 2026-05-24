import type { ReactNode } from "react";

const inputClass =
  "w-full rounded-xl border border-line bg-white px-4 py-3.5 text-[15px] text-graphite-900 outline-none transition-colors duration-200 placeholder:text-graphite-900/35 focus:border-orange";

export function FieldLabel({
  children,
  required = false,
}: {
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <span className="mb-2 block font-mono text-xs uppercase tracking-[0.14em] text-graphite-900/55">
      {children}
      {required && <span className="text-orange"> *</span>}
    </span>
  );
}

export function TextField({
  label,
  required,
  ...props
}: {
  label: string;
  required?: boolean;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <FieldLabel required={required}>{label}</FieldLabel>
      <input className={inputClass} required={required} {...props} />
    </label>
  );
}

export function TextArea({
  label,
  required,
  ...props
}: {
  label: string;
  required?: boolean;
} & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className="block">
      <FieldLabel required={required}>{label}</FieldLabel>
      <textarea className={`${inputClass} min-h-[130px] resize-y`} required={required} {...props} />
    </label>
  );
}

export function ChoiceField({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div className="flex gap-2.5">
        {options.map((o) => {
          const active = value === o;
          return (
            <button
              type="button"
              key={o}
              onClick={() => onChange(o)}
              className={`flex-1 rounded-xl border px-4 py-3 text-sm font-medium transition-colors duration-200 ${
                active
                  ? "border-orange bg-orange/[0.06] text-graphite-900"
                  : "border-line bg-white text-graphite-900/55 hover:border-graphite-900/25"
              }`}
            >
              {o}
            </button>
          );
        })}
      </div>
    </div>
  );
}
