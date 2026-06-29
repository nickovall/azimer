import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import Container from "./ui/Container";

export default function PageHero({
  title,
  subtitle,
  crumb,
  image,
  children,
}: {
  title: string;
  subtitle?: string;
  crumb: string;
  image?: string;
  children?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden bg-graphite-950 text-light">
      {image && (
        <>
          <Image
            src={image}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-graphite-950/82" />
          <div className="absolute inset-0 bg-gradient-to-r from-graphite-950 via-graphite-950/85 to-graphite-950/45" />
        </>
      )}
      <div className="absolute inset-0 blueprint-grid opacity-50" />
      <div className="absolute -bottom-32 -left-32 h-[420px] w-[420px] rounded-full bg-orange/15 blur-[150px]" />

      <Container className="relative">
        <div className="pt-36 pb-16 md:pt-44 md:pb-24">
          <nav className="flex items-center gap-2.5 font-mono text-xs uppercase tracking-[0.16em] text-light/45">
            <Link href="/" className="transition-colors hover:text-orange">
              Главная
            </Link>
            <span className="text-orange">/</span>
            <span className="text-light/75">{crumb}</span>
          </nav>
          <h1 className="mt-7 max-w-[20ch] text-4xl font-extrabold leading-[1.05] tracking-[-0.02em] sm:text-5xl md:text-6xl">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-light/65 md:text-lg">
              {subtitle}
            </p>
          )}
          {children}
        </div>
      </Container>
    </section>
  );
}
