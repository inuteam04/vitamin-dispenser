"use client";

import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Language, t } from "@/lib/i18n";

// 시간 계산 유틸리티 함수 (순수 함수, 다국어 지원)
function calculateTimeSince(
  date: Date | null,
  now: number,
  lang: Language = "ko"
): string {
  if (!date) return "--";
  const seconds = Math.floor((now - date.getTime()) / 1000);
  if (seconds < 5) return t("connection.justNow", lang);
  if (seconds < 60)
    return lang === "ko"
      ? `${seconds}${t("connection.secondsAgo", lang)}`
      : `${seconds} ${t("connection.secondsAgo", lang)}`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60)
    return lang === "ko"
      ? `${minutes}${t("connection.minutesAgo", lang)}`
      : `${minutes} ${t("connection.minutesAgo", lang)}`;
  const hours = Math.floor(minutes / 60);
  return lang === "ko"
    ? `${hours}${t("connection.hoursAgo", lang)}`
    : `${hours} ${t("connection.hoursAgo", lang)}`;
}

function calculateTimeAgo(
  ts: number,
  now: number,
  lang: Language = "ko"
): string {
  if (!ts || ts === 0) return t("connection.noRecord", lang);
  // 아두이노에서 초 단위로 저장하므로 밀리초로 변환
  const tsMs = ts < 1e12 ? ts * 1000 : ts;
  const seconds = Math.floor((now - tsMs) / 1000);
  if (seconds < 0) return t("connection.justNow", lang); // 시간 동기화 오차 처리
  if (seconds < 60) return t("connection.justNow", lang);
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60)
    return lang === "ko"
      ? `${minutes}${t("connection.minutesAgo", lang)}`
      : `${minutes} ${t("connection.minutesAgo", lang)}`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24)
    return lang === "ko"
      ? `${hours}${t("connection.hoursAgo", lang)}`
      : `${hours} ${t("connection.hoursAgo", lang)}`;
  const days = Math.floor(hours / 24);
  return lang === "ko"
    ? `${days}${t("connection.daysAgo", lang)}`
    : `${days} ${t("connection.daysAgo", lang)}`;
}

interface ConnectionStatusProps {
  isConnected: boolean;
  lastUpdate: Date | null;
  className?: string;
  lang?: Language;
}

/**
 * 실시간 연결 상태 인디케이터
 */
export function ConnectionStatus({
  isConnected,
  lastUpdate,
  className,
  lang = "ko",
}: ConnectionStatusProps) {
  const [now, setNow] = useState(() => Date.now());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setNow(Date.now());
    }, 5000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const timeSince = calculateTimeSince(lastUpdate, now, lang);

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-full border transition-colors",
        isConnected
          ? "border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-900/20"
          : "border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20",
        className
      )}
    >
      <div className="relative">
        <div
          className={cn(
            "w-2 h-2 rounded-full",
            isConnected ? "bg-green-500" : "bg-red-500"
          )}
        />
        {isConnected && (
          <div className="absolute inset-0 w-2 h-2 rounded-full bg-green-500 animate-ping opacity-75" />
        )}
      </div>
      <span
        className={cn(
          "text-xs font-medium",
          isConnected
            ? "text-green-700 dark:text-green-400"
            : "text-red-700 dark:text-red-400"
        )}
      >
        {t("connection.label", lang)}:{" "}
        {isConnected
          ? t("connection.connected", lang)
          : t("connection.disconnected", lang)}
      </span>
      {lastUpdate && (
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          · {timeSince}
        </span>
      )}
    </div>
  );
}

interface LastDispensedProps {
  timestamp: number;
  className?: string;
  lang?: Language;
}

/**
 * 마지막 복용 시간 표시 컴포넌트
 */
export function LastDispensed({
  timestamp,
  className,
  lang = "ko",
}: LastDispensedProps) {
  const [now, setNow] = useState(() => Date.now());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setNow(Date.now());
    }, 30000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const timeAgo = calculateTimeAgo(timestamp, now, lang);

  const formatTime = (ts: number): string => {
    if (!ts || ts === 0) return "--:--";
    // 아두이노에서 초 단위로 저장하므로 밀리초로 변환
    const tsMs = ts < 1e12 ? ts * 1000 : ts;
    return new Date(tsMs).toLocaleTimeString(
      lang === "ko" ? "ko-KR" : "en-US",
      {
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  };

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900",
        className
      )}
    >
      <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
        <svg
          className="w-5 h-5 text-blue-600 dark:text-blue-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      <div>
        <div className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
          {t("lastDispensed.title", lang)}
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-medium text-black dark:text-white">
            {timeAgo}
          </span>
          {timestamp > 0 && (
            <span className="text-sm text-zinc-400">
              {formatTime(timestamp)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
