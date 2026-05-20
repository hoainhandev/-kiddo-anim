"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import DurationSelector from "@/components/DurationSelector";
import UploadZone, { type UploadedImage } from "@/components/UploadZone";
import VideoGenerator from "@/components/VideoGenerator";
import QuoteCalculator from "@/components/QuoteCalculator";
import type { AnimationConfig } from "@/types/animation";
import { DEFAULT_ANIMATION_OPTIONS } from "@/types/animation";

export default function Home() {
  const imagesRef = useRef<UploadedImage[]>([]);
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aiVideoUrl, setAiVideoUrl] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState(6);

  const isAnalyzing = images.some((im) => im.status === "processing");

  const currentImage =
    currentIndex !== null ? images[currentIndex] : undefined;

  const animationConfig = useMemo(() => {
    if (!currentImage?.config) return null;
    return currentImage.config;
  }, [currentImage?.config]);

  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  useEffect(() => {
    if (currentImage) {
      console.log("spriteBase64 exists:", !!currentImage.spriteBase64);
      console.log("spriteStatus:", currentImage.spriteStatus);
    }
  }, [currentImage]);

  const processSprite = useCallback(
    async (base64: string, mimeType: string, id: string) => {
      console.log("processSprite called with:", mimeType);

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
        console.log("remove-bg response:", {
          ok: res.ok,
          usedFallback: data.usedFallback,
          hasResult: !!data.resultBase64,
        });

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
      } catch {
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
      setAiVideoUrl(null);
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
    setAiVideoUrl(null);
  }, []);

  const handleSelect = useCallback((index: number) => {
    setCurrentIndex(index);
    setAiVideoUrl(null);
    setError(null);
  }, []);

  const processImage = useCallback(
    async (img: UploadedImage, index: number) => {
      setImages((prev) =>
        prev.map((im, i) =>
          i === index
            ? { ...im, status: "processing" as const, errorMsg: undefined }
            : im,
        ),
      );

      try {
        const analyzeOptions = {
          ...DEFAULT_ANIMATION_OPTIONS,
          kidCount: 1 as const,
          duration:
            videoDuration <= 6 ? 10 : videoDuration <= 8 ? 8 : 15,
        };

        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageBase64: img.base64,
            mimeType: img.mimeType,
            options: analyzeOptions,
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
        const message = err instanceof Error ? err.message : "Lỗi xử lý";
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
    [videoDuration],
  );

  const processCurrent = async () => {
    if (currentIndex === null) {
      setError("Vui lòng chọn một ảnh trong lưới");
      return;
    }

    const img = images[currentIndex];
    if (!img || img.status === "processing") return;

    setError(null);
    setAiVideoUrl(null);

    try {
      await processImage(img, currentIndex);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Phân tích ảnh thất bại");
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
          disabled={isAnalyzing}
        />

        <DurationSelector
          value={videoDuration}
          onChange={setVideoDuration}
        />

        <QuoteCalculator
          selectedDuration={videoDuration}
          onDurationChange={setVideoDuration}
        />

        {images.length > 0 && (
          <button
            type="button"
            className="btn-kiddo"
            onClick={processCurrent}
            disabled={
              isAnalyzing ||
              currentIndex === null ||
              images[currentIndex]?.status === "processing"
            }
          >
            ✨ Phân tích ảnh & tạo prompt
          </button>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col items-center gap-4">
        {error && (
          <p className="text-center text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        {images.length === 0 && (
          <p className="kiddo-card max-w-md text-center text-sm text-gray-500">
            Tải flashcard bên trái để bắt đầu
          </p>
        )}

        {currentIndex !== null && images[currentIndex]?.status === "processing" && (
          <p className="kiddo-card w-full max-w-[640px] text-center text-sm text-[#F4750A]">
            Đang phân tích ảnh {currentIndex + 1}…
          </p>
        )}

        {currentIndex !== null &&
          images[currentIndex]?.status === "pending" &&
          !animationConfig && (
            <p className="kiddo-card w-full max-w-[640px] text-center text-sm text-gray-600">
              Ảnh {currentIndex + 1} đã sẵn sàng — bấm{" "}
              <strong className="text-[#F4750A]">
                ✨ Phân tích ảnh & tạo prompt
              </strong>{" "}
              bên trái
            </p>
          )}

        {currentIndex !== null &&
          images[currentIndex]?.status === "done" &&
          animationConfig &&
          currentImage && (
            <div className="flex w-full max-w-[640px] flex-col gap-4">
              <div className="kiddo-card overflow-hidden p-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={currentImage.previewUrl}
                  alt={animationConfig.title}
                  className="aspect-video w-full object-contain bg-orange-50"
                />
                <div className="border-t border-orange-100 px-4 py-3 text-center">
                  <p className="text-xs text-gray-500">
                    Ảnh {currentIndex + 1}/{images.length}
                  </p>
                  <h2 className="text-lg font-bold text-[#F4750A]">
                    {animationConfig.title}
                  </h2>
                  {animationConfig.subtitle && (
                    <p className="text-sm text-gray-600">
                      {animationConfig.subtitle}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-[#2a8a2a]">
                    ✅ Đã phân tích — tạo video AI bên dưới
                  </p>
                </div>
              </div>

              <VideoGenerator
                imageBase64={currentImage.base64}
                mimeType={currentImage.mimeType}
                animationConfig={animationConfig}
                duration={videoDuration}
                onVideoReady={(url) => setAiVideoUrl(url)}
                onExportComplete={(video) =>
                  console.log("Saved:", video.id)
                }
              />

              {aiVideoUrl && (
                <p className="text-center text-xs text-gray-500">
                  Video AI đã sẵn sàng ở trên — xem và tải xuống
                </p>
              )}
            </div>
          )}

        {currentIndex !== null && images[currentIndex]?.status === "error" && (
          <p className="kiddo-card w-full max-w-[640px] text-center text-sm text-red-600">
            {images[currentIndex]?.errorMsg ?? "Phân tích thất bại"}
          </p>
        )}
      </div>
    </main>
  );
}
