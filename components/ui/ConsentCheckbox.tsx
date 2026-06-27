import Link from "next/link";

/**
 * Чекбокс согласия на обработку персональных данных (152-ФЗ).
 * По умолчанию снят. Форма не отправляется, пока он не отмечен —
 * это фиксирует явное согласие субъекта, а не конклюдентное «нажимая кнопку».
 */
export default function ConsentCheckbox({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="mt-5 flex cursor-pointer items-start gap-3 text-xs leading-relaxed text-graphite-900/55">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-orange"
      />
      <span>
        Я даю согласие на обработку моих персональных данных и подтверждаю, что
        ознакомлен(а) с{" "}
        <Link
          href="/privacy"
          className="text-orange hover:underline"
          target="_blank"
        >
          политикой конфиденциальности
        </Link>
        .
      </span>
    </label>
  );
}
