"use client";

import { useEffect, useState } from "react";

interface StorageData {
  totalMB: number;
  videoMB: number;
  thumbMB: number;
  limitMB: number;
  usagePercent: number;
  videoCount: number;
  dbVideoCount?: number;
  status: "ok" | "warning" | "critical";
}

export default function StorageUsage() {
  const [data, setData] = useState<StorageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch("/api/storage-usage")
      .then((r) => r.json())
      .then((json) => {
        if (json.error) throw new Error(json.error);
        setData(json as StorageData);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div
        style={{
          padding: "10px 16px",
          background: "rgba(255,255,255,0.8)",
          borderRadius: 10,
          fontSize: 12,
          color: "#8A6040",
          fontFamily: "Georgia, serif",
        }}
      >
        💾 Đang kiểm tra dung lượng...
      </div>
    );
  }

  if (!data) return null;

  const colors = {
    ok: {
      bar: "linear-gradient(90deg, #F4750A, #FFD700)",
      text: "#5A3A10",
      bg: "rgba(244,117,10,0.06)",
      border: "rgba(244,117,10,0.15)",
    },
    warning: {
      bar: "linear-gradient(90deg, #F4A020, #F4750A)",
      text: "#7A4010",
      bg: "rgba(244,160,32,0.08)",
      border: "rgba(244,160,32,0.25)",
    },
    critical: {
      bar: "linear-gradient(90deg, #E84040, #cc2020)",
      text: "#cc2020",
      bg: "rgba(232,64,64,0.08)",
      border: "rgba(232,64,64,0.3)",
    },
  };
  const c = colors[data.status];

  return (
    <div
      style={{
        background:
          data.status === "critical"
            ? "rgba(232,64,64,0.06)"
            : "rgba(255,255,255,0.9)",
        border: `1.5px solid ${c.border}`,
        borderRadius: 14,
        padding: "14px 16px",
        fontFamily: "Georgia, serif",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 16 }}>
            {data.status === "critical"
              ? "🚨"
              : data.status === "warning"
                ? "⚠️"
                : "💾"}
          </span>
          <span style={{ fontWeight: 700, color: "#2A1A00", fontSize: 13 }}>
            Dung lượng Storage
          </span>
        </div>
        <span style={{ fontSize: 12, fontWeight: 700, color: c.text }}>
          {data.totalMB}MB / {data.limitMB}MB
        </span>
      </div>

      <div
        style={{
          height: 8,
          background: "rgba(0,0,0,0.06)",
          borderRadius: 4,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${Math.min(data.usagePercent, 100)}%`,
            background: c.bar,
            borderRadius: 4,
            transition: "width 0.5s ease",
          }}
        />
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          fontSize: 11,
          color: "#8A6040",
        }}
      >
        <span>🎬 {data.videoCount} videos</span>
        <span>📹 Video: {data.videoMB}MB</span>
        <span>🖼 Thumb: {data.thumbMB}MB</span>
        <span style={{ marginLeft: "auto", fontWeight: 700, color: c.text }}>
          {data.usagePercent}% đã dùng
        </span>
      </div>

      {data.videoCount === 0 && (data.dbVideoCount ?? 0) > 0 && (
        <div
          style={{
            padding: "8px 12px",
            background: "rgba(244,117,10,0.06)",
            borderRadius: 8,
            fontSize: 11,
            color: "#8A6040",
            lineHeight: 1.6,
            border: "1px solid rgba(244,117,10,0.12)",
          }}
        >
          💡 Video đang lưu trên fal.ai (link tạm thời). Tạo video mới sẽ tự động
          lưu vào Supabase Storage.
        </div>
      )}

      {data.status === "warning" && (
        <div
          style={{
            padding: "8px 12px",
            background: "rgba(244,160,32,0.1)",
            borderRadius: 8,
            fontSize: 11,
            color: "#7A4010",
            lineHeight: 1.6,
            border: "1px solid rgba(244,160,32,0.2)",
          }}
        >
          ⚠️ Đã dùng {data.usagePercent}% dung lượng. Nên xóa bớt video cũ để
          tránh đầy.
        </div>
      )}

      {data.status === "critical" && (
        <div
          style={{
            padding: "10px 12px",
            background: "rgba(232,64,64,0.08)",
            borderRadius: 8,
            fontSize: 12,
            color: "#cc2020",
            lineHeight: 1.6,
            border: "1px solid rgba(232,64,64,0.2)",
            fontWeight: 600,
          }}
        >
          🚨 Sắp hết dung lượng! ({data.usagePercent}%)
          <br />
          <span style={{ fontWeight: 400, fontSize: 11 }}>
            Xóa video cũ ngay hoặc nâng cấp Supabase ($25/tháng → 100GB).
          </span>
        </div>
      )}

      {data.usagePercent > 70 && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 11,
            color: "#8A6040",
            paddingTop: 2,
          }}
        >
          <span>Nâng cấp để có thêm dung lượng</span>
          <a
            href="https://supabase.com/pricing"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: "#F4750A",
              fontWeight: 700,
              textDecoration: "none",
              fontSize: 11,
            }}
          >
            Xem gói Pro →
          </a>
        </div>
      )}
    </div>
  );
}
