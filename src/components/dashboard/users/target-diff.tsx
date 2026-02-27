import { TrendingDown, TrendingUp, Minus } from "lucide-react";

interface TargetDiffProps {
  jtpTarget: number | null;
  carrierTarget: number | null;
}

export function TargetDiff({ jtpTarget, carrierTarget }: TargetDiffProps) {
  if (jtpTarget == null || carrierTarget == null) {
    return <span className="text-muted-foreground text-xs">—</span>;
  }

  const diff = ((carrierTarget - jtpTarget) / jtpTarget) * 100;
  const abs = Math.abs(diff).toFixed(1);

  if (Math.abs(diff) < 0.05) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
        <Minus className="size-3" /> 0%
      </span>
    );
  }
  if (diff > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-medium text-destructive">
        <TrendingUp className="size-3" /> {abs}%
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-xs font-medium text-green-600 dark:text-green-400">
      <TrendingDown className="size-3" /> {abs}%
    </span>
  );
}
