import { Population } from "@/lib/types";
import { getPopReportUrl } from "@/lib/gradingLinks";

export function PopulationCard({ population }: { population: Population }) {
  const total = population.popAtGrade + population.popHigher;
  const asOfLabel = new Date(population.asOf).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });

  return (
    <div className="rounded-xl border border-border bg-surface p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted mb-1">
            {population.gradingCompany} Population — Grade {population.grade}
          </p>
          <p className="text-3xl font-semibold text-accent-2">{population.popAtGrade.toLocaleString()}</p>
        </div>
        <a
          href={getPopReportUrl(population.gradingCompany)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap bg-surface-2 text-muted hover:text-accent-2 transition-colors"
        >
          Pop Report ↗
        </a>
      </div>

      <div className="text-sm text-muted">
        {population.popHigher > 0 ? (
          <>
            {population.popHigher.toLocaleString()} graded higher · {total.toLocaleString()} total at this grade or above
          </>
        ) : (
          <>None graded higher — this is the top grade</>
        )}
      </div>

      <p className="text-xs text-muted border-t border-border pt-3">
        Population data is illustrative sample data, as of {asOfLabel}, not a live grading-company report.
      </p>
    </div>
  );
}
