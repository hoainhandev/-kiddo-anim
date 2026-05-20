"use client";

import { useEffect, useState, type ReactNode } from "react";

export default function PasscodeGate({ children }: { children: ReactNode }) {
  const [unlocked, setUnlocked] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/auth", { method: "GET" })
      .then((r) => {
        if (r.ok) setUnlocked(true);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async () => {
    if (!input.trim()) return;
    setSubmitting(true);
    setError(false);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode: input }),
      });
      if (res.ok) {
        setUnlocked(true);
        setError(false);
      } else {
        setError(true);
        setInput("");
      }
    } catch {
      setError(true);
      setInput("");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "linear-gradient(180deg, #87CEEB 0%, #EAF6FF 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ color: "#F4750A", fontSize: 16, fontFamily: "Georgia, serif" }}>
          ⏳ Đang kiểm tra...
        </div>
      </div>
    );
  }

  if (!unlocked) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "linear-gradient(180deg, #87CEEB 0%, #EAF6FF 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <div
          style={{
            background: "rgba(255,255,255,0.95)",
            border: "2px solid rgba(244,117,10,0.25)",
            borderRadius: 20,
            padding: "32px 28px",
            maxWidth: 360,
            width: "100%",
            boxShadow: "0 8px 32px rgba(244,117,10,0.15)",
            fontFamily: "Georgia, serif",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 8 }}>🌷</div>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: "#F4750A",
              margin: "0 0 6px",
            }}
          >
            Kiddo
          </h1>
          <p style={{ fontSize: 13, color: "#8A6040", margin: "0 0 24px" }}>
            Nhập passcode để sử dụng công cụ
          </p>

          <input
            type="password"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="Passcode"
            autoFocus
            style={{
              width: "100%",
              padding: "12px 16px",
              borderRadius: 30,
              border: error
                ? "2px solid #E84040"
                : "2px solid rgba(244,117,10,0.3)",
              fontSize: 15,
              fontFamily: "Georgia, serif",
              outline: "none",
              boxSizing: "border-box",
              marginBottom: 12,
            }}
          />

          {error && (
            <p
              style={{
                color: "#cc3030",
                fontSize: 12,
                margin: "0 0 12px",
                fontWeight: 600,
              }}
            >
              ❌ Sai passcode, thử lại
            </p>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !input.trim()}
            style={{
              width: "100%",
              padding: "12px 0",
              background: submitting
                ? "rgba(244,117,10,0.5)"
                : "linear-gradient(135deg, #F4750A, #FF8C33)",
              color: "#fff",
              border: "none",
              borderRadius: 30,
              fontSize: 15,
              fontWeight: 700,
              fontFamily: "Georgia, serif",
              cursor: submitting ? "wait" : "pointer",
              boxShadow: "0 4px 14px rgba(244,117,10,0.35)",
            }}
          >
            {submitting ? "⏳ Đang xác thực..." : "🔓 Mở khóa"}
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
