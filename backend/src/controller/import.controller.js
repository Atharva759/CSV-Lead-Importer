const { parseCsvBuffer } = require("../service/csvParser.service");
const { processRows } = require("../service/batchProcessor");


function writeEvent(res, event) {
  res.write(`${JSON.stringify(event)}\n`);
}

async function runStreamedImport(req, res, rows, headers) {
  res.setHeader("Content-Type", "application/x-ndjson");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("X-Accel-Buffering", "no"); 
  if (typeof res.flushHeaders === "function") res.flushHeaders();

  try {
    const result = await processRows(rows, {}, (progress) => {
      writeEvent(res, { type: "progress", ...progress });
    });

    writeEvent(res, {
      type: "done",
      result: {
        totalRows: rows.length,
        totalImported: result.totalImported,
        totalSkipped: result.totalSkipped,
        imported: result.imported,
        skipped: result.skipped,
        detectedHeaders: headers,
        batchErrors: result.batchErrors,
      },
    });
  } catch (err) {
    writeEvent(res, { type: "error", error: err.message });
  } finally {
    res.end();
  }
}


async function importCsv(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded. Expected a 'file' field." });
    }

    const { headers, rows } = parseCsvBuffer(req.file.buffer);

    if (rows.length === 0) {
      return res.status(400).json({ error: "The CSV file has no data rows." });
    }

    await runStreamedImport(req, res, rows, headers);
  } catch (err) {
    if (res.headersSent) {
      writeEvent(res, { type: "error", error: err.message });
      res.end();
    } else {
      next(err);
    }
  }
}


async function retryRows(req, res, next) {
  try {
    const rows = req.body?.rows;
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: "Expected a non-empty 'rows' array." });
    }

    const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
    await runStreamedImport(req, res, rows, headers);
  } catch (err) {
    if (res.headersSent) {
      writeEvent(res, { type: "error", error: err.message });
      res.end();
    } else {
      next(err);
    }
  }
}

module.exports = { importCsv, retryRows };