import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { calcClientPrice } from "@/lib/clientPricing";

type ApiCostRow = {
  created_at: string;
  api_name: string;
  action: string;
  status: string;
  duration_seconds: number | null;
  has_audio: boolean | null;
  metadata: { quality?: string } | null;
};

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { data: costs, error } = await supabase
      .from("api_costs")
      .select(
        "created_at, api_name, action, status, duration_seconds, has_audio, metadata",
      )
      .order("created_at", { ascending: false });

    if (error) throw error;

    const rows = (costs ?? []) as ApiCostRow[];

    const successfulHailuo = rows.filter(
      (c) =>
        c.api_name === "hailuo" &&
        c.action === "generate_video" &&
        c.status === "success",
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const clientBillItems = successfulHailuo.map((c) => {
      const duration = c.duration_seconds || 6;
      const quality =
        c.metadata?.quality === "pro" ? "pro" : ("standard" as const);
      const hasAudio = c.has_audio || false;
      const client_price = calcClientPrice(duration, hasAudio, quality);

      return {
        created_at: c.created_at,
        duration_seconds: duration,
        has_audio: hasAudio,
        client_price,
      };
    });

    const totalClientBill = clientBillItems.reduce(
      (sum, v) => sum + v.client_price,
      0,
    );
    const todayItems = clientBillItems.filter(
      (v) => new Date(v.created_at) >= today,
    );
    const monthItems = clientBillItems.filter(
      (v) => new Date(v.created_at) >= monthStart,
    );
    const todayBill = todayItems.reduce((sum, v) => sum + v.client_price, 0);
    const monthBill = monthItems.reduce((sum, v) => sum + v.client_price, 0);

    return NextResponse.json({
      todayVideos: todayItems.length,
      monthVideos: monthItems.length,
      totalVideos: successfulHailuo.length,
      totalDurationSeconds: successfulHailuo.reduce(
        (sum, c) => sum + (c.duration_seconds || 6),
        0,
      ),
      todayBill: Math.round(todayBill * 100) / 100,
      monthBill: Math.round(monthBill * 100) / 100,
      totalBill: Math.round(totalClientBill * 100) / 100,
      recentActivity: clientBillItems.slice(0, 20),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
