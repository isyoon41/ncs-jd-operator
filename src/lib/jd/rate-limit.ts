import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

const USER_HOURLY_LIMIT = 5;
const ORG_DAILY_LIMIT = 30;

type RateLimitResult = { allowed: true } | { allowed: false; message: string };

export async function checkAiGenerationRateLimit(
  supabase: SupabaseClient<Database>,
  organizationId: string,
  userId: string,
): Promise<RateLimitResult> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [{ count: userCount }, { count: orgCount }] = await Promise.all([
    supabase
      .from("ai_generation_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", oneHourAgo),
    supabase
      .from("ai_generation_events")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .gte("created_at", oneDayAgo),
  ]);

  if ((userCount ?? 0) >= USER_HOURLY_LIMIT) {
    return {
      allowed: false,
      message: `AI 직무설계는 1인당 시간당 ${USER_HOURLY_LIMIT}건까지 만들 수 있습니다. 잠시 후 다시 시도해 주세요.`,
    };
  }
  if ((orgCount ?? 0) >= ORG_DAILY_LIMIT) {
    return {
      allowed: false,
      message: `이 회사는 하루 ${ORG_DAILY_LIMIT}건까지 AI 직무설계를 만들 수 있습니다. 내일 다시 시도해 주세요.`,
    };
  }
  return { allowed: true };
}

export async function recordAiGenerationEvent(
  supabase: SupabaseClient<Database>,
  organizationId: string,
  userId: string,
  kind: "create" | "refine",
) {
  await supabase.from("ai_generation_events").insert({ organization_id: organizationId, user_id: userId, kind });
}
