import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Glitch — Real-Time Self-Training Coach",
  description: "AI-powered live video coaching that gets smarter about you over time",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} dark`}>
      <body className="bg-zinc-950 font-sans antialiased text-zinc-50 flex flex-col min-h-screen">
        <header className="w-full p-6 flex justify-between items-center absolute top-0 z-10">
          <div className="font-bold text-xl tracking-tighter flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-emerald-500 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-zinc-900" />
            </div>
            Glitch
          </div>
        </header>
        <main className="flex-1 flex flex-col">
          {children}
        </main>
      </body>
    </html>
  );
}
