/**
 * Parse CSV / TSV / TXT / Excel student import payloads.
 * PDF / image OCR is intentionally stubbed for MVP (see parseOcrStub).
 */

export interface ImportStudentRow {
  name: string;
  email?: string;
  college?: string;
  major?: string;
  line: number;
}

export interface ImportParseResult {
  rows: ImportStudentRow[];
  warnings: string[];
  format: "csv" | "tsv" | "txt" | "excel" | "ocr_stub" | "unknown";
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if ((ch === "," || ch === "\t") && !inQuotes) {
      out.push(cur.trim());
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur.trim());
  return out;
}

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/[\s_-]+/g, "");
}

function mapHeaderIndex(headers: string[]): {
  name?: number;
  email?: number;
  college?: number;
  major?: number;
} {
  const map: { name?: number; email?: number; college?: number; major?: number } = {};
  headers.forEach((h, i) => {
    const n = normalizeHeader(h);
    if (["name", "fullname", "studentname", "fullnamename"].includes(n)) map.name = i;
    else if (["email", "mail", "e-mail"].includes(n) || n === "emailaddress") map.email = i;
    else if (["college", "university", "school", "uni"].includes(n)) map.college = i;
    else if (["major", "programme", "program", "course"].includes(n)) map.major = i;
  });
  return map;
}

function rowFromCells(
  cells: string[],
  line: number,
  headerMap?: ReturnType<typeof mapHeaderIndex>,
): ImportStudentRow | null {
  if (headerMap && headerMap.name !== undefined) {
    const name = cells[headerMap.name]?.trim();
    if (!name) return null;
    return {
      name,
      email: headerMap.email !== undefined ? cells[headerMap.email]?.trim() || undefined : undefined,
      college:
        headerMap.college !== undefined ? cells[headerMap.college]?.trim() || undefined : undefined,
      major: headerMap.major !== undefined ? cells[headerMap.major]?.trim() || undefined : undefined,
      line,
    };
  }

  // Positional: name, email, college, major
  const name = cells[0]?.trim();
  if (!name) return null;
  const email = cells[1]?.includes("@") ? cells[1].trim() : undefined;
  const college = email ? cells[2]?.trim() : cells[1]?.trim();
  const major = email ? cells[3]?.trim() : cells[2]?.trim();
  return { name, email, college: college || undefined, major: major || undefined, line };
}

export function parseDelimitedText(text: string): ImportParseResult {
  const warnings: string[] = [];
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));

  if (lines.length === 0) {
    return { rows: [], warnings: ["No rows found"], format: "unknown" };
  }

  const delimiter = lines[0].includes("\t") ? "\t" : ",";
  const format = delimiter === "\t" ? "tsv" : lines[0].includes(",") ? "csv" : "txt";

  let start = 0;
  let headerMap: ReturnType<typeof mapHeaderIndex> | undefined;
  const firstCells = splitCsvLine(lines[0]);
  const maybeHeaders = mapHeaderIndex(firstCells);
  if (maybeHeaders.name !== undefined) {
    headerMap = maybeHeaders;
    start = 1;
  }

  const rows: ImportStudentRow[] = [];
  for (let i = start; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]);
    const row = rowFromCells(cells, i + 1, headerMap);
    if (!row) {
      warnings.push(`Skipped line ${i + 1}`);
      continue;
    }
    rows.push(row);
  }

  return { rows, warnings, format };
}

export async function parseExcelBuffer(buffer: Buffer): Promise<ImportParseResult> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return { rows: [], warnings: ["Excel workbook has no sheets"], format: "excel" };
  }
  const sheet = workbook.Sheets[sheetName];
  const csv = XLSX.utils.sheet_to_csv(sheet);
  const parsed = parseDelimitedText(csv);
  return { ...parsed, format: "excel" };
}

/**
 * TODO(production): Optional OCR path for PDF/images.
 * Suggested deps: `pdf-parse` + OCR service (e.g. Google Vision / Tesseract) behind a feature flag.
 * Do not enable by default — heavy infra and variable accuracy.
 */
export function parseOcrStub(_buffer: Buffer, filename: string): ImportParseResult {
  return {
    rows: [],
    warnings: [
      `OCR for "${filename}" is not enabled in this MVP. Export to CSV/Excel/TXT and re-upload.`,
      "TODO: wire optional PDF/image OCR behind OPENAI_API_KEY or a dedicated OCR provider.",
    ],
    format: "ocr_stub",
  };
}

export function detectAndParseFile(filename: string, buffer: Buffer): Promise<ImportParseResult> | ImportParseResult {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
    return parseExcelBuffer(buffer);
  }
  if (lower.endsWith(".csv") || lower.endsWith(".tsv") || lower.endsWith(".txt")) {
    return parseDelimitedText(buffer.toString("utf8"));
  }
  if (lower.endsWith(".pdf") || /\.(png|jpe?g|webp|gif)$/i.test(lower)) {
    return parseOcrStub(buffer, filename);
  }
  // Try text
  const asText = buffer.toString("utf8");
  if (asText.includes(",") || asText.includes("\t") || asText.includes("\n")) {
    return parseDelimitedText(asText);
  }
  return {
    rows: [],
    warnings: [`Unsupported file type: ${filename}. Use CSV, Excel, or TXT.`],
    format: "unknown",
  };
}
