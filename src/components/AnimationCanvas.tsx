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
  DUR,
  FPS,
  H,
  W,
  initRenderState,
  renderFrame,
  type RenderState,
} from "@/lib/animationEngine";
import type { AnimationConfig } from "@/types/animation";

const TOTAL_FRAMES = Math.round((DUR / 1000) * FPS);
const FRAME_MS = 1000 / FPS;
const THUMBNAIL_MS = 500;

export interface AnimationCanvasHandle {
  captureFrame: () => Promise<Blob>;
  renderAllFrames: (onProgress?: (progress: number) => void) => Promise<Blob[]>;
}

interface AnimationCanvasProps {
  config: AnimationConfig;
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
  function AnimationCanvas({ config, onReady }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const stateRef = useRef<RenderState>(initRenderState(config));
    const playingRef = useRef(true);
    const startRef = useRef(0);
    const pausedAtRef = useRef(0);
    const readyRef = useRef(false);
    const exportingRef = useRef(false);

    const [playing, setPlaying] = useState(true);
    const [progress, setProgress] = useState(0);

    const resetState = useCallback(() => {
      stateRef.current = initRenderState(config);
      pausedAtRef.current = 0;
      startRef.current = performance.now();
    }, [config]);

    const drawAtTime = useCallback(
      (t: number, state: RenderState) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        renderFrame(t, ctx, W, H, config, state);
      },
      [config],
    );

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

          for (let i = 0; i < TOTAL_FRAMES; i++) {
            const t = i * FRAME_MS;
            drawAtTime(t, state);
            blobs.push(await canvasToBlob(canvas));
            onProgress?.((i + 1) / TOTAL_FRAMES);
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
      [config, drawAtTime],
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
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      let rafId = 0;

      const loop = (now: number) => {
        if (!exportingRef.current) {
          if (playingRef.current) {
            const elapsed = now - startRef.current;
            const t = Math.min(elapsed, DUR);
            pausedAtRef.current = t;
            drawAtTime(t, stateRef.current);
            setProgress(t / DUR);

            if (t >= DUR) {
              playingRef.current = false;
              setPlaying(false);
            }
          }

          if (!readyRef.current) {
            readyRef.current = true;
            onReady?.();
          }
        }

        rafId = requestAnimationFrame(loop);
      };

      rafId = requestAnimationFrame(loop);
      return () => cancelAnimationFrame(rafId);
    }, [config, drawAtTime, onReady]);

    const handlePlayPause = () => {
      if (playing) {
        pausedAtRef.current = Math.min(
          performance.now() - startRef.current,
          DUR,
        );
        setPlaying(false);
      } else {
        if (pausedAtRef.current >= DUR) {
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
