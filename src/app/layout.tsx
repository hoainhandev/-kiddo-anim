import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import KiddoHeader from "@/components/KiddoHeader";
import PasscodeGate from "@/components/PasscodeGate";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Kiddo — AI Animation cho trẻ",
  description: "Upload flashcard → AI tạo animation → Tải MP4",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body
        className="flex min-h-full flex-col"
        suppressHydrationWarning
      >
        <PasscodeGate>
          <KiddoHeader />
          {children}
        </PasscodeGate>
      </body>
    </html>
  );
}
