"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import AnimationCanvas, {
  type AnimationCanvasHandle,
} from "@/components/AnimationCanvas";
import AnimationOptionsPanel, {
  defaultAnimationOptions,
} from "@/components/AnimationOptions";
import ExportButton from "@/components/ExportButton";
import UploadZone, { type UploadedImage } from "@/components/UploadZone";
import type { AnimationConfig, AnimationOptions, Video } from "@/types/animation";

function mergeConfig(
  config: AnimationConfig,
  options: AnimationOptions,
): AnimationConfig {
  return {
    ...config,
    ...options,
    kidCount: options.kidCount,
  };
}

export default function Home() {
  const canvasRef = useRef<AnimationCanvasHandle>(null);
  const imagesRef = useRef<UploadedImage[]>([]);
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);
  const [isProcessingAll, setIsProcessingAll] = useState(false);
  const [batchProgress, setBatchProgress] = useState<string | null>(null);
  const [options, setOptions] = useState<AnimationOptions>(defaultAnimationOptions);
  const [error, setError] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState<Video | null>(null);

  const isBusy =
    isProcessingAll ||
    images.some((im) => im.status === "processing");

  const displayConfig = useMemo(() => {
    if (currentIndex === null) return null;
    const img = images[currentIndex];
    if (!img?.config) return null;
    return mergeConfig(img.config, options);
  }, [currentIndex, images, options]);

  const pendingCount = images.filter((im) => im.status === "pending").length;

  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  const processSprite = useCallback(
    async (base64: string, mimeType: string, id: string) => {
      setImages((prev) =>
        prev.map((im) =>
          im.id === id ? { ...im, spriteStatus: "processing" as const } : im,
        ),
      );

      try {
        const res = await fetch("/api/remove-bg", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64: base64, mimeType }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error ?? "Remove.bg failed");
        }

        setImages((prev) =>
          prev.map((im) =>
            im.id === id
              ? {
                  ...im,
                  spriteBase64: data.resultBase64,
                  spriteMime: data.mimeType,
                  spriteStatus: data.usedFallback
                    ? ("fallback" as const)
                    : ("done" as const),
                }
              : im,
          ),
        );
      } catch (err) {
        console.error("Sprite processing failed:", err);
        setImages((prev) =>
          prev.map((im) =>
            im.id === id
              ? {
                  ...im,
                  spriteBase64: base64,
                  spriteMime: mimeType,
                  spriteStatus: "fallback" as const,
                }
              : im,
          ),
        );
      }
    },
    [],
  );

  const handleAddImages = useCallback(
    (items: UploadedImage[]) => {
      setImages((prev) => {
        const next = [...prev, ...items].slice(0, 10);
        if (prev.length === 0 && next.length > 0) {
          setCurrentIndex(0);
        }
        return next;
      });
      setExportSuccess(null);
      setError(null);

      for (const item of items) {
        void processSprite(item.base64, item.mimeType, item.id);
      }
    },
    [processSprite],
  );

  const handleRemove = useCallback((id: string) => {
    setImages((prev) => {
      const idx = prev.findIndex((im) => im.id === id);
      if (idx === -1) return prev;
      const next = prev.filter((im) => im.id !== id);
      setCurrentIndex((cur) => {
        if (cur === null) return null;
        if (cur === idx) return next.length ? Math.min(idx, next.length - 1) : null;
        if (cur > idx) return cur - 1;
        return cur;
      });
      return next;
    });
    setExportSuccess(null);
  }, []);

  const handleSelect = useCallback((index: number) => {
    setCurrentIndex(index);
    setExportSuccess(null);
    setError(null);
  }, []);

  const currentImage =
    currentIndex !== null ? images[currentIndex] : undefined;

  const processImage = useCallback(
    async (img: UploadedImage, index: number) => {
      setImages((prev) =>
        prev.map((im, i) =>
          i === index ? { ...im, status: "processing" as const, errorMsg: undefined } : im,
        ),
      );

      try {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageBase64: img.base64,
            mimeType: img.mimeType,
            options,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error ?? "Phân tích ảnh thất bại");
        }

        const config = data as AnimationConfig;

        setImages((prev) =>
          prev.map((im, i) =>
            i === index ? { ...im, status: "done" as const, config } : im,
          ),
        );

        setCurrentIndex(index);
        setError(null);
        return config;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Lỗi xử lý";
        setImages((prev) =>
          prev.map((im, i) =>
            i === index
              ? { ...im, status: "error" as const, errorMsg: message }
              : im,
          ),
        );
        throw err;
      }
    },
    [options],
  );

  const processCurrent = async () => {
    if (currentIndex === null) {
      setError("Vui lòng chọn một ảnh trong lưới");
      return;
    }

    const img = images[currentIndex];
    if (!img) return;

    if (img.status === "processing") return;

    setError(null);
    setExportSuccess(null);

    try {
      await processImage(img, currentIndex);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Phân tích ảnh thất bại");
    }
  };

  const processAll = async () => {
    const pendingIndices = imagesRef.current
      .map((im, i) => (im.status === "pending" ? i : -1))
      .filter((i) => i >= 0);

    if (!pendingIndices.length) {
      setError("Không còn ảnh nào chờ xử lý");
      return;
    }

    setIsProcessingAll(true);
    setError(null);
    setExportSuccess(null);

    try {
      for (let step = 0; step < pendingIndices.length; step++) {
        const index = pendingIndices[step];
        setBatchProgress(
          `Đang xử lý ${step + 1}/${pendingIndices.length}...`,
        );

        const snapshot = imagesRef.current[index];
        if (!snapshot || snapshot.status !== "pending") continue;

        try {
          await processImage(snapshot, index);
        } catch {
          /* per-image error state already set */
        }

        if (step < pendingIndices.length - 1) {
          await new Promise((r) => setTimeout(r, 500));
        }
      }
    } finally {
      setIsProcessingAll(false);
      setBatchProgress(null);
    }
  };

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 lg:flex-row lg:items-start lg:justify-center">
      <div className="flex w-full max-w-md flex-shrink-0 flex-col gap-4">
        <UploadZone
          images={images}
          selectedIndex={currentIndex}
          onSelect={handleSelect}
          onRemove={handleRemove}
          onAdd={handleAddImages}
          disabled={isBusy}
        />

        {currentImage && (
          <div className="kiddo-card flex flex-col gap-2 p-3">
            <p className="text-xs font-bold text-gray-600">Nhân vật (sprite)</p>
            {currentImage.spriteStatus === "processing" && (
              <p className="flex items-center gap-2 text-sm font-medium text-[#F4750A]">
                <span
                  className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[#F4750A] border-t-transparent"
                  aria-hidden
                />
                ✂️ Đang tách nhân vật...
              </p>
            )}
            {(currentImage.spriteStatus === "done" ||
              currentImage.spriteStatus === "fallback") &&
              currentImage.spriteBase64 && (
                <div className="flex items-center gap-3">
                  <div
                    className="h-20 w-20 shrink-0 overflow-hidden rounded-lg"
                    style={{
                      backgroundImage:
                        "linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)",
                      backgroundSize: "12px 12px",
                      backgroundPosition: "0 0, 0 6px, 6px -6px, -6px 0px",
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`data:${currentImage.spriteMime ?? "image/png"};base64,${currentImage.spriteBase64}`}
                      alt="Sprite preview"
                      className="h-full w-full object-contain"
                    />
                  </div>
                  <p className="text-xs text-gray-600">
                    {currentImage.spriteStatus === "fallback"
                      ? "⚠️ Dùng ảnh gốc (chưa có Remove.bg key)"
                      : "✅ Đã tách background thành công!"}
                  </p>
                </div>
              )}
          </div>
        )}

        <AnimationOptionsPanel
          value={options}
          onChange={setOptions}
          disabled={isBusy}
        />

        {images.length > 0 && (
          <div className="flex flex-col gap-2">
            <button
              type="button"
              className="btn-kiddo"
              onClick={processCurrent}
              disabled={
                isBusy ||
                currentIndex === null ||
                images[currentIndex]?.status === "processing"
              }
            >
              ✨ Tạo animation này
            </button>
            <button
              type="button"
              className="btn-kiddo"
              onClick={processAll}
              disabled={isBusy || pendingCount === 0}
            >
              🚀 Tạo tất cả ({pendingCount} ảnh)
            </button>
            {batchProgress && (
              <p className="text-center text-sm font-medium text-[#F4750A]">
                {batchProgress}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col items-center gap-6">
        {error && (
          <p className="text-center text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        {currentIndex !== null && images[currentIndex]?.status === "done" && displayConfig && (
          <div className="flex w-full flex-col items-center gap-4">
            <div className="kiddo-card w-full max-w-[640px] text-center">
              <p className="text-xs text-gray-500">
                Ảnh {currentIndex + 1}/{images.length}
              </p>
              <h2 className="text-lg font-bold text-[#F4750A]">
                {displayConfig.title}
              </h2>
              <p className="text-sm text-gray-600">{displayConfig.subtitle}</p>
            </div>

            <AnimationCanvas
              ref={canvasRef}
              config={displayConfig}
              spriteBase64={currentImage?.spriteBase64}
              spriteMime={currentImage?.spriteMime ?? "image/png"}
            />

            <ExportButton
              canvasRef={canvasRef}
              config={displayConfig}
              onExportComplete={(data) => {
                setExportSuccess(data);
              }}
            />

            {exportSuccess && (
              <div className="kiddo-card w-full max-w-[640px] text-center text-sm">
                <p className="font-bold text-[#F4750A]">Đã lưu video!</p>
                <p className="mt-1 text-gray-600">
                  <Link
                    href="/history"
                    className="underline hover:text-[#F4750A]"
                  >
                    Xem trong Lịch sử
                  </Link>
                </p>
              </div>
            )}
          </div>
        )}

        {currentIndex !== null &&
          images[currentIndex]?.status === "pending" &&
          !displayConfig && (
            <p className="kiddo-card text-center text-sm text-gray-600">
              Ảnh {currentIndex + 1} đang chờ — bấm{" "}
              <strong className="text-[#F4750A]">✨ Tạo animation này</strong>{" "}
              hoặc <strong className="text-[#F4750A]">🚀 Tạo tất cả</strong>
            </p>
          )}

        {currentIndex !== null && images[currentIndex]?.status === "processing" && (
          <p className="kiddo-card text-center text-sm text-[#F4750A]">
            Đang tạo animation cho ảnh {currentIndex + 1}…
          </p>
        )}

        {images.length === 0 && (
          <p className="kiddo-card max-w-md text-center text-sm text-gray-500">
            Thêm flashcard bên trái để bắt đầu
          </p>
        )}
      </div>
    </main>
  );
}
