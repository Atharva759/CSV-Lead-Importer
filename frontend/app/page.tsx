"use client";

import { useState } from "react";
import StepIndicator from "@/components/StepIndicator";
import FileDropzone from "@/components/FileDropZone";
import CsvPreviewTable from "@/components/CsvPreviewTable";
import ResultsTable from "@/components/ResultsTable";
import ThemeToggle from "@/components/ThemeToggle";
import { parseCsvFile, type ParsedCsv } from "@/lib/csv";
import { importCsvFile, retryFailedRows } from "@/lib/api";
import type { ImportApiResponse, ImportProgressEvent, ImportStep } from "@/lib/types";

export default function Home() {
  const [step, setStep] = useState<ImportStep>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<ParsedCsv | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportApiResponse | null>(null);
  const [progress, setProgress] = useState<ImportProgressEvent | null>(null);

  async function handleFileAccepted(newFile: File) {
    setParseError(null);
    try {
      const parsedCsv = await parseCsvFile(newFile);
      setFile(newFile);
      setParsed(parsedCsv);
      setStep("preview");
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "Could not parse this CSV.");
    }
  }

  function handleStartOver() {
    setFile(null);
    setParsed(null);
    setParseError(null);
    setApiError(null);
    setResult(null);
    setStep("upload");
  }

  async function handleConfirm() {
    if (!file) return;
    setApiError(null);
    setProgress(null);
    setStep("processing");
    try {
      const response = await importCsvFile(file, setProgress);
      setResult(response);
      setStep("results");
    } catch (err) {
      setApiError(
        err instanceof Error
          ? err.message
          : "Could not reach the import service. Please try again."
      );
      setStep("preview");
    }
  }

  async function handleRetryFailed(rows: Record<string, string>[]) {
    setApiError(null);
    setProgress(null);
    setStep("processing");
    try {
      const retryResult = await retryFailedRows(rows, setProgress);
      
      setResult((prev) => {
        if (!prev) return retryResult;
        const retriedRowSet = new Set(rows.map((r) => JSON.stringify(r)));
        const remainingSkipped = prev.skipped.filter(
          (s) => !retriedRowSet.has(JSON.stringify(s.row))
        );
        return {
          ...prev,
          imported: [...prev.imported, ...retryResult.imported],
          skipped: [...remainingSkipped, ...retryResult.skipped],
          totalImported: prev.imported.length + retryResult.imported.length,
          totalSkipped: remainingSkipped.length + retryResult.skipped.length,
          batchErrors: retryResult.batchErrors,
        };
      });
      setStep("results");
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Retry failed. Please try again.");
      setStep("results");
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-10 sm:py-16">
      <div className="w-full max-w-4xl flex flex-col gap-8">
        <header className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <span
              className="font-mono text-xs uppercase tracking-widest"
              style={{ color: "var(--color-accent)" }}
            >
              Lead Import Terminal
            </span>
            <h1
              className="text-2xl sm:text-3xl font-semibold"
              style={{ fontFamily: "var(--font-display)" }}
            >
              CSV → CRM, mapped by AI
            </h1>
            <p className="text-sm" style={{ color: "var(--color-muted)" }}>
              Upload any lead export. We&apos;ll detect the fields and map them into 
              format  no fixed column names required.
            </p>
          </div>
          <ThemeToggle />
        </header>

        <StepIndicator current={step} />

        <div
          className="rounded-xl border p-6 sm:p-8 flex flex-col gap-5"
          style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-line)" }}
        >
          {step === "upload" && <FileDropzone onFileAccepted={handleFileAccepted} />}

          {step === "upload" && parseError && (
            <p className="text-sm" style={{ color: "var(--color-danger)" }}>
              {parseError}
            </p>
          )}

          {step === "preview" && parsed && file && (
            <div className="flex flex-col gap-4">
              {apiError && (
                <div
                  className="text-sm rounded-lg border px-4 py-3"
                  style={{ borderColor: "var(--color-danger)", color: "var(--color-danger)" }}
                >
                  {apiError}
                </div>
              )}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-mono text-xs" style={{ color: "var(--color-muted)" }}>
                    {file.name} · {(file.size / 1024).toFixed(1)} KB
                  </p>
                  <p className="text-sm mt-1">
                    Detected <span className="font-mono">{parsed.headers.length}</span> columns
                    and <span className="font-mono">{parsed.rows.length}</span> preview rows.
                    No AI processing has happened yet.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleStartOver}
                    className="text-sm px-4 py-2 rounded-lg border cursor-pointer"
                    style={{ borderColor: "var(--color-line)", color: "var(--color-muted)" }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirm}
                    className="text-sm px-4 py-2 rounded-lg font-medium cursor-pointer"
                    style={{ backgroundColor: "var(--color-accent)", color: "var(--color-ink)" }}
                  >
                    Confirm Import
                  </button>
                </div>
              </div>
              <CsvPreviewTable headers={parsed.headers} rows={parsed.rows} />
            </div>
          )}

          {step === "processing" && (
            <div className="flex flex-col items-center gap-4 py-10 w-full">
              <div
                className="w-8 h-8 rounded-full border-2 animate-spin"
                style={{
                  borderColor: "var(--color-line)",
                  borderTopColor: "var(--color-accent)",
                }}
              />
              {progress ? (
                <div className="w-full max-w-sm flex flex-col gap-2">
                  <div
                    className="w-full h-2 rounded-full overflow-hidden"
                    style={{ backgroundColor: "var(--color-line)" }}
                  >
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.round(
                          (progress.cumulativeRows / progress.totalRows) * 100
                        )}%`,
                        backgroundColor: "var(--color-accent)",
                      }}
                    />
                  </div>
                  <p className="font-mono text-xs text-center" style={{ color: "var(--color-muted)" }}>
                    Batch {progress.batchIndex + 1}/{progress.totalBatches} · {progress.cumulativeRows}/
                    {progress.totalRows} rows mapped
                  </p>
                </div>
              ) : (
                <p className="font-mono text-sm" style={{ color: "var(--color-muted)" }}>
                  Mapping fields with AI this can take a moment for larger files…
                </p>
              )}
            </div>
          )}

          {step === "results" && result && (
            <>
              {apiError && (
                <div
                  className="text-sm rounded-lg border px-4 py-3"
                  style={{ borderColor: "var(--color-danger)", color: "var(--color-danger)" }}
                >
                  {apiError}
                </div>
              )}
              <ResultsTable
                result={result}
                onStartOver={handleStartOver}
                onRetryFailed={handleRetryFailed}
              />
            </>
          )}
        </div>
      </div>
    </main>
  );
}