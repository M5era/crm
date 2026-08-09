import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * API requests arrive with no user session, so they cannot use the cookie
 * client — row level security would reject every write. Instead the bearer
 * token is verified here and the request proceeds with the service role,
 * scoped in code to the single workspace that token belongs to.
 *
 * The service key is read from the environment and never committed. Without it
 * the API refuses to serve rather than falling back to something weaker.
 */
function serviceClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export const TOKEN_PREFIX = "crm_live_";

export function generateToken() {
  const secret = randomBytes(24).toString("base64url");
  const token = `${TOKEN_PREFIX}${secret}`;
  return {
    token,
    hash: hashToken(token),
    // Enough to recognise a key in a list, not enough to use it.
    prefix: token.slice(0, TOKEN_PREFIX.length + 6),
  };
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export type AuthResult =
  | { ok: true; workspaceId: string; keyId: string; supabase: SupabaseClient }
  | { ok: false; status: number; error: string };

/** Validate `Authorization: Bearer <token>` and resolve its workspace. */
export async function authenticateRequest(
  request: Request,
): Promise<AuthResult> {
  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());

  if (!match) {
    return {
      ok: false,
      status: 401,
      error: "Missing Authorization header. Use: Authorization: Bearer <token>",
    };
  }

  const token = match[1].trim();
  const supabase = serviceClient();

  if (!supabase) {
    return {
      ok: false,
      status: 503,
      error:
        "The API is not configured on this deployment: SUPABASE_SERVICE_ROLE_KEY is unset.",
    };
  }

  const { data, error } = await supabase
    .from("api_keys")
    .select("id, workspace_id, token_hash, revoked_at")
    .eq("token_hash", hashToken(token))
    .maybeSingle();

  if (error || !data) {
    return { ok: false, status: 401, error: "Invalid API key." };
  }

  // The lookup above already matched on the hash; this comparison is a
  // belt-and-braces constant-time check against timing differences.
  const a = Buffer.from(String(data.token_hash));
  const b = Buffer.from(hashToken(token));
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, status: 401, error: "Invalid API key." };
  }

  if (data.revoked_at) {
    return { ok: false, status: 401, error: "This API key has been revoked." };
  }

  // Fire-and-forget: a failed timestamp update must not fail the request.
  void supabase
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id);

  return {
    ok: true,
    workspaceId: data.workspace_id as string,
    keyId: data.id as string,
    supabase,
  };
}

export function jsonError(status: number, error: string) {
  return Response.json({ error }, { status });
}
