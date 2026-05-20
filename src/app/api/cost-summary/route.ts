import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type ApiCostRow = {
  id: string;
  created_at: string;
  api_name: string;
  action: string;
  status: string;
  cost_usd: number | string;
  duration_seconds: number | null;
  has_audio: boolean | null;
  error_message: string | null;
  video_id: string | null;
  metadata: Record<string, unknown> | null;
};

type BreakdownEntry = {
  total: number;
  count: number;
  errors: number;
};

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { data: costs, error } = await supabase
      .from("api_costs")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    if (!costs?.length) {
      return NextResponse.json({
        total: 0,
        totalSuccess: 0,
        totalWasted: 0,
        todayTotal: 0,
        monthTotal: 0,
        breakdown: {},
        recent: [],
        totalTransactions: 0,
        successfulVideos: 0,
        estimatedRevenue: 0,
        estimatedProfit: 0,
        avgCostPerVideo: 0,
      });
    }

    const rows = costs as ApiCostRow[];

    const total = rows.reduce((sum, c) => sum + Number(c.cost_usd), 0);
    const totalSuccess = rows
      .filter((c) => c.status === "success")
      .reduce((sum, c) => sum + Number(c.cost_usd), 0);
    const totalWasted = rows
      .filter((c) => c.status === "error")
      .reduce((sum, c) => sum + Number(c.cost_usd), 0);

    const breakdown = rows.reduce<Record<string, BreakdownEntry>>((acc, c) => {
      if (!acc[c.api_name]) {
        acc[c.api_name] = { total: 0, count: 0, errors: 0 };
      }
      acc[c.api_name].total += Number(c.cost_usd);
      acc[c.api_name].count++;
      if (c.status === "error") acc[c.api_name].errors++;
      return acc;
    }, {});

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCosts = rows.filter((c) => new Date(c.created_at) >= today);
    const todayTotal = todayCosts.reduce(
      (sum, c) => sum + Number(c.cost_usd),
      0,
    );

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthCosts = rows.filter((c) => new Date(c.created_at) >= monthStart);
    const monthTotal = monthCosts.reduce(
      (sum, c) => sum + Number(c.cost_usd),
      0,
    );

    const recent = rows.slice(0, 20).map((c) => ({
      ...c,
      cost_usd: Number(c.cost_usd),
    }));

    const successfulVideos = rows.filter(
      (c) => c.api_name === "hailuo" && c.status === "success",
    ).length;

    const MARKUP_PER_VIDEO = 2.0;
    const avgCostPerVideo = totalSuccess / Math.max(successfulVideos, 1);
    const estimatedRevenue =
      successfulVideos * (MARKUP_PER_VIDEO + avgCostPerVideo);
    const estimatedProfit = successfulVideos * MARKUP_PER_VIDEO;

    const round4 = (n: number) => Math.round(n * 10000) / 10000;

    return NextResponse.json({
      total: round4(total),
      totalSuccess: round4(totalSuccess),
      totalWasted: round4(totalWasted),
      todayTotal: round4(todayTotal),
      monthTotal: round4(monthTotal),
      breakdown,
      recent,
      totalTransactions: rows.length,
      successfulVideos,
      estimatedRevenue: round4(estimatedRevenue),
      estimatedProfit: round4(estimatedProfit),
      avgCostPerVideo: round4(avgCostPerVideo),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
