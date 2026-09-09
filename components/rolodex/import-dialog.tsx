"use client";

import { useRouter } from "next/navigation";
import { useState, type ChangeEvent } from "react";
import {
  applyImportAction,
  parseImportAction,
  previewMappedCsvAction,
  type ImportPreviewRow,
} from "@/lib/rolodex/import-actions";
import styles from "./people.module.css";

const PERSON_FIELDS = [
  { key: "name", label: "Name" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "jobTitle", label: "Job title" },
  { key: "company", label: "Company" },
  { key: "city", label: "City" },
  { key: "birthday", label: "Birthday" },
  { key: "notes", label: "Notes" },
] as const;

export function ImportPeopleButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Import
      </button>
      {open ? <ImportDialog onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function ImportDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [filename, setFilename] = useState("");
  const [format, setFormat] = useState<"csv" | "vcf" | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [rows, setRows] = useState<ImportPreviewRow[]>([]);
  const [pending, setPending] = useState(false);

  async function onFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    setError(null);
    setPending(true);
    try {
      const contents = await file.text();
      setText(contents);
      setFilename(file.name);
      const parsed = await parseImportAction(contents, file.name);
      if (parsed.error) {
        setError(parsed.error);
        setRows([]);
        setFormat(null);
        return;
      }
      setFormat(parsed.format);
      setHeaders(parsed.headers);
      setMapping(parsed.suggestedMapping ?? {});
      setRows(parsed.people);
    } catch {
      setError("Could not parse that file.");
      setRows([]);
    } finally {
      setPending(false);
    }
  }

  async function remap(next: Record<string, string>) {
    setMapping(next);
    if (!text) {
      return;
    }
    const preview = await previewMappedCsvAction(text, next);
    setRows(preview.people);
  }

  async function onApply() {
    setPending(true);
    setError(null);
    try {
      const selected = rows.filter((row) => row.selected && !row.isDuplicate);
      await applyImportAction(selected);
      router.refresh();
      onClose();
    } catch {
      setError("Import failed. Nobody was added.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={styles["rolodex-dialog-backdrop"]}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-title"
        className={styles["rolodex-dialog"]}
      >
        <h2 id="import-title">Import people</h2>
        {error ? <p role="alert">{error}</p> : null}
        <div className={styles["rolodex-field"]}>
          <label htmlFor="import-file">CSV or vCard file</label>
          <input
            id="import-file"
            type="file"
            accept=".csv,.vcf,.vcard,text/csv,text/vcard"
            onChange={onFile}
          />
        </div>
        {format === "csv" && headers.length > 0 ? (
          <div>
            <p>Column mapping</p>
            {headers.map((header) => (
              <div key={header} className={styles["rolodex-field"]}>
                <label htmlFor={`map-${header}`}>{header}</label>
                <select
                  id={`map-${header}`}
                  value={mapping[header] ?? ""}
                  onChange={(event) => {
                    const next = { ...mapping };
                    if (event.target.value) {
                      next[header] = event.target.value;
                    } else {
                      delete next[header];
                    }
                    void remap(next);
                  }}
                >
                  <option value="">Ignore</option>
                  {PERSON_FIELDS.map((field) => (
                    <option key={field.key} value={field.key}>
                      {field.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        ) : null}
        {rows.length > 0 ? (
          <div className={styles["rolodex-table-wrap"]}>
            <table className={styles["rolodex-table"]}>
              <thead>
                <tr>
                  <th>Import</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Company</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={`${row.name}-${index}`}>
                    <td>
                      <input
                        type="checkbox"
                        checked={row.selected}
                        disabled={row.isDuplicate}
                        aria-label={
                          row.isDuplicate
                            ? `Duplicate of ${row.duplicateOfName ?? "existing person"}`
                            : `Import ${row.name}`
                        }
                        onChange={(event) => {
                          const next = [...rows];
                          next[index] = {
                            ...row,
                            selected: event.target.checked,
                          };
                          setRows(next);
                        }}
                      />
                    </td>
                    <td>
                      {row.name}
                      {row.isDuplicate ? " (duplicate)" : ""}
                    </td>
                    <td>{row.email ?? ""}</td>
                    <td>{row.company ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        <div className={styles["rolodex-form-actions"]}>
          <button type="button" onClick={onClose} disabled={pending}>
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void onApply()}
            disabled={pending || rows.every((row) => !row.selected)}
          >
            Import
          </button>
        </div>
      </div>
    </div>
  );
}
