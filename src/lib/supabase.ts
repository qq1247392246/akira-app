import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

let client: SupabaseClient<Database> | null = null;

function assertSupabaseEnv() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Supabase 环境变量缺失：请在 .env.local 中配置 SUPABASE_URL 与 SUPABASE_SERVICE_ROLE_KEY");
  }
}

export function getSupabaseAdmin(): SupabaseClient<Database> {
  if (client) return client;
  assertSupabaseEnv();
  client = createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false },
    }
  );
  return client;
}

