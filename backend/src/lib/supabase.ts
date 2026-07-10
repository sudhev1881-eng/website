import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getEnv } from "../config/env.js";

let adminClient: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (!adminClient) {
    const env = getEnv();
    adminClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return adminClient;
}

export async function verifySupabaseAccessToken(
  accessToken: string,
): Promise<{ id: string; email?: string } | null> {
  const { data, error } = await getSupabaseAdmin().auth.getUser(accessToken);
  if (error || !data.user) return null;
  return { id: data.user.id, email: data.user.email ?? undefined };
}
