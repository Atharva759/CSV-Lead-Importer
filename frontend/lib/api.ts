import type { ImportApiResponse, ImportApiError } from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

/**
 * Sends the raw CSV file to the backend for AI extraction.
 * This is only ever called after the user clicks "Confirm" on the preview screen.
 */
export async function importCsvFile(file: File): Promise<ImportApiResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE_URL}/api/import`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ImportApiError | null;
    throw new Error(body?.error || `Import failed with status ${response.status}`);
  }

  return response.json();
}