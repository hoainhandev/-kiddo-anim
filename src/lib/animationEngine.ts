import type {
  AnimationConfig,
  CircleConfig,
  KidConfig,
  LyricLine,
  ShapeType,
  SubjectConfig,
} from "@/types/animation";
import { drawSprite, isSpriteReady } from "@/lib/spriteAnimator";
import { renderDynamicBackground } from "@/lib/sceneRenderer";

export const W = 640;
export const H = 420;

export const PRIMARY = "#F4750A";
export const YELLOW = "#FFD700";
export const SKY_TOP = "#87CEEB";
export const SKY_BOTTOM = "#EAF6FF";

/** Default clip length (ms); prefer `getDurationMs(cfg)` for real exports. */
export const DUR = 10000;
export const FPS = 25;

export function getDurationMs(cfg: Pick<AnimationConfig, "duration">): number {
  const d = cfg.duration;
  if (d === 8 || d === 10 || d === 15) return d * 1000;
  return 10_000;
}

export function getSpeedMult(cfg: AnimationConfig): number {
  const rhythm = cfg.animationHints?.rhythm;
  if (rhythm === "slow") return 0.7;
  if (rhythm === "fast") return 1.4;
  if (rhythm === "medium") return 1;
  if (cfg.speed === "slow") return 0.7;
  if (cfg.speed === "fast") return 1.4;
  return 1;
}

export function animT(t: number, cfg: AnimationConfig): number {
  return t * getSpeedMult(cfg);
}

export function getTotalFrames(cfg: AnimationConfig): number {
  return Math.round((getDurationMs(cfg) / 1000) * FPS);
}

let frameTime = 0;

const DEFAULT_KIDS: KidConfig[] = [
  { bodyColor: "#4A90D9", hairColor: "#5C3317", skinTone: "#FFCC99" },
  { bodyColor: "#E85D75", hairColor: "#1A1A1A", skinTone: "#FFDBAC" },
  { bodyColor: "#50C878", hairColor: "#D4A017", skinTone: "#FFDAB9" },
];

export interface KidPose {
  wave?: boolean;
  action?: string;
}

export interface KidState {
  cx: number;
  cy: number;
  sc: number;
  kidIdx: number;
  pose: KidPose;
}

export interface CircleState {
  cx: number;
  cy: number;
  r: number;
  color: string;
  shape: ShapeType;
  scale: number;
  alpha: number;
  active: boolean;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  type: "dot" | "star";
  rotation: number;
  rotSpeed: number;
}

export interface RenderState {
  particles: Particle[];
  hitFired: boolean[];
  circleStates: CircleState[];
}

function cfgShapes(cfg: AnimationConfig): ShapeType[] {
  return (cfg.shapes || ["circle", "circle", "circle"]).slice(0, 3) as ShapeType[];
}

function normalizeLyrics(cfg: AnimationConfig): LyricLine[] {
  if (!cfg.lyrics?.length) return [];

  const dur = getDurationMs(cfg);
  const first = cfg.lyrics[0];
  if (typeof first === "string") {
    const lines = cfg.lyrics as string[];
    const span = dur / lines.length;
    return lines.map((text, i) => ({
      text,
      startMs: i * span,
      endMs: (i + 1) * span,
    }));
  }

  return cfg.lyrics as LyricLine[];
}

function shapeTargets(cfg: AnimationConfig): CircleConfig[] {
  const shapes = cfgShapes(cfg);
  const palette = [
    cfg.colors?.primary ?? PRIMARY,
    cfg.colors?.secondary ?? YELLOW,
    cfg.colors?.accent ?? "#4A90D9",
  ];
  const dur = getDurationMs(cfg);
  const scale = dur / 10_000;
  const slots = [
    { x: 0.22, y: 0.42, timeMs: Math.round(2800 * scale) },
    { x: 0.5, y: 0.38, timeMs: Math.round(4800 * scale) },
    { x: 0.78, y: 0.42, timeMs: Math.round(6800 * scale) },
  ];

  return shapes.map((shape, i) => ({
    ...slots[i],
    radius: 30,
    color: palette[i % palette.length],
    shape: (["circle", "square", "triangle", "star"].includes(shape)
      ? shape
      : "circle") as ShapeType,
  }));
}

function kidCount(cfg: AnimationConfig): number {
  const n = cfg.kidCount ?? cfg.kids?.length ?? 3;
  return Math.min(3, Math.max(1, Math.round(n)));
}

