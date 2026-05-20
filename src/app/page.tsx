"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import AnimationCanvas, {
  type AnimationCanvasHandle,
} from "@/components/AnimationCanvas";
import ExportButton, {
  type ExportedVideoData,
} from "@/components/ExportButton";
import UploadZone from "@/components/UploadZone";
import type { AnimationConfig } from "@/types/animation";

export default function Home() {
  const canvasRef = useRef<AnimationCanvasHandle>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState("image/jpeg");
  const [config, setConfig] = useState<AnimationConfig | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState<ExportedVideoData | null>(
    null,
  );

  const handleImageSelected = useCallback(
    (base64: string, mime: string, previewUrl: string) => {
      setImageBase64(base64);
      setMimeType(mime);
      setPreview(previewUrl);
      setConfig(null);
      setExportSuccess(null);
      setError(null);
    },
    [],
  );

  const handleAnalyze = async () => {
    if (!imageBase64) {
      setError("Vui lòng chọn ảnh flashcard trước");
      return;
    }

    setAnalyzing(true);
    setError(null);
    setConfig(null);
    setExportSuccess(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64, mimeType }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Phân tích ảnh thất bại");
      }

      setConfig(data as AnimationConfig);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Phân tích ảnh thất bại");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6 px-4 py-8">
      <UploadZone
        preview={preview}
        onImageSelected={handleImageSelected}
        disabled={analyzing}
      />

      {preview && !config && (
        <button
          type="button"
          className="btn-kiddo max-w-[640px]"
          onClick={handleAnalyze}
          disabled={analyzing || !imageBase64}
        >
          {analyzing ? "Đang tạo animation…" : "Tạo Animation"}
        </button>
      )}

      {error && (
        <p className="text-center text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {config && (
        <div className="flex w-full flex-col items-center gap-4">
          <div className="kiddo-card w-full max-w-[640px] text-center">
            <h2 className="text-lg font-bold text-[#F4750A]">{config.title}</h2>
            <p className="text-sm text-gray-600">{config.subtitle}</p>
          </div>

          <AnimationCanvas ref={canvasRef} config={config} />

          <ExportButton
            canvasRef={canvasRef}
            config={config}
            onExportComplete={(data) => {
              setExportSuccess(data);
            }}
          />

          {exportSuccess && (
            <div className="kiddo-card w-full max-w-[640px] text-center text-sm">
              <p className="font-bold text-[#F4750A]">Đã lưu video!</p>
              <p className="mt-1 text-gray-600">
                <Link href="/history" className="underline hover:text-[#F4750A]">
                  Xem trong Lịch sử
                </Link>
              </p>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
