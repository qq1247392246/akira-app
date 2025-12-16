import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { Database } from "@/types/database";

type RegistrationRequestRow = Database["public"]["Tables"]["registration_requests"]["Row"];

const paramsSchema = z.object({ requestId: z.string().uuid() });

const actionSchema = z.object({
  action: z.enum(["approve", "reject"]),
  reviewerId: z.string().uuid(),
  rejectionReason: z.string().max(280).optional(),
});

export async function PATCH(request: NextRequest, context: { params: Promise<{ requestId: string }> }) {
  const params = paramsSchema.safeParse(await context.params);
  if (!params.success) {
    return NextResponse.json({ error: "Invalid request id" }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const parsed = actionSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const requestRecord = await fetchRequest(params.data.requestId);
  if (!requestRecord) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }

  if (requestRecord.status !== "pending") {
    return NextResponse.json({ error: "Request already processed" }, { status: 409 });
  }

  if (parsed.data.action === "approve") {
    const createResult = await ensureUserCreated(requestRecord);
    if (!createResult.ok) {
      return NextResponse.json({ error: createResult.error }, { status: createResult.status });
    }
  }

  const { error: updateError } = await supabase
    .from("registration_requests")
    .update({
      status: parsed.data.action === "approve" ? "approved" : "rejected",
      reviewed_by: parsed.data.reviewerId,
      reviewed_at: new Date().toISOString(),
      rejection_reason: parsed.data.action === "reject" ? parsed.data.rejectionReason ?? null : null,
    })
    .eq("id", requestRecord.id);

  if (updateError) {
    console.error(updateError);
    return NextResponse.json({ error: "Failed to update request" }, { status: 500 });
  }

  return NextResponse.json({
    requestId: requestRecord.id,
    status: parsed.data.action === "approve" ? "approved" : "rejected",
  });
}

async function fetchRequest(requestId: string): Promise<RegistrationRequestRow | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("registration_requests")
    .select("*")
    .eq("id", requestId)
    .maybeSingle();

  if (error) {
    console.error(error);
    return null;
  }

  return data ?? null;
}

async function ensureUserCreated(requestRecord: RegistrationRequestRow) {
  const supabase = getSupabaseAdmin();
  const { data: existing, error: existingError } = await supabase
    .from("users")
    .select("id")
    .eq("username", requestRecord.username)
    .maybeSingle();

  if (existingError) {
    console.error(existingError);
    return { ok: false as const, error: "Failed to check user", status: 500 };
  }

  if (existing) {
    return { ok: false as const, error: "Username already exists", status: 409 };
  }

  const { error: insertError } = await supabase.from("users").insert({
    username: requestRecord.username,
    display_name: requestRecord.display_name,
    password_hash: requestRecord.password_hash,
    avatar_url: requestRecord.avatar_url,
    signature: requestRecord.signature,
    role: 0,
    is_active: true,
  });

  if (insertError) {
    console.error(insertError);
    return { ok: false as const, error: "Failed to create user", status: 500 };
  }

  return { ok: true as const };
}