"use client";

import { useCallback, useRef, useState } from "react";

interface UploadZoneProps {
  preview: string | null;
  onImageSelected: (base64: string, mimeType: string, previewUrl: string) => void;
  disabled?: boolean;
}

export default function UploadZone({
  preview,
  onImageSelected,
  disabled = false,
}: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const processFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) return;

      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(",")[1] ?? "";
        onImageSelected(base64, file.type, result);
      };
      reader.readAsDataURL(file);
    },
    [onImageSelected],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (disabled) return;
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [disabled, processFile],
  );

  return (
    <div className="kiddo-card w-full max-w-[640px]">
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        onClick={() => !disabled && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition ${
          dragOver
            ? "border-[#F4750A] bg-orange-50"
            : "border-orange-200 bg-white/60"
        } ${disabled ? "pointer-events-none opacity-50" : ""}`}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt="Flashcard preview"
            className="max-h-[280px] max-w-full rounded-lg object-contain"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 p-6 text-center">
            <span className="text-4xl">📷</span>
            <p className="font-bold text-[#F4750A]">
              Kéo thả hoặc bấm để chọn flashcard
            </p>
            <p className="text-sm text-gray-500">PNG, JPG, WEBP</p>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        disabled={disabled}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) processFile(file);
        }}
      />
    </div>
  );
}
