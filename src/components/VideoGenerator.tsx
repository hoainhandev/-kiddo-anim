"use client";

import { useState } from "react";
import type { AnimationConfig, Video } from "@/types/animation";

interface VideoGeneratorProps {
  imageBase64: string;
  mimeType: string;
  animationConfig: AnimationConfig;
  duration?: number;
  hasAudio?: boolean;
  onVideoReady: (videoUrl: string) => void;
  onExportComplete?: (video: Video) => void;
}

const AUDIO_PROMPT_SUFFIX =
  " Background music: cheerful, playful children's music that matches the scene mood.";

function buildFinalPrompt(prompt: string, hasAudio: boolean): string {
  if (!hasAudio) return prompt;
  return `${prompt}${AUDIO_PROMPT_SUFFIX}`;
}

type Step = "idle" | "generating-prompt" | "generating-video" | "done" | "error";

export default function VideoGenerator({
  imageBase64,
  mimeType,
  animationConfig,
  duration = 6,
  hasAudio = false,
  onVideoReady,
  onExportComplete,
}: VideoGeneratorProps) {
  console.log("VideoGenerator hasAudio prop:", hasAudio);

  const [step, setStep] = useState<Step>("idle");
  const [prompt, setPrompt] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [originalVideoUrl, setOriginalVideoUrl] = useState("");
  const [error, setError] = useState("");
  const [editablePrompt, setEditablePrompt] = useState("");
  const [showPromptEditor, setShowPromptEditor] = useState(false);
  const [savedToHistory, setSavedToHistory] = useState(false);

  async function saveToHistory(videoUrlRemote: string, promptText: string) {
    try {
      const res = await fetch("/api/save-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: animationConfig?.title || "AI Video",
          animation_config: {
            ...animationConfig,
            prompt: promptText,
            duration,
            hasAudio,
            generatedBy: "hailuo",
          },
          mp4_url: videoUrlRemote,
          thumbnail_url: null,
          duration,
        }),
      });
      const saved = await res.json();
      if (!res.ok || saved.error) {
        throw new Error(saved.error ?? "Save failed");
      }
      console.log("Saved to history:", saved.id);
      setSavedToHistory(true);
      onExportComplete?.(saved as Video);
    } catch (err) {
      console.error("Save history error:", err);
    }
  }

  async function generatePrompt() {
    setStep("generating-prompt");
    setError("");
    try {
      const res = await fetch("/api/generate-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64, mimeType, animationConfig }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error ?? "Prompt generation failed");
      }
      setPrompt(data.prompt);
      setEditablePrompt(data.prompt);
      setShowPromptEditor(true);
      setStep("idle");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Prompt generation failed");
      setStep("error");
    }
  }

  async function generateVideo() {
    setStep("generating-video");
    setError("");
    try {
      const basePrompt = editablePrompt || prompt;
      const finalPrompt = buildFinalPrompt(basePrompt, hasAudio);

      console.log("generateVideo sending hasAudio:", hasAudio ?? false);

      const res = await fetch("/api/generate-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64,
          mimeType,
          prompt: editablePrompt || prompt,
          duration,
          hasAudio: hasAudio ?? false,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error ?? "Video generation failed");
      }
      if (!data.videoUrl) {
        throw new Error("No video URL returned");
      }
      const proxiedUrl = `/api/proxy-video?url=${encodeURIComponent(data.videoUrl)}`;
      setOriginalVideoUrl(data.videoUrl);
      setVideoUrl(proxiedUrl);
      setStep("done");
      onVideoReady(data.videoUrl);
      await saveToHistory(
        data.videoUrl,
        (data.prompt as string) || finalPrompt,
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Video generation failed");
      setStep("error");
    }
  }

  const isLoading =
    step === "generating-prompt" || step === "generating-video";

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.9)",
        border: "2px solid rgba(244,117,10,0.2)",
        borderRadius: 16,
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 20 }}>🎬</span>
        <span style={{ fontWeight: 700, color: "#F4750A", fontSize: 14 }}>
          AI Video Generator (Hailuo)
        </span>
      </div>

      {!prompt && step !== "generating-prompt" && (
        <button
          type="button"
          onClick={generatePrompt}
          disabled={isLoading}
          style={{
            background: "linear-gradient(135deg, #F4750A, #E85D00)",
            color: "#fff",
            border: "none",
            borderRadius: 30,
            padding: "11px 0",
            fontFamily: "Georgia, serif",
            fontWeight: 700,
            fontSize: 14,
            cursor: isLoading ? "not-allowed" : "pointer",
            boxShadow: "0 4px 16px rgba(244,117,10,0.3)",
          }}
        >
          ✨ Tạo prompt từ ảnh
        </button>
      )}

      {step === "generating-prompt" && (
        <div
          style={{
            textAlign: "center",
            color: "#F4750A",
            fontSize: 13,
            padding: 8,
          }}
        >
          🤖 Claude đang phân tích ảnh...
        </div>
      )}

      {showPromptEditor && prompt && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 11, color: "#8A6040", fontWeight: 700 }}>
            PROMPT (có thể chỉnh sửa):
          </div>
          <textarea
            value={editablePrompt}
            onChange={(e) => setEditablePrompt(e.target.value)}
            rows={4}
            style={{
              width: "100%",
              padding: "10px 12px",
              border: "1.5px solid rgba(244,117,10,0.3)",
              borderRadius: 10,
              fontSize: 12,
              fontFamily: "Georgia, serif",
              background: "rgba(255,240,224,0.4)",
              color: "#2A1A00",
              resize: "vertical",
              outline: "none",
            }}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={generatePrompt}
              disabled={isLoading}
              style={{
                flex: 1,
                padding: "9px 0",
                background: "rgba(244,117,10,0.1)",
                color: "#F4750A",
                border: "1.5px solid rgba(244,117,10,0.3)",
                borderRadius: 24,
                fontSize: 12,
                fontFamily: "Georgia, serif",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              🔄 Tạo lại prompt
            </button>
            <button
              type="button"
              onClick={generateVideo}
              disabled={isLoading}
              style={{
                flex: 2,
                padding: "9px 0",
                background: "linear-gradient(135deg, #3a9e3a, #2a7e2a)",
                color: "#fff",
                border: "none",
                borderRadius: 24,
                fontSize: 13,
                fontFamily: "Georgia, serif",
                cursor: isLoading ? "not-allowed" : "pointer",
                fontWeight: 700,
                opacity: isLoading ? 0.5 : 1,
                boxShadow: "0 4px 14px rgba(40,140,40,0.3)",
              }}
            >
              🚀 Tạo video AI
            </button>
          </div>
        </div>
      )}

      {step === "generating-video" && (
        <div
          style={{
            textAlign: "center",
            padding: "20px 0",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div style={{ fontSize: 32 }}>⏳</div>
          <div style={{ color: "#F4750A", fontWeight: 700, fontSize: 14 }}>
            ⏳ Hailuo đang tạo video{hasAudio ? " + nhạc" : ""}...
          </div>
          <div style={{ color: "#8A6040", fontSize: 12 }}>
            Thường mất {hasAudio ? "2–4" : "1–3"} phút, vui lòng chờ
          </div>
          <div
            style={{
              width: "100%",
              height: 4,
              background: "rgba(244,117,10,0.1)",
              borderRadius: 2,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                background: "linear-gradient(90deg, #F4750A, #FFD700)",
                borderRadius: 2,
                animation: "kiddo-loading-bar 2s ease-in-out infinite",
                width: "60%",
              }}
            />
          </div>
        </div>
      )}

      {step === "done" && videoUrl && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <video
            src={videoUrl}
            controls
            autoPlay
            loop
            playsInline
            style={{
              width: "100%",
              borderRadius: 12,
              border: "2px solid rgba(244,117,10,0.2)",
            }}
          />
          <a
            href={originalVideoUrl || videoUrl}
            download="kiddo_ai_video.mp4"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "block",
              textAlign: "center",
              padding: "11px 0",
              background: "linear-gradient(135deg, #3a9e3a, #2a7e2a)",
              color: "#fff",
              borderRadius: 30,
              textDecoration: "none",
              fontFamily: "Georgia, serif",
              fontWeight: 700,
              fontSize: 14,
              boxShadow: "0 4px 14px rgba(40,140,40,0.3)",
            }}
          >
            ⬇ Tải MP4
          </a>
          {savedToHistory && (
            <p
              style={{
                textAlign: "center",
                fontSize: 12,
                color: "#2a8a2a",
                fontWeight: 600,
              }}
            >
              ✅ Đã lưu vào lịch sử
            </p>
          )}
        </div>
      )}

      {step === "error" && error && (
        <div
          style={{
            background: "rgba(232,64,64,0.08)",
            border: "1px solid rgba(232,64,64,0.2)",
            borderRadius: 10,
            padding: "12px 14px",
            color: "#cc3030",
            fontSize: 12,
          }}
        >
          ❌ {error}
          <button
            type="button"
            onClick={() => setStep("idle")}
            style={{
              display: "block",
              marginTop: 8,
              padding: "6px 16px",
              background: "none",
              border: "1px solid #cc3030",
              borderRadius: 20,
              color: "#cc3030",
              cursor: "pointer",
              fontSize: 11,
            }}
          >
            Thử lại
          </button>
        </div>
      )}

      <style>{`
        @keyframes kiddo-loading-bar {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(60%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  );
}
