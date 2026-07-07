export const CRM_FIELD_KEYS = [
  "created_at",
  "name",
  "email",
  "country_code",
  "mobile_without_country_code",
  "company",
  "city",
  "state",
  "country",
  "lead_owner",
  "crm_status",
  "crm_note",
  "data_source",
  "possession_time",
  "description",
] as const;

export type CrmFieldKey = (typeof CRM_FIELD_KEYS)[number];

export type CrmRecord = Record<CrmFieldKey, string>;

export const CRM_STATUS_VALUES = [
  "GOOD_LEAD_FOLLOW_UP",
  "DID_NOT_CONNECT",
  "BAD_LEAD",
  "SALE_DONE",
] as const;

export const DATA_SOURCE_VALUES = [
  "leads_on_demand",
  "meridian_tower",
  "eden_park",
  "varah_swamy",
  "sarjapur_plots",
] as const;

export type RawCsvRow = Record<string, string>;

export interface SkippedRecord {
  row: RawCsvRow;
  reason: string;
}

export interface ImportApiResponse {
  totalRows: number;
  totalImported: number;
  totalSkipped: number;
  imported: CrmRecord[];
  skipped: SkippedRecord[];
  detectedHeaders: string[];
  batchErrors: { batchIndex: number; size: number; error: string }[];
}

export interface ImportProgressEvent {
  type: "progress";
  batchIndex: number;
  totalBatches: number;
  batchSize: number;
  batchImported: number;
  batchSkipped: number;
  batchFailed: boolean;
  batchErrorMessage: string | null;
  cumulativeImported: number;
  cumulativeSkipped: number;
  cumulativeRows: number;
  totalRows: number;
}

export function isRetryableSkip(skip: SkippedRecord): boolean {
  return skip.reason.startsWith("AI extraction failed");
}

export interface ImportApiError {
  error: string;
}

export type ImportStep = "upload" | "preview" | "processing" | "results";