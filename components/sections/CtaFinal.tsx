import Container from "../ui/Container";
import Button from "../ui/Button";

export default function CtaFinal() {
  return (
    <section id="cta" className="blueprint-paper py-24 md:py-32">
      <Container>
        <div className="relative overflow-hidden rounded-3xl bg-graphite-950 px-7 py-16 text-light md:px-16 md:py-24">
          <div className="absolute inset-0 blueprint-grid" />
          <div className="absolute -right-32 -top-32 h-[440px] w-[440px] rounded-full bg-orange/20 blur-[150px]" />

          <div className="relative max-w-2xl">
            <span className="inline-flex items-center gap-3 font-mono text-xs uppercase tracking-[0.22em] text-orange">
              <span className="h-px w-7 bg-orange" />
              Заявка
            </span>
            <h2 className="mt-6 text-3xl font-extrabold leading-[1.06] tracking-[-0.02em] md:text-5xl">
              Получить предварительный расчёт
            </h2>
            <p className="mt-6 text-base leading-relaxed text-light/65 md:text-lg">
              Опишите объект — назначение, размеры, регион и сроки. Подготовим
              предварительную оценку и коммерческое предложение под вашу задачу.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-4">
              <Button href="/estimate" variant="primary" arrow>
                Оставить заявку
              </Button>
              <span className="font-mono text-xs uppercase tracking-[0.14em] text-light/45">
                Заявка ни к чему не обязывает
              </span>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
