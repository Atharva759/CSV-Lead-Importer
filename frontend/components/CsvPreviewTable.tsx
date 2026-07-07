interface CsvPreviewTableProps {
  headers: string[];
  rows: Record<string, string>[];
  maxHeightClass?: string;
  monoValues?: boolean;
}

export default function CsvPreviewTable({
  headers,
  rows,
  maxHeightClass = "max-h-[420px]",
  monoValues = true,
}: CsvPreviewTableProps) {
  return (
    <div
      className={`data-scroll w-full overflow-auto rounded-lg border ${maxHeightClass}`}
      style={{ borderColor: "var(--color-line)" }}
    >
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr>
            {headers.map((header) => (
              <th
                key={header}
                className="sticky top-0 z-10 text-left px-3 py-2 font-mono text-xs uppercase tracking-wide whitespace-nowrap border-b"
                style={{
                  backgroundColor: "var(--color-surface-raised)",
                  color: "var(--color-muted)",
                  borderColor: "var(--color-line)",
                }}
              >
                {header || <span style={{ color: "var(--color-danger)" }}>(blank)</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr
              key={rowIndex}
              className="border-b last:border-b-0"
              style={{ borderColor: "var(--color-line)" }}
            >
              {headers.map((header) => (
                <td
                  key={header}
                  className={`px-3 py-2 whitespace-nowrap ${monoValues ? "font-mono" : ""}`}
                  style={{ color: "var(--color-paper)" }}
                >
                  {row[header] || <span style={{ color: "var(--color-line)" }}>—</span>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && (
        <p className="text-sm text-center py-8" style={{ color: "var(--color-muted)" }}>
          No rows to display.
        </p>
      )}
    </div>
  );
}