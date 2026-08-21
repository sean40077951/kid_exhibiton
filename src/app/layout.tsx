import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "怪獸放電場｜線上預約",
  description: "兒藝節秋季展期 線上預約系統"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
