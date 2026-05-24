import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import Container from "@/components/ui/Container";
import RaschetWizard from "@/components/estimate/RaschetWizard";

export const metadata: Metadata = {
  title: "Мастер расчёта — АЗИМЕР",
  description:
    "Рассчитайте предварительную стоимость каркасного здания онлайн. Укажите параметры объекта по шагам и получите оценку.",
};

export default function RaschetPage() {
  return (
    <>
      <PageHero
        crumb="Мастер расчёта"
        title="Предварительный расчёт объекта"
        subtitle="Укажите параметры здания по шагам — получите предварительную оценку стоимости и заявку на детальное коммерческое предложение."
        image="/photos/proc-frame.jpg"
      />
      <section className="bg-light py-20 md:py-28">
        <Container>
          <div className="mx-auto max-w-3xl">
            <RaschetWizard />
          </div>
        </Container>
      </section>
    </>
  );
}
