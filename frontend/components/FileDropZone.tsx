"use client";

import { useCallback, useState } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";

interface FileDropzoneProps {
  onFileAccepted: (file: File) => void;
}

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB, matches backend limit

export default function FileDropzone({ onFileAccepted }: FileDropzoneProps) {
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[], rejections: FileRejection[]) => {
      setError(null);

      if (rejections.length > 0) {
        const reason = rejections[0].errors[0];
        if (reason?.code === "file-too-large") {
          setError("File is too large. Max size is 5MB.");
        } else if (reason?.code === "file-invalid-type") {
          setError("Only .csv files are supported.");
        } else {
          setError(reason?.message || "This file could not be accepted.");
        }
        return;
      }

      if (acceptedFiles.length > 0) {
        onFileAccepted(acceptedFiles[0]);
      }
    },
    [onFileAccepted]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "text/csv": [".csv"] },
    maxSize: MAX_SIZE_BYTES,
    multiple: false,
  });

  return (
    <div className="w-full flex flex-col gap-3">
      <div
        {...getRootProps()}
        className="w-full rounded-lg border-2 border-dashed cursor-pointer transition-colors flex flex-col items-center justify-center gap-3 px-6 py-12 text-center"
        style={{
          borderColor: isDragActive ? "var(--color-accent)" : "var(--color-line)",
          backgroundColor: isDragActive ? "var(--color-surface-raised)" : "transparent",
        }}
      >
        <input {...getInputProps()} />
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke={isDragActive ? "var(--color-accent)" : "var(--color-muted)"}
          strokeWidth="1.5"
        >
          <path
            d="M12 16V4m0 0L7 9m5-5l5 5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <div>
          <p className="font-medium" style={{ fontFamily: "var(--font-display)" }}>
            {isDragActive ? "Drop it here" : "Drop your CSV file here"}
          </p>
          <p className="text-sm mt-1" style={{ color: "var(--color-muted)" }}>
            or click to browse files
          </p>
        </div>
        <span
          className="font-mono text-xs px-2 py-1 rounded"
          style={{ backgroundColor: "var(--color-surface-raised)", color: "var(--color-muted)" }}
        >
          Supported: .csv (max 5MB)
        </span>
      </div>
      {error && (
        <p className="text-sm" style={{ color: "var(--color-danger)" }}>
          {error}
        </p>
      )}
    </div>
  );
}