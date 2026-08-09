import type { SupabaseClient } from "@supabase/supabase-js";
import { LIFECYCLES, type Lifecycle } from "@/lib/types";

export type ImportResult = {
  created: number;
  updated: number;
  failed: number;
  errors: Array<{ row: number; message: string }>;
};

const EMPTY: ImportResult = { created: 0, updated: 0, failed: 0, errors: [] };

/** Rows per round trip. Large enough to import 1,000 contacts in a few calls,
 *  small enough that one bad row does not fail an enormous statement. */
const CHUNK = 250;

function chunked<T>(items: T[], size = CHUNK): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

const VALID_LIFECYCLES = new Set<string>(LIFECYCLES.map((l) => l.value));

function toLifecycle(value: string | undefined): Lifecycle {
  const candidate = value?.trim().toLowerCase();
  return candidate && VALID_LIFECYCLES.has(candidate)
    ? (candidate as Lifecycle)
    : "new";
}

/**
 * Resolve company names to ids, creating any that do not exist yet.
 *
 * A contact import that mentions "Acme Inc." should not silently drop the
 * association just because the company was never added by hand.
 */
async function resolveCompanies(
  supabase: SupabaseClient,
  workspaceId: string,
  names: string[],
): Promise<Map<string, string>> {
  const wanted = Array.from(
    new Set(names.map((n) => n.trim()).filter(Boolean)),
  );
  const map = new Map<string, string>();
  if (wanted.length === 0) return map;

  const { data: existing } = await supabase
    .from("companies")
    .select("id, name")
    .eq("workspace_id", workspaceId);

  for (const row of existing ?? []) {
    map.set(String(row.name).toLowerCase(), row.id as string);
  }

  const missing = wanted.filter((n) => !map.has(n.toLowerCase()));
  for (const batch of chunked(missing)) {
    const { data: inserted } = await supabase
      .from("companies")
      .insert(batch.map((name) => ({ workspace_id: workspaceId, name })))
      .select("id, name");
    for (const row of inserted ?? []) {
      map.set(String(row.name).toLowerCase(), row.id as string);
    }
  }

  return map;
}

/**
 * Import people.
 *
 * Re-importing the same list updates rows rather than duplicating them: email
 * is the identity within a workspace. Rows without an email cannot be matched,
 * so they are always inserted — importing the same email-less list twice will
 * produce duplicates, which is the honest behaviour when there is nothing to
 * match on.
 */
export async function importContacts(
  supabase: SupabaseClient,
  workspaceId: string,
  records: Array<Record<string, string>>,
): Promise<ImportResult> {
  if (records.length === 0) return { ...EMPTY };

  const result: ImportResult = { created: 0, updated: 0, failed: 0, errors: [] };

  const companyMap = await resolveCompanies(
    supabase,
    workspaceId,
    records.map((r) => r.company ?? "").filter(Boolean),
  );

  // Existing people, so a second import updates instead of duplicating.
  const { data: existingRows } = await supabase
    .from("contacts")
    .select("id, email")
    .eq("workspace_id", workspaceId)
    .not("email", "is", null);

  const byEmail = new Map<string, string>();
  for (const row of existingRows ?? []) {
    if (row.email) byEmail.set(String(row.email).toLowerCase(), row.id as string);
  }

  const toInsert: Array<Record<string, unknown>> = [];
  const toUpdate: Array<Record<string, unknown>> = [];
  const seenEmails = new Set<string>();

  records.forEach((record, index) => {
    const rowNumber = index + 2; // +1 for zero-index, +1 for the header row

    const first =
      record.first_name?.trim() ||
      // A list with only a full name column still imports sensibly.
      record.name?.trim().split(/\s+/)[0] ||
      record.email?.split("@")[0] ||
      "";

    if (!first) {
      result.failed++;
      result.errors.push({
        row: rowNumber,
        message: "No first name or email to identify this person.",
      });
      return;
    }

    const lifecycle = toLifecycle(record.lifecycle);

    const payload: Record<string, unknown> = {
      workspace_id: workspaceId,
      first_name: first,
      last_name: record.last_name ?? null,
      email: record.email ?? null,
      phone: record.phone ?? null,
      title: record.title ?? null,
      linkedin: record.linkedin ?? null,
      source: record.source ?? null,
      notes: record.notes ?? null,
      lifecycle,
      company_id: record.company
        ? (companyMap.get(record.company.trim().toLowerCase()) ?? null)
        : null,
    };

    const email = record.email?.toLowerCase();

    if (email) {
      // Guard against the same address appearing twice in one file, which
      // would otherwise trip the unique index mid-batch.
      if (seenEmails.has(email)) {
        result.failed++;
        result.errors.push({
          row: rowNumber,
          message: `Duplicate of an earlier row in this file (${email}).`,
        });
        return;
      }
      seenEmails.add(email);

      const existingId = byEmail.get(email);
      if (existingId) {
        toUpdate.push({ ...payload, id: existingId });
        return;
      }
    }

    toInsert.push(payload);
  });

  for (const batch of chunked(toInsert)) {
    const { error, count } = await supabase
      .from("contacts")
      .insert(batch, { count: "exact" });
    if (error) {
      result.failed += batch.length;
      result.errors.push({ row: 0, message: error.message });
    } else {
      result.created += count ?? batch.length;
    }
  }

  for (const batch of chunked(toUpdate)) {
    const { error, count } = await supabase
      .from("contacts")
      .upsert(batch, { onConflict: "id", count: "exact" });
    if (error) {
      result.failed += batch.length;
      result.errors.push({ row: 0, message: error.message });
    } else {
      result.updated += count ?? batch.length;
    }
  }

  return result;
}

