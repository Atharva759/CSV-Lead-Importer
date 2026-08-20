const { deduplicateRecords, getDedupKey } = require("../dedup.service");

function record(overrides) {
  return {
    created_at: "",
    name: "",
    email: "",
    country_code: "",
    mobile_without_country_code: "",
    company: "",
    city: "",
    state: "",
    country: "",
    lead_owner: "",
    crm_status: "",
    crm_note: "",
    data_source: "",
    possession_time: "",
    description: "",
    ...overrides,
  };
}

describe("getDedupKey", () => {
  test("keys on normalized (lowercased, trimmed) email when present", () => {
    expect(getDedupKey(record({ email: " John@Example.com " }))).toBe("email:john@example.com");
  });

  test("falls back to mobile when email is blank", () => {
    expect(getDedupKey(record({ mobile_without_country_code: "9876543210" }))).toBe(
      "mobile:9876543210"
    );
  });

  test("returns null when neither email nor mobile is present", () => {
    expect(getDedupKey(record({}))).toBeNull();
  });
});

describe("deduplicateRecords", () => {
  test("removes an exact duplicate by email (case/whitespace-insensitive)", () => {
    const records = [
      record({ name: "John Doe", email: "john@example.com" }),
      record({ name: "John Doe", email: " John@Example.com " }),
    ];
    const { unique, duplicatesRemoved } = deduplicateRecords(records);

    expect(unique).toHaveLength(1);
    expect(duplicatesRemoved).toBe(1);
  });

  test("removes an exact duplicate by mobile when email is absent", () => {
    const records = [
      record({ name: "Amit", mobile_without_country_code: "9876543210" }),
      record({ name: "Amit", mobile_without_country_code: "9876543210" }),
    ];
    const { unique, duplicatesRemoved } = deduplicateRecords(records);

    expect(unique).toHaveLength(1);
    expect(duplicatesRemoved).toBe(1);
  });

  test("keeps records with different emails distinct", () => {
    const records = [
      record({ email: "a@example.com" }),
      record({ email: "b@example.com" }),
    ];
    const { unique, duplicatesRemoved } = deduplicateRecords(records);

    expect(unique).toHaveLength(2);
    expect(duplicatesRemoved).toBe(0);
  });

  test("merges crm_note content from the duplicate into the kept record", () => {
    const records = [
      record({ email: "a@example.com", crm_note: "First contact, interested" }),
      record({ email: "a@example.com", crm_note: "Called back, wants demo" }),
    ];
    const { unique } = deduplicateRecords(records);

    expect(unique).toHaveLength(1);
    expect(unique[0].crm_note).toContain("First contact, interested");
    expect(unique[0].crm_note).toContain("Called back, wants demo");
  });

  test("does not duplicate identical crm_note text when merging", () => {
    const records = [
      record({ email: "a@example.com", crm_note: "Same note" }),
      record({ email: "a@example.com", crm_note: "Same note" }),
    ];
    const { unique } = deduplicateRecords(records);

    expect(unique[0].crm_note).toBe("Same note");
  });

  test("keeps the first record's non-note fields when merging duplicates", () => {
    const records = [
      record({ email: "a@example.com", name: "First Entry", city: "Pune" }),
      record({ email: "a@example.com", name: "Second Entry", city: "Mumbai" }),
    ];
    const { unique } = deduplicateRecords(records);

    expect(unique[0].name).toBe("First Entry");
    expect(unique[0].city).toBe("Pune");
  });

  test("passes through records with no usable key without crashing", () => {
    const records = [record({})]; // no email, no mobile
    const { unique, duplicatesRemoved } = deduplicateRecords(records);

    expect(unique).toHaveLength(1);
    expect(duplicatesRemoved).toBe(0);
  });

  test("handles three-way duplicates, not just pairs", () => {
    const records = [
      record({ email: "a@example.com", crm_note: "Note 1" }),
      record({ email: "a@example.com", crm_note: "Note 2" }),
      record({ email: "a@example.com", crm_note: "Note 3" }),
    ];
    const { unique, duplicatesRemoved } = deduplicateRecords(records);

    expect(unique).toHaveLength(1);
    expect(duplicatesRemoved).toBe(2);
    expect(unique[0].crm_note).toBe("Note 1 | Note 2 | Note 3");
  });
});