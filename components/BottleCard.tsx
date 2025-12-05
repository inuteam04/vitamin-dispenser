"use client";

import { useState } from "react";
import { SensorCard } from "@/components/SensorCard";
import { ProgressBar, RangeBar } from "@/components/ui/ProgressBar";
import { DHTData } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Language, t } from "@/lib/i18n";

interface BottleCardProps {
  bottleId: 1 | 2 | 3;
  pillCount: number;
  maxPills?: number;
  pillName: string;
  dhtData: DHTData | null;
  onDispense?: (bottleId: 1 | 2 | 3, count: number) => Promise<void>;
  onRefill?: (bottleId: 1 | 2 | 3) => Promise<void>;
  isDispensing?: boolean;
  isRefilling?: boolean;
  lang?: Language;
}

/**
 * 약통 카드 컴포넌트
 * 약 개수, 온습도 정보, 배출 버튼을 포함
 */
export function BottleCard({
  bottleId,
  pillCount,
  maxPills = 18,
  pillName,
  dhtData,
  onDispense,
  onRefill,
  isDispensing = false,
  isRefilling = false,
  lang = "ko",
}: BottleCardProps) {
  const [dispenseCount, setDispenseCount] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefillLoading, setIsRefillLoading] = useState(false);

  const temperature = dhtData?.temperature ?? 0;
  const humidity = dhtData?.humidity ?? 0;

  const isLowPills = pillCount < 5;
  const isWarningPills = pillCount < 10 && pillCount >= 5;

  const handleDispense = async () => {
    if (!onDispense || isLoading || isDispensing) return;
    if (pillCount < dispenseCount) return;

    setIsLoading(true);
    try {
      await onDispense(bottleId, dispenseCount);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefill = async () => {
    if (!onRefill || isRefillLoading || isRefilling) return;
    if (pillCount >= maxPills) return;

    setIsRefillLoading(true);
    try {
      await onRefill(bottleId);
    } finally {
      setIsRefillLoading(false);
    }
  };

  const getPillStatus = () => {
    if (isLowPills) return "error";
    if (isWarningPills) return "warning";
    return "normal";
  };

  return (
    <SensorCard>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center text-xl font-semibold",
              isLowPills
                ? "bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400"
                : isWarningPills
                ? "bg-yellow-100 dark:bg-yellow-900/50 text-yellow-600 dark:text-yellow-400"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
            )}
          >
            {bottleId}
          </div>
          <div>
            <div className="text-lg font-medium text-black dark:text-white">
              {t("bottle.title", lang)} {bottleId}
            </div>
            <div className="text-sm text-zinc-500 dark:text-zinc-400">
              {pillName || t("bottle.notSet", lang)}
            </div>
          </div>
        </div>
        {isLowPills && (
          <span className="px-2 py-1 text-xs font-medium bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 rounded-full">
            {t("bottle.needsRefill", lang)}
          </span>
        )}
      </div>

      {/* 약 개수 */}
      <div className="mb-4">
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            {t("bottle.pills", lang)}
          </span>
          <div className="flex items-baseline gap-1">
            <span
              className={cn(
                "text-3xl font-light tracking-tight",
                isLowPills
                  ? "text-red-600 dark:text-red-400"
                  : isWarningPills
                  ? "text-yellow-600 dark:text-yellow-400"
                  : "text-black dark:text-white"
              )}
            >
              {pillCount}
            </span>
            <span className="text-sm text-zinc-400 dark:text-zinc-500">
              / {maxPills}
            </span>
          </div>
        </div>
        <ProgressBar
          value={pillCount}
          max={maxPills}
          status={getPillStatus()}
          size="md"
        />
      </div>

      {/* Quick Dispense 버튼 */}
      {onDispense && (
        <div className="mb-4 p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="flex items-center border border-zinc-300 dark:border-zinc-700 rounded overflow-hidden">
              <button
                onClick={() => setDispenseCount(Math.max(1, dispenseCount - 1))}
                className="px-3 py-1.5 text-sm hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
                disabled={isLoading || isDispensing}
                aria-label={lang === "ko" ? "수량 감소" : "Decrease count"}
              >
                −
              </button>
              <span className="px-3 py-1.5 text-sm font-medium min-w-10 text-center border-x border-zinc-300 dark:border-zinc-700">
                {dispenseCount}
              </span>
              <button
                onClick={() =>
                  setDispenseCount(Math.min(pillCount, dispenseCount + 1))
                }
                className="px-3 py-1.5 text-sm hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
                disabled={isLoading || isDispensing}
                aria-label={lang === "ko" ? "수량 증가" : "Increase count"}
              >
                +
              </button>
            </div>
            <button
              onClick={handleDispense}
              disabled={isLoading || isDispensing || pillCount < dispenseCount}
              className={cn(
                "flex-1 px-4 py-1.5 rounded text-sm font-medium transition-colors",
                isLoading || isDispensing
                  ? "bg-zinc-300 dark:bg-zinc-700 text-zinc-500 cursor-not-allowed"
                  : "bg-black dark:bg-white text-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-200"
              )}
            >
              {isLoading || isDispensing ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="animate-spin h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  {t("bottle.dispensing", lang)}
                </span>
              ) : (
                t("bottle.dispense", lang)
              )}
            </button>
          </div>
        </div>
      )}

      {/* 빠른 리필 버튼 */}
      {onRefill && isLowPills && (
        <div className="mb-4">
          <button
            onClick={handleRefill}
            disabled={isRefillLoading || isRefilling || pillCount >= maxPills}
            className={cn(
              "w-full px-4 py-2 rounded text-sm font-medium transition-colors border",
              isRefillLoading || isRefilling
                ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 cursor-not-allowed border-zinc-300 dark:border-zinc-700"
                : "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/50"
            )}
          >
            {isRefillLoading || isRefilling ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="animate-spin h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                {t("bottle.refilling", lang)}
              </span>
            ) : (
              <>
                <span className="mr-1">↻</span> {t("bottle.refill", lang)} (
                {maxPills - pillCount}
                {lang === "ko" ? "개" : " pills"})
              </>
            )}
          </button>
        </div>
      )}

      {/* 온습도 */}
      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
        <div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
            {t("bottle.temp", lang)}
          </div>
          <div className="flex items-baseline gap-1">
            <span
              className={cn(
                "text-xl font-light",
                temperature > 30
                  ? "text-yellow-600 dark:text-yellow-400"
                  : "text-black dark:text-white"
              )}
            >
              {temperature.toFixed(1)}
            </span>
            <span className="text-xs text-zinc-400">°C</span>
          </div>
          <RangeBar
            value={temperature}
            min={0}
            max={50}
            optimalMin={15}
            optimalMax={25}
            warningThreshold={30}
            className="mt-2"
          />
        </div>
        <div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
            {t("bottle.humidity", lang)}
          </div>
          <div className="flex items-baseline gap-1">
            <span
              className={cn(
                "text-xl font-light",
                humidity > 70
                  ? "text-yellow-600 dark:text-yellow-400"
                  : "text-black dark:text-white"
              )}
            >
              {humidity.toFixed(1)}
            </span>
            <span className="text-xs text-zinc-400">%</span>
          </div>
          <RangeBar
            value={humidity}
            min={0}
            max={100}
            optimalMin={40}
            optimalMax={60}
            warningThreshold={70}
            className="mt-2"
          />
        </div>
      </div>
    </SensorCard>
  );
}
