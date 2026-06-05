import Link from "next/link";
import Container from "./ui/Container";
import Logo from "./ui/Logo";
import { company, nav } from "@/lib/content";

export default function Footer() {
  return (
    <footer className="bg-graphite-950 text-light">
      <Container>
        <div className="grid gap-12 border-t border-white/10 py-16 md:grid-cols-[1.4fr_1fr_1fr] md:py-20">
          {/* Brand */}
          <div>
            <Logo tone="light" className="h-12 w-auto" />
            <p className="mt-6 max-w-xs text-sm leading-relaxed text-light/55">
              {company.legalName} — каркасные здания под ключ: жильё, склады,
              ангары, производство и коммерческие объекты. Проектирование,
              изготовление и монтаж.
            </p>
          </div>

          {/* Nav */}
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-light/40">
              Навигация
            </p>
            <ul className="mt-5 space-y-3">
              {nav.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-light/70 transition-colors hover:text-orange"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contacts */}
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-light/40">
              Контакты
            </p>
            <ul className="mt-5 space-y-3 text-sm text-light/70">
              {company.phoneHref && company.phoneLabel ? (
                <li>
                  <a
                    href={company.phoneHref}
                    className="font-semibold text-light transition-colors hover:text-orange"
                  >
                    {company.phoneLabel}
                  </a>
                </li>
              ) : null}
              {company.vkChatHref ? (
                <li>
                  <a
                    href={company.vkChatHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="transition-colors hover:text-orange"
                  >
                    Написать в VK{company.vkHandle ? ` (${company.vkHandle})` : ""}
                  </a>
                </li>
              ) : null}
              {company.emailHref && company.email ? (
                <li>
                  <a
                    href={company.emailHref}
                    className="break-all transition-colors hover:text-orange"
                  >
                    {company.email}
                  </a>
                </li>
              ) : null}
              <li>{company.city}</li>
              <li>
                <Link
                  href="/estimate"
                  className="text-orange transition-colors hover:text-orange-bright"
                >
                  Оставить заявку →
                </Link>
              </li>
            </ul>

            <p className="mt-6 font-mono text-[11px] uppercase leading-relaxed tracking-[0.14em] text-light/35">
              ИНН {company.inn} · ОГРН {company.ogrn}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-white/10 py-7 text-xs text-light/40 sm:flex-row sm:items-center sm:justify-between">
          <span>
            © {new Date().getFullYear()} {company.legalName}
          </span>
          <span className="font-mono uppercase tracking-[0.15em]">
            Каркасные конструкции · ЛСТК · Модульные здания
          </span>
        </div>
      </Container>

      {/* Спейсер под mobile sticky CTA, чтобы не перекрывался последний ряд. */}
      <div className="h-[72px] lg:hidden" aria-hidden />
    </footer>
  );
}
