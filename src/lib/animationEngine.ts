import type {
  AnimationConfig,
  CircleConfig,
  KidConfig,
  LyricLine,
  ShapeType,
} from "@/types/animation";

export const W = 640;
export const H = 420;
export const DUR = 10000;
export const FPS = 25;

export const PRIMARY = "#F4750A";
export const YELLOW = "#FFD700";
export const SKY_TOP = "#87CEEB";
export const SKY_BOTTOM = "#EAF6FF";

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

  const first = cfg.lyrics[0];
  if (typeof first === "string") {
    const lines = cfg.lyrics as string[];
    const span = DUR / lines.length;
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
  const slots = [
    { x: 0.22, y: 0.42, timeMs: 2800 },
    { x: 0.5, y: 0.38, timeMs: 4800 },
    { x: 0.78, y: 0.42, timeMs: 6800 },
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
  return Math.max(1, cfg.kidCount ?? cfg.kids?.length ?? 3);
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

// ─── Background ───────────────────────────────────────────────────────────────

export function drawBg(
  t: number,
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  _cfg: AnimationConfig,
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
  const waveAngle = wave ? Math.sin(frameTime / 120 + kidIdx) * 0.45 - 0.3 : 0;

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
  ctx.arc(0, -10, 8, 0.15 * Math.PI, 0.85 * Math.PI);
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

  const fontSize = 18;
  ctx.font = `bold ${fontSize}px "Comic Sans MS", "Chalkboard SE", cursive, sans-serif`;
  const textW = ctx.measureText(line.text).width;
  const pillW = textW + 40;
  const pillH = 36;
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

  for (let i = 0; i < count; i++) {
    const cx = spacing * (i + 1);
    const bounce = Math.sin(t / 280 + i * 1.2) * 5;
    const cy = grassY - 8 + bounce;
    const sc = count === 1 ? 1.15 : count === 2 ? 1 : 0.92;

    const waveWindow =
      (t >= 1800 + i * 700 && t < 3200 + i * 700) ||
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
  frameTime = t;
  drawBg(t, ctx, width, height, cfg);

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
      spawnBurst(cs.cx, cs.cy, cs.color, state.particles);
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

  updateParticles(state.particles, ctx);

  drawLyric(t, ctx, width, height, cfg);

  if (t < 2500) {
    drawTitle(t, ctx, width, height, cfg);
  }
}
