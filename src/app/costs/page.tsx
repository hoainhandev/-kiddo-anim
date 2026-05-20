"use client";

import { useEffect, useState } from "react";

type BreakdownEntry = {
  total: number;
  count: number;
  errors: number;
};

type CostTransaction = {
  id: string;
  created_at: string;
  api_name: string;
  action: string;
  status: string;
  cost_usd: number;
  duration_seconds: number | null;
  has_audio: boolean | null;
  error_message: string | null;
};

type CostSummary = {
  total: number;
  totalSuccess: number;
  totalWasted: number;
  todayTotal: number;
  monthTotal: number;
  breakdown: Record<string, BreakdownEntry>;
  recent: CostTransaction[];
  totalTransactions: number;
  successfulVideos: number;
  estimatedRevenue: number;
  estimatedProfit: number;
  avgCostPerVideo: number;
  error?: string;
};

const apiColors: Record<string, string> = {
  hailuo: "#F4750A",
  claude: "#7B6FCC",
  removebg: "#2a8a2a",
};

const apiLabels: Record<string, string> = {
  hailuo: "🎬 Hailuo (video)",
  claude: "🤖 Claude (AI)",
  removebg: "✂️ Remove.bg",
};

export default function CostsPage() {
  const [data, setData] = useState<CostSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/cost-summary")
      .then((r) => r.json())
      .then((json) => setData(json as CostSummary))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const fmt = (n: number) => `$${n.toFixed(4)}`;
  const fmtVND = (usd: number) => `${(usd * 25000 / 1000).toFixed(0)}k đ`;

  return (
    <main
      className="mx-auto w-full max-w-4xl px-4 py-8"
      style={{ fontFamily: "Georgia, serif" }}
    >
      <h1
        className="mb-6 text-2xl font-bold text-[#F4750A]"
        style={{ fontFamily: "Georgia, serif" }}
      >
        💰 Chi phí thực tế
      </h1>

      {loading && (
        <div style={{ textAlign: "center", color: "#8A6040", padding: 40 }}>
          Đang tải...
        </div>
      )}

      {data?.error && (
        <p className="kiddo-card text-center text-red-600" role="alert">
          ❌ {data.error}
        </p>
      )}

      {data && !data.error && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: 12,
            }}
          >
            {[
              { label: "Hôm nay", value: data.todayTotal, icon: "📅" },
              { label: "Tháng này", value: data.monthTotal, icon: "📆" },
              { label: "Tổng cộng", value: data.total, icon: "💳" },
              {
                label: "Chi phí lỗi",
                value: data.totalWasted,
                icon: "⚠️",
                warn: data.totalWasted > 0,
              },
            ].map((card) => (
              <div
                key={card.label}
                style={{
                  background: "rgba(255,255,255,0.9)",
                  border: `2px solid ${card.warn ? "rgba(232,64,64,0.3)" : "rgba(244,117,10,0.2)"}`,
                  borderRadius: 14,
                  padding: 16,
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 24, marginBottom: 6 }}>{card.icon}</div>
                <div style={{ fontSize: 11, color: "#8A6040", marginBottom: 4 }}>
                  {card.label}
                </div>
                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 700,
                    color: card.warn ? "#cc3030" : "#F4750A",
                  }}
                >
                  {fmt(card.value)}
                </div>
                <div style={{ fontSize: 11, color: "#8A6040" }}>
                  {fmtVND(card.value)}
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              background:
                "linear-gradient(135deg, rgba(40,160,40,0.08), rgba(255,215,0,0.06))",
              border: "2px solid rgba(40,160,40,0.2)",
              borderRadius: 14,
              padding: 20,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 16,
            }}
          >
            <div>
              <div style={{ fontWeight: 700, color: "#2a6a2a", fontSize: 16 }}>
                💹 Lợi nhuận ước tính
              </div>
              <div style={{ fontSize: 12, color: "#5a8a5a", marginTop: 4 }}>
                Dựa trên {data.successfulVideos ?? 0} video thành công × $2.00
                markup
              </div>
            </div>
            <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 11, color: "#5a8a5a" }}>Chi phí API</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#cc3030" }}>
                  -{fmt(data.totalSuccess)}
                </div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 11, color: "#5a8a5a" }}>
                  Doanh thu (ước tính)
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#2a8a2a" }}>
                  +{fmt(data.estimatedRevenue ?? 0)}
                </div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 11, color: "#5a8a5a" }}>Lợi nhuận</div>
                <div style={{ fontSize: 24, fontWeight: 900, color: "#1a6a1a" }}>
                  {fmt(data.estimatedProfit ?? 0)}
                </div>
                <div style={{ fontSize: 11, color: "#5a8a5a" }}>
                  ~{fmtVND(data.estimatedProfit ?? 0)}
                </div>
              </div>
            </div>
          </div>

          <div
            className="kiddo-card"
            style={{ padding: 20 }}
          >
            <div style={{ fontWeight: 700, color: "#2A1A00", marginBottom: 14 }}>
              📊 Chi tiết theo API
            </div>
            {Object.keys(data.breakdown).length === 0 && (
              <p style={{ fontSize: 12, color: "#8A6040" }}>
                Chưa có giao dịch nào được ghi nhận.
              </p>
            )}
            {Object.entries(data.breakdown).map(([api, info]) => (
              <div
                key={api}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 0",
                  borderBottom: "1px solid rgba(244,117,10,0.08)",
                  flexWrap: "wrap",
                }}
              >
                <div
                  style={{
                    width: 140,
                    fontSize: 13,
                    color: "#2A1A00",
                    fontWeight: 600,
                  }}
                >
                  {apiLabels[api] || api}
                </div>
                <div
                  style={{
                    flex: 1,
                    minWidth: 120,
                    height: 8,
                    background: "rgba(0,0,0,0.06)",
                    borderRadius: 4,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${data.total > 0 ? Math.min((info.total / data.total) * 100, 100) : 0}%`,
                      background: apiColors[api] || "#888",
                      borderRadius: 4,
                    }}
                  />
                </div>
                <div style={{ textAlign: "right", minWidth: 120 }}>
                  <div style={{ fontWeight: 700, color: apiColors[api] || "#888" }}>
                    {fmt(info.total)}
                  </div>
                  <div style={{ fontSize: 11, color: "#8A6040" }}>
                    {info.count} calls
                    {info.errors > 0 && (
                      <span style={{ color: "#cc3030" }}>
                        {" "}
                        · {info.errors} lỗi
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="kiddo-card" style={{ padding: 20 }}>
            <div style={{ fontWeight: 700, color: "#2A1A00", marginBottom: 14 }}>
              🕐 Giao dịch gần đây ({data.totalTransactions})
            </div>
            {data.recent.length === 0 && (
              <p style={{ fontSize: 12, color: "#8A6040" }}>
                Chưa có giao dịch. Tạo video hoặc phân tích ảnh để bắt đầu ghi nhận
                chi phí.
              </p>
            )}
            <div style={{ display: "flex", flexDirection: "column" }}>
              {data.recent.map((c) => (
                <div
                  key={c.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "9px 0",
                    borderBottom: "1px solid rgba(244,117,10,0.06)",
                    fontSize: 12,
                  }}
                >
                  <span style={{ fontSize: 16 }}>
                    {c.status === "success" ? "✅" : "❌"}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span
                      style={{
                        fontWeight: 600,
                        color: apiColors[c.api_name] || "#888",
                      }}
                    >
                      {apiLabels[c.api_name] || c.api_name}
                    </span>
                    <span style={{ color: "#8A6040", marginLeft: 6 }}>
                      {c.action}
                      {c.has_audio && " 🎵"}
                      {c.duration_seconds != null && ` · ${c.duration_seconds}s`}
                    </span>
                    {c.error_message && (
                      <div
                        style={{
                          color: "#cc3030",
                          fontSize: 11,
                          marginTop: 2,
                        }}
                      >
                        {c.error_message.slice(0, 60)}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div
                      style={{
                        fontWeight: 700,
                        color: c.status === "error" ? "#cc3030" : "#2A1A00",
                      }}
                    >
                      {fmt(c.cost_usd)}
                    </div>
                    <div style={{ fontSize: 10, color: "#8A6040" }}>
                      {new Date(c.created_at).toLocaleString("vi-VN", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
