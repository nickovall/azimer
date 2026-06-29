import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import PageHero from "@/components/PageHero";
import CtaFinal from "@/components/sections/CtaFinal";
import JsonLd from "@/components/seo/JsonLd";
import Button from "@/components/ui/Button";
import Container from "@/components/ui/Container";
import Label from "@/components/ui/Label";
import Reveal from "@/components/ui/Reveal";
import { company } from "@/lib/content";
import {
  getServiceLandingPage,
  serviceLandingPages,
  type ServiceLandingPage,
} from "@/lib/service-landing-pages";

const SITE_URL = "https://azimer.ru";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return serviceLandingPages.map((page) => ({ slug: page.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = getServiceLandingPage(slug);

  if (!page) {
    return {};
  }

  const url = `${SITE_URL}/uslugi/${page.slug}/`;

  return {
    title: page.metaTitle,
    description: page.description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      locale: "ru_RU",
      url,
      siteName: company.name,
      title: page.metaTitle,
      description: page.description,
      images: [
        {
          url: page.heroImage,
          width: 1200,
          height: 630,
          alt: page.heroAlt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: page.metaTitle,
      description: page.description,
      images: [page.heroImage],
    },
  };
}

function breadcrumbJsonLd(page: ServiceLandingPage): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Главная", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Услуги", item: `${SITE_URL}/services` },
      {
        "@type": "ListItem",
        position: 3,
        name: page.navLabel,
        item: `${SITE_URL}/uslugi/${page.slug}/`,
      },
    ],
  };
}

function serviceJsonLd(page: ServiceLandingPage): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: page.title,
    serviceType: page.serviceType,
    provider: { "@id": `${SITE_URL}/#organization` },
    areaServed: { "@type": "AdministrativeArea", name: "Красноярский край" },
    url: `${SITE_URL}/uslugi/${page.slug}/`,
    image: `${SITE_URL}${page.heroImage}`,
    description: page.description,
    offers: {
      "@type": "Offer",
      priceCurrency: "RUB",
      availability: "https://schema.org/InStock",
      priceSpecification: {
        "@type": "PriceSpecification",
        description: "Стоимость рассчитывается по параметрам объекта и составу работ.",
      },
    },
  };
}

function faqJsonLd(page: ServiceLandingPage): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: page.faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

