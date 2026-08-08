import "server-only";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Workspace } from "@/lib/types";

export async function getWorkspaces(): Promise<Workspace[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workspaces")
    .select("*")
    .order("position");
  if (error) throw error;
  return (data ?? []) as Workspace[];
}

export async function getWorkspaceBySlug(
  slug: string,
): Promise<Workspace | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workspaces")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return (data as Workspace) ?? null;
}

/**
 * Resolve the workspace in the URL, 404ing on an unknown slug. Every scoped
 * page starts here, so a made-up slug never reaches a query.
 */
export async function requireWorkspace(slug: string): Promise<Workspace> {
  const workspace = await getWorkspaceBySlug(slug);
  if (!workspace) notFound();
  return workspace;
}

/** Where "/" sends you: the first workspace by position. */
export async function getDefaultWorkspace(): Promise<Workspace | null> {
  const workspaces = await getWorkspaces();
  return workspaces[0] ?? null;
}
