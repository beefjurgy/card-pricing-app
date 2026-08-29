import { TrendingLabel, TrendingSignal } from "@/lib/types";
import { SectionHeading } from "./SectionHeading";

const LABEL_STYLE: Record<TrendingLabel, { emoji: string; className: string }> = {
  Hot: { emoji: "🔥", className: "bg-down/10 text-down" },
  Rising: { emoji: "📈", className: "bg-up/10 text-up" },
  Steady: { emoji: "➖", className: "bg-surface-2 text-muted" },
  Cooling: { emoji: "📉", className: "bg-accent-2/10 text-accent-2" },
};

export function TrendingCard({ trending }: { trending: TrendingSignal }) {
  const style = trending.label ? LABEL_STYLE[trending.label] : null;
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between mb-3">
        <SectionHeading>Stats</SectionHeading>
        {style && trending.label && (
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap ${style.className}`}>
            {style.emoji} {trending.label}
          </span>
        )}
      </div>
      <ul className="space-y-1.5">
        {trending.factors.map((factor, i) => (
          <li key={i} className="text-sm text-muted flex gap-2">
            <span>·</span>
            <span>{factor}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
