/**
 * A small RFC 4180 CSV reader.
 *
 * Written by hand rather than pulled in as a dependency because the job is
 * narrow — quoted fields, escaped quotes, and newlines inside quotes — and a
 * parser that splits on commas would mangle any address column.
 */
export function parseCsv(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  // Strip a UTF-8 BOM, which Excel writes and which would otherwise become
  // part of the first header name.
  const text = input.replace(/^﻿/, "");

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\r") {
      // Handled by the \n that follows it.
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  // Whatever is left after the final newline.
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

/** "First Name" and "first_name" should both map to firstName. */
function normaliseHeader(header: string) {
  return header.trim().toLowerCase().replace(/[\s_-]+/g, "");
}

/**
 * Parse into objects keyed by a canonical field name.
 *
 * `aliases` maps a canonical name to the header spellings that mean it, so a
 * list exported from LinkedIn, Apollo or a spreadsheet all import without the
 * user renaming columns first.
 */
export function parseCsvRecords(
  input: string,
  aliases: Record<string, string[]>,
): { records: Array<Record<string, string>>; headers: string[]; unmapped: string[] } {
  const rows = parseCsv(input);
  if (rows.length === 0) return { records: [], headers: [], unmapped: [] };

  const headers = rows[0].map((h) => h.trim());

  const lookup = new Map<string, string>();
  for (const [canonical, spellings] of Object.entries(aliases)) {
    for (const spelling of spellings) {
      lookup.set(normaliseHeader(spelling), canonical);
    }
  }

  const columnMap = headers.map((h) => lookup.get(normaliseHeader(h)) ?? null);
  const unmapped = headers.filter((_, i) => columnMap[i] === null);

  const records = rows.slice(1).map((row) => {
    const record: Record<string, string> = {};
    columnMap.forEach((canonical, index) => {
      if (!canonical) return;
      const value = (row[index] ?? "").trim();
      if (value !== "") record[canonical] = value;
    });
    return record;
  });

  return { records, headers, unmapped };
}

export const CONTACT_ALIASES: Record<string, string[]> = {
  first_name: ["first name", "firstname", "given name", "first"],
  last_name: ["last name", "lastname", "surname", "family name", "last"],
  email: ["email", "email address", "e-mail", "work email"],
  phone: ["phone", "phone number", "mobile", "telephone", "tel"],
  title: ["title", "job title", "position", "role", "headline"],
  company: ["company", "company name", "organisation", "organization", "account", "employer"],
  linkedin: ["linkedin", "linkedin url", "linkedin profile", "profile url"],
  source: ["source", "lead source", "channel"],
  notes: ["notes", "note", "comment", "comments"],
  lifecycle: ["lifecycle", "status", "stage"],
};

export const COMPANY_ALIASES: Record<string, string[]> = {
  name: ["name", "company", "company name", "organisation", "organization", "account"],
  domain: ["domain", "website domain", "url domain"],
  website: ["website", "url", "web", "site"],
  industry: ["industry", "sector", "vertical"],
  size: ["size", "headcount", "employees", "employee count", "company size"],
  location: ["location", "city", "country", "address", "hq"],
  description: ["description", "about", "summary", "notes"],
};
