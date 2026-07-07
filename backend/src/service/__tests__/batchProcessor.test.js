const { chunk, processRows } = require("../batchProcessor");

describe("chunk", () => {
  test("splits an array into equal-sized chunks", () => {
    expect(chunk([1, 2, 3, 4, 5, 6], 2)).toEqual([[1, 2], [3, 4], [5, 6]]);
  });

  test("last chunk can be smaller than the rest", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  test("returns an empty array for empty input", () => {
    expect(chunk([], 5)).toEqual([]);
  });
});

describe("processRows (mock AI provider)", () => {
  const originalProvider = process.env.AI_PROVIDER;
  const originalFallback = process.env.AI_PROVIDER_FALLBACK;

  beforeAll(() => {
    process.env.AI_PROVIDER = "mock";
    delete process.env.AI_PROVIDER_FALLBACK;
  });

  afterAll(() => {
    process.env.AI_PROVIDER = originalProvider;
    process.env.AI_PROVIDER_FALLBACK = originalFallback;
  });

  test("imports rows that have an email or mobile, skips rows that have neither", async () => {
    const rows = [
      { Name: "Has Email", Email: "has-email@example.com" },
      { Name: "Has Mobile", Phone: "9876543210" },
      { Name: "Has Neither" },
    ];

    const result = await processRows(rows, { batchSize: 10, maxRetries: 0 });

    expect(result.totalImported).toBe(2);
    expect(result.totalSkipped).toBe(1);
    expect(result.skipped[0].reason).toMatch(/missing both email and mobile/i);
  });

  test("processes rows across multiple batches and reports progress for each", async () => {
    const rows = Array.from({ length: 25 }, (_, i) => ({
      Name: `Lead ${i}`,
      Email: `lead${i}@example.com`,
    }));

    const progressEvents = [];
    const result = await processRows(rows, { batchSize: 10, maxRetries: 0 }, (progress) => {
      progressEvents.push(progress);
    });

    expect(result.totalImported).toBe(25);
    expect(progressEvents).toHaveLength(3); 
    expect(progressEvents[2].cumulativeRows).toBe(25);
    expect(progressEvents[2].totalBatches).toBe(3);
  });
});