import Link from "next/link";
import Container from "@/components/ui/Container";

export default function NotFound() {
  return (
    <section className="relative flex min-h-screen items-center overflow-hidden bg-graphite-950 text-light">
      <div className="absolute inset-0 blueprint-grid opacity-50" />
      <div className="absolute -bottom-40 -left-40 h-[480px] w-[480px] rounded-full bg-orange/15 blur-[160px]" />

      <Container className="relative">
        <div className="mx-auto max-w-xl py-32 text-center">
          <span className="font-mono text-sm uppercase tracking-[0.22em] text-orange">
            Ошибка 404
          </span>
          <h1 className="mt-6 text-5xl font-extrabold tracking-[-0.02em] md:text-7xl">
            Страница не найдена
          </h1>
          <p className="mt-5 text-base leading-relaxed text-light/65 md:text-lg">
            Возможно, страница была перемещена или больше не существует.
            Вернитесь на главную или оставьте заявку на расчёт.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2.5 rounded-full bg-orange px-7 py-3.5 text-sm font-semibold text-white transition-all duration-300 hover:bg-orange-bright hover:-translate-y-0.5"
            >
              На главную
            </Link>
            <Link
              href="/estimate"
              className="inline-flex items-center gap-2.5 rounded-full border border-white/20 px-7 py-3.5 text-sm font-semibold text-light transition-colors hover:border-orange"
            >
              Мастер расчёта
            </Link>
          </div>
        </div>
      </Container>
    </section>
  );
}
