import type {
  AnimationConfig,
  CircleConfig,
  KidConfig,
  LyricLine,
  ShapeType,
} from "@/types/animation";

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

export function getSpeedMult(cfg: Pick<AnimationConfig, "speed">): number {
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

function kidAt(cfg: AnimationConfig, idx: number): KidConfig {
  return cfg.kids?.[idx] ?? DEFAULT_KIDS[idx % DEFAULT_KIDS.length];
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

export function drawBg(
  t: number,
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  cfg: AnimationConfig,
): void {
  const theme = cfg.background ?? "sky";
  switch (theme) {
    case "space":
      drawSpaceBg(t, ctx, width, height);
      break;
    case "ocean":
      drawOceanBg(t, ctx, width, height);
      break;
    case "farm":
      drawFarmBg(t, ctx, width, height);
      break;
    case "classroom":
      drawClassroomBg(t, ctx, width, height);
      break;
    default:
      drawSkyBg(t, ctx, width, height);
  }

  ctx.strokeStyle = PRIMARY;
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, width - 4, height - 4);
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
  const wave = pose.wave ?? false;
  const mood = cfg.characterStyle ?? "happy";
  const waveSpeed = mood === "excited" ? 80 : mood === "calm" ? 165 : 120;
  const waveAngle = wave
    ? Math.sin(frameTime / waveSpeed + kidIdx) * 0.45 - 0.3
    : 0;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(sc, sc);

  const legSpread = 14;
  ctx.fillStyle = "#333";
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
  ctx.rotate(wave ? waveAngle * 0.3 : 0.2);
  ctx.beginPath();
  ctx.ellipse(0, 0, 6, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(18, 14);
  ctx.rotate(wave ? waveAngle : -0.15);
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

  drawHair(ctx, kidIdx, kid.hairColor);

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
  const sm0 = mood === "excited" ? 0.08 * Math.PI : mood === "calm" ? 0.22 * Math.PI : 0.15 * Math.PI;
  const sm1 = mood === "excited" ? 0.92 * Math.PI : mood === "calm" ? 0.78 * Math.PI : 0.85 * Math.PI;
  ctx.arc(0, -10, 8, sm0, sm1);
  ctx.stroke();

  ctx.restore();
}

function drawHair(
  ctx: CanvasRenderingContext2D,
  kidIdx: number,
  color: string,
): void {
  ctx.fillStyle = color;
  const style = kidIdx % 3;

  if (style === 0) {
    ctx.beginPath();
    ctx.arc(0, -22, 22, Math.PI, 0);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(-20, -10, 8, 14, -0.3, 0, Math.PI * 2);
    ctx.ellipse(20, -10, 8, 14, 0.3, 0, Math.PI * 2);
    ctx.fill();
  } else if (style === 1) {
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
    ctx.ellipse(0, -24, 24, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-24, -24, 48, 10);
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

// ─── Kid positions ────────────────────────────────────────────────────────────

export function getKidPositions(t: number, cfg: AnimationConfig): KidState[] {
  const count = kidCount(cfg);
  const grassY = H * 0.82;
  const spacing = W / (count + 1);
  const states: KidState[] = [];
  const at = animT(t, cfg);
  const style = cfg.characterStyle ?? "happy";
  const bounceAmp = style === "excited" ? 7 : style === "calm" ? 3 : 5;

  for (let i = 0; i < count; i++) {
    const cx = spacing * (i + 1);
    const bounce = Math.sin(at / 280 + i * 1.2) * bounceAmp;
    const cy = grassY - 8 + bounce;
    const sc = count === 1 ? 1.15 : count === 2 ? 1 : 0.92;

    const dur = getDurationMs(cfg);
    const waveStart = dur * 0.18;
    const waveSpan = dur * 0.07;
    const waveEnd = dur * 0.32;
    const waveWindow =
      (t >= waveStart + i * waveSpan && t < waveEnd + i * waveSpan) ||
      shapeTargets(cfg).some(
        (c) =>
          t >= c.timeMs &&
          t < c.timeMs + 600 &&
          Math.abs(c.x * W - cx) < 120,
      );

    states.push({
      cx,
      cy,
      sc,
      kidIdx: i,
      pose: { wave: waveWindow },
    });
  }

  return states;
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
  return {
    particles: [],
    hitFired: (cfg.shapes || ["circle", "circle", "circle"])
      .slice(0, 3)
      .map(() => false),
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
): void {
  const dur = getDurationMs(cfg);
  const a = animT(t, cfg);
  frameTime = a;
  drawBg(a, ctx, width, height, cfg);

  shapeTargets(cfg).forEach((circleCfg, i) => {
    const cs = state.circleStates[i];
    if (!cs) return;

    if (t >= circleCfg.timeMs) {
      cs.active = true;
      const appear = easeOut(clamp((t - circleCfg.timeMs) / 400, 0, 1));
      const pulse = 1 + Math.sin((t - circleCfg.timeMs) / 200) * 0.08;
      cs.scale = appear * pulse;
      cs.alpha = appear;
    }

    if (
      cs.active &&
      !state.hitFired[i] &&
      t >= circleCfg.timeMs + 800
    ) {
      if (cfg.hasParticles !== false) {
        spawnBurst(cs.cx, cs.cy, cs.color, state.particles);
      }
      state.hitFired[i] = true;
      cs.active = false;
    }

    if (cs.active && cs.alpha > 0) {
      ctx.save();
      ctx.globalAlpha = cs.alpha;
      drawShape(cs.cx, cs.cy, cs.r * cs.scale, cs.color, cs.shape, ctx);
      ctx.restore();
    }
  });

  const kids = getKidPositions(t, cfg);
  for (const k of kids) {
    drawKid(k.cx, k.cy, k.sc, k.kidIdx, k.pose, cfg, ctx);
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
