"use client";

import type { AnimationOptions } from "@/types/animation";
import { DEFAULT_ANIMATION_OPTIONS } from "@/types/animation";

export const defaultAnimationOptions = DEFAULT_ANIMATION_OPTIONS;

interface AnimationOptionsPanelProps {
  value: AnimationOptions;
  onChange: (next: AnimationOptions) => void;
  disabled?: boolean;
}

const btnBase =
  "rounded-full border-2 px-3 py-2 text-sm font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F4750A]";

const btnActive = "border-[#F4750A] bg-[#F4750A] text-white shadow";
const btnInactive =
  "border-[#F4750A] bg-white text-[#F4750A] hover:bg-orange-50";

function rowLabel(text: string) {
  return (
    <p className="mb-2 text-sm font-bold text-[#F4750A]">{text}</p>
  );
}

export default function AnimationOptionsPanel({
  value,
  onChange,
  disabled = false,
}: AnimationOptionsPanelProps) {
  const patch = (p: Partial<AnimationOptions>) =>
    onChange({ ...value, ...p });

  return (
    <div
      className={`kiddo-card w-full max-w-md border-2 border-[#F4750A] ${disabled ? "pointer-events-none opacity-50" : ""}`}
    >
      <h3
        className="mb-4 text-center text-lg font-bold text-[#F4750A]"
        style={{ fontFamily: "Georgia, serif" }}
      >
        Tùy chỉnh animation
      </h3>

      {rowLabel("Nhân vật")}
      <div className="mb-4 flex flex-wrap gap-2">
        {([1, 2, 3] as const).map((n) => (
          <button
            key={n}
            type="button"
            className={`${btnBase} ${value.kidCount === n ? btnActive : btnInactive}`}
            onClick={() => patch({ kidCount: n })}
          >
            {n} bé
          </button>
        ))}
      </div>

      {rowLabel("Phông nền")}
      <div className="mb-4 flex flex-wrap gap-2">
        {(
          [
            { id: "sky" as const, label: "☁️ Bầu trời" },
            { id: "ocean" as const, label: "🌊 Đại dương" },
            { id: "space" as const, label: "🚀 Vũ trụ" },
            { id: "farm" as const, label: "🌾 Nông trại" },
            { id: "classroom" as const, label: "🏫 Lớp học" },
          ] as const
        ).map(({ id, label }) => (
          <button
            key={id}
            type="button"
            className={`${btnBase} ${value.background === id ? btnActive : btnInactive}`}
            onClick={() => patch({ background: id })}
          >
            {label}
          </button>
        ))}
      </div>

      {rowLabel("Tốc độ")}
      <div className="mb-4 flex flex-wrap gap-2">
        {(
          [
            { id: "slow" as const, label: "🐢 Chậm" },
            { id: "normal" as const, label: "▶️ Bình thường" },
            { id: "fast" as const, label: "⚡ Nhanh" },
          ] as const
        ).map(({ id, label }) => (
          <button
            key={id}
            type="button"
            className={`${btnBase} ${value.speed === id ? btnActive : btnInactive}`}
            onClick={() => patch({ speed: id })}
          >
            {label}
          </button>
        ))}
      </div>

      {rowLabel("Thời lượng")}
      <div className="mb-4 flex flex-wrap gap-2">
        {([8, 10, 15] as const).map((d) => (
          <button
            key={d}
            type="button"
            className={`${btnBase} ${value.duration === d ? btnActive : btnInactive}`}
            onClick={() => patch({ duration: d })}
          >
            {d} giây
          </button>
        ))}
      </div>

      {rowLabel("Hiệu ứng")}
      <div className="mb-4 flex flex-wrap gap-3">
        <TogglePill
          label="✨ Confetti"
          on={value.hasConfetti}
          onToggle={() => patch({ hasConfetti: !value.hasConfetti })}
        />
        <TogglePill
          label="💥 Particles"
          on={value.hasParticles}
          onToggle={() => patch({ hasParticles: !value.hasParticles })}
        />
      </div>

      {rowLabel("Cỡ chữ lyrics")}
      <div className="mb-2 flex flex-wrap gap-2">
        {(
          [
            { id: "small" as const, label: "Nhỏ" },
            { id: "medium" as const, label: "Vừa" },
            { id: "large" as const, label: "Lớn" },
          ] as const
        ).map(({ id, label }) => (
          <button
            key={id}
            type="button"
            className={`${btnBase} ${value.textSize === id ? btnActive : btnInactive}`}
            onClick={() => patch({ textSize: id })}
          >
            {label}
          </button>
        ))}
      </div>

      {rowLabel("Tâm trạng nhân vật")}
      <div className="flex flex-wrap gap-2">
        {(
          [
            { id: "happy" as const, label: "😊 Vui" },
            { id: "excited" as const, label: "🤩 Hào hứng" },
            { id: "calm" as const, label: "😌 Điềm tĩnh" },
          ] as const
        ).map(({ id, label }) => (
          <button
            key={id}
            type="button"
            className={`${btnBase} ${value.characterStyle === id ? btnActive : btnInactive}`}
            onClick={() => patch({ characterStyle: id })}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

function TogglePill({
  label,
  on,
  onToggle,
}: {
  label: string;
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`rounded-full border-2 px-4 py-2 text-sm font-bold transition ${
        on
          ? "border-[#F4750A] bg-[#F4750A] text-white"
          : "border-gray-300 bg-gray-100 text-gray-600"
      }`}
    >
      {label}
    </button>
  );
}
