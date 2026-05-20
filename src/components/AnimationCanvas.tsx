"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  FPS,
  H,
  W,
  getDurationMs,
  getTotalFrames,
  initRenderState,
  renderFrame,
  type RenderState,
} from "@/lib/animationEngine";
import type { AnimationConfig } from "@/types/animation";

const THUMBNAIL_MS = 500;
const FRAME_MS = 1000 / FPS;

export interface AnimationCanvasHandle {
  captureFrame: () => Promise<Blob>;
  renderAllFrames: (onProgress?: (progress: number) => void) => Promise<Blob[]>;
}

interface AnimationCanvasProps {
  config: AnimationConfig;
  spriteBase64?: string | null;
  spriteMime?: string;
  onReady?: () => void;
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type = "image/jpeg",
  quality = 0.92,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Failed to create blob from canvas"));
      },
      type,
      quality,
    );
  });
}

const AnimationCanvas = forwardRef<AnimationCanvasHandle, AnimationCanvasProps>(
  function AnimationCanvas(
    { config, spriteBase64, spriteMime = "image/png", onReady },
    ref,
  ) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const stateRef = useRef<RenderState>(initRenderState(config));
    const spriteImgRef = useRef<HTMLImageElement | null>(null);
    const spriteLoadNonceRef = useRef(0);
    const currentTRef = useRef(0);
    const playingRef = useRef(true);
    const startRef = useRef(0);
    const pausedAtRef = useRef(0);
    const readyRef = useRef(false);
    const exportingRef = useRef(false);

    const [playing, setPlaying] = useState(true);
    const [progress, setProgress] = useState(0);

    const dur = getDurationMs(config);
    const totalFrames = getTotalFrames(config);

    const resetState = useCallback(() => {
      stateRef.current = initRenderState(config);
      pausedAtRef.current = 0;
      currentTRef.current = 0;
      startRef.current = performance.now();
    }, [config]);

    const drawAtTime = useCallback(
      (tMs: number, state: RenderState) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        currentTRef.current = tMs;
        renderFrame(tMs, ctx, W, H, config, state, spriteImgRef.current);
      },
      [config],
    );

    const redrawCurrentFrame = useCallback(() => {
      drawAtTime(currentTRef.current, stateRef.current);
    }, [drawAtTime]);

    useEffect(() => {
      if (!spriteBase64) {
        spriteImgRef.current = null;
        redrawCurrentFrame();
        return;
      }

      const nonce = ++spriteLoadNonceRef.current;
      const img = new Image();
      img.onload = () => {
        if (nonce !== spriteLoadNonceRef.current) return;
        spriteImgRef.current = img;

        if (pausedAtRef.current >= dur) {
          resetState();
          playingRef.current = true;
          setPlaying(true);
          setProgress(0);
        } else {
          redrawCurrentFrame();
        }
      };
      img.onerror = (e) => console.error("Sprite load error:", e);
      img.src = `data:${spriteMime};base64,${spriteBase64}`;
    }, [spriteBase64, spriteMime, redrawCurrentFrame, dur, resetState]);

    useImperativeHandle(
      ref,
      () => ({
        captureFrame: async () => {
          const canvas = canvasRef.current;
          if (!canvas) throw new Error("Canvas not ready");

          exportingRef.current = true;
          const state = initRenderState(config);
          drawAtTime(THUMBNAIL_MS, state);
          const blob = await canvasToBlob(canvas);
          exportingRef.current = false;
          return blob;
        },

        renderAllFrames: async (onProgress) => {
          const canvas = canvasRef.current;
          if (!canvas) throw new Error("Canvas not ready");

          exportingRef.current = true;
          const wasPlaying = playingRef.current;
          playingRef.current = false;
          setPlaying(false);

          const state = initRenderState(config);
          const blobs: Blob[] = [];

          for (let i = 0; i < totalFrames; i++) {
            const tMs = i * FRAME_MS;
            drawAtTime(tMs, state);
            blobs.push(await canvasToBlob(canvas));
            onProgress?.((i + 1) / totalFrames);
          }

          exportingRef.current = false;
          playingRef.current = wasPlaying;
          setPlaying(wasPlaying);
          if (wasPlaying) {
            startRef.current = performance.now() - pausedAtRef.current;
          }

          return blobs;
        },
      }),
      [config, drawAtTime, totalFrames],
    );

    useEffect(() => {
      resetState();
      readyRef.current = false;
    }, [config, resetState]);

    useEffect(() => {
      playingRef.current = playing;
      if (playing) {
        startRef.current = performance.now() - pausedAtRef.current;
      }
    }, [playing]);

    useEffect(() => {
      let rafId = 0;

      const loop = (now: number) => {
        if (!exportingRef.current && playingRef.current) {
          const elapsed = now - startRef.current;
          const tMs = Math.min(elapsed, dur);
          pausedAtRef.current = tMs;
          drawAtTime(tMs, stateRef.current);
          setProgress(tMs / dur);

          if (tMs >= dur) {
            playingRef.current = false;
            setPlaying(false);
          }
        }

        if (!readyRef.current) {
          readyRef.current = true;
          onReady?.();
        }

        rafId = requestAnimationFrame(loop);
      };

      rafId = requestAnimationFrame(loop);
      return () => cancelAnimationFrame(rafId);
    }, [config, drawAtTime, dur, onReady]);

    const handlePlayPause = () => {
      if (playing) {
        pausedAtRef.current = Math.min(
          performance.now() - startRef.current,
          dur,
        );
        currentTRef.current = pausedAtRef.current;
        setPlaying(false);
      } else {
        if (pausedAtRef.current >= dur) {
          handleRestart();
          return;
        }
        setPlaying(true);
      }
    };

    const handleRestart = () => {
      resetState();
      setProgress(0);
      setPlaying(true);
    };

    const progressPct = Math.round(progress * 100);

    return (
      <div className="flex w-full max-w-[640px] flex-col gap-3">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="w-full rounded-xl border-4 border-[#F4750A] shadow-lg"
          aria-label="Kiddo animation preview"
        />

        <div className="h-2 overflow-hidden rounded-full bg-orange-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#F4750A] to-[#FFD700] transition-[width] duration-100"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={handlePlayPause}
            className="rounded-full bg-[#F4750A] px-5 py-2 text-sm font-bold text-white shadow transition hover:bg-[#e06800]"
          >
            {playing ? "Tạm dừng" : "Phát"}
          </button>
          <button
            type="button"
            onClick={handleRestart}
            className="rounded-full border-2 border-[#F4750A] bg-white px-5 py-2 text-sm font-bold text-[#F4750A] transition hover:bg-orange-50"
          >
            Phát lại
          </button>
        </div>
      </div>
    );
  },
);

AnimationCanvas.displayName = "AnimationCanvas";

export default AnimationCanvas;
