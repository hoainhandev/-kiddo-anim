import { createClient } from "@supabase/supabase-js";

export const API_COSTS = {
  claude_analyze: 0.01,
  claude_prompt: 0.005,
  removebg: 0.1,
  hailuo_standard_per_second: 0.08,
  hailuo_pro_per_second: 0.112,
  hailuo_audio_multiplier: 2.0,
};

export function calcHailuoCost(
  durationSeconds: number,
  quality: "standard" | "pro" = "standard",
  hasAudio: boolean = false,
): number {
  const base =
    quality === "pro"
      ? API_COSTS.hailuo_pro_per_second
      : API_COSTS.hailuo_standard_per_second;
  const cost = durationSeconds * base;
  return hasAudio ? cost * API_COSTS.hailuo_audio_multiplier : cost;
}

export interface LogCostParams {
  api_name: string;
  action: string;
  status: "success" | "error";
  cost_usd: number;
  duration_seconds?: number;
  has_audio?: boolean;
  error_message?: string;
  video_id?: string;
  metadata?: Record<string, unknown>;
}

export async function logCost(params: LogCostParams) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    await supabase.from("api_costs").insert([params]);
  } catch (err) {
    console.error("Failed to log cost:", err);
  }
}
