import type { SpriteAnimationConfig } from "@/types/animation";

export interface SpriteState {
  image: HTMLImageElement | null;
  loaded: boolean;
  originalBase64: string;
  cleanBase64: string;
}

export interface SpriteDrawOptions {
  flipHorizontal?: boolean;
  bounceStyle?: SpriteAnimationConfig["bounceStyle"];
  shouldBounce?: boolean;
  shouldWave?: boolean;
}

export async function loadSprite(
  base64: string,
  mimeType: string,
): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = `data:${mimeType};base64,${base64}`;
  });
}

export function isSpriteReady(
  img: HTMLImageElement | null | undefined,
): img is HTMLImageElement {
  return !!img && img.complete && img.naturalWidth > 0;
}

export interface SpriteAnimation {
  bounceY: number;
  scale: number;
  wobble: number;
}

export function getSpriteAnimation(
  t: number,
  mood: string,
  opts?: Pick<SpriteDrawOptions, "bounceStyle" | "shouldBounce">,
): SpriteAnimation {
  const moodSpeed = mood === "excited" ? 1.2 : mood === "calm" ? 0.85 : 1;
  const style = opts?.bounceStyle ?? "gentle";
  const bounceAmp =
    style === "energetic" ? 24 : style === "none" ? 0 : 18;
  const scaleAmp = style === "energetic" ? 0.1 : style === "none" ? 0 : 0.08;
  const wobbleAmp = style === "energetic" ? 0.07 : style === "none" ? 0 : 0.05;

  if (opts?.shouldBounce === false || style === "none") {
    return { bounceY: 0, scale: 1, wobble: 0 };
  }

  const bounceY = Math.sin(t * 3 * moodSpeed) * bounceAmp;
  const scale = 1 + Math.sin(t * 2 * moodSpeed) * scaleAmp;
  const wobble = Math.sin(t * 1.5 * moodSpeed) * wobbleAmp;

  return { bounceY, scale, wobble };
}

export function drawSprite(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | null | undefined,
  cx: number,
  cy: number,
  maxHeight: number,
  t: number,
  mood: string,
  alpha = 1,
  opts: SpriteDrawOptions = {},
): void {
  if (!img || !img.complete || img.naturalWidth === 0) return;

  const aspectRatio = img.naturalWidth / img.naturalHeight;
  const height = maxHeight;
  const width = Math.min(height * aspectRatio, maxHeight * 1.15);
  const finalHeight = width / aspectRatio;

  const { bounceY, scale, wobble } = getSpriteAnimation(t, mood, opts);
  const flip = opts.flipHorizontal ? -1 : 1;

  ctx.save();
  ctx.globalAlpha = Math.min(alpha, 1);
  ctx.translate(cx, cy + bounceY);
  ctx.rotate(wobble);
  ctx.scale(scale * flip, scale);

  ctx.save();
  ctx.globalAlpha *= 0.18;
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.ellipse(0, finalHeight / 2 + 8, width * 0.32, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.drawImage(img, -width / 2, -finalHeight / 2, width, finalHeight);

  if (opts.shouldWave && t > 8.5) {
    const age = t - 8.5;
    ctx.save();
    ctx.globalAlpha *= Math.min(age / 0.4, 1);
    ctx.font = "22px serif";
    ctx.textAlign = "center";
    ctx.fillText(
      "⭐",
      width * 0.45 * flip,
      -finalHeight * 0.5 + Math.sin(age * 7) * 10,
    );
    ctx.restore();
  }

  ctx.restore();
}
