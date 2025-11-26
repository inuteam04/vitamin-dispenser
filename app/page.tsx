"use client";

import Link from "next/link";
import { useAuth } from "@/lib/hooks/useAuth";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-linear-to-b from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-black">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-zinc-200 bg-white/80 backdrop-blur-lg dark:border-zinc-800 dark:bg-zinc-900/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
            Smart Vitamin Dispenser
          </h2>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 pt-24 pb-16">
        {/* Hero Section */}
        <section className="flex flex-col items-center gap-8 py-16 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
            </span>
            INU Maker Project 2025
          </div>

          <h1 className="max-w-4xl text-5xl font-bold leading-tight tracking-tight text-zinc-900 dark:text-white md:text-6xl">
            IoT 기반 스마트
            <br />
            비타민 디스펜서
          </h1>

          <p className="max-w-2xl text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
            Arduino, ESP32, Firebase를 활용한 실시간 모니터링 및 원격 제어
            시스템. 온습도 센서, 적외선 센서를 통해 스마트하게 비타민을
            관리하고, 웹 대시보드에서 실시간으로 확인할 수 있습니다.
          </p>

          <div className="flex flex-col gap-4 sm:flex-row">
            <Link
              href={user ? "/dashboard" : "/login"}
              className="rounded-lg bg-zinc-900 px-8 py-3 text-base font-semibold text-white transition-all hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {user ? "대시보드로 이동" : "시작하기"}
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200 py-8 mt-24 dark:border-zinc-800">
        <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
          © 2025 InuTeam04 Team. INU Maker Project.
        </p>
      </footer>
    </div>
  );
}
