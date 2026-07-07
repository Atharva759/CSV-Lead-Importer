import Papa from "papaparse";
import type { RawCsvRow } from "./types";

export interface ParsedCsv {
  headers: string[];
  rows: RawCsvRow[];
}

const MAX_PREVIEW_ROWS = 500;

/**
 * Parses a File client-side for the Preview step. Purely local — no network
 * call, no AI. Caps the preview at MAX_PREVIEW_ROWS so a huge CSV doesn't
 * freeze the browser tab (the full file is still sent to the backend on confirm).
 */
export function parseCsvFile(file: File): Promise<ParsedCsv> {
  return new Promise((resolve, reject) => {
    Papa.parse<RawCsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      preview: MAX_PREVIEW_ROWS,
      transformHeader: (h) => h.trim(),
      complete: (results) => {
        const headers = results.meta.fields ?? [];
        if (headers.length === 0) {
          reject(new Error("Could not detect any columns in this CSV."));
          return;
        }
        resolve({ headers, rows: results.data });
      },
      error: (err) => reject(err),
    });
  });
}