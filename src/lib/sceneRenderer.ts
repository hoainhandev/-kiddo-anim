import type { AnimationConfig } from "@/types/animation";

/** @param t elapsed animation time in seconds (after speed multiplier) */
export function renderDynamicBackground(
  t: number,
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  cfg: AnimationConfig,
): void {
  const scene = cfg.sceneDescription;
  if (!scene) {
    renderDefaultBackground(t, ctx, W, H, cfg);
    return;
  }

  const bgColors =
    scene.backgroundColors && scene.backgroundColors.length >= 2
      ? scene.backgroundColors
      : [cfg.colors?.background ?? "#87CEEB", "#ffffff"];

  const grd = ctx.createLinearGradient(0, 0, 0, H);
  grd.addColorStop(0, bgColors[0]);
  grd.addColorStop(1, bgColors[1] ?? bgColors[0]);
  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.roundRect(0, 0, W, H, 18);
  ctx.fill();

  ctx.strokeStyle = cfg.colors?.primary ?? "#F4750A";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(2, 2, W - 4, H - 4, 17);
  ctx.stroke();

  const weather = scene.weather ?? "none";
  const timeOfDay = scene.timeOfDay ?? "day";
  const elements = scene.backgroundElements ?? [];

  if (weather === "rainy") {
    renderRain(t, ctx, W, H);
  } else if (weather === "snowy") {
    renderSnow(t, ctx, W, H);
  } else if (weather === "sunny") {
    renderSun(t, ctx, W);
  } else if (weather === "cloudy") {
    renderClouds(t, ctx, W, H, 0.7);
  }

  if (elements.includes("clouds") || weather === "sunny") {
    renderClouds(t, ctx, W, H, 0.5);
  }
  if (elements.includes("stars") || timeOfDay === "night") {
    renderStars(t, ctx);
  }
  if (elements.includes("trees")) {
    renderTrees(t, ctx, W, H, cfg.colors?.accent ?? "#4a8a30");
  }
  if (elements.includes("buildings")) {
    renderBuildings(t, ctx, W, H);
  }
  if (elements.includes("waves") || elements.includes("water")) {
    renderWaves(t, ctx, W, H);
  }
  if (elements.includes("rain") && weather !== "rainy") {
    renderRain(t, ctx, W, H);
  }

  renderGround(t, ctx, W, H, scene.groundType ?? "grass", scene.groundColor);
}

function renderRain(
  t: number,
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
): void {
  ctx.save();
  ctx.strokeStyle = "rgba(180, 210, 240, 0.6)";
  ctx.lineWidth = 1.5;
  ctx.lineCap = "round";
  for (let i = 0; i < 30; i++) {
    const seed = i * 137.5;
    const x = ((seed % W) + t * 80) % W;
    const y = (seed * 0.7 + t * 200) % (H - 80);
    const len = 8 + (i % 5) * 3;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - 2, y + len);
    ctx.stroke();
  }
  ctx.restore();
}

function renderSnow(
  t: number,
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
): void {
  ctx.save();
  ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
  for (let i = 0; i < 25; i++) {
    const seed = i * 97.3;
    const x = ((seed % W) + Math.sin(t * 0.5 + i) * 20) % W;
    const y = (seed * 0.5 + t * 40) % (H - 80);
    const r = 2 + (i % 4);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function renderSun(
  t: number,
  ctx: CanvasRenderingContext2D,
  W: number,
): void {
  const sx = W - 72;
  const sy = 58;
  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(t * 0.4);
  ctx.strokeStyle = "#FFD700";
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 26, Math.sin(a) * 26);
    ctx.lineTo(Math.cos(a) * 38, Math.sin(a) * 38);
    ctx.stroke();
  }
  ctx.restore();

  const grad = ctx.createRadialGradient(sx - 4, sy - 4, 2, sx, sy, 20);
  grad.addColorStop(0, "#FFF176");
  grad.addColorStop(1, "#FFB300");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(sx, sy, 20, 0, Math.PI * 2);
  ctx.fill();
}

