import { getCertLookupUrl, getPopReportUrl } from "@/lib/gradingLinks";
import { SectionHeading } from "./SectionHeading";

// Shown for a graded real card when we have no population number to display
// (fallbackValuation never has one — that's only ever sample data on the
// mock comps in mockSales.ts). Rather than show nothing or fabricate a
// count, this links straight to the grading company's own real page: the
// exact cert page when we have a cert number (shows this card's real
// population inline), or their general population search otherwise.
export function PopulationLinkOut({ gradingCompany, certNumber }: { gradingCompany: string; certNumber: string | undefined }) {
  const certUrl = getCertLookupUrl(gradingCompany, certNumber);
  const href = certUrl ?? getPopReportUrl(gradingCompany);

  return (
    <div className="rounded-xl border border-border bg-surface p-5 space-y-3">
      <SectionHeading>Population</SectionHeading>
      <p className="text-sm text-muted">
        We don&apos;t have a live {gradingCompany} population feed yet, so there&apos;s no number to show here — but you can
        check the real, current population for this exact card directly on {gradingCompany}&apos;s own site.
      </p>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block px-3 py-2 rounded-md border border-border text-sm hover:bg-surface-2 hover:border-accent-2/50 hover:text-accent-2 transition-colors"
      >
        {certUrl ? "View Population on Cert Page ↗" : `Search ${gradingCompany} Population Report ↗`}
      </a>
    </div>
  );
}
