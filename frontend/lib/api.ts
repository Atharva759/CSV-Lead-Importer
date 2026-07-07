import type { ImportApiResponse, ImportApiError, ImportProgressEvent, RawCsvRow } from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type NdjsonEvent =
  | ImportProgressEvent
  | { type: "done"; result: ImportApiResponse }
  | { type: "error"; error: string };


async function readNdjsonStream(
  response: Response,
  onProgress?: (event: ImportProgressEvent) => void
): Promise<ImportApiResponse> {
  if (!response.body) {
    throw new Error("Streaming is not supported in this environment.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finalResult: ImportApiResponse | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? ""; 

    for (const line of lines) {
      if (!line.trim()) continue;
      const event = JSON.parse(line) as NdjsonEvent;

      if (event.type === "progress") {
        onProgress?.(event);
      } else if (event.type === "done") {
        finalResult = event.result;
      } else if (event.type === "error") {
        throw new Error(event.error);
      }
    }
  }

  buffer += decoder.decode();
  if (buffer.trim()) {
    const event = JSON.parse(buffer) as NdjsonEvent;
    if (event.type === "progress") {
      onProgress?.(event);
    } else if (event.type === "done") {
      finalResult = event.result;
    } else if (event.type === "error") {
      throw new Error(event.error);
    }
  }

  if (!finalResult) {
    throw new Error("The import stream ended without returning a result.");
  }
  return finalResult;
}


export async function importCsvFile(
  file: File,
  onProgress?: (event: ImportProgressEvent) => void
): Promise<ImportApiResponse> {
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

  return readNdjsonStream(response, onProgress);
}


export async function retryFailedRows(
  rows: RawCsvRow[],
  onProgress?: (event: ImportProgressEvent) => void
): Promise<ImportApiResponse> {
  const response = await fetch(`${API_BASE_URL}/api/import/retry`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rows }),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ImportApiError | null;
    throw new Error(body?.error || `Retry failed with status ${response.status}`);
  }

  return readNdjsonStream(response, onProgress);
}