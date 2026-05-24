"use client";

import { PDFDownloadLink } from "@react-pdf/renderer";
import KpDocument from "./KpDocument";
import type { WizardState, Estimate } from "@/lib/pricing";

export default function KpDownloadButton({
  state,
  estimate,
  contact,
}: {
  state: WizardState;
  estimate: Estimate;
  contact: { name: string; phone: string };
}) {
  return (
    <PDFDownloadLink
      document={
        <KpDocument state={state} estimate={estimate} contact={contact} />
      }
      fileName="AZIMER-KP-predvaritelnaya-ocenka.pdf"
      className="inline-flex items-center justify-center gap-2.5 rounded-full border border-graphite-900/20 px-6 py-3.5 text-sm font-semibold text-graphite-900 transition-all duration-300 hover:border-orange hover:text-orange"
    >
      {({ loading }) => (
        <>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M8 2v8m0 0L4.5 6.5M8 10l3.5-3.5M2.5 12.5h11"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {loading ? "Готовим PDF…" : "Скачать КП в PDF"}
        </>
      )}
    </PDFDownloadLink>
  );
}
