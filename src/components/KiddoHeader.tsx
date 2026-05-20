"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function TulipIcon() {
  return (
    <svg
      width="36"
      height="40"
      viewBox="0 0 36 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M18 38C18 38 10 28 10 20C10 14.477 14.477 10 20 10C20 10 18 6 18 2C18 6 16 10 16 10C21.523 10 26 14.477 26 20C26 28 18 38 18 38Z"
        fill="#F4750A"
      />
      <ellipse cx="12" cy="16" rx="6" ry="8" fill="#F4750A" opacity="0.85" />
      <ellipse cx="24" cy="16" rx="6" ry="8" fill="#F4750A" opacity="0.85" />
      <ellipse cx="18" cy="12" rx="7" ry="9" fill="#FF8C33" />
      <path
        d="M18 22V38"
        stroke="#2D8C2A"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M18 28C14 26 10 24 8 22"
        stroke="#2D8C2A"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function KiddoHeader() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const isHistory = pathname === "/history";
  const isCosts = pathname === "/costs";

  return (
    <header className="w-full border-b-4 border-[#F4750A] bg-gradient-to-b from-[#FFF8F0] to-white px-4 py-4 shadow-sm">
      <div className="mx-auto flex max-w-4xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <TulipIcon />
          <div>
            <div className="flex items-center gap-2">
              <h1
                className="text-2xl font-bold text-[#F4750A] sm:text-3xl"
                style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
              >
                Kiddo
              </h1>
              <span className="text-xl" aria-hidden>
                ☀️
              </span>
            </div>
            <p className="text-sm text-gray-600 sm:text-base">
              Upload flashcard → AI tạo animation → Tải MP4
            </p>
          </div>
        </div>

        <nav className="flex gap-2">
          <Link
            href="/"
            className={`rounded-full px-4 py-2 text-sm font-bold transition ${
              isHome
                ? "bg-[#F4750A] text-white hover:bg-[#e06800]"
                : "border-2 border-[#F4750A] text-[#F4750A] hover:bg-orange-50"
            }`}
          >
            Tạo mới
          </Link>
          <Link
            href="/history"
            className={`rounded-full px-4 py-2 text-sm font-bold transition ${
              isHistory
                ? "bg-[#F4750A] text-white hover:bg-[#e06800]"
                : "border-2 border-[#F4750A] text-[#F4750A] hover:bg-orange-50"
            }`}
          >
            Lịch sử
          </Link>
          <Link
            href="/costs"
            className={`rounded-full px-4 py-2 text-sm font-bold transition ${
              isCosts
                ? "bg-[#F4750A] text-white hover:bg-[#e06800]"
                : "border-2 border-[#F4750A] text-[#F4750A] hover:bg-orange-50"
            }`}
          >
            Thống kê
          </Link>
        </nav>
      </div>
    </header>
  );
}
