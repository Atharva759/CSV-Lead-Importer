const { parse } = require("csv-parse/sync");

/**
 * 
 * @param {Buffer} buffer 
 * @returns {{ headers: string[], rows: Record<string, string>[] }}
 */
function parseCsvBuffer(buffer) {

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
      relax_column_count: true, 
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