export default async function ServiceLanding({ params }: PageProps) {
  const { slug } = await params;
  const page = getServiceLandingPage(slug);

  if (!page) {
    notFound();
  }

  const relatedPages = page.related
    .map((relatedSlug) => getServiceLandingPage(relatedSlug))
    .filter((item): item is ServiceLandingPage => Boolean(item));

  return (
    <>
      <JsonLd data={serviceJsonLd(page)} />
      <JsonLd data={faqJsonLd(page)} />
      <JsonLd data={breadcrumbJsonLd(page)} />

      <PageHero
        crumb={page.navLabel}
        title={page.title}
        subtitle={page.lead}
        image={page.heroImage}
      >
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Button href={`/estimate?service=${page.slug}`} variant="primary" arrow>
            Получить расчет
          </Button>
          <Button href={company.phoneHref} variant="outline">
            {company.phoneLabel}
          </Button>
        </div>
        <div className="mt-7 flex flex-wrap gap-2.5">
          {page.badges.map((badge) => (
            <span
              key={badge}
              className="rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-xs font-medium text-light/75"
            >
              {badge}
            </span>
          ))}
        </div>
      </PageHero>

      <section className="bg-light py-20 md:py-28">
        <Container>
          <div className="grid gap-12 md:grid-cols-12 md:gap-10">
            <Reveal className="md:col-span-5">
              <Label>Задачи</Label>
              <h2 className="mt-6 text-3xl font-extrabold leading-tight text-graphite-900 md:text-[2.5rem]">
                Под какие объекты считаем
              </h2>
              <p className="mt-5 text-base leading-relaxed text-graphite-900/65">
                Каждую заявку считаем по назначению, размерам, региону и составу
                работ. Так КП получается прикладным, а не усредненным.
              </p>
            </Reveal>

            <div className="md:col-span-7">
              <div className="grid gap-4 sm:grid-cols-2">
                {page.useCases.map((item, index) => (
                  <Reveal
                    key={item}
                    delay={(index % 2) * 0.06}
                    className="rounded-2xl border border-line bg-white p-6"
                  >
                    <span className="font-mono text-xs uppercase tracking-[0.14em] text-orange">
                      0{index + 1}
                    </span>
                    <p className="mt-4 text-lg font-bold leading-snug text-graphite-900">
                      {item}
                    </p>
                  </Reveal>
                ))}
              </div>
            </div>
          </div>
        </Container>
      </section>

      <section className="bg-graphite-950 py-20 text-light md:py-28">
        <Container>
          <Reveal>
            <Label>Состав работ</Label>
            <h2 className="mt-6 max-w-[16ch] text-3xl font-extrabold leading-tight md:text-[2.5rem]">
              Что входит в работу
            </h2>
          </Reveal>

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {page.deliverables.map((item, index) => (
              <Reveal
                key={item.title}
                delay={(index % 3) * 0.06}
                className="rounded-2xl border border-white/10 bg-graphite-900 p-7"
              >
                <span className="block h-px w-10 bg-orange" />
                <h3 className="mt-5 text-xl font-bold">{item.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-light/58">
                  {item.text}
                </p>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      <section className="blueprint-paper py-20 md:py-28">
        <Container>
          <div className="grid gap-12 md:grid-cols-12 md:gap-10">
            <Reveal className="md:col-span-5">
              <Label>Этапы</Label>
              <h2 className="mt-6 text-3xl font-extrabold leading-tight text-graphite-900 md:text-[2.5rem]">
                Как доводим до КП и монтажа
              </h2>
            </Reveal>

            <div className="md:col-span-7">
              {page.process.map((step, index) => (
                <Reveal
                  key={step}
                  delay={(index % 2) * 0.05}
                  className="grid gap-5 border-t border-line py-6 first:border-t-0 first:pt-0 sm:grid-cols-[80px_1fr]"
                >
                  <span className="font-mono text-sm text-orange">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <p className="text-lg font-semibold leading-relaxed text-graphite-900">
                    {step}
                  </p>
                </Reveal>
              ))}
            </div>
          </div>
        </Container>
      </section>

      <section className="bg-light py-20 md:py-28">
        <Container>
          <Reveal>
            <Label>Фото</Label>
            <h2 className="mt-6 max-w-[18ch] text-3xl font-extrabold leading-tight text-graphite-900 md:text-[2.5rem]">
              Реальные объекты и монтаж
            </h2>
          </Reveal>

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {page.gallery.map((image, index) => (
              <Reveal
                key={image.src}
                delay={(index % 3) * 0.06}
                className="group overflow-hidden rounded-2xl border border-line bg-white"
              >
                <div className="relative aspect-[4/3] overflow-hidden">
                  <Image
                    src={image.src}
                    alt={image.alt}
                    fill
                    loading="eager"
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover object-center transition-transform duration-700 group-hover:scale-[1.04]"
                  />
                </div>
                <p className="p-5 text-sm font-semibold text-graphite-900">
                  {image.caption}
                </p>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      <section className="bg-graphite-950 py-20 text-light md:py-28">
        <Container>
          <div className="grid gap-12 md:grid-cols-12 md:gap-10">
            <div className="md:col-span-5">
              <Label>Вопросы</Label>
              <h2 className="mt-6 text-3xl font-extrabold leading-tight md:text-[2.5rem]">
                Что обычно уточняют перед расчетом
              </h2>
            </div>

            <div className="md:col-span-7">
              {page.faq.map((item, index) => (
                <div
                  key={item.question}
                  className="border-t border-white/10 py-6 first:border-t-0 first:pt-0"
                >
                  <h3 className="text-lg font-bold">{item.question}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-light/58">
                    {item.answer}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </Container>
      </section>

      <section className="bg-light py-16">
        <Container>
          <div className="flex flex-col gap-5 border-t border-line pt-10 md:flex-row md:items-center md:justify-between">
            <div>
              <Label>Еще направления</Label>
              <h2 className="mt-4 text-2xl font-extrabold text-graphite-900">
                Связанные услуги
              </h2>
            </div>
            <div className="flex flex-wrap gap-3">
              {relatedPages.map((item) => (
                <Link
                  key={item.slug}
                  href={`/uslugi/${item.slug}`}
                  className="rounded-full border border-line bg-white px-5 py-3 text-sm font-semibold text-graphite-900 transition-colors hover:border-orange hover:text-orange"
                >
                  {item.navLabel}
                </Link>
              ))}
            </div>
          </div>
        </Container>
      </section>

      <CtaFinal />
    </>
  );
}
