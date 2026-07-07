const { parseCsvBuffer } = require("../service/csvParser.service");
const { processRows } = require("../service/batchProcessor");

/**
 * POST /api/import
 * Expects multipart/form-data with a "file" field (the CSV).
 * This is only ever called AFTER the user confirms the preview on the frontend —
 * no AI work happens before this point.
 */
async function importCsv(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded. Expected a 'file' field." });
    }

    const { headers, rows } = parseCsvBuffer(req.file.buffer);

    if (rows.length === 0) {
      return res.status(400).json({ error: "The CSV file has no data rows." });
    }

    const result = await processRows(rows);

    return res.status(200).json({
      totalRows: rows.length,
      totalImported: result.totalImported,
      totalSkipped: result.totalSkipped,
      imported: result.imported,
      skipped: result.skipped,
      detectedHeaders: headers,
      batchErrors: result.batchErrors,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { importCsv };