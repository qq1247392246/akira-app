import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

let client: SupabaseClient<Database> | null = null;

function resolveSupabaseKey() {
  const url = process.env.SUPABASE_URL;
  const serviceRole =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_SERVICE_TOKEN;
  const fallbackKey =
    process.env.SUPABASE_API_KEY ||
    process.env.SUPABASE_KEY ||
    process.env.SUPABASE_ANON_KEY;

  if (!url) {
    throw new Error("Supabase 环境变量缺失：未检测到 SUPABASE_URL。");
  }

  if (serviceRole) {
    return { url, key: serviceRole };
  }

  if (fallbackKey) {
    console.warn(
      "[supabase] 未检测到 SUPABASE_SERVICE_ROLE_KEY，已退回使用公开 key。请确认 RLS/权限配置，以免暴露敏感数据。"
    );
    return { url, key: fallbackKey };
  }

  throw new Error(
    "Supabase 环境变量缺失：请至少配置 SUPABASE_SERVICE_ROLE_KEY 或 SUPABASE_ANON_KEY。"
  );
}

export function getSupabaseAdmin(): SupabaseClient<Database> {
  if (client) return client;
  const { url, key } = resolveSupabaseKey();
  client = createClient<Database>(url, key, {
    auth: { persistSession: false },
  });
  return client;
}
