"use client";

interface DurationSelectorProps {
  value: number;
  onChange: (duration: number) => void;
}

export default function DurationSelector({
  value,
  onChange,
}: DurationSelectorProps) {
  const options = [
    { seconds: 6, label: "6 giây", note: "Đề xuất · Tiết kiệm", highlight: true },
    { seconds: 8, label: "8 giây", note: "Cân bằng", highlight: false },
    { seconds: 10, label: "10 giây", note: "Chi tiết hơn", highlight: false },
  ];

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.9)",
        border: "2px solid rgba(244,117,10,0.2)",
        borderRadius: 14,
        padding: 16,
        fontFamily: "Georgia, serif",
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: "#8A6040",
          fontWeight: 700,
          marginBottom: 12,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <span>⏱</span> Thời lượng video
        <span
          style={{
            fontSize: 10,
            background: "rgba(232,64,64,0.08)",
            color: "#cc3030",
            padding: "1px 7px",
            borderRadius: 10,
            border: "1px solid rgba(232,64,64,0.2)",
            fontWeight: 600,
            textTransform: "none",
            letterSpacing: 0,
          }}
        >
          ảnh hưởng chi phí
        </span>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        {options.map((opt) => (
          <button
            key={opt.seconds}
            type="button"
            onClick={() => onChange(opt.seconds)}
            style={{
              flex: 1,
              padding: "12px 6px",
              borderRadius: 12,
              cursor: "pointer",
              border:
                value === opt.seconds
                  ? "2px solid #F4750A"
                  : "1.5px solid rgba(244,117,10,0.2)",
              background:
                value === opt.seconds
                  ? "rgba(244,117,10,0.08)"
                  : "rgba(255,255,255,0.8)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              transition: "all 0.2s",
            }}
          >
            <span
              style={{
                fontWeight: 700,
                fontSize: 16,
                color: value === opt.seconds ? "#F4750A" : "#2A1A00",
              }}
            >
              {opt.label}
            </span>
            <span
              style={{
                fontSize: 10,
                color: value === opt.seconds ? "#E85D00" : "#8A6040",
                textAlign: "center",
                lineHeight: 1.4,
              }}
            >
              {opt.note}
            </span>
            {opt.highlight && (
              <span
                style={{
                  fontSize: 9,
                  background: "#FFD700",
                  color: "#2A1A00",
                  padding: "1px 6px",
                  borderRadius: 8,
                  fontWeight: 700,
                }}
              >
                ĐỀ XUẤT
              </span>
            )}
          </button>
        ))}
      </div>

      {/* AUDIO FEATURE - COMING SOON */}
      {/*
      <div
        style={{
          marginTop: 14,
          paddingTop: 14,
          borderTop: "1px solid rgba(244,117,10,0.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        ...
      </div>
      */}

      <div
        style={{
          marginTop: 12,
          padding: "8px 12px",
          background: "rgba(244,117,10,0.04)",
          borderRadius: 8,
          fontSize: 11,
          color: "#8A6040",
          lineHeight: 1.6,
        }}
      >
        💡 Video dài hơn = chi phí cao hơn · 6s phù hợp cho hầu hết nội dung
        flashcard
      </div>
    </div>
  );
}
