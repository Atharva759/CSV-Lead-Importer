const { CRM_FIELD_KEYS, CRM_STATUS_VALUES, DATA_SOURCE_VALUES } = require("../config/crmSchema");

const EMAIL_REGEX = /[^\s,;<>]+@[^\s,;<>]+\.[^\s,;<>]+/g;
const MOBILE_SPLIT_REGEX = /[,;/]+/;


function escapeLineBreaks(value) {
  if (typeof value !== "string") return value;
  return value.replace(/\r\n|\r|\n/g, "\\n");
}


function splitEmails(value) {
  if (!value || typeof value !== "string") return { primary: "", extras: [] };
  const matches = value.match(EMAIL_REGEX) || [];
  if (matches.length === 0) return { primary: "", extras: [] };
  return { primary: matches[0], extras: matches.slice(1) };
}


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


function validateAndCleanRecord(rawRecord) {
  const record = {};
  for (const key of CRM_FIELD_KEYS) {
    record[key] = rawRecord && rawRecord[key] != null ? String(rawRecord[key]).trim() : "";
  }

  const extraNotes = [];

  if (record.crm_status && !CRM_STATUS_VALUES.includes(record.crm_status)) {
    record.crm_status = "";
  }
  if (record.data_source && !DATA_SOURCE_VALUES.includes(record.data_source)) {
    record.data_source = "";
  }

  if (record.created_at && !isValidDate(record.created_at)) {
    extraNotes.push(`Original date value could not be parsed: ${record.created_at}`);
    record.created_at = "";
  }

  const { primary: primaryEmail, extras: extraEmails } = splitEmails(record.email);
  record.email = primaryEmail;
  if (extraEmails.length > 0) {
    extraNotes.push(`Additional email(s): ${extraEmails.join(", ")}`);
  }

  const { primary: primaryMobile, extras: extraMobiles } = splitMobiles(record.mobile_without_country_code);
  record.mobile_without_country_code = primaryMobile;
  if (extraMobiles.length > 0) {
    extraNotes.push(`Additional mobile(s): ${extraMobiles.join(", ")}`);
  }

  if (extraNotes.length > 0) {
    record.crm_note = [record.crm_note, ...extraNotes].filter(Boolean).join(" | ");
  }

  for (const key of CRM_FIELD_KEYS) {
    record[key] = escapeLineBreaks(record[key]);
  }


  const skip = !record.email && !record.mobile_without_country_code;
  const skipReason = skip ? "Missing both email and mobile number" : null;

  return { record, skip, skipReason };
}

module.exports = { validateAndCleanRecord, isValidDate, splitEmails, splitMobiles };