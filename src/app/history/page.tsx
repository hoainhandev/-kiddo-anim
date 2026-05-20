"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AnimationCanvas from "@/components/AnimationCanvas";
import StorageUsage from "@/components/StorageUsage";
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
            <p className="text-sm text-gray-600">
              {video.animation_config.subtitle}
            </p>
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

        {video.mp4_url ? (
          <video
            src={video.mp4_url}
            controls
            autoPlay
            playsInline
            style={{ width: "100%", borderRadius: 12 }}
          />
        ) : (
          <AnimationCanvas config={video.animation_config} />
        )}

        {video.mp4_url && (
          <div className="mt-4">
            <a
              href={video.mp4_url}
              download={`${video.title}.mp4`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-kiddo block text-center no-underline"
            >
              ⬇ Tải MP4
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

export default function HistoryPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalVideo, setModalVideo] = useState<Video | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBulkBar, setShowBulkBar] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [storageRefreshKey, setStorageRefreshKey] = useState(0);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getVideos();
        setVideos(data || []);
      } catch (err: unknown) {
        console.error("History load error:", err);
        setError(err instanceof Error ? err.message : "Không tải được lịch sử");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  async function deleteVideo(video: Video) {
    if (!confirm(`Xóa video "${video.title}"? Không thể hoàn tác.`)) return;

    setDeleting(video.id);
    try {
      const res = await fetch("/api/delete-video", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: video.id,
          mp4_url: video.mp4_url,
          thumbnail_url: video.thumbnail_url,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error ?? "Delete failed");
      }
      setVideos((prev) => prev.filter((v) => v.id !== video.id));
      setSelectedIds((prev) => prev.filter((id) => id !== video.id));
      if (modalVideo?.id === video.id) setModalVideo(null);
      setStorageRefreshKey((prev) => prev + 1);
    } catch (err: unknown) {
      alert(
        "Lỗi xóa: " + (err instanceof Error ? err.message : "Không xóa được"),
      );
    } finally {
      setDeleting(null);
    }
  }

  async function deleteBulk() {
    if (!confirm(`Xóa ${selectedIds.length} video đã chọn?`)) return;

    setBulkDeleting(true);
    try {
      for (const id of selectedIds) {
        const video = videos.find((v) => v.id === id);
        if (!video) continue;
        const res = await fetch("/api/delete-video", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: video.id,
            mp4_url: video.mp4_url,
            thumbnail_url: video.thumbnail_url,
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error ?? "Delete failed");
        }
      }
      setVideos((prev) => prev.filter((v) => !selectedIds.includes(v.id)));
      if (modalVideo && selectedIds.includes(modalVideo.id)) {
        setModalVideo(null);
      }
      setSelectedIds([]);
      setShowBulkBar(false);
      setStorageRefreshKey((prev) => prev + 1);
    } catch (err: unknown) {
      alert(
        "Lỗi xóa: " + (err instanceof Error ? err.message : "Không xóa được"),
      );
    } finally {
      setBulkDeleting(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 pb-24">
      <h1
        className="mb-6 text-2xl font-bold text-[#F4750A]"
        style={{ fontFamily: "Georgia, serif" }}
      >
        Lịch sử video
      </h1>

      <div style={{ marginBottom: 20 }}>
        <StorageUsage key={storageRefreshKey} />
      </div>

      {error && (
        <div
          style={{
            textAlign: "center",
            padding: 40,
            color: "#cc3030",
            fontSize: 14,
          }}
          role="alert"
        >
          ❌ Lỗi: {error}
          <br />
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              marginTop: 12,
              padding: "8px 20px",
              background: "#F4750A",
              color: "#fff",
              border: "none",
              borderRadius: 20,
              cursor: "pointer",
            }}
          >
            Thử lại
          </button>
        </div>
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
            <article
              key={video.id}
              className="kiddo-card relative overflow-hidden p-0"
            >
              <input
                type="checkbox"
                checked={selectedIds.includes(video.id)}
                onChange={(e) => {
                  e.stopPropagation();
                  setSelectedIds((prev) =>
                    e.target.checked
                      ? [...prev, video.id]
                      : prev.filter((id) => id !== video.id),
                  );
                  setShowBulkBar(true);
                }}
                style={{
                  position: "absolute",
                  top: 10,
                  left: 10,
                  width: 18,
                  height: 18,
                  cursor: "pointer",
                  accentColor: "#F4750A",
                  zIndex: 10,
                }}
                aria-label={`Chọn ${video.title}`}
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteVideo(video);
                }}
                disabled={deleting === video.id || bulkDeleting}
                style={{
                  position: "absolute",
                  top: 8,
                  right: 8,
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: "rgba(232,64,64,0.85)",
                  border: "none",
                  color: "#fff",
                  fontSize: 14,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: deleting === video.id ? 0.5 : 1,
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
                  zIndex: 10,
                }}
                title="Xóa video"
                aria-label={`Xóa ${video.title}`}
              >
                {deleting === video.id ? "⏳" : "🗑"}
              </button>

              {video.thumbnail_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={video.thumbnail_url}
                  alt={video.title}
                  className="aspect-video w-full object-cover"
                  style={{ borderRadius: "12px 12px 0 0" }}
                />
              ) : (
                <div
                  style={{
                    width: "100%",
                    aspectRatio: "16/9",
                    background:
                      "linear-gradient(135deg, rgba(244,117,10,0.15), rgba(255,215,0,0.1))",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "12px 12px 0 0",
                  }}
                >
                  <span style={{ fontSize: 40 }}>🎬</span>
                </div>
              )}
              <div className="p-4">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <h2 className="font-bold text-[#F4750A]">{video.title}</h2>
                  {video.animation_config?.generatedBy === "hailuo" ? (
                    <span
                      style={{
                        fontSize: 10,
                        background: "rgba(40,160,40,0.12)",
                        color: "#2a8a2a",
                        padding: "2px 7px",
                        borderRadius: 10,
                        border: "1px solid rgba(40,160,40,0.2)",
                        fontWeight: 700,
                      }}
                    >
                      🤖 Hailuo AI
                    </span>
                  ) : (
                    <span
                      style={{
                        fontSize: 10,
                        background: "rgba(244,117,10,0.1)",
                        color: "#F4750A",
                        padding: "2px 7px",
                        borderRadius: 10,
                        border: "1px solid rgba(244,117,10,0.2)",
                        fontWeight: 700,
                      }}
                    >
                      🎨 Canvas
                    </span>
                  )}
                  {video.animation_config?.hasAudio && (
                    <span
                      style={{
                        fontSize: 10,
                        background: "rgba(255,215,0,0.15)",
                        color: "#8A5000",
                        padding: "2px 7px",
                        borderRadius: 10,
                        border: "1px solid rgba(255,215,0,0.3)",
                        fontWeight: 700,
                      }}
                    >
                      🎵 Có nhạc
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  {new Date(video.created_at).toLocaleDateString("vi-VN")}
                  {video.duration ? ` · ${video.duration}s` : ""}
                </p>
                <div className="mt-3 flex flex-col gap-2">
                  <button
                    type="button"
                    className="btn-kiddo"
                    onClick={() => setModalVideo(video)}
                  >
                    Xem lại
                  </button>
                  {video.mp4_url && (
                    <a
                      href={video.mp4_url}
                      download={`${video.title}.mp4`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-kiddo block text-center no-underline"
                    >
                      ⬇ Tải MP4
                    </a>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {showBulkBar && selectedIds.length > 0 && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            background: "#2A1A00",
            borderRadius: 30,
            padding: "12px 20px",
            display: "flex",
            alignItems: "center",
            gap: 16,
            boxShadow: "0 8px 32px rgba(0,0,0,0.35)",
            zIndex: 100,
            fontFamily: "Georgia, serif",
          }}
        >
          <span style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>
            ✓ Đã chọn {selectedIds.length} video
          </span>
          <button
            type="button"
            onClick={deleteBulk}
            disabled={bulkDeleting}
            style={{
              background: "#E84040",
              color: "#fff",
              border: "none",
              borderRadius: 20,
              padding: "7px 18px",
              fontSize: 13,
              fontFamily: "Georgia, serif",
              fontWeight: 700,
              cursor: bulkDeleting ? "wait" : "pointer",
              opacity: bulkDeleting ? 0.7 : 1,
            }}
          >
            {bulkDeleting ? "⏳ Đang xóa..." : `🗑 Xóa ${selectedIds.length} video`}
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedIds([]);
              setShowBulkBar(false);
            }}
            style={{
              background: "rgba(255,255,255,0.1)",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: 20,
              padding: "7px 14px",
              fontSize: 13,
              fontFamily: "Georgia, serif",
              cursor: "pointer",
            }}
          >
            Bỏ chọn
          </button>
        </div>
      )}

      {modalVideo && (
        <VideoModal video={modalVideo} onClose={() => setModalVideo(null)} />
      )}
    </main>
  );
}
