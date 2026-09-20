import { CountUp } from "./count-up";
import { Sparkline } from "./sparkline";

export function StatCard({
  label,
  value,
  format,
  suffix,
  hint,
  trend,
}: {
  label: string;
  value: number;
  format?: (n: number) => string;
  suffix?: string;
  hint?: string;
  trend?: number[];
}) {
  return (
    <div className="surface-card hover-lift flex flex-col gap-3 px-5 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="text-sm text-[color:var(--color-text-muted)]">{label}</div>
        {trend && trend.length > 1 ? <Sparkline data={trend} width={64} height={24} /> : null}
      </div>
      <div className="font-display tabular flex items-baseline gap-1 text-3xl font-semibold">
        <CountUp value={value} format={format} />
        {suffix ? (
          <span className="text-base font-medium text-[color:var(--color-text-muted)]">
            {suffix}
          </span>
        ) : null}
      </div>
      {hint ? <div className="text-xs text-[color:var(--color-text-muted)]">{hint}</div> : null}
    </div>
  );
}
