const { CRM_FIELD_KEYS, CRM_STATUS_VALUES, DATA_SOURCE_VALUES } = require("../config/crmSchema");

const EMAIL_REGEX = /[^\s,;<>]+@[^\s,;<>]+\.[^\s,;<>]+/g;
const MOBILE_SPLIT_REGEX = /[,;/]+/;

/**
 * Escapes raw line breaks so a field can safely sit inside a single CSV row.
 */
function escapeLineBreaks(value) {
  if (typeof value !== "string") return value;
  return value.replace(/\r\n|\r|\n/g, "\\n");
}

/**
 * If a field contains multiple emails, keep the first as primary
 * and return the rest so they can be appended to crm_note.
 */
function splitEmails(value) {
  if (!value || typeof value !== "string") return { primary: "", extras: [] };
  const matches = value.match(EMAIL_REGEX) || [];
  if (matches.length === 0) return { primary: "", extras: [] };
  return { primary: matches[0], extras: matches.slice(1) };
}

/**
 * If a field contains multiple mobile numbers (comma/semicolon/slash separated),
 * keep the first as primary and return the rest for crm_note.
 */
function splitMobiles(value) {
  if (!value || typeof value !== "string") return { primary: "", extras: [] };
  const parts = value
    .split(MOBILE_SPLIT_REGEX)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return { primary: "", extras: [] };
  return { primary: parts[0], extras: parts.slice(1) };
}

function isValidDate(value) {
  if (!value || typeof value !== "string") return false;
  const d = new Date(value);
  return !Number.isNaN(d.getTime());
}

/**
 * Validates and cleans a single AI-extracted CRM record.
 * Returns { record, skip, skipReason }.
 */
function validateAndCleanRecord(rawRecord) {
  const record = {};
  for (const key of CRM_FIELD_KEYS) {
    record[key] = rawRecord && rawRecord[key] != null ? String(rawRecord[key]).trim() : "";
  }

  const extraNotes = [];

  // Enum enforcement: blank out anything not in the allowed list
  if (record.crm_status && !CRM_STATUS_VALUES.includes(record.crm_status)) {
    record.crm_status = "";
  }
  if (record.data_source && !DATA_SOURCE_VALUES.includes(record.data_source)) {
    record.data_source = "";
  }

  // Date validity: must be usable via `new Date(created_at)`
  if (record.created_at && !isValidDate(record.created_at)) {
    extraNotes.push(`Original date value could not be parsed: ${record.created_at}`);
    record.created_at = "";
  }

  // Multiple emails -> keep first, push rest to crm_note
  const { primary: primaryEmail, extras: extraEmails } = splitEmails(record.email);
  record.email = primaryEmail;
  if (extraEmails.length > 0) {
    extraNotes.push(`Additional email(s): ${extraEmails.join(", ")}`);
  }

  // Multiple mobiles -> keep first, push rest to crm_note
  const { primary: primaryMobile, extras: extraMobiles } = splitMobiles(record.mobile_without_country_code);
  record.mobile_without_country_code = primaryMobile;
  if (extraMobiles.length > 0) {
    extraNotes.push(`Additional mobile(s): ${extraMobiles.join(", ")}`);
  }

  if (extraNotes.length > 0) {
    record.crm_note = [record.crm_note, ...extraNotes].filter(Boolean).join(" | ");
  }

  // Ensure every field stays CSV-safe (no unescaped line breaks)
  for (const key of CRM_FIELD_KEYS) {
    record[key] = escapeLineBreaks(record[key]);
  }

  // Skip rule: must have at least an email OR a mobile number
  const skip = !record.email && !record.mobile_without_country_code;
  const skipReason = skip ? "Missing both email and mobile number" : null;

  return { record, skip, skipReason };
}

module.exports = { validateAndCleanRecord, isValidDate, splitEmails, splitMobiles };