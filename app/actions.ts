"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ActivityType, LeadStatus } from "@/lib/types";

export type ActionState = { error?: string; ok?: boolean };

/** Empty form fields should land as NULL, not as empty strings. */
function text(form: FormData, key: string): string | null {
  const value = form.get(key);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function number(form: FormData, key: string): number {
  const value = text(form, key);
  if (!value) return 0;
  const parsed = Number(value.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function revalidateEverything() {
  revalidatePath("/", "layout");
}

// ------------------------------------------------------------------- leads

export async function createLead(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const title = text(form, "title");
  if (!title) return { error: "Give the lead a name." };

  const supabase = await createClient();
  let stageId = text(form, "stage_id");

  if (!stageId) {
    const { data } = await supabase
      .from("stages")
      .select("id")
      .order("position")
      .limit(1)
      .maybeSingle();
    stageId = (data?.id as string) ?? null;
  }
  if (!stageId) return { error: "No pipeline stages are configured." };

  const { error } = await supabase.from("leads").insert({
    title,
    stage_id: stageId,
    company_id: text(form, "company_id"),
    contact_id: text(form, "contact_id"),
    value: number(form, "value"),
    source: text(form, "source"),
    owner: text(form, "owner"),
    expected_close_date: text(form, "expected_close_date"),
    notes: text(form, "notes"),
  });

  if (error) return { error: error.message };
  revalidateEverything();
  return { ok: true };
}

export async function updateLead(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const id = text(form, "id");
  const title = text(form, "title");
  if (!id) return { error: "Missing lead id." };
  if (!title) return { error: "Give the lead a name." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("leads")
    .update({
      title,
      company_id: text(form, "company_id"),
      contact_id: text(form, "contact_id"),
      stage_id: text(form, "stage_id"),
      value: number(form, "value"),
      source: text(form, "source"),
      owner: text(form, "owner"),
      expected_close_date: text(form, "expected_close_date"),
      notes: text(form, "notes"),
    })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidateEverything();
  return { ok: true };
}

/** Called by the board on drop, and by the stage picker on a lead page. */
export async function moveLeadToStage(leadId: string, stageId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("leads")
    .update({ stage_id: stageId })
    .eq("id", leadId);
  if (error) throw new Error(error.message);
  revalidateEverything();
}

export async function setLeadStatus(leadId: string, status: LeadStatus) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("leads")
    .update({ status })
    .eq("id", leadId);
  if (error) throw new Error(error.message);
  revalidateEverything();
}

export async function deleteLead(form: FormData) {
  const id = form.get("id");
  if (typeof id !== "string") return;
  const supabase = await createClient();
  await supabase.from("leads").delete().eq("id", id);
  revalidateEverything();
  redirect("/pipeline");
}

// ---------------------------------------------------------------- contacts

export async function createContact(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const firstName = text(form, "first_name");
  if (!firstName) return { error: "A first name is required." };

  const supabase = await createClient();
  const { error } = await supabase.from("contacts").insert({
    first_name: firstName,
    last_name: text(form, "last_name"),
    email: text(form, "email"),
    phone: text(form, "phone"),
    title: text(form, "title"),
    company_id: text(form, "company_id"),
    linkedin: text(form, "linkedin"),
    source: text(form, "source"),
    notes: text(form, "notes"),
  });

  if (error) return { error: error.message };
  revalidateEverything();
  return { ok: true };
}

export async function updateContact(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const id = text(form, "id");
  const firstName = text(form, "first_name");
  if (!id) return { error: "Missing contact id." };
  if (!firstName) return { error: "A first name is required." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("contacts")
    .update({
      first_name: firstName,
      last_name: text(form, "last_name"),
      email: text(form, "email"),
      phone: text(form, "phone"),
      title: text(form, "title"),
      company_id: text(form, "company_id"),
      linkedin: text(form, "linkedin"),
      source: text(form, "source"),
      notes: text(form, "notes"),
    })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidateEverything();
  return { ok: true };
}

export async function deleteContact(form: FormData) {
  const id = form.get("id");
  if (typeof id !== "string") return;
  const supabase = await createClient();
  await supabase.from("contacts").delete().eq("id", id);
  revalidateEverything();
  redirect("/contacts");
}

// --------------------------------------------------------------- companies

export async function createCompany(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const name = text(form, "name");
  if (!name) return { error: "A company name is required." };

  const supabase = await createClient();
  const { error } = await supabase.from("companies").insert({
    name,
    domain: text(form, "domain"),
    website: text(form, "website"),
    industry: text(form, "industry"),
    size: text(form, "size"),
    location: text(form, "location"),
    description: text(form, "description"),
  });

  if (error) return { error: error.message };
  revalidateEverything();
  return { ok: true };
}

export async function updateCompany(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const id = text(form, "id");
  const name = text(form, "name");
  if (!id) return { error: "Missing company id." };
  if (!name) return { error: "A company name is required." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("companies")
    .update({
      name,
      domain: text(form, "domain"),
      website: text(form, "website"),
      industry: text(form, "industry"),
      size: text(form, "size"),
      location: text(form, "location"),
      description: text(form, "description"),
    })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidateEverything();
  return { ok: true };
}

export async function deleteCompany(form: FormData) {
  const id = form.get("id");
  if (typeof id !== "string") return;
  const supabase = await createClient();
  await supabase.from("companies").delete().eq("id", id);
  revalidateEverything();
  redirect("/companies");
}

// -------------------------------------------------------------- activities

export async function createActivity(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const subject = text(form, "subject");
  if (!subject) return { error: "Add a short summary." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("activities").insert({
    type: (text(form, "type") ?? "note") as ActivityType,
    subject,
    body: text(form, "body"),
    lead_id: text(form, "lead_id"),
    contact_id: text(form, "contact_id"),
    company_id: text(form, "company_id"),
    author: user?.email ?? null,
  });

  if (error) return { error: error.message };
  revalidateEverything();
  return { ok: true };
}

export async function deleteActivity(form: FormData) {
  const id = form.get("id");
  if (typeof id !== "string") return;
  const supabase = await createClient();
  await supabase.from("activities").delete().eq("id", id);
  revalidateEverything();
}

// ---------------------------------------------------------------- auth

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
