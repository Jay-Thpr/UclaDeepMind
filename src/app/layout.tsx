import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Glitch — Real-Time Self-Training Coach",
  description:
    "AI coaching engine that teaches itself any skill from YouTube and coaches you live via video feedback",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