/** Import organisations. Name is the identity within a workspace. */
export async function importCompanies(
  supabase: SupabaseClient,
  workspaceId: string,
  records: Array<Record<string, string>>,
): Promise<ImportResult> {
  if (records.length === 0) return { ...EMPTY };

  const result: ImportResult = { created: 0, updated: 0, failed: 0, errors: [] };

  const { data: existingRows } = await supabase
    .from("companies")
    .select("id, name")
    .eq("workspace_id", workspaceId);

  const byName = new Map<string, string>();
  for (const row of existingRows ?? []) {
    byName.set(String(row.name).toLowerCase(), row.id as string);
  }

  const toInsert: Array<Record<string, unknown>> = [];
  const toUpdate: Array<Record<string, unknown>> = [];
  const seen = new Set<string>();

  records.forEach((record, index) => {
    const rowNumber = index + 2;
    const name = record.name?.trim();

    if (!name) {
      result.failed++;
      result.errors.push({ row: rowNumber, message: "Missing company name." });
      return;
    }

    const key = name.toLowerCase();
    if (seen.has(key)) {
      result.failed++;
      result.errors.push({
        row: rowNumber,
        message: `Duplicate of an earlier row in this file (${name}).`,
      });
      return;
    }
    seen.add(key);

    const payload: Record<string, unknown> = {
      workspace_id: workspaceId,
      name,
      domain: record.domain ?? null,
      website: record.website ?? null,
      industry: record.industry ?? null,
      size: record.size ?? null,
      location: record.location ?? null,
      description: record.description ?? null,
    };

    const existingId = byName.get(key);
    if (existingId) toUpdate.push({ ...payload, id: existingId });
    else toInsert.push(payload);
  });

  for (const batch of chunked(toInsert)) {
    const { error, count } = await supabase
      .from("companies")
      .insert(batch, { count: "exact" });
    if (error) {
      result.failed += batch.length;
      result.errors.push({ row: 0, message: error.message });
    } else {
      result.created += count ?? batch.length;
    }
  }

  for (const batch of chunked(toUpdate)) {
    const { error, count } = await supabase
      .from("companies")
      .upsert(batch, { onConflict: "id", count: "exact" });
    if (error) {
      result.failed += batch.length;
      result.errors.push({ row: 0, message: error.message });
    } else {
      result.updated += count ?? batch.length;
    }
  }

  return result;
}

/** Record what an import did, so a bad file can be understood afterwards. */
export async function logImportRun(
  supabase: SupabaseClient,
  workspaceId: string,
  entity: string,
  source: "csv" | "api",
  result: ImportResult,
  author: string | null,
) {
  await supabase.from("import_runs").insert({
    workspace_id: workspaceId,
    entity,
    source,
    created: result.created,
    updated: result.updated,
    failed: result.failed,
    // Keep the log row small; the first handful explain the pattern.
    errors: result.errors.slice(0, 25),
    author,
  });
}
