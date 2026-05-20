/** Client-facing prices (aligned with QuoteCalculator markup model). */

const MARKUP = 2.0;
const CLAUDE = 0.01;
const REMOVEBG = 0.1;

export function calcClientPrice(
  durationSeconds: number,
  hasAudio: boolean,
  quality: "standard" | "pro" = "standard",
): number {
  const duration = durationSeconds || 6;
  const hailuoRate =
    quality === "pro"
      ? hasAudio
        ? 0.224
        : 0.112
      : hasAudio
        ? 0.16
        : 0.08;
  const hailuoCost = duration * hailuoRate;
  const techCost = hailuoCost + CLAUDE + REMOVEBG;
  return Math.ceil((techCost + MARKUP) * 10) / 10;
}
