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
        await sleep(300 * (attempt + 1)); 
      }
    }
  }
  throw lastError;
}

/**
 * 
 * @param {Record<string, string>[]} rawRows
 * @param {{ batchSize?: number, maxRetries?: number }} options
 * @param {(progress: object) => void} [onBatchComplete] - called after each batch, for streaming progress
 * @returns {{ imported: object[], skipped: object[], totalImported: number, totalSkipped: number, batchErrors: object[] }}
 */
async function processRows(rawRows, options = {}, onBatchComplete) {
  const batchSize = options.batchSize || Number(process.env.AI_BATCH_SIZE || 20);
  const maxRetries = options.maxRetries ?? Number(process.env.AI_BATCH_MAX_RETRIES || 2);

  const batches = chunk(rawRows, batchSize);
  const totalBatches = batches.length;
  const imported = [];
  const skipped = [];
  const batchErrors = [];

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    let batchImported = 0;
    let batchSkipped = 0;
    let batchFailed = false;
    let batchErrorMessage = null;

    try {
      const extracted = await extractBatchWithRetry(batch, maxRetries);

      extracted.forEach((rawRecord, i) => {
        const { record, skip, skipReason } = validateAndCleanRecord(rawRecord);
        if (skip) {
          skipped.push({ row: batch[i], reason: skipReason, batchIndex });
          batchSkipped++;
        } else {
          imported.push(record);
          batchImported++;
        }
      });
    } catch (err) {
      
      batch.forEach((row) => {
        skipped.push({ row, reason: `AI extraction failed: ${err.message}`, batchIndex });
      });
      batchSkipped = batch.length;
      batchFailed = true;
      batchErrorMessage = err.message;
      batchErrors.push({ batchIndex, size: batch.length, error: err.message });
    }

    if (onBatchComplete) {
      onBatchComplete({
        batchIndex,
        totalBatches,
        batchSize: batch.length,
        batchImported,
        batchSkipped,
        batchFailed,
        batchErrorMessage,
        cumulativeImported: imported.length,
        cumulativeSkipped: skipped.length,
        cumulativeRows: imported.length + skipped.length,
        totalRows: rawRows.length,
      });
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