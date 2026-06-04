import Hero from "@/components/sections/Hero";
import Stats from "@/components/sections/Stats";
import About from "@/components/sections/About";
import Services from "@/components/sections/Services";
import Audiences from "@/components/sections/Audiences";
import Advantages from "@/components/sections/Advantages";
import Process from "@/components/sections/Process";
import Gallery from "@/components/sections/Gallery";
import Objects from "@/components/sections/Objects";
// Секция «Благодарственные письма» (Testimonials) убрана по запросу Азамата (2026-06-04).
// Компонент и data сохранены в репо на случай возврата — см. components/sections/Testimonials.tsx.
import Trust from "@/components/sections/Trust";
import CtaFinal from "@/components/sections/CtaFinal";

export default function Home() {
  return (
    <>
      <Hero />
      <Stats />
      <About />
      <Services />
      <Audiences />
      <Advantages />
      <Process />
      <Gallery />
      <Objects />
      <Trust />
      <CtaFinal />
    </>
  );
}
