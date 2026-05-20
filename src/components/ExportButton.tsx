"use client";

import { useRef, useState } from "react";
import type { RefObject } from "react";
import type { FFmpeg } from "@ffmpeg/ffmpeg";
import { FPS } from "@/lib/animationEngine";
import type { AnimationConfig } from "@/types/animation";
import type { AnimationCanvasHandle } from "./AnimationCanvas";

export interface ExportedVideoData {
  id: string;
  thumbnail_url: string;
  mp4_url: string;
}

interface ExportButtonProps {
  canvasRef: RefObject<AnimationCanvasHandle | null>;
  config: AnimationConfig;
  onExportComplete: (videoData: ExportedVideoData) => void;
}

const loadFFmpeg = async (): Promise<FFmpeg> => {
  const { createFFmpeg } = await import("@ffmpeg/ffmpeg");
  const ff = createFFmpeg({
    log: true,
    corePath:
      "https://unpkg.com/@ffmpeg/core@0.11.0/dist/ffmpeg-core.js",
  });
  await ff.load();
  return ff;
};

export default function ExportButton({
  canvasRef,
  config,
  onExportComplete,
}: ExportButtonProps) {
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const encodeFramesToMp4 = async (frameBlobs: Blob[]): Promise<Blob> => {
    console.log("Step 2: loading ffmpeg...");
    if (!ffmpegRef.current) {
      ffmpegRef.current = await loadFFmpeg();
    }
    const ffmpeg = ffmpegRef.current;
    const { fetchFile } = await import("@ffmpeg/ffmpeg");

    console.log("Step 3: writing frames...");
    for (let i = 0; i < frameBlobs.length; i++) {
      const name = `frame${String(i).padStart(4, "0")}.jpg`;
      ffmpeg.FS("writeFile", name, await fetchFile(frameBlobs[i]));
    }

    console.log("Step 4: encoding...");
    await ffmpeg.run(
      "-framerate",
      String(FPS),
      "-i",
      "frame%04d.jpg",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-y",
      "output.mp4",
    );

    console.log("Step 5: reading output...");
    const data = ffmpeg.FS("readFile", "output.mp4");

    for (let i = 0; i < frameBlobs.length; i++) {
      try {
        ffmpeg.FS("unlink", `frame${String(i).padStart(4, "0")}.jpg`);
      } catch {
        /* ignore */
      }
    }
    try {
      ffmpeg.FS("unlink", "output.mp4");
    } catch {
      /* ignore */
    }

    return new Blob([Uint8Array.from(data)], { type: "video/mp4" });
  };

  const handleExport = async () => {
    const canvas = canvasRef.current;
    if (!canvas) {
      setError("Canvas chưa sẵn sàng");
      return;
    }

    setExporting(true);
    setError(null);
    setProgress(0);

    try {
      console.log("Step 1: capturing frames...");
      const thumbnailBlob = await canvas.captureFrame();
      setProgress(0.05);

      const frameBlobs = await canvas.renderAllFrames((p) => {
        setProgress(0.05 + p * 0.55);
      });

      setProgress(0.65);
      const mp4Blob = await encodeFramesToMp4(frameBlobs);

      const downloadUrl = URL.createObjectURL(mp4Blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `${config.title.replace(/\s+/g, "-")}.mp4`;
      link.click();
      URL.revokeObjectURL(downloadUrl);

      setProgress(0.85);

      console.log("Step 6: uploading to server...");
      const formData = new FormData();
      formData.append("title", config.title);
      formData.append("config", JSON.stringify(config));
      formData.append(
        "thumbnail",
        new File([thumbnailBlob], "thumbnail.jpg", { type: "image/jpeg" }),
      );
      formData.append(
        "mp4",
        new File([mp4Blob], "animation.mp4", { type: "video/mp4" }),
      );

      const res = await fetch("/api/save-video", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(body.error ?? `Upload failed (${res.status})`);
      }

      const videoData = (await res.json()) as ExportedVideoData;
      setProgress(1);
      console.log("Export complete:", videoData);
      onExportComplete(videoData);
    } catch (err) {
      console.error("Export failed:", err);
      setError(err instanceof Error ? err.message : "Xuất video thất bại");
    } finally {
      setExporting(false);
    }
  };

  const progressPct = Math.round(progress * 100);

  return (
    <div className="flex w-full max-w-[640px] flex-col items-center gap-2">
      <button
        type="button"
        onClick={handleExport}
        disabled={exporting}
        className="btn-kiddo"
      >
        {exporting ? `Đang xuất… ${progressPct}%` : "Tải MP4"}
      </button>

      {exporting && (
        <div className="h-2 w-full overflow-hidden rounded-full bg-orange-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#F4750A] to-[#FFD700] transition-[width] duration-150"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      )}

      {error && (
        <p className="text-center text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
