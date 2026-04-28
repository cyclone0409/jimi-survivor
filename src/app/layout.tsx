import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "基米幸存者",
  description: "一个 Canvas 实现的基米幸存者网页小游戏"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
