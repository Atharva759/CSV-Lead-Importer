const { extractBatch } = require("./aiExtractor.service");
const { validateAndCleanRecord } = require("./validator.service");

function chunk(array, size) {
  const out = [];
  for (let i = 0; i < array.length; i += size) {
    out.push(array.slice(i, i + size));
  }
  return out;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calls extractBatch with retries. Throws only after all retries are exhausted.
 */
async function extractBatchWithRetry(rows, maxRetries) {
  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await extractBatch(rows);
      if (!Array.isArray(result) || result.length !== rows.length) {
        throw new Error(
          `AI returned ${Array.isArray(result) ? result.length : "non-array"} records for a batch of ${rows.length} rows.`
        );
      }
      return result;
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        await sleep(300 * (attempt + 1)); // small backoff before retrying
      }
    }
  }
  throw lastError;
}

/**
 * Processes all raw CSV rows: batches them, sends each batch to the AI
 * extractor (with retry), validates/cleans every returned record, and
 * separates results into imported vs skipped.
 *
 * @param {Record<string, string>[]} rawRows
 * @param {{ batchSize?: number, maxRetries?: number }} options
 * @returns {{ imported: object[], skipped: object[], totalImported: number, totalSkipped: number, batchErrors: object[] }}
 */
async function processRows(rawRows, options = {}) {
  const batchSize = options.batchSize || Number(process.env.AI_BATCH_SIZE || 20);
  const maxRetries = options.maxRetries ?? Number(process.env.AI_BATCH_MAX_RETRIES || 2);

  const batches = chunk(rawRows, batchSize);
  const imported = [];
  const skipped = [];
  const batchErrors = [];

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    try {
      const extracted = await extractBatchWithRetry(batch, maxRetries);

      extracted.forEach((rawRecord, i) => {
        const { record, skip, skipReason } = validateAndCleanRecord(rawRecord);
        if (skip) {
          skipped.push({ row: batch[i], reason: skipReason });
        } else {
          imported.push(record);
        }
      });
    } catch (err) {
      // Entire batch failed after retries: skip all its rows, but keep the
      // original raw data so nothing is silently lost.
      batch.forEach((row) => {
        skipped.push({ row, reason: `AI extraction failed: ${err.message}` });
      });
      batchErrors.push({ batchIndex, size: batch.length, error: err.message });
    }
  }

  return {
    imported,
    skipped,
    totalImported: imported.length,
    totalSkipped: skipped.length,
    batchErrors,
  };
}

module.exports = { processRows, chunk };