function kidAt(cfg: AnimationConfig, idx: number): KidConfig & { pantsColor?: string; hasGlasses?: boolean; hairStyle?: string } {
  const ch = cfg.characters?.[idx];
  const def = DEFAULT_KIDS[idx % DEFAULT_KIDS.length];
  return {
    bodyColor: ch?.shirtColor ?? def.bodyColor,
    hairColor: ch?.hairColor ?? def.hairColor,
    skinTone: ch?.skinColor ?? def.skinTone,
    pantsColor: ch?.pantsColor,
    hasGlasses: ch?.hasGlasses,
    hairStyle: ch?.hairStyle,
  };
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function easeOut(t: number): number {
  return 1 - (1 - t) ** 3;
}

// ─── Background themes ───────────────────────────────────────────────────────

function drawSkyBg(
  t: number,
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  const grad = ctx.createLinearGradient(0, 0, 0, height * 0.78);
  grad.addColorStop(0, SKY_TOP);
  grad.addColorStop(1, SKY_BOTTOM);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  const sunX = width - 72;
  const sunY = 68 + Math.sin(t / 900) * 4;
  const sunR = 28;

  ctx.save();
  ctx.translate(sunX, sunY);
  ctx.rotate(t / 1800);
  for (let i = 0; i < 12; i++) {
    ctx.save();
    ctx.rotate((Math.PI * 2 * i) / 12);
    ctx.fillStyle = YELLOW;
    ctx.beginPath();
    ctx.moveTo(0, -sunR - 4);
    ctx.lineTo(5, -sunR - 18);
    ctx.lineTo(-5, -sunR - 18);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();

  const sunGrad = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunR);
  sunGrad.addColorStop(0, "#FFF8DC");
  sunGrad.addColorStop(0.6, YELLOW);
  sunGrad.addColorStop(1, "#FFA500");
  ctx.fillStyle = sunGrad;
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
  ctx.fill();

  const clouds: { x: number; y: number; s: number; sp: number }[] = [
    { x: 80, y: 55, s: 1, sp: 0.018 },
    { x: 260, y: 40, s: 0.85, sp: 0.014 },
    { x: 420, y: 70, s: 1.1, sp: 0.022 },
    { x: 540, y: 48, s: 0.75, sp: 0.016 },
  ];

  for (const c of clouds) {
    const ox = ((c.x + t * c.sp * 40) % (width + 120)) - 60;
    drawCloud(ctx, ox, c.y, c.s);
  }

  const grassTop = height * 0.72;
  const grassGrad = ctx.createLinearGradient(0, grassTop, 0, height);
  grassGrad.addColorStop(0, "#7EC850");
  grassGrad.addColorStop(0.4, "#5CB338");
  grassGrad.addColorStop(1, "#3D8C2A");
  ctx.fillStyle = grassGrad;
  ctx.fillRect(0, grassTop, width, height - grassTop);

  for (let i = 0; i < width; i += 14) {
    const bladeH = 8 + Math.sin(i * 0.3 + t / 400) * 3;
    ctx.strokeStyle = `rgba(60,140,40,${0.3 + Math.sin(i) * 0.15})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(i, grassTop + 2);
    ctx.quadraticCurveTo(i + 3, grassTop - bladeH, i + 6, grassTop + 2);
    ctx.stroke();
  }

  const flowerSpots = [
    { x: 55, c: "#FF6B9D" },
    { x: 140, c: YELLOW },
    { x: 230, c: "#FF69B4" },
    { x: 380, c: "#DA70D6" },
    { x: 500, c: YELLOW },
    { x: 590, c: "#FF6B9D" },
  ];
  for (const f of flowerSpots) {
    const bob = Math.sin(t / 500 + f.x) * 2;
    drawFlower(ctx, f.x, grassTop + 8 + bob, f.c);
  }
}

function drawSpaceBg(
  t: number,
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  const g = ctx.createLinearGradient(0, 0, 0, height);
  g.addColorStop(0, "#0a0a2a");
  g.addColorStop(1, "#0a0a1a");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, width, height);

  for (let i = 0; i < 80; i++) {
    const x = (i * 73 + t * 0.02) % width;
    const y = (i * 47) % (height * 0.75);
    const tw = 1 + (i % 3);
    ctx.fillStyle = `rgba(255,255,255,${0.3 + (i % 5) * 0.12})`;
    ctx.fillRect(x, y, tw, tw);
  }

  const moonX = width - 80;
  const moonY = 70;
  ctx.fillStyle = "#E8E8E8";
  ctx.beginPath();
  ctx.arc(moonX, moonY, 32, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#0a0a1a";
  ctx.beginPath();
  ctx.arc(moonX - 14, moonY - 6, 28, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#C94C4C";
  ctx.beginPath();
  ctx.arc(120 + Math.sin(t / 2000) * 8, 100, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#6B8CFF";
  ctx.beginPath();
  ctx.arc(480 + Math.cos(t / 1800) * 10, 160, 10, 0, Math.PI * 2);
  ctx.fill();

  const groundY = height * 0.78;
  ctx.fillStyle = "#151520";
  ctx.fillRect(0, groundY, width, height - groundY);
}

function drawOceanBg(
  t: number,
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  const g = ctx.createLinearGradient(0, 0, 0, height);
  g.addColorStop(0, "#00CED1");
  g.addColorStop(0.45, "#006994");
  g.addColorStop(1, "#003d5c");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.lineWidth = 2;
  for (let w = 0; w < 4; w++) {
    ctx.beginPath();
    const y = height * 0.35 + w * 40 + Math.sin(t / 600 + w) * 6;
    for (let x = 0; x <= width; x += 20) {
      ctx.lineTo(x, y + Math.sin(x / 40 + t / 300 + w) * 8);
    }
    ctx.stroke();
  }

  for (let i = 0; i < 6; i++) {
    const fx = 80 + i * 100 + Math.sin(t / 500 + i) * 20;
    const fy = height * 0.42 + Math.cos(t / 400 + i) * 15;
    ctx.fillStyle = "#FF9F43";
    ctx.beginPath();
    ctx.ellipse(fx, fy, 18, 10, Math.sin(t / 800 + i), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(fx + 6, fy - 2, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let b = 0; b < 25; b++) {
    const bx = (b * 97 + t * 0.08) % width;
    const by = height * 0.2 + (b * 53) % (height * 0.5);
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(bx, by, 3 + (b % 4), 0, Math.PI * 2);
    ctx.stroke();
  }

  const sandY = height * 0.72;
  ctx.fillStyle = "#C2B280";
  ctx.fillRect(0, sandY, width, height - sandY);
}

function drawFarmBg(
  t: number,
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  const sky = ctx.createLinearGradient(0, 0, 0, height * 0.55);
  sky.addColorStop(0, "#87CEEB");
  sky.addColorStop(1, "#E0F4FF");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height * 0.55);

  const sunX = width - 70;
  const sunY = 65;
  ctx.fillStyle = YELLOW;
  ctx.beginPath();
  ctx.arc(sunX, sunY, 26 + Math.sin(t / 700) * 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#5CB338";
  ctx.beginPath();
  ctx.moveTo(0, height * 0.52);
  ctx.quadraticCurveTo(width * 0.25, height * 0.38, width * 0.5, height * 0.5);
  ctx.quadraticCurveTo(width * 0.75, height * 0.62, width, height * 0.48);
  ctx.lineTo(width, height * 0.72);
  ctx.lineTo(0, height * 0.72);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#8B6914";
  ctx.fillRect(0, height * 0.72, width, height * 0.28);

  ctx.fillStyle = "#B22222";
  ctx.fillRect(width * 0.62, height * 0.38, 70, 55);
  ctx.fillStyle = "#8B4513";
  ctx.beginPath();
  ctx.moveTo(width * 0.62 - 15, height * 0.38);
  ctx.lineTo(width * 0.62 + 35, height * 0.28);
  ctx.lineTo(width * 0.62 + 85, height * 0.38);
  ctx.closePath();
  ctx.fill();

  for (let i = 0; i < 5; i++) {
    drawFlower(
      ctx,
      60 + i * 130,
      height * 0.76 + Math.sin(t / 400 + i) * 2,
      ["#FF6B9D", YELLOW, "#DA70D6"][i % 3],
    );
  }
}

function drawClassroomBg(
  t: number,
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  ctx.fillStyle = "#f5f0e8";
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "#2d4a3e";
  ctx.fillRect(24, 20, width - 48, height * 0.42);
  ctx.strokeStyle = "#8B7355";
  ctx.lineWidth = 6;
  ctx.strokeRect(24, 20, width - 48, height * 0.42);

  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.font = 'bold 18px "Comic Sans MS", sans-serif';
  ctx.fillText("A B C   1 + 1 = 2", 40, 55 + Math.sin(t / 900) * 2);

  ctx.fillStyle = "#c4a574";
  ctx.fillRect(0, height * 0.68, width, height * 0.32);
  ctx.fillStyle = "#8B6914";
  for (let d = 0; d < 4; d++) {
    ctx.fillRect(80 + d * 140, height * 0.62, 90, 8);
  }
}

function drawShapesMinimalBg(
  t: number,
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, SKY_TOP);
  grad.addColorStop(1, SKY_BOTTOM);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = YELLOW;
  ctx.beginPath();
  ctx.arc(width - 60, 55 + Math.sin(t / 900) * 3, 22, 0, Math.PI * 2);
  ctx.fill();

  const grassTop = height * 0.78;
  ctx.fillStyle = "#7EC850";
  ctx.fillRect(0, grassTop, width, height - grassTop);
}

function drawAnimalsBg(
  t: number,
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  const sky = ctx.createLinearGradient(0, 0, 0, height * 0.55);
  sky.addColorStop(0, "#87CEEB");
  sky.addColorStop(1, "#C8E6FF");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height * 0.55);

  ctx.fillStyle = "#4CAF50";
  ctx.beginPath();
  ctx.moveTo(0, height * 0.5);
  ctx.quadraticCurveTo(width * 0.3, height * 0.35, width * 0.55, height * 0.48);
  ctx.quadraticCurveTo(width * 0.8, height * 0.62, width, height * 0.45);
  ctx.lineTo(width, height * 0.72);
  ctx.lineTo(0, height * 0.72);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#388E3C";
  ctx.fillRect(0, height * 0.72, width, height * 0.28);

  for (let i = 0; i < 4; i++) {
    const tx = 80 + i * 150;
    ctx.fillStyle = "#5D4037";
    ctx.fillRect(tx, height * 0.38, 12, height * 0.34);
    ctx.fillStyle = "#2E7D32";
    ctx.beginPath();
    ctx.arc(tx + 6, height * 0.36, 28 + Math.sin(t / 600 + i) * 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawLettersThemeBg(
  t: number,
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  ctx.fillStyle = "#FFF9E6";
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "rgba(200,180,140,0.35)";
  ctx.lineWidth = 1;
  for (let x = 0; x < width; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height * 0.72);
    ctx.stroke();
  }
  for (let y = 0; y < height * 0.72; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  ctx.fillStyle = "#c4a574";
  ctx.fillRect(0, height * 0.72, width, height * 0.28);
  ctx.fillStyle = "rgba(244,117,10,0.15)";
  ctx.font = 'bold 20px "Comic Sans MS", sans-serif';
  ctx.fillText("A B C", 40, 50 + Math.sin(t / 800) * 2);
}

function drawNumbersBg(
  t: number,
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  cfg: AnimationConfig,
): void {
  ctx.fillStyle = cfg.colors?.background ?? "#FFFFFF";
  ctx.fillRect(0, 0, width, height);

  const dotColors = [
    cfg.colors?.primary ?? PRIMARY,
    cfg.colors?.secondary ?? YELLOW,
    cfg.colors?.accent ?? "#4A90D9",
    "#FF69B4",
    "#9B59B6",
  ];
  for (let i = 0; i < 30; i++) {
    const x = (i * 97 + t * 0.03) % width;
    const y = (i * 53) % (height * 0.65);
    ctx.fillStyle = dotColors[i % dotColors.length];
    ctx.globalAlpha = 0.25;
    ctx.beginPath();
    ctx.arc(x, y, 4 + (i % 3), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  ctx.fillStyle = "#E8E8E8";
  ctx.fillRect(0, height * 0.72, width, height * 0.28);
}

function resolveTheme(cfg: AnimationConfig): string {
  const raw = (cfg.theme ?? cfg.scene?.layout ?? "default").toString().toLowerCase();
  if (raw !== "default") return raw;
  const bgMap: Record<string, string> = {
    sky: "default",
    space: "space",
    ocean: "ocean",
    farm: "nature",
    classroom: "letters",
  };
  return bgMap[cfg.background ?? "sky"] ?? "default";
}

export function drawBg(
  t: number,
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  cfg: AnimationConfig,
): void {
  const theme = resolveTheme(cfg);

  if (cfg.scene?.backgroundType === "solid" && cfg.colors?.background) {
    ctx.fillStyle = cfg.colors.background;
    ctx.fillRect(0, 0, width, height);
  } else {
    switch (theme) {
      case "animals":
        drawAnimalsBg(t, ctx, width, height);
        break;
      case "letters":
        drawLettersThemeBg(t, ctx, width, height);
        break;
      case "numbers":
        drawNumbersBg(t, ctx, width, height, cfg);
        break;
      case "nature":
        drawFarmBg(t, ctx, width, height);
        break;
      case "space":
        drawSpaceBg(t, ctx, width, height);
        break;
      case "shapes":
        drawShapesMinimalBg(t, ctx, width, height);
        break;
      case "ocean":
        drawOceanBg(t, ctx, width, height);
        break;
      case "classroom":
        drawClassroomBg(t, ctx, width, height);
        break;
      default:
        drawSkyBg(t, ctx, width, height);
    }
  }

  const borderColor = cfg.colors?.primary ?? PRIMARY;
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, width - 6, height - 6);
}

function drawCloud(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  const blobs = [
    { dx: 0, dy: 0, r: 22 },
    { dx: 24, dy: 4, r: 18 },
    { dx: -20, dy: 6, r: 16 },
    { dx: 12, dy: -8, r: 14 },
    { dx: 38, dy: 2, r: 15 },
  ];
  for (const b of blobs) {
    ctx.beginPath();
    ctx.arc(b.dx, b.dy, b.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawFlower(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
): void {
  ctx.strokeStyle = "#2D6B1E";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y + 10);
  ctx.lineTo(x, y - 4);
  ctx.stroke();

  for (let i = 0; i < 5; i++) {
    const a = (Math.PI * 2 * i) / 5 - Math.PI / 2;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(
      x + Math.cos(a) * 7,
      y - 4 + Math.sin(a) * 7,
      5,
      5,
      a,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  ctx.fillStyle = YELLOW;
  ctx.beginPath();
  ctx.arc(x, y - 4, 4, 0, Math.PI * 2);
  ctx.fill();
}

// ─── Title ────────────────────────────────────────────────────────────────────

export function drawTitle(
  t: number,
  ctx: CanvasRenderingContext2D,
  width: number,
  _height: number,
  cfg: AnimationConfig,
): void {
  const fade = easeOut(clamp(t / 1200, 0, 1));
  if (fade <= 0) return;

  ctx.save();
  ctx.globalAlpha = fade;

  const titleSize = 22;
  const subSize = 14;
  ctx.font = `bold ${titleSize}px "Comic Sans MS", "Chalkboard SE", cursive, sans-serif`;
  const titleW = ctx.measureText(cfg.title).width;
  ctx.font = `${subSize}px "Comic Sans MS", "Chalkboard SE", cursive, sans-serif`;
  const subW = ctx.measureText(cfg.subtitle ?? "").width;
  const pillW = Math.max(titleW, subW) + 48;
  const pillH = 58;
  const px = (width - pillW) / 2;
  const py = 14;

  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.shadowColor = "rgba(0,0,0,0.12)";
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 2;
  roundRect(ctx, px, py, pillW, pillH, 20);
  ctx.fill();
  ctx.shadowColor = "transparent";

  ctx.fillStyle = PRIMARY;
  ctx.font = `bold ${titleSize}px "Comic Sans MS", "Chalkboard SE", cursive, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(cfg.title, width / 2, py + 22);

  ctx.fillStyle = "#555";
  ctx.font = `${subSize}px "Comic Sans MS", "Chalkboard SE", cursive, sans-serif`;
  ctx.fillText(cfg.subtitle ?? "", width / 2, py + 44);

  ctx.restore();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ─── Shapes ───────────────────────────────────────────────────────────────────

export function drawShape(
  cx: number,
  cy: number,
  r: number,
  color: string,
  shape: ShapeType,
  ctx: CanvasRenderingContext2D,
): void {
  ctx.save();
  ctx.translate(cx, cy);

  ctx.fillStyle = color;
  ctx.strokeStyle = "rgba(0,0,0,0.15)";
  ctx.lineWidth = 2;

  switch (shape) {
    case "circle":
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    case "square":
      ctx.beginPath();
      ctx.roundRect(-r, -r, r * 2, r * 2, r * 0.2);
      ctx.fill();
      ctx.stroke();
      break;
    case "triangle":
      ctx.beginPath();
      ctx.moveTo(0, -r);
      ctx.lineTo(r, r);
      ctx.lineTo(-r, r);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    case "star":
      drawStarPath(ctx, 0, 0, r, r * 0.45, 5);
      ctx.fill();
      ctx.stroke();
      break;
  }

  const shineGrad = ctx.createRadialGradient(-r * 0.3, -r * 0.35, 0, 0, 0, r);
  shineGrad.addColorStop(0, "rgba(255,255,255,0.65)");
  shineGrad.addColorStop(0.5, "rgba(255,255,255,0.15)");
  shineGrad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = shineGrad;
  ctx.beginPath();
  ctx.arc(-r * 0.25, -r * 0.3, r * 0.55, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawStarPath(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  outer: number,
  inner: number,
  points: number,
): void {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const rad = (i * Math.PI) / points - Math.PI / 2;
    const radius = i % 2 === 0 ? outer : inner;
    const x = cx + Math.cos(rad) * radius;
    const y = cy + Math.sin(rad) * radius;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

// ─── Kid character ────────────────────────────────────────────────────────────

export function drawKid(
  cx: number,
  cy: number,
  sc: number,
  kidIdx: number,
  pose: KidPose,
  cfg: AnimationConfig,
  ctx: CanvasRenderingContext2D,
): void {
  const kid = kidAt(cfg, kidIdx);
  const action = pose.action ?? (pose.wave ? "waving" : "standing");
  const wave = action === "waving" || pose.wave === true;
  const pointing = action === "pointing";
  const mood = cfg.characterStyle ?? cfg.animationHints?.mood ?? "happy";
  const waveSpeed = mood === "excited" ? 80 : mood === "calm" ? 165 : 120;
  const waveAngle = wave
    ? Math.sin(frameTime / waveSpeed + kidIdx) * 0.45 - 0.3
    : 0;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(sc, sc);

  const legSpread = 14;
  ctx.fillStyle = kid.pantsColor ?? "#4ab8d8";
  ctx.beginPath();
  ctx.ellipse(-legSpread / 2, 38, 7, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(legSpread / 2, 38, 7, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = kid.bodyColor;
  ctx.beginPath();
  ctx.ellipse(0, 18, 22, 26, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(0,0,0,0.08)";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = kid.skinTone;
  ctx.save();
  ctx.translate(-18, 14);
  ctx.rotate(
    action === "standing" ? 0.1 : wave ? waveAngle * 0.3 : 0.2,
  );
  ctx.beginPath();
  ctx.ellipse(0, 0, 6, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(18, 14);
  ctx.rotate(pointing ? -0.8 : wave ? waveAngle : -0.15);
  ctx.beginPath();
  ctx.ellipse(0, 0, 6, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  if (wave) {
    const handX = 18 + Math.cos(waveAngle) * 6;
    const handY = 14 + Math.sin(waveAngle) * 6 - 18;
    drawSparkle(ctx, handX, handY - 22, YELLOW);
  }

  ctx.fillStyle = kid.skinTone;
  ctx.beginPath();
  ctx.arc(0, -14, 20, 0, Math.PI * 2);
  ctx.fill();

  drawHair(ctx, kidIdx, kid.hairColor, kid.hairStyle);

  if (kid.hasGlasses) {
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(-7, -16, 5, 0, Math.PI * 2);
    ctx.arc(7, -16, 5, 0, Math.PI * 2);
    ctx.moveTo(-2, -16);
    ctx.lineTo(2, -16);
    ctx.stroke();
  }

  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.ellipse(-7, -16, 5, 6, 0, 0, Math.PI * 2);
  ctx.ellipse(7, -16, 5, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#333";
  ctx.beginPath();
  ctx.arc(-7, -15, 2.5, 0, Math.PI * 2);
  ctx.arc(7, -15, 2.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(255,150,150,0.55)";
  ctx.beginPath();
  ctx.ellipse(-12, -8, 4, 2.5, 0, 0, Math.PI * 2);
  ctx.ellipse(12, -8, 4, 2.5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#333";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.beginPath();
  const sm0 =
    mood === "excited"
      ? 0.08 * Math.PI
      : mood === "calm"
        ? 0.22 * Math.PI
        : 0.15 * Math.PI;
  const sm1 =
    mood === "excited"
      ? 0.92 * Math.PI
      : mood === "calm"
        ? 0.78 * Math.PI
        : 0.85 * Math.PI;
  ctx.arc(0, -10, 8, sm0, sm1);
  ctx.stroke();

  ctx.restore();
}

function drawHair(
  ctx: CanvasRenderingContext2D,
  kidIdx: number,
  color: string,
  hairStyle?: string,
): void {
  ctx.fillStyle = color;
  const style = hairStyle ?? (["short", "curly", "long"][kidIdx % 3] as string);

  if (style === "long" || style === "pigtails") {
    ctx.beginPath();
    ctx.arc(0, -22, 22, Math.PI, 0);
    ctx.fill();
    if (style === "pigtails") {
      ctx.beginPath();
      ctx.ellipse(-20, -10, 8, 14, -0.3, 0, Math.PI * 2);
      ctx.ellipse(20, -10, 8, 14, 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (style === "curly") {
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 8, -28);
      ctx.lineTo(i * 8 - 4, -38 - Math.abs(i) * 2);
      ctx.lineTo(i * 8 + 4, -28);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(0, -20, 21, Math.PI, 0);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.arc(0, -22, 22, Math.PI, 0);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(-20, -10, 8, 14, -0.3, 0, Math.PI * 2);
    ctx.ellipse(20, -10, 8, 14, 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawSparkle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  for (let i = 0; i < 4; i++) {
    ctx.rotate(Math.PI / 4);
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(2, -2);
    ctx.lineTo(10, 0);
    ctx.lineTo(2, 2);
    ctx.lineTo(0, 10);
    ctx.lineTo(-2, 2);
    ctx.lineTo(-10, 0);
    ctx.lineTo(-2, -2);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

// ─── Particles ────────────────────────────────────────────────────────────────

export function spawnBurst(
  cx: number,
  cy: number,
  color: string,
  particles: Particle[],
): void {
  for (let i = 0; i < 16; i++) {
    const angle = (Math.PI * 2 * i) / 16 + Math.random() * 0.3;
    const speed = 2 + Math.random() * 4;
    particles.push({
      x: cx,
      y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2,
      life: 1,
      maxLife: 1,
      color,
      size: 4 + Math.random() * 4,
      type: "dot",
      rotation: 0,
      rotSpeed: 0,
    });
  }

  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI * 2 * i) / 6 + Math.random() * 0.5;
    const speed = 1.5 + Math.random() * 3;
    particles.push({
      x: cx,
      y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 3,
      life: 1,
      maxLife: 1,
      color: YELLOW,
      size: 8 + Math.random() * 4,
      type: "star",
      rotation: Math.random() * Math.PI,
      rotSpeed: (Math.random() - 0.5) * 0.2,
    });
  }
}

export function updateParticles(
  particles: Particle[],
  ctx: CanvasRenderingContext2D,
): void {
  const gravity = 0.12;

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.vy += gravity;
    p.x += p.vx;
    p.y += p.vy;
    p.vx *= 0.98;
    p.life -= 0.018;
    p.rotation += p.rotSpeed;

    if (p.life <= 0) {
      particles.splice(i, 1);
      continue;
    }

    const alpha = p.life / p.maxLife;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);

    if (p.type === "star") {
      ctx.fillStyle = p.color;
      drawStarPath(ctx, 0, 0, p.size, p.size * 0.4, 5);
      ctx.fill();
    } else {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(0, 0, p.size * alpha, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

// ─── Lyrics ───────────────────────────────────────────────────────────────────

function lyricFontSize(cfg: AnimationConfig): number {
  if (cfg.textSize === "small") return 18;
  if (cfg.textSize === "large") return 30;
  return 23;
}

function drawConfetti(
  t: number,
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  cfg: AnimationConfig,
): void {
  if (cfg.hasConfetti === false) return;
  const dur = getDurationMs(cfg);
  if (t < dur * 0.82) return;

  const u = (t - dur * 0.82) / (dur * 0.18);
  const colors = ["#F4750A", "#FFD700", "#FF69B4", "#4ECDC4", "#9B59B6"];
  for (let i = 0; i < 48; i++) {
    const x =
      (Math.sin(i * 12.989 + u * 14) * 0.5 + 0.5) * (width - 20) + 10;
    const y =
      ((i * 37 + u * 260 + t * 0.05) % (height + 40)) - 20 + u * 30;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(u * Math.PI * 2 + i * 0.4);
    ctx.fillStyle = colors[i % colors.length];
    ctx.globalAlpha = 0.75;
    ctx.fillRect(-3, -7, 6, 14);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

export function drawLyric(
  t: number,
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  cfg: AnimationConfig,
): void {
  const line = normalizeLyrics(cfg).find((l) => t >= l.startMs && t < l.endMs);
  if (!line) return;

  const duration = line.endMs - line.startMs;
  const local = t - line.startMs;
  const fadeIn = easeOut(clamp(local / 300, 0, 1));
  const fadeOut = easeOut(clamp((duration - local) / 300, 0, 1));
  const alpha = Math.min(fadeIn, fadeOut);
  if (alpha <= 0) return;

  ctx.save();
  ctx.globalAlpha = alpha;

  const fontSize = lyricFontSize(cfg);
  ctx.font = `bold ${fontSize}px "Comic Sans MS", "Chalkboard SE", cursive, sans-serif`;
  const textW = ctx.measureText(line.text).width;
  const pillW = textW + 40;
  const pillH = Math.round(fontSize + 16);
  const px = (width - pillW) / 2;
  const py = height * 0.58;

  ctx.fillStyle = "rgba(244,117,10,0.18)";
  roundRect(ctx, px, py, pillW, pillH, 18);
  ctx.fill();
  ctx.strokeStyle = PRIMARY;
  ctx.lineWidth = 2;
  roundRect(ctx, px, py, pillW, pillH, 18);
  ctx.stroke();

  ctx.fillStyle = "#333";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(line.text, width / 2, py + pillH / 2);

  ctx.restore();
}

// ─── Dynamic subjects ─────────────────────────────────────────────────────────

function getDefaultSubjects(cfg: AnimationConfig): SubjectConfig[] {
  const shapes = (cfg.shapes || ["circle", "circle", "circle"]).slice(0, 5);
  const colors = [
    cfg.colors?.primary ?? PRIMARY,
    cfg.colors?.secondary ?? YELLOW,
    cfg.colors?.accent ?? "#4A90D9",
  ];
  return shapes.map((shape, i) => ({
    type: shape,
    color: colors[i % colors.length] ?? "#888888",
    size: "medium" as const,
    label: null,
  }));
}

function getSubjectPosition(
  subject: SubjectConfig,
  idx: number,
  total: number,
  width: number,
  height: number,
): { cx: number; cy: number } {
  if (subject.positionX != null && subject.positionY != null) {
    return {
      cx: subject.positionX * width,
      cy: subject.positionY * height * 0.6 + 60,
    };
  }
  const spacing = width / (total + 1);
  return { cx: spacing * (idx + 1), cy: height * 0.45 };
}

function subjectRadius(size?: string): number {
  if (size === "small") return 40;
  if (size === "large") return 80;
  return 60;
}

function isSequentialKeyAction(keyAction: string): boolean {
  return /one by one|sequence|appear/i.test(keyAction);
}

function subjectStartSec(idx: number, keyAction: string): number {
  const sequential = isSequentialKeyAction(keyAction);
  const base = 0.7;
  const stagger = sequential ? 1.5 : 0.4;
  return base + idx * stagger;
}

function getEntryScale(ageSec: number, entryStyle: string): number {
  if (ageSec <= 0) return 0;
  switch (entryStyle) {
    case "slide":
    case "fade":
      return Math.min(ageSec / 0.35, 1);
    case "pop":
      if (ageSec < 0.15) return (ageSec / 0.15) * 1.4;
      if (ageSec < 0.3) return 1.4 - ((ageSec - 0.15) / 0.15) * 0.4;
      return 1;
    case "spin":
      return Math.min(ageSec / 0.35, 1);
    case "bounce":
    default:
      if (ageSec < 0.25) return (ageSec / 0.25) * 1.2;
      if (ageSec < 0.45) return 1.2 - ((ageSec - 0.25) / 0.2) * 0.2;
      return 1;
  }
}

function getEntryAlpha(ageSec: number, entryStyle: string): number {
  if (entryStyle === "fade") return Math.min(ageSec / 0.4, 1);
  return Math.min(ageSec / 0.3, 1);
}

function getActionScale(tSec: number, idx: number, keyAction: string): number {
  const k = keyAction.toLowerCase();
  if (/grow|big then small|pulse/.test(k)) {
    const cycle = Math.sin(tSec * 3 + idx * 0.8);
    return 0.8 + (cycle + 1) * 0.3;
  }
  if (/bounce/.test(k) && !isSequentialKeyAction(k)) {
    return 1 + Math.sin(tSec * 4 + idx) * 0.08;
  }
  return 1;
}

function getSubjectYOffset(
  tSec: number,
  idx: number,
  keyAction: string,
  ageSec: number,
  entryStyle: string,
): number {
  const k = keyAction.toLowerCase();
  if (/hop/.test(k) && ageSec > 0.4) {
    return Math.abs(Math.sin(tSec * 5 + idx * 0.5)) * -30;
  }
  if (entryStyle === "slide" && ageSec < 0.5) {
    return (1 - Math.min(ageSec / 0.5, 1)) * 80;
  }
  return 0;
}

function getSubjectRotation(
  tSec: number,
  idx: number,
  keyAction: string,
  entryStyle: string,
  ageSec: number,
): number {
  const k = keyAction.toLowerCase();
  if (/spin|rotate/.test(k)) return tSec * 2 + idx;
  if (entryStyle === "spin" && ageSec < 0.5) {
    return (1 - ageSec / 0.5) * Math.PI * 2;
  }
  return 0;
}

function toGeomShape(type: string): ShapeType | null {
  if (["circle", "square", "triangle", "star"].includes(type)) {
    return type as ShapeType;
  }
  return null;
}

function drawSubjectVisual(
  ctx: CanvasRenderingContext2D,
  r: number,
  color: string,
  type: string,
  label?: string | null,
): void {
  const geom = toGeomShape(type);
  if (geom) {
    drawShape(0, 0, r, color, geom, ctx);
    return;
  }

  if (type === "letter" || type === "number") {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.15)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "#FFFFFF";
    ctx.font = `bold ${Math.round(r * 0.85)}px Georgia, serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const text = (label ?? (type === "number" ? "1" : "A")).slice(0, 3);
    ctx.fillText(text, 0, 2);
    return;
  }

  if (type === "animal") {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(0, r * 0.1, r * 0.85, r * 0.65, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-r * 0.45, -r * 0.55, r * 0.22, 0, Math.PI * 2);
    ctx.arc(r * 0.45, -r * 0.55, r * 0.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#333";
    ctx.beginPath();
    ctx.arc(-r * 0.25, -r * 0.05, r * 0.08, 0, Math.PI * 2);
    ctx.arc(r * 0.25, -r * 0.05, r * 0.08, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(-r, -r, r * 2, r * 2, r * 0.15);
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.15)";
  ctx.lineWidth = 2;
  ctx.stroke();
}

function getHitScale(
  t: number,
  idx: number,
  cx: number,
  cy: number,
  startMs: number,
  cfg: AnimationConfig,
  state: RenderState,
  color: string,
): number {
  if (state.hitFired[idx]) return 0.92;

  const kids = getKidPositionsInternal(t, cfg);
  for (const k of kids) {
    if (Math.hypot(k.cx - cx, k.cy - cy) < 70 && t > startMs + 600) {
      if (cfg.hasParticles !== false) {
        spawnBurst(cx, cy, color, state.particles);
      }
      state.hitFired[idx] = true;
      return 0.85;
    }
  }
  return 1;
}

function renderSubjects(
  t: number,
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  cfg: AnimationConfig,
  state: RenderState,
): void {
  const subjects = (cfg.subjects?.length ? cfg.subjects : getDefaultSubjects(cfg)).slice(
    0,
    5,
  );
  const entryStyle = cfg.animationHints?.entryStyle ?? "bounce";
  const keyAction = cfg.animationHints?.keyAction ?? "";
  const tSec = t / 1000;

  subjects.forEach((subject, i) => {
    const startSec = subjectStartSec(i, keyAction);
    const startMs = startSec * 1000;
    const ageSec = tSec - startSec;
    if (ageSec < 0) return;

    const { cx, cy: baseCy } = getSubjectPosition(
      subject,
      i,
      subjects.length,
      width,
      height,
    );
    const r = subjectRadius(subject.size);
    const yOff = getSubjectYOffset(tSec, i, keyAction, ageSec, entryStyle);
    const cy = baseCy + yOff;

    const enterScale = getEntryScale(ageSec, entryStyle);
    const actionScale = getActionScale(tSec, i, keyAction);
    const hitScale = getHitScale(t, i, cx, cy, startMs, cfg, state, subject.color);
    const finalScale = enterScale * actionScale * hitScale;
    const rotation = getSubjectRotation(tSec, i, keyAction, entryStyle, ageSec);
    const alpha = getEntryAlpha(ageSec, entryStyle);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotation);
    ctx.scale(finalScale, finalScale);
    ctx.globalAlpha = alpha;
    drawSubjectVisual(ctx, r, subject.color, subject.type, subject.label);
    ctx.restore();

    if (
      ["letter", "number", "animal"].includes(subject.type) &&
      subject.label
    ) {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = "bold 13px Georgia, serif";
      ctx.fillStyle = subject.color;
      ctx.textAlign = "center";
      ctx.fillText(subject.label, cx, cy + r * finalScale + 18);
      ctx.restore();
    }
  });
}

// ─── Kid positions ────────────────────────────────────────────────────────────

function characterX(
  hint: string | undefined,
  idx: number,
  count: number,
  width: number,
): number {
  if (hint === "left") return width * 0.15;
  if (hint === "center") return width * 0.5;
  if (hint === "right") return width * 0.85;
  const spacing = width / (count + 1);
  return spacing * (idx + 1);
}

function getKidPositionsInternal(t: number, cfg: AnimationConfig): KidState[] {
  const count = kidCount(cfg);
  const grassY = H * 0.82;
  const at = animT(t, cfg);
  const style = cfg.characterStyle ?? cfg.animationHints?.mood ?? "happy";
  const bounceAmp =
    style === "excited" ? 7 : style === "calm" ? 3 : 5;
  const states: KidState[] = [];

  for (let i = 0; i < count; i++) {
    const ch = cfg.characters?.[i];
    const action = ch?.action ?? "standing";
    const cx = characterX(ch?.positionHint, i, count, W);

    let bounce = Math.sin(at / 280 + i * 1.2) * bounceAmp;
    if (action === "jumping") {
      bounce += Math.abs(Math.sin(at / 1000 * 4)) * -25;
    } else if (action === "running" && t < 1200) {
      bounce += Math.abs(Math.sin(at / 100 * 10)) * -12;
    }

    const cy = grassY - 8 + bounce;
    const sc = count === 1 ? 1.15 : count === 2 ? 1 : 0.92;

    states.push({
      cx,
      cy,
      sc,
      kidIdx: i,
      pose: {
        wave: action === "waving",
        action,
      },
    });
  }

  return states;
}

export function getKidPositions(t: number, cfg: AnimationConfig): KidState[] {
  return getKidPositionsInternal(t, cfg);
}

// ─── Circle state helpers ─────────────────────────────────────────────────────

export function initCircleStates(cfg: AnimationConfig): CircleState[] {
  return shapeTargets(cfg).map((c) => ({
    cx: c.x * W,
    cy: c.y * H,
    r: c.radius,
    color: c.color,
    shape: c.shape,
    scale: 0,
    alpha: 0,
    active: false,
  }));
}

export function initRenderState(cfg: AnimationConfig): RenderState {
  const subjects = (
    cfg.subjects?.length ? cfg.subjects : getDefaultSubjects(cfg)
  ).slice(0, 5);
  return {
    particles: [],
    hitFired: subjects.map(() => false),
    circleStates: initCircleStates(cfg),
  };
}

// ─── Main render ──────────────────────────────────────────────────────────────

export function renderFrame(
  t: number,
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  cfg: AnimationConfig,
  state: RenderState,
  spriteImg?: HTMLImageElement | null,
): void {
  const dur = getDurationMs(cfg);
  const a = animT(t, cfg);
  frameTime = a;
  const tSec = a / 1000;
  renderDynamicBackground(tSec, ctx, width, height, cfg);

  renderSubjects(t, ctx, width, height, cfg, state);

  const groundType = cfg.sceneDescription?.groundType;
  const groundY = height - (groundType === "none" ? 40 : 82);
  const mood = cfg.mood ?? cfg.characterStyle ?? "happy";
  const spriteCfg = cfg.spriteAnimation;

  if (isSpriteReady(spriteImg)) {
    const enterAge = Math.max(0, tSec - 1);
    const enterAlpha = Math.min(enterAge / 0.5, 1);
    const entryOffset = enterAlpha < 1 ? (1 - enterAge / 0.5) * 80 : 0;

    const scaleInScene = spriteCfg?.scaleInScene ?? "medium";
    const spriteSize =
      scaleInScene === "large" ? 220 : scaleInScene === "small" ? 120 : 170;
    const spriteCy = groundY - spriteSize / 2 + entryOffset;
    const flipHorizontal = spriteCfg?.facingDirection === "left";

    drawSprite(
      ctx,
      spriteImg,
      width / 2,
      spriteCy,
      spriteSize,
      tSec,
      mood,
      enterAlpha,
      {
        flipHorizontal,
        bounceStyle: spriteCfg?.bounceStyle,
        shouldBounce: spriteCfg?.shouldBounce !== false,
        shouldWave: spriteCfg?.shouldWave ?? tSec > 8.5,
      },
    );

    const extraKids = Math.min((cfg.kidCount ?? 1) - 1, 2);
    if (extraKids > 0) {
      const positions = [width * 0.18, width * 0.82];
      for (let i = 0; i < extraKids; i++) {
        const kidEnter = Math.max(0, tSec - 1.3 - i * 0.3);
        const kidAlpha = Math.min(kidEnter / 0.5, 1);
        if (kidAlpha > 0) {
          ctx.save();
          ctx.globalAlpha = kidAlpha;
          drawKid(
            positions[i],
            groundY,
            0.68,
            i,
            { wave: tSec > 8.5, action: "waving" },
            cfg,
            ctx,
          );
          ctx.restore();
        }
      }
    }
  } else {
    const kids = getKidPositions(t, cfg);
    for (const k of kids) {
      drawKid(k.cx, k.cy, k.sc, k.kidIdx, k.pose, cfg, ctx);
    }
  }

  if (cfg.hasParticles !== false) {
    updateParticles(state.particles, ctx);
  } else {
    state.particles.length = 0;
  }

  drawLyric(t, ctx, width, height, cfg);

  drawConfetti(t, ctx, width, height, cfg);

  const titleWindow = Math.min(2500, dur * 0.25);
  if (t < titleWindow) {
    drawTitle(a, ctx, width, height, cfg);
  }
}
