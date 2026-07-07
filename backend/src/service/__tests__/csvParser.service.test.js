const { parseCsvBuffer } = require("../csvParser.service");

function toBuffer(str) {
  return Buffer.from(str, "utf-8");
}

describe("parseCsvBuffer", () => {
  test("parses a simple CSV into row objects keyed by header", () => {
    const csv = "name,email\nJohn Doe,john@example.com\nJane Doe,jane@example.com";
    const { headers, rows } = parseCsvBuffer(toBuffer(csv));

    expect(headers).toEqual(["name", "email"]);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({ name: "John Doe", email: "john@example.com" });
  });

  test("makes no assumptions about column names — arbitrary headers pass through as-is", () => {
    const csv = "Full Name,Contact Number\nAmit,9876543210";
    const { headers, rows } = parseCsvBuffer(toBuffer(csv));

    expect(headers).toEqual(["Full Name", "Contact Number"]);
    expect(rows[0]["Full Name"]).toBe("Amit");
  });

  test("strips a UTF-8 BOM if present", () => {
    const bom = Buffer.from([0xef, 0xbb, 0xbf]);
    const csv = Buffer.concat([bom, toBuffer("name,email\nJohn,john@example.com")]);
    const { headers, rows } = parseCsvBuffer(csv);

    expect(headers[0]).toBe("name");
    expect(rows[0].name).toBe("John");
  });

  test("tolerates ragged rows (fewer/extra columns) instead of throwing", () => {
    const csv = "a,b,c\n1,2\n3,4,5,6";
    expect(() => parseCsvBuffer(toBuffer(csv))).not.toThrow();
  });

  test("skips fully empty lines", () => {
    const csv = "name,email\nJohn,john@example.com\n\n\nJane,jane@example.com";
    const { rows } = parseCsvBuffer(toBuffer(csv));
    expect(rows).toHaveLength(2);
  });

  test("returns empty rows/headers for a CSV with only a header row", () => {
    const csv = "name,email";
    const { rows } = parseCsvBuffer(toBuffer(csv));
    expect(rows).toHaveLength(0);
  });
});