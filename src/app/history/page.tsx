"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AnimationCanvas from "@/components/AnimationCanvas";
import { getVideos } from "@/lib/supabase";
import type { Video } from "@/types/animation";

function SkeletonCard() {
  return (
    <div className="kiddo-card animate-pulse overflow-hidden p-0">
      <div className="aspect-video bg-gradient-to-br from-orange-100 to-orange-50" />
      <div className="space-y-2 p-4">
        <div className="h-4 rounded bg-orange-200/80" />
        <div className="h-3 w-2/3 rounded bg-orange-100" />
      </div>
    </div>
  );
}

function VideoModal({
  video,
  onClose,
}: {
  video: Video;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="kiddo-card max-h-[90vh] w-full max-w-2xl overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-2">
          <div>
            <h2 className="text-xl font-bold text-[#F4750A]">{video.title}</h2>
            <p className="text-sm text-gray-600">{video.subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-3 py-1 text-2xl leading-none text-gray-500 hover:bg-orange-50"
            aria-label="Đóng"
          >
            ×
          </button>
        </div>

        <AnimationCanvas config={video.config} />

        <div className="mt-4">
          <a
            href={video.video_url}
            download={`${video.title}.mp4`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-kiddo block text-center no-underline"
          >
            ⬇ Tải MP4
          </a>
        </div>
      </div>
    </div>
  );
}

export default function HistoryPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Video | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const data = await getVideos();
        if (!cancelled) setVideos(data);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Không tải được lịch sử",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8">
      <h1
        className="mb-6 text-2xl font-bold text-[#F4750A]"
        style={{ fontFamily: "Georgia, serif" }}
      >
        Lịch sử video
      </h1>

      {error && (
        <p className="mb-4 text-center text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {loading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {!loading && videos.length === 0 && !error && (
        <p className="kiddo-card text-center text-gray-600">
          Chưa có video nào.{" "}
          <Link href="/" className="font-bold text-[#F4750A] underline">
            Tạo animation đầu tiên
          </Link>
        </p>
      )}

      {!loading && videos.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {videos.map((video) => (
            <article key={video.id} className="kiddo-card overflow-hidden p-0">
              {video.thumbnail_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={video.thumbnail_url}
                  alt={video.title}
                  className="aspect-video w-full object-cover"
                />
              ) : (
                <div className="flex aspect-video items-center justify-center bg-orange-50 text-4xl">
                  🎬
                </div>
              )}
              <div className="p-4">
                <h2 className="font-bold text-[#F4750A]">{video.title}</h2>
                <p className="text-xs text-gray-500">
                  {new Date(video.created_at).toLocaleDateString("vi-VN")}
                </p>
                <div className="mt-3 flex flex-col gap-2">
                  <button
                    type="button"
                    className="btn-kiddo"
                    onClick={() => setSelected(video)}
                  >
                    Xem lại
                  </button>
                  <a
                    href={video.video_url}
                    download={`${video.title}.mp4`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-kiddo block text-center no-underline"
                  >
                    ⬇ Tải MP4
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {selected && (
        <VideoModal video={selected} onClose={() => setSelected(null)} />
      )}
    </main>
  );
}
