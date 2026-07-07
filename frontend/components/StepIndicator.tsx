import type { ImportStep } from "@/lib/types";

const STEPS: { key: ImportStep; label: string; stamp: string }[] = [
  { key: "upload", label: "Upload", stamp: "01_RECV" },
  { key: "preview", label: "Preview", stamp: "02_SCAN" },
  { key: "processing", label: "Processing", stamp: "03_MAP" },
  { key: "results", label: "Results", stamp: "04_DONE" },
];

function stepIndex(step: ImportStep): number {
  return STEPS.findIndex((s) => s.key === step);
}

export default function StepIndicator({ current }: { current: ImportStep }) {
  const currentIndex = stepIndex(current);

  return (
    <div className="flex items-stretch w-full font-mono text-xs">
      {STEPS.map((step, i) => {
        const isDone = i < currentIndex;
        const isActive = i === currentIndex;
        return (
          <div key={step.key} className="flex-1 flex flex-col gap-2 min-w-0">
            <div
              className={`h-1 rounded-full transition-colors ${
                isDone || isActive ? "bg-accent" : "bg-line"
              }`}
              style={{
                backgroundColor: isDone || isActive ? "var(--color-accent)" : "var(--color-line)",
              }}
            />
            <div className="flex items-baseline justify-between gap-2 pr-2">
              <span
                className="uppercase tracking-wide truncate"
                style={{
                  color: isActive
                    ? "var(--color-accent)"
                    : isDone
                    ? "var(--color-paper)"
                    : "var(--color-muted)",
                  fontWeight: isActive ? 600 : 400,
                }}
              >
                {step.label}
              </span>
              <span
                className="hidden sm:inline"
                style={{ color: isDone ? "var(--color-success)" : "var(--color-line)" }}
              >
                {isDone ? "✓" : step.stamp}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}