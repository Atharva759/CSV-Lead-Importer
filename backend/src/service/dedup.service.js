/**
 * 
 * Runs AFTER validation, on the final list of imported CRM records — not per
 * batch — because a duplicate lead can land in any two batches, so dedup
 * needs to see the whole imported set at once.
 *
 * Dedup key is the NORMALIZED email (lowercased, trimmed) if present,
 * otherwise the normalized mobile number. This intentionally runs on the
 * already-cleaned record (post multi-email/mobile splitting in
 * validator.service.js), not the raw CSV row, so "John@Example.com " and
 * "john@example.com" are correctly treated as the same lead.
 *
 * This is exact-match only (case/whitespace-insensitive) — it will NOT catch
 * near-duplicates like differently-formatted phone numbers or typo'd names.
 * That would need fuzzy matching (e.g. normalized phone comparison,
 * Levenshtein distance on names) — a reasonable "next step" but out of scope
 * here.
 */

function normalizeKeyValue(value) {
  return (value || "").trim().toLowerCase();
}

/**
 * Builds the dedup key for a single record. Returns null if the record has
 * neither an email nor a mobile (shouldn't happen post-validation, since
 * those are skipped already, but guarded defensively).
 */
function getDedupKey(record) {
  const email = normalizeKeyValue(record.email);
  if (email) return `email:${email}`;

  const mobile = normalizeKeyValue(record.mobile_without_country_code);
  if (mobile) return `mobile:${mobile}`;

  return null;
}

/**
 * Merges a duplicate record into the one already kept for this key.
 * Keeps the first-seen record's fields, but folds any new/different
 * crm_note content in, so information isn't silently dropped.
 */
function mergeDuplicate(kept, duplicate) {
  const notes = [kept.crm_note, duplicate.crm_note].map((n) => (n || "").trim()).filter(Boolean);

  const uniqueNotes = [...new Set(notes)];
  return {
    ...kept,
    crm_note: uniqueNotes.join(" | "),
  };
}

/**
 * @param {object[]} records - already-validated CRM records (imported list)
 * @returns {{ unique: object[], duplicatesRemoved: number }}
 */
function deduplicateRecords(records) {
  const seen = new Map(); // dedup key -> kept record
  const noKeyRecords = []; // defensive: records with no usable key pass through untouched
  let duplicatesRemoved = 0;

  for (const record of records) {
    const key = getDedupKey(record);

    if (!key) {
      noKeyRecords.push(record);
      continue;
    }

    if (seen.has(key)) {
      const merged = mergeDuplicate(seen.get(key), record);
      seen.set(key, merged);
      duplicatesRemoved++;
    } else {
      seen.set(key, record);
    }
  }

  return {
    unique: [...seen.values(), ...noKeyRecords],
    duplicatesRemoved,
  };
}

module.exports = { deduplicateRecords, getDedupKey };