function renderClouds(
  t: number,
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  opacity: number,
): void {
  const alpha = Math.min(t / 1.5, 1) * opacity;
  ctx.save();
  const clouds: [number, number, number][] = [
    [100, 55, 0.9],
    [310, 38, 0.65],
    [530, 62, 0.75],
  ];
  for (const [cx, cy, sc] of clouds) {
    ctx.save();
    ctx.globalAlpha = alpha * sc;
    ctx.fillStyle = "#fff";
    ctx.translate(cx + Math.sin(t * 0.18) * 8, cy);
    ctx.scale(sc, sc);
    ctx.beginPath();
    ctx.arc(0, 0, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(28, 5, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-20, 6, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

function renderStars(t: number, ctx: CanvasRenderingContext2D): void {
  ctx.save();
  const stars: [number, number][] = [
    [50, 30],
    [120, 20],
    [200, 45],
    [300, 15],
    [380, 35],
    [450, 25],
    [530, 40],
    [580, 20],
    [80, 80],
    [250, 60],
    [420, 70],
    [560, 65],
  ];
  stars.forEach(([sx, sy], i) => {
    const twinkle = 0.4 + Math.sin(t * 2 + i) * 0.4;
    ctx.globalAlpha = twinkle;
    ctx.fillStyle = "#FFF176";
    ctx.beginPath();
    ctx.arc(sx, sy, 2 + (i % 3), 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

function renderTrees(
  t: number,
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  color: string,
): void {
  const alpha = Math.min(t / 2, 1);
  ctx.save();
  ctx.globalAlpha = alpha * 0.7;
  const trees: [number, number][] = [
    [60, H - 120],
    [W - 80, H - 130],
    [W - 200, H - 100],
  ];
  for (const [tx, ty] of trees) {
    ctx.fillStyle = "#8B6914";
    ctx.fillRect(tx - 6, ty, 12, 40);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(tx, ty, 32, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function renderBuildings(
  t: number,
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
): void {
  const alpha = Math.min(t / 2, 1);
  ctx.save();
  ctx.globalAlpha = alpha * 0.6;
  ctx.fillStyle = "#c04040";
  ctx.beginPath();
  ctx.moveTo(W - 160, H - 140);
  ctx.lineTo(W - 100, H - 200);
  ctx.lineTo(W - 40, H - 140);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#8B4513";
  ctx.fillRect(W - 155, H - 140, 110, 70);
  ctx.restore();
}

function renderWaves(
  t: number,
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
): void {
  ctx.save();
  ctx.strokeStyle = "rgba(100,180,240,0.5)";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  for (let wave = 0; wave < 3; wave++) {
    ctx.beginPath();
    const yBase = H - 100 + wave * 20;
    for (let x = 0; x <= W; x += 4) {
      const y = yBase + Math.sin(x / 60 + t * 2 + wave) * 8;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.restore();
}

function renderGround(
  t: number,
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  groundType: string,
  groundColor?: string,
): void {
  const alpha = Math.min(t / 1, 1);
  ctx.save();
  ctx.globalAlpha = alpha;

  if (groundType === "grass") {
    ctx.fillStyle = "#58b044";
    ctx.beginPath();
    ctx.moveTo(3, H - 68);
    for (let x = 3; x <= W - 3; x += 18) {
      ctx.quadraticCurveTo(x + 9, H - 80, x + 18, H - 68);
    }
    ctx.lineTo(W - 3, H - 2);
    ctx.lineTo(3, H - 2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#72cc5a";
    ctx.beginPath();
    ctx.moveTo(3, H - 62);
    for (let x = 3; x <= W - 3; x += 16) {
      ctx.quadraticCurveTo(x + 8, H - 74, x + 16, H - 62);
    }
    ctx.lineTo(W - 3, H - 2);
    ctx.lineTo(3, H - 2);
    ctx.closePath();
    ctx.fill();
  } else if (groundType === "sand") {
    ctx.fillStyle = groundColor ?? "#d4a853";
    ctx.fillRect(3, H - 70, W - 6, 68);
  } else if (groundType === "water") {
    ctx.fillStyle = groundColor ?? "#4a90d9";
    ctx.fillRect(3, H - 70, W - 6, 68);
  } else if (groundType === "floor") {
    ctx.fillStyle = groundColor ?? "#d4c4a0";
    ctx.fillRect(3, H - 60, W - 6, 58);
    ctx.strokeStyle = "rgba(0,0,0,0.08)";
    ctx.lineWidth = 1;
    for (let x = 3; x < W; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x, H - 60);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
  } else if (groundType === "none") {
    /* no ground plane */
  } else {
    ctx.fillStyle = groundColor ?? "#72cc5a";
    ctx.fillRect(3, H - 65, W - 6, 63);
  }

  if (["grass", "floor"].includes(groundType)) {
    const fa = Math.min(t / 2.5, 1);
    ctx.globalAlpha = fa;
    const flowerColors = [
      "#FF5555",
      "#FFEE00",
      "#FF88FF",
      "#55EE55",
      "#55AAFF",
      "#FFAA00",
    ];
    [55, 130, 220, 360, 460, 550].forEach((fx, fi) => {
      const fc = flowerColors[fi % flowerColors.length];
      ctx.fillStyle = "#3a8a30";
      ctx.beginPath();
      ctx.arc(fx, H - 60, 2, 0, Math.PI * 2);
      ctx.fill();
      for (let p = 0; p < 5; p++) {
        const a = (p / 5) * Math.PI * 2;
        ctx.fillStyle = fc;
        ctx.beginPath();
        ctx.arc(fx + Math.cos(a) * 6, H - 60 + Math.sin(a) * 6, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "#ffe070";
      ctx.beginPath();
      ctx.arc(fx, H - 60, 3.5, 0, Math.PI * 2);
      ctx.fill();
    });
  }
  ctx.restore();
}

function renderDefaultBackground(
  t: number,
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  cfg: AnimationConfig,
): void {
  const grd = ctx.createLinearGradient(0, 0, 0, H);
  grd.addColorStop(0, "#87CEEB");
  grd.addColorStop(1, "#EAF6FF");
  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.roundRect(0, 0, W, H, 18);
  ctx.fill();
  ctx.strokeStyle = cfg.colors?.primary ?? "#F4750A";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(2, 2, W - 4, H - 4, 17);
  ctx.stroke();
  renderSun(t, ctx, W);
  renderClouds(t, ctx, W, H, 0.5);
  renderGround(t, ctx, W, H, "grass", undefined);
}
