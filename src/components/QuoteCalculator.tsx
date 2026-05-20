"use client";

import { useState } from "react";

interface QuoteCalculatorProps {
  selectedDuration?: number;
  hasAudio?: boolean;
  onDurationChange?: (duration: number) => void;
}

export default function QuoteCalculator({
  selectedDuration: controlledDuration,
  hasAudio = false,
  onDurationChange,
}: QuoteCalculatorProps) {
  const [internalDuration, setInternalDuration] = useState(6);
  const duration = controlledDuration ?? internalDuration;

  const setDuration = (d: number) => {
    if (onDurationChange) onDurationChange(d);
    else setInternalDuration(d);
  };

  const [quantity, setQuantity] = useState(10);
  const [includeSprite, setIncludeSprite] = useState(true);
  const [quality, setQuality] = useState<"standard" | "pro">("standard");
  const [isExpanded, setIsExpanded] = useState(false);

  const COSTS = {
    hailuo: {
      standard: { noAudio: 0.08, withAudio: 0.16 },
      pro: { noAudio: 0.112, withAudio: 0.224 },
    },
    claude: 0.01,
    removebg: 0.1,
    markup: 2.0,
  };

  const hailuoRate =
    quality === "pro"
      ? hasAudio
        ? COSTS.hailuo.pro.withAudio
        : COSTS.hailuo.pro.noAudio
      : hasAudio
        ? COSTS.hailuo.standard.withAudio
        : COSTS.hailuo.standard.noAudio;

  const hailuoCost = duration * hailuoRate;
  const techCostPerVideo =
    hailuoCost + COSTS.claude + (includeSprite ? COSTS.removebg : 0);
  const pricePerVideo = Math.ceil((techCostPerVideo + COSTS.markup) * 10) / 10;
  const subtotal = pricePerVideo * quantity;

  const formatUSD = (n: number) => `$${n.toFixed(2)}`;
  const formatVND = (usd: number) => {
    const vnd = usd * 25000;
    return vnd >= 1_000_000
      ? `${(vnd / 1_000_000).toFixed(1)}tr đ`
      : `${(vnd / 1000).toFixed(0)}k đ`;
  };

  const quoteText = `📋 DỰ TOÁN KIDDO ANIMATION
━━━━━━━━━━━━━━━━━━━━
📹 Số lượng video: ${quantity} video
⏱ Thời lượng: ${duration}s/video
✨ Chất lượng: ${quality === "pro" ? "Pro (1080p)" : "Standard (720p)"}
🎭 Tách nhân vật: ${includeSprite ? "Có" : "Không"}
🎵 Nhạc nền: ${hasAudio ? "Có" : "Không"}
━━━━━━━━━━━━━━━━━━━━
💰 Đơn giá: ${formatUSD(pricePerVideo)}/video (~${formatVND(pricePerVideo)})
× ${quantity} video
📦 Tổng cộng: ${formatUSD(subtotal)} (~${formatVND(subtotal)})
━━━━━━━━━━━━━━━━━━━━`;

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.95)",
        border: "2px solid rgba(244,117,10,0.25)",
        borderRadius: 16,
        overflow: "hidden",
        fontFamily: "Georgia, serif",
        boxShadow: "0 4px 20px rgba(244,117,10,0.1)",
      }}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={() => setIsExpanded(!isExpanded)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsExpanded(!isExpanded);
          }
        }}
        style={{
          padding: "14px 18px",
          background:
            "linear-gradient(135deg, rgba(244,117,10,0.08), rgba(255,215,0,0.06))",
          borderBottom: isExpanded ? "1px solid rgba(244,117,10,0.12)" : "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 18 }}>📋</span>
          <span style={{ fontWeight: 700, color: "#2A1A00", fontSize: 14 }}>
            Bảng dự toán
          </span>
          <span
            style={{
              fontSize: 10,
              background: "rgba(244,117,10,0.12)",
              color: "#F4750A",
              padding: "2px 8px",
              borderRadius: 20,
              border: "1px solid rgba(244,117,10,0.25)",
              fontWeight: 700,
            }}
          >
            {formatUSD(subtotal)} · {quantity} videos
          </span>
        </div>
        <span style={{ color: "#F4750A", fontSize: 12 }}>
          {isExpanded ? "▲ Thu gọn" : "▼ Mở rộng"}
        </span>
      </div>

      {isExpanded && (
        <div
          style={{
            padding: 18,
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 11,
                color: "#8A6040",
                fontWeight: 700,
                marginBottom: 8,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              Số lượng video
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <input
                type="range"
                min={1}
                max={100}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                style={{ flex: 1, accentColor: "#F4750A" }}
              />
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    border: "1.5px solid rgba(244,117,10,0.3)",
                    background: "rgba(244,117,10,0.08)",
                    color: "#F4750A",
                    fontSize: 16,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  −
                </button>
                <input
                  type="number"
                  min={1}
                  max={200}
                  value={quantity}
                  onChange={(e) =>
                    setQuantity(
                      Math.max(1, Math.min(200, Number(e.target.value))),
                    )
                  }
                  style={{
                    width: 56,
                    textAlign: "center",
                    padding: "5px 0",
                    border: "1.5px solid rgba(244,117,10,0.3)",
                    borderRadius: 8,
                    fontSize: 15,
                    fontWeight: 700,
                    color: "#F4750A",
                    background: "rgba(255,240,224,0.5)",
                    fontFamily: "Georgia, serif",
                    outline: "none",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setQuantity(Math.min(200, quantity + 1))}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    border: "1.5px solid rgba(244,117,10,0.3)",
                    background: "rgba(244,117,10,0.08)",
                    color: "#F4750A",
                    fontSize: 16,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  +
                </button>
              </div>
            </div>
          </div>

          <div>
            <div
              style={{
                fontSize: 11,
                color: "#8A6040",
                fontWeight: 700,
                marginBottom: 8,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              Thời lượng mỗi video
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {[6, 8, 10].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDuration(d)}
                  style={{
                    flex: 1,
                    padding: "10px 4px",
                    borderRadius: 10,
                    cursor: "pointer",
                    border:
                      duration === d
                        ? "2px solid #F4750A"
                        : "1.5px solid rgba(244,117,10,0.2)",
                    background:
                      duration === d
                        ? "rgba(244,117,10,0.1)"
                        : "rgba(255,255,255,0.8)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 3,
                    transition: "all 0.2s",
                  }}
                >
                  <span
                    style={{
                      fontWeight: 700,
                      color: duration === d ? "#F4750A" : "#2A1A00",
                      fontSize: 14,
                    }}
                  >
                    {d}s
                  </span>
                  {d === 6 && (
                    <span
                      style={{
                        fontSize: 9,
                        background: "#FFD700",
                        color: "#2A1A00",
                        padding: "1px 5px",
                        borderRadius: 8,
                        fontWeight: 700,
                      }}
                    >
                      PHỔ BIẾN
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div
              style={{
                fontSize: 11,
                color: "#8A6040",
                fontWeight: 700,
                marginBottom: 8,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              Chất lượng
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {[
                { value: "standard" as const, label: "Standard", sub: "720p" },
                { value: "pro" as const, label: "Pro", sub: "1080p" },
              ].map((q) => (
                <button
                  key={q.value}
                  type="button"
                  onClick={() => setQuality(q.value)}
                  style={{
                    flex: 1,
                    padding: "10px 4px",
                    borderRadius: 10,
                    cursor: "pointer",
                    border:
                      quality === q.value
                        ? "2px solid #F4750A"
                        : "1.5px solid rgba(244,117,10,0.2)",
                    background:
                      quality === q.value
                        ? "rgba(244,117,10,0.1)"
                        : "rgba(255,255,255,0.8)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 2,
                    transition: "all 0.2s",
                  }}
                >
                  <span
                    style={{
                      fontWeight: 700,
                      color: quality === q.value ? "#F4750A" : "#2A1A00",
                      fontSize: 14,
                    }}
                  >
                    {q.label}
                  </span>
                  <span style={{ fontSize: 11, color: "#8A6040" }}>{q.sub}</span>
                </button>
              ))}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div style={{ fontWeight: 700, color: "#2A1A00", fontSize: 13 }}>
                🎭 Tách nhân vật từ ảnh
              </div>
              <div style={{ fontSize: 11, color: "#8A6040", marginTop: 2 }}>
                Remove background, nhân vật xuất hiện trong video
              </div>
            </div>
            <div
              role="switch"
              aria-checked={includeSprite}
              tabIndex={0}
              onClick={() => setIncludeSprite(!includeSprite)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setIncludeSprite(!includeSprite);
                }
              }}
              style={{
                width: 44,
                height: 24,
                borderRadius: 12,
                background: includeSprite ? "#F4750A" : "#ddd",
                cursor: "pointer",
                position: "relative",
                transition: "background 0.2s",
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  background: "#fff",
                  position: "absolute",
                  top: 3,
                  left: includeSprite ? 23 : 3,
                  transition: "left 0.2s",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
                }}
              />
            </div>
          </div>

          <div
            style={{
              background:
                "linear-gradient(135deg, rgba(244,117,10,0.06), rgba(255,215,0,0.04))",
              borderRadius: 12,
              padding: "14px 16px",
              border: "1.5px solid rgba(244,117,10,0.2)",
            }}
          >
            {hasAudio && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 12,
                  color: "#8A6040",
                  padding: "4px 0",
                }}
              >
                <span>🎵 Nhạc nền (×2 chi phí)</span>
                <span style={{ color: "#F4750A" }}>+included</span>
              </div>
            )}

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 8,
              }}
            >
              <span style={{ color: "#5A3A10", fontSize: 13 }}>Đơn giá</span>
              <span style={{ fontWeight: 700, color: "#F4750A", fontSize: 15 }}>
                {formatUSD(pricePerVideo)}
                <span
                  style={{
                    fontSize: 11,
                    color: "#8A6040",
                    fontWeight: 400,
                    marginLeft: 6,
                  }}
                >
                  (~{formatVND(pricePerVideo)})
                </span>
              </span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 8,
                paddingTop: 8,
                borderTop: "1px solid rgba(244,117,10,0.12)",
              }}
            >
              <span style={{ color: "#5A3A10", fontSize: 13 }}>
                × {quantity} video
              </span>
              <span style={{ color: "#8A6040", fontSize: 12 }}>
                {formatUSD(pricePerVideo)} × {quantity}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 8,
                paddingTop: 8,
                borderTop: "1px solid rgba(244,117,10,0.12)",
              }}
            >
              <span style={{ fontWeight: 700, color: "#2A1A00", fontSize: 14 }}>
                Tổng cộng
              </span>
              <span style={{ fontWeight: 700, color: "#F4750A", fontSize: 18 }}>
                {formatUSD(subtotal)}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 12,
                color: "#8A6040",
              }}
            >
              <span>≈ {formatVND(subtotal)}</span>
            </div>
          </div>

          <pre
            style={{
              fontSize: 11,
              color: "#5A3A10",
              background: "rgba(255,240,224,0.4)",
              borderRadius: 10,
              padding: "12px 14px",
              margin: 0,
              whiteSpace: "pre-wrap",
              lineHeight: 1.5,
              border: "1px solid rgba(244,117,10,0.15)",
              fontFamily: "Georgia, serif",
            }}
          >
            {quoteText}
          </pre>
        </div>
      )}
    </div>
  );
}
