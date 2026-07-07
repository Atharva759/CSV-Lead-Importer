"use client";

import { useState } from "react";
import CsvPreviewTable from "./CsvPreviewTable";
import { CRM_FIELD_KEYS, type ImportApiResponse } from "@/lib/types";

interface ResultsTableProps {
  result: ImportApiResponse;
  onStartOver: () => void;
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div
      className="rounded-lg border px-4 py-3 flex-1 min-w-[120px]"
      style={{ borderColor: "var(--color-line)", backgroundColor: "var(--color-surface-raised)" }}
    >
      <p className="font-mono text-xs uppercase tracking-wide" style={{ color: "var(--color-muted)" }}>
        {label}
      </p>
      <p className="text-2xl font-semibold mt-1" style={{ fontFamily: "var(--font-display)", color }}>
        {value}
      </p>
    </div>
  );
}

export default function ResultsTable({ result, onStartOver }: ResultsTableProps) {
  const [tab, setTab] = useState<"imported" | "skipped">("imported");

  // Build a headers/rows shape for the skipped table: original raw columns + a "reason" column.
  const skippedHeaders = Array.from(
    new Set(result.skipped.flatMap((s) => Object.keys(s.row)))
  );
  const skippedRows = result.skipped.map((s) => ({
    ...s.row,
    "Skip Reason": s.reason,
  }));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-3">
        <StatCard label="Total Rows" value={result.totalRows} color="var(--color-paper)" />
        <StatCard label="Imported" value={result.totalImported} color="var(--color-success)" />
        <StatCard label="Skipped" value={result.totalSkipped} color="var(--color-danger)" />
      </div>

      {result.batchErrors.length > 0 && (
        <div
          className="text-sm rounded-lg border px-4 py-3"
          style={{ borderColor: "var(--color-danger)", color: "var(--color-danger)" }}
        >
          {result.batchErrors.length} batch(es) failed during AI extraction and were skipped.
          See the Skipped tab for details.
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => setTab("imported")}
          className="text-sm px-4 py-2 rounded-lg font-medium border"
          style={{
            backgroundColor: tab === "imported" ? "var(--color-accent)" : "transparent",
            color: tab === "imported" ? "var(--color-ink)" : "var(--color-muted)",
            borderColor: tab === "imported" ? "var(--color-accent)" : "var(--color-line)",
          }}
        >
          Imported ({result.totalImported})
        </button>
        <button
          onClick={() => setTab("skipped")}
          className="text-sm px-4 py-2 rounded-lg font-medium border"
          style={{
            backgroundColor: tab === "skipped" ? "var(--color-accent)" : "transparent",
            color: tab === "skipped" ? "var(--color-ink)" : "var(--color-muted)",
            borderColor: tab === "skipped" ? "var(--color-accent)" : "var(--color-line)",
          }}
        >
          Skipped ({result.totalSkipped})
        </button>
      </div>

      {tab === "imported" && (
        <CsvPreviewTable headers={[...CRM_FIELD_KEYS]} rows={result.imported} />
      )}
      {tab === "skipped" && (
        <CsvPreviewTable headers={[...skippedHeaders, "Skip Reason"]} rows={skippedRows} />
      )}

      <div>
        <button
          onClick={onStartOver}
          className="text-sm px-4 py-2 rounded-lg border"
          style={{ borderColor: "var(--color-line)", color: "var(--color-muted)" }}
        >
          Import another CSV
        </button>
      </div>
    </div>
  );
}