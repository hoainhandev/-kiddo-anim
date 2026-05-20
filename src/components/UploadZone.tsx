"use client";

import { useCallback, useRef, useState } from "react";
import type { AnimationConfig } from "@/types/animation";

export interface UploadedImage {
  id: string;
  file: File;
  previewUrl: string;
  base64: string;
  mimeType: string;
  status: "pending" | "processing" | "done" | "error";
  config?: AnimationConfig;
  errorMsg?: string;
  spriteBase64?: string;
  spriteMime?: string;
  spriteStatus?: "processing" | "done" | "fallback";
}

const MAX_IMAGES = 10;

interface UploadZoneProps {
  images: UploadedImage[];
  selectedIndex: number | null;
  onSelect: (index: number) => void;
  onRemove: (id: string) => void;
  onAdd: (items: UploadedImage[]) => void;
  disabled?: boolean;
}

function StatusBadge({ image }: { image: UploadedImage }) {
  const base = "w-full py-1 text-center text-[10px] font-bold";

  switch (image.status) {
    case "pending":
      return (
        <div
          className={base}
          style={{ background: "#f0f0f0", color: "#888" }}
        >
          Chờ xử lý
        </div>
      );
    case "processing":
      return (
        <div
          className={`${base} flex items-center justify-center gap-1`}
          style={{
            background: "rgba(244,117,10,0.15)",
            color: "#F4750A",
          }}
        >
          <span
            className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-[#F4750A] border-t-transparent"
            aria-hidden
          />
          Đang tạo...
        </div>
      );
    case "done":
      return (
        <div
          className={base}
          style={{ background: "rgba(40,160,40,0.12)", color: "#2a8a2a" }}
        >
          ✅ Xong
        </div>
      );
    case "error":
      return (
        <div
          className={base}
          style={{ background: "rgba(232,64,64,0.1)", color: "#cc3030" }}
          title={image.errorMsg}
        >
          ❌ Lỗi
        </div>
      );
  }
}

export default function UploadZone({
  images,
  selectedIndex,
  onSelect,
  onRemove,
  onAdd,
  disabled = false,
}: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [limitWarning, setLimitWarning] = useState<string | null>(null);

  const readFiles = useCallback(
    (files: FileList | File[]) => {
      const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
      if (!list.length) return;

      const remaining = MAX_IMAGES - images.length;
      if (remaining <= 0) {
        setLimitWarning(`Tối đa ${MAX_IMAGES} ảnh. Vui lòng xóa bớt trước khi thêm.`);
        return;
      }

      const toAdd = list.slice(0, remaining);
      if (list.length > remaining) {
        setLimitWarning(
          `Chỉ thêm được ${remaining} ảnh nữa (tối đa ${MAX_IMAGES}).`,
        );
      } else {
        setLimitWarning(null);
      }

      let loaded = 0;
      const newItems: UploadedImage[] = [];

      toAdd.forEach((file) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const base64 = result.split(",")[1] ?? "";
          newItems.push({
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            file,
            previewUrl: result,
            base64,
            mimeType: file.type,
            status: "pending",
          });
          loaded += 1;
          if (loaded === toAdd.length) {
            onAdd(newItems);
          }
        };
        reader.readAsDataURL(file);
      });
    },
    [images.length, onAdd],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (disabled) return;
      if (e.dataTransfer.files?.length) {
        readFiles(e.dataTransfer.files);
      }
    },
    [disabled, readFiles],
  );

  const openPicker = () => {
    if (!disabled) inputRef.current?.click();
  };

  return (
    <div className="kiddo-card w-full">
      {images.length === 0 ? (
        <div
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") openPicker();
          }}
          onClick={openPicker}
          onDragOver={(e) => {
            e.preventDefault();
            if (!disabled) setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`flex min-h-[160px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition ${
            dragOver
              ? "border-[#F4750A] bg-orange-50"
              : "border-orange-200 bg-white/60"
          } ${disabled ? "pointer-events-none opacity-50" : ""}`}
        >
          <div className="flex flex-col items-center gap-2 p-4 text-center">
            <span className="text-3xl">📷</span>
            <p className="text-sm font-bold text-[#F4750A]">
              Kéo thả hoặc chọn flashcard
            </p>
            <p className="text-xs text-gray-500">
              Tối đa {MAX_IMAGES} ảnh · PNG, JPG, WEBP
            </p>
          </div>
        </div>
      ) : (
        <>
          <div
            className={`max-h-[320px] overflow-y-auto rounded-xl p-1 ${
              dragOver ? "bg-orange-50 ring-2 ring-[#F4750A]" : ""
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              if (!disabled) setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <div className="grid grid-cols-3 gap-2">
              {images.map((img, index) => (
                <div
                  key={img.id}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") onSelect(index);
                  }}
                  onClick={() => onSelect(index)}
                  className={`relative cursor-pointer overflow-hidden rounded-[10px] bg-white text-left transition ${
                    selectedIndex === index
                      ? "border-2 border-[#F4750A] shadow-md"
                      : "border border-[#eee]"
                  }`}
                >
                  <button
                    type="button"
                    aria-label="Xóa ảnh"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(img.id);
                    }}
                    className="absolute right-1 top-1 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-white/90 text-xs text-gray-600 shadow hover:bg-red-500 hover:text-white"
                  >
                    ×
                  </button>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.previewUrl}
                    alt={`Flashcard ${index + 1}`}
                    className="h-20 w-full rounded-t-[9px] object-cover"
                  />
                  <StatusBadge image={img} />
                </div>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={openPicker}
            disabled={disabled || images.length >= MAX_IMAGES}
            className="mt-3 w-full rounded-full border-2 border-[#F4750A] bg-white py-2 text-sm font-bold text-[#F4750A] transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            + Thêm ảnh ({images.length}/{MAX_IMAGES})
          </button>
        </>
      )}

      {limitWarning && (
        <p className="mt-2 text-center text-xs font-medium text-amber-700">
          {limitWarning}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        disabled={disabled}
        onChange={(e) => {
          if (e.target.files?.length) readFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
