const { parse } = require("csv-parse/sync");

/**
 * Parses a raw CSV buffer into an array of plain objects.
 * Makes zero assumptions about column names — whatever headers
 * exist in the file become the object keys, in whatever order.
 *
 * @param {Buffer} buffer - raw uploaded file contents
 * @returns {{ headers: string[], rows: Record<string, string>[] }}
 */
function parseCsvBuffer(buffer) {
  // Strip UTF-8 BOM if present (common in Excel exports)
  let text = buffer.toString("utf-8");
  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1);
  }

  let records;
  try {
    records = parse(text, {
      columns: (headerRow) => headerRow.map((h) => (h || "").trim()),
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true, // tolerate ragged rows instead of throwing
      bom: true,
    });
  } catch (err) {
    const error = new Error(`Failed to parse CSV: ${err.message}`);
    error.cause = err;
    throw error;
  }

  const headers = records.length > 0 ? Object.keys(records[0]) : [];

  return { headers, rows: records };
}

module.exports = { parseCsvBuffer };