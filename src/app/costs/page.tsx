"use client";

import { useEffect, useState } from "react";

type RecentActivity = {
  created_at: string;
  duration_seconds: number;
  has_audio: boolean;
  client_price: number;
};

type UsageSummary = {
  todayVideos: number;
  monthVideos: number;
  totalVideos: number;
  totalDurationSeconds: number;
  todayBill: number;
  monthBill: number;
  totalBill: number;
  recentActivity: RecentActivity[];
  error?: string;
};

function fmtUsd(n: number) {
  return `$${n.toFixed(2)}`;
}

function fmtVnd(usd: number) {
  const vnd = usd * 25000;
  return vnd >= 1_000_000
    ? `~${(vnd / 1_000_000).toFixed(1)}tr đ`
    : `~${(vnd / 1000).toFixed(0)}k đ`;
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  const hour = String(d.getHours()).padStart(2, "0");
  const minute = String(d.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} ${hour}:${minute}`;
}

export default function CostsPage() {
  const [data, setData] = useState<UsageSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/cost-summary")
      .then((r) => r.json())
      .then((json) => setData(json as UsageSummary))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const isEmpty =
    !loading && data && !data.error && data.totalVideos === 0;

  const summaryCards = data
    ? [
        {
          label: "Hôm nay",
          videos: data.todayVideos,
          bill: data.todayBill,
          icon: "📅",
          highlight: false,
        },
        {
          label: "Tháng này",
          videos: data.monthVideos,
          bill: data.monthBill,
          icon: "📆",
          highlight: false,
        },
        {
          label: "Tổng video",
          videos: data.totalVideos,
          bill: null as number | null,
          icon: "🎬",
          highlight: false,
        },
        {
          label: "Cần thanh toán",
          videos: null as number | null,
          bill: data.totalBill,
          icon: "💳",
          highlight: true,
        },
      ]
    : [];

  return (
    <main
      className="mx-auto w-full max-w-4xl px-4 py-8"
      style={{ fontFamily: "Georgia, serif" }}
    >
      <h1
        className="mb-6 text-2xl font-bold text-[#F4750A]"
        style={{ fontFamily: "Georgia, serif" }}
      >
        📊 Thống kê sử dụng
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

      {isEmpty && (
        <p className="kiddo-card text-center text-gray-600">
          Chưa có video nào được tạo
        </p>
      )}

      {data && !data.error && data.totalVideos > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: 12,
            }}
          >
            {summaryCards.map((card) => (
              <div
                key={card.label}
                style={{
                  background: card.highlight
                    ? "rgba(244,117,10,0.06)"
                    : "rgba(255,255,255,0.9)",
                  border: card.highlight
                    ? "2px solid rgba(244,117,10,0.5)"
                    : "2px solid rgba(244,117,10,0.2)",
                  borderRadius: 14,
                  padding: 16,
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 24, marginBottom: 6 }}>{card.icon}</div>
                <div style={{ fontSize: 11, color: "#8A6040", marginBottom: 6 }}>
                  {card.label}
                </div>
                {card.videos != null && (
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: "#2A1A00",
                      marginBottom: 4,
                    }}
                  >
                    {card.videos} video
                  </div>
                )}
                {card.bill != null && (
                  <>
                    <div
                      style={{
                        fontSize: card.highlight ? 22 : 18,
                        fontWeight: 700,
                        color: "#F4750A",
                      }}
                    >
                      {fmtUsd(card.bill)}
                    </div>
                    <div style={{ fontSize: 11, color: "#8A6040" }}>
                      {fmtVnd(card.bill)}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          <div className="kiddo-card" style={{ padding: 20, overflowX: "auto" }}>
            <div style={{ fontWeight: 700, color: "#2A1A00", marginBottom: 14 }}>
              🕐 Hoạt động gần đây
            </div>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 13,
              }}
            >
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(244,117,10,0.2)" }}>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "8px 10px",
                      color: "#8A6040",
                      fontWeight: 700,
                    }}
                  >
                    Ngày
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "8px 10px",
                      color: "#8A6040",
                      fontWeight: 700,
                    }}
                  >
                    Thời lượng
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "8px 10px",
                      color: "#8A6040",
                      fontWeight: 700,
                    }}
                  >
                    Nhạc
                  </th>
                  <th
                    style={{
                      textAlign: "right",
                      padding: "8px 10px",
                      color: "#8A6040",
                      fontWeight: 700,
                    }}
                  >
                    Đơn giá
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.recentActivity.map((item, index) => (
                  <tr
                    key={`${item.created_at}-${index}`}
                    style={{
                      borderBottom: "1px solid rgba(244,117,10,0.08)",
                    }}
                  >
                    <td style={{ padding: "10px", color: "#2A1A00" }}>
                      {formatDateTime(item.created_at)}
                    </td>
                    <td style={{ padding: "10px", color: "#8A6040" }}>
                      {item.duration_seconds}s
                    </td>
                    <td style={{ padding: "10px" }}>
                      {item.has_audio ? (
                        <span
                          style={{
                            fontSize: 10,
                            background: "rgba(255,215,0,0.15)",
                            color: "#8A5000",
                            padding: "2px 7px",
                            borderRadius: 10,
                            border: "1px solid rgba(255,215,0,0.3)",
                            fontWeight: 700,
                          }}
                        >
                          🎵 Có nhạc
                        </span>
                      ) : (
                        <span style={{ color: "#8A6040" }}>-</span>
                      )}
                    </td>
                    <td style={{ padding: "10px", textAlign: "right" }}>
                      <div style={{ fontWeight: 700, color: "#2A1A00" }}>
                        {fmtUsd(item.client_price)}
                      </div>
                      <div style={{ fontSize: 11, color: "#8A6040" }}>
                        {fmtVnd(item.client_price)}
                      </div>
                    </td>
                  </tr>
                ))}
                <tr
                  style={{
                    borderTop: "2px solid rgba(244,117,10,0.2)",
                    fontWeight: 700,
                  }}
                >
                  <td colSpan={3} style={{ padding: "12px 10px", color: "#2A1A00" }}>
                    Tổng cộng ({data.totalVideos} videos)
                  </td>
                  <td style={{ padding: "12px 10px", textAlign: "right" }}>
                    <span style={{ color: "#F4750A", fontSize: 18 }}>
                      {fmtUsd(data.totalBill)}
                    </span>
                    <span
                      style={{
                        display: "block",
                        fontSize: 12,
                        color: "#8A6040",
                        fontWeight: 400,
                      }}
                    >
                      ({fmtVnd(data.totalBill)})
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  );
}
