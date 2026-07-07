const { validateAndCleanRecord, isValidDate, splitEmails, splitMobiles } = require("../validator.service");

describe("isValidDate", () => {
  test("accepts a normal ISO-ish date string", () => {
    expect(isValidDate("2026-05-13 14:20:48")).toBe(true);
  });

  test("rejects garbage strings", () => {
    expect(isValidDate("not a date")).toBe(false);
  });

  test("rejects empty/undefined", () => {
    expect(isValidDate("")).toBe(false);
    expect(isValidDate(undefined)).toBe(false);
  });
});

describe("splitEmails", () => {
  test("returns empty when there is no email", () => {
    expect(splitEmails("")).toEqual({ primary: "", extras: [] });
  });

  test("extracts a single email as primary with no extras", () => {
    expect(splitEmails("john@example.com")).toEqual({
      primary: "john@example.com",
      extras: [],
    });
  });

  test("splits multiple emails, keeping the first as primary", () => {
    const result = splitEmails("john@example.com;jane@example.com");
    expect(result.primary).toBe("john@example.com");
    expect(result.extras).toEqual(["jane@example.com"]);
  });
});

describe("splitMobiles", () => {
  test("returns empty when there is no mobile", () => {
    expect(splitMobiles("")).toEqual({ primary: "", extras: [] });
  });

  test("splits comma/semicolon-separated mobiles, keeping the first as primary", () => {
    const result = splitMobiles("9876543210, 9876543211");
    expect(result.primary).toBe("9876543210");
    expect(result.extras).toEqual(["9876543211"]);
  });
});

describe("validateAndCleanRecord", () => {
  test("passes through a fully valid record unchanged (except field ordering)", () => {
    const { record, skip } = validateAndCleanRecord({
      created_at: "2026-05-13 14:20:48",
      name: "John Doe",
      email: "john.doe@example.com",
      mobile_without_country_code: "9876543210",
      crm_status: "GOOD_LEAD_FOLLOW_UP",
      data_source: "leads_on_demand",
    });
    expect(skip).toBe(false);
    expect(record.name).toBe("John Doe");
    expect(record.email).toBe("john.doe@example.com");
    expect(record.crm_status).toBe("GOOD_LEAD_FOLLOW_UP");
    expect(record.data_source).toBe("leads_on_demand");
  });

  test("blanks out an invalid crm_status instead of keeping it", () => {
    const { record } = validateAndCleanRecord({
      email: "a@b.com",
      crm_status: "TOTALLY_MADE_UP_STATUS",
    });
    expect(record.crm_status).toBe("");
  });

  test("blanks out an invalid data_source instead of keeping it", () => {
    const { record } = validateAndCleanRecord({
      email: "a@b.com",
      data_source: "some_random_source",
    });
    expect(record.data_source).toBe("");
  });

  test("blanks an unparseable created_at and notes it in crm_note", () => {
    const { record } = validateAndCleanRecord({
      email: "a@b.com",
      created_at: "not-a-real-date",
    });
    expect(record.created_at).toBe("");
    expect(record.crm_note).toMatch(/could not be parsed/i);
  });

  test("moves extra emails into crm_note and keeps the first as primary", () => {
    const { record } = validateAndCleanRecord({
      email: "first@example.com;second@example.com",
      crm_note: "Existing note",
    });
    expect(record.email).toBe("first@example.com");
    expect(record.crm_note).toContain("Existing note");
    expect(record.crm_note).toContain("second@example.com");
  });

  test("moves extra mobile numbers into crm_note and keeps the first as primary", () => {
    const { record } = validateAndCleanRecord({
      email: "a@b.com",
      mobile_without_country_code: "9876543210,9876543211",
    });
    expect(record.mobile_without_country_code).toBe("9876543210");
    expect(record.crm_note).toContain("9876543211");
  });

  test("skips a record with neither email nor mobile", () => {
    const { skip, skipReason } = validateAndCleanRecord({
      name: "No Contact Person",
    });
    expect(skip).toBe(true);
    expect(skipReason).toMatch(/missing both email and mobile/i);
  });

  test("does NOT skip a record that has only a mobile number", () => {
    const { skip } = validateAndCleanRecord({
      mobile_without_country_code: "9876543210",
    });
    expect(skip).toBe(false);
  });

  test("escapes raw line breaks so the record stays CSV-safe", () => {
    const { record } = validateAndCleanRecord({
      email: "a@b.com",
      description: "Line one\nLine two",
    });
    expect(record.description).toBe("Line one\\nLine two");
    expect(record.description).not.toContain("\n");
  });
});