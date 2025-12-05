"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ActivityLog } from "@/components/ActivityLog";
import { BottleCard } from "@/components/BottleCard";
import { ConnectionStatus, LastDispensed } from "@/components/StatusIndicators";
import { useRealtimeData } from "@/lib/hooks/useRealtimeData";
import { useDeviceControl } from "@/lib/hooks/useDeviceControl";
import { useAuth } from "@/lib/hooks/useAuth";
import { useActivityLogs } from "@/lib/hooks/useActivityLogs";
import { SensorData, SystemStatus } from "@/lib/types";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserMenu } from "@/components/UserMenu";
import { HamburgerMenu } from "@/components/HamburgerMenu";
import { withAuth } from "@/components/withAuth";
import toast from "react-hot-toast";
import { db } from "@/lib/firebase";
import { ref, get } from "firebase/database";
import { Language, t, getSystemStatusText } from "@/lib/i18n";

// 약통 설정 타입
type PillConfig = {
  bottle1?: string;
  bottle2?: string;
  bottle3?: string;
};

/**
 * 메인 대시보드 페이지
 * 인증된 사용자만 접근 가능
 */
function DashboardPage() {
  return (
    <ErrorBoundary>
      <DashboardContent />
    </ErrorBoundary>
  );
}

// 인증 보호 적용
export default withAuth(DashboardPage);

function DashboardContent() {
  const { logout, user } = useAuth();
  const router = useRouter();
  const { dispense, refillBottle, isExecuting } = useDeviceControl();

  // 언어 설정 상태 (기본: 한국어)
  const [lang, setLang] = useState<Language>("ko");
  const [refillingBottle, setRefillingBottle] = useState<1 | 2 | 3 | null>(
    null
  );
  const {
    data: sensorData,
    loading,
    error,
    retry,
  } = useRealtimeData<SensorData>("sensors", {
    bottle1Count: 18,
    bottle2Count: 18,
    bottle3Count: 6,
    dht1: { temperature: 0, humidity: 0 },
    dht2: { temperature: 0, humidity: 0 },
    dht3: { temperature: 0, humidity: 0 },
    lastDispensed: 0,
    isDispensing: false,
    fanStatus: false,
    photoDetected: false,
    timestamp: 0,
  });

  // 활동 로그 (Firebase에서 실시간으로 가져옴)
  const { events } = useActivityLogs(50);

  // 마지막 데이터 업데이트 시간
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // 약통 설정 (약 이름 표시용)
  const [pillConfig, setPillConfig] = useState<PillConfig>({
    bottle1: "",
    bottle2: "",
    bottle3: "",
  });

  // 배출 핸들러
  const handleDispense = async (bottleId: 1 | 2 | 3, count: number) => {
    try {
      await dispense(bottleId, count);
      toast.success(
        t("toast.dispenseRequest", lang, { count }) + ` Bottle ${bottleId}`
      );
    } catch (err) {
      toast.error(t("toast.dispenseFailed", lang));
      console.error(err);
    }
  };

  // 리필 핸들러
  const handleRefill = async (bottleId: 1 | 2 | 3) => {
    const currentCount =
      bottleId === 1
        ? sensorData?.bottle1Count ?? 0
        : bottleId === 2
        ? sensorData?.bottle2Count ?? 0
        : sensorData?.bottle3Count ?? 0;
    const refillAmount = 18 - currentCount;

    if (refillAmount <= 0) {
      toast.error(t("toast.alreadyFull", lang));
      return;
    }

    setRefillingBottle(bottleId);
    try {
      await refillBottle(bottleId, refillAmount);
      toast.success(t("toast.refillSuccess", lang));
    } catch (err) {
      toast.error(t("toast.refillFailed", lang));
      console.error(err);
    } finally {
      setRefillingBottle(null);
    }
  };

  // 약통 설정 로드
  useEffect(() => {
    if (!user) return;
    const loadPillConfig = async () => {
      try {
        const snap = await get(ref(db, `users/${user.uid}/pillConfig`));
        if (snap.exists()) {
          const data = snap.val() as PillConfig;
          setPillConfig({
            bottle1: data.bottle1 ?? "",
            bottle2: data.bottle2 ?? "",
            bottle3: data.bottle3 ?? "",
          });
        }
      } catch (err) {
        console.error("Failed to load pill config:", err);
      }
    };
    loadPillConfig();
  }, [user]);

  // 약통별 약 이름 가져오기
  const getPillName = (bottleId: 1 | 2 | 3): string => {
    const key = `bottle${bottleId}` as keyof PillConfig;
    return pillConfig[key] || t("bottle.notSet", lang);
  };

  // permission_denied 에러 발생 시 자동 로그아웃
  useEffect(() => {
    if (error && error.message.includes("permission_denied")) {
      const handlePermissionDenied = async () => {
        toast.error(t("error.permissionDenied", lang), {
          duration: 4000,
        });
        await logout();
        router.push("/login?error=permission_denied");
      };
      handlePermissionDenied();
    }
  }, [error, logout, router, lang]);

  // 센서 데이터 업데이트 시간 추적
  useEffect(() => {
    if (!sensorData || loading) return;
    // 데이터가 업데이트될 때마다 현재 시간 저장
    const now = new Date();
    requestAnimationFrame(() => setLastUpdate(now));
  }, [sensorData, loading]);

  // 로딩 상태
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-black">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-black dark:border-white"></div>
      </div>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-black">
        <div className="text-center border border-zinc-200 dark:border-zinc-800 rounded p-8">
          <h2 className="text-2xl font-light text-black dark:text-white mb-4">
            {t("error.connection", lang)}
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400 mb-6 text-sm">
            {error.message}
          </p>
          <button
            onClick={retry}
            className="px-6 py-2 bg-black dark:bg-white text-white dark:text-black rounded hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors text-sm uppercase tracking-wider font-medium"
          >
            {t("error.retry", lang)}
          </button>
        </div>
      </div>
    );
  }

  // 시스템 상태 판별
  const getSystemStatus = (): SystemStatus => {
    if (!sensorData) return SystemStatus.OFFLINE;
    if (sensorData.isDispensing) return SystemStatus.DISPENSING;
    if (sensorData.fanStatus === true) return SystemStatus.COOLING;
    // 어느 병이든 35도 초과시 에러
    const maxTemp = Math.max(
      sensorData.dht1?.temperature ?? 0,
      sensorData.dht2?.temperature ?? 0,
      sensorData.dht3?.temperature ?? 0
    );
    if (maxTemp > 35) return SystemStatus.ERROR;
    return SystemStatus.IDLE;
  };

  const systemStatus = getSystemStatus();

  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* 헤더 */}
        <header className="mb-12 border-b border-zinc-200 dark:border-zinc-800 pb-8">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-5xl font-light tracking-tight mb-3">
                {t("header.title", lang)}
              </h1>
              <p className="text-zinc-600 dark:text-zinc-400 text-sm uppercase tracking-wider">
                {t("header.subtitle", lang)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* 언어 전환 버튼 */}
              <button
                onClick={() => setLang(lang === "ko" ? "en" : "ko")}
                className="px-3 py-1.5 text-xs font-medium border border-zinc-300 dark:border-zinc-700 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                aria-label="Toggle language"
              >
                {lang === "ko" ? "EN" : "한"}
              </button>
              <HamburgerMenu />
              <ThemeToggle />
              <UserMenu />
            </div>
          </div>
        </header>

        {/* 시스템 상태 배너 */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border border-zinc-200 dark:border-zinc-800 rounded px-6 py-4">
          <div className="flex items-center gap-4 flex-wrap">
            {/* 시스템 상태 - pill 스타일 */}
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-colors ${
                systemStatus === SystemStatus.ERROR
                  ? "border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20"
                  : systemStatus === SystemStatus.DISPENSING
                  ? "border-yellow-200 dark:border-yellow-900 bg-yellow-50 dark:bg-yellow-900/20"
                  : systemStatus === SystemStatus.IDLE
                  ? "border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-900/20"
                  : "border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50"
              }`}
            >
              <div className="relative">
                <div
                  className={`w-2 h-2 rounded-full ${
                    systemStatus === SystemStatus.ERROR
                      ? "bg-red-500"
                      : systemStatus === SystemStatus.DISPENSING
                      ? "bg-yellow-500"
                      : systemStatus === SystemStatus.IDLE
                      ? "bg-green-500"
                      : "bg-zinc-500"
                  }`}
                />
                {systemStatus === SystemStatus.IDLE && (
                  <div className="absolute inset-0 w-2 h-2 rounded-full bg-green-500 animate-ping opacity-75" />
                )}
              </div>
              <span
                className={`text-xs font-medium ${
                  systemStatus === SystemStatus.ERROR
                    ? "text-red-700 dark:text-red-400"
                    : systemStatus === SystemStatus.DISPENSING
                    ? "text-yellow-700 dark:text-yellow-400"
                    : systemStatus === SystemStatus.IDLE
                    ? "text-green-700 dark:text-green-400"
                    : "text-zinc-600 dark:text-zinc-400"
                }`}
              >
                {t("system.label", lang)}:{" "}
                {getSystemStatusText(systemStatus, lang)}
              </span>
            </div>

            <ConnectionStatus
              isConnected={!error && !loading}
              lastUpdate={lastUpdate}
              lang={lang}
            />

            {/* 팬 상태 - pill 스타일 */}
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-colors ${
                sensorData?.fanStatus
                  ? "border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-900/20"
                  : "border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50"
              }`}
            >
              <div className="relative">
                <div
                  className={`w-2 h-2 rounded-full ${
                    sensorData?.fanStatus ? "bg-blue-500" : "bg-zinc-400"
                  }`}
                />
                {sensorData?.fanStatus && (
                  <div className="absolute inset-0 w-2 h-2 rounded-full bg-blue-500 animate-ping opacity-75" />
                )}
              </div>
              <span
                className={`text-xs font-medium ${
                  sensorData?.fanStatus
                    ? "text-blue-700 dark:text-blue-400"
                    : "text-zinc-600 dark:text-zinc-400"
                }`}
              >
                {t("fan.label", lang)}:{" "}
                {sensorData?.fanStatus ? t("fan.on", lang) : t("fan.off", lang)}
              </span>
            </div>
          </div>
        </div>

        {/* 마지막 복용 시간 */}
        <div className="mb-6">
          <LastDispensed
            timestamp={sensorData?.lastDispensed ?? 0}
            lang={lang}
          />
        </div>

        {/* 센서 데이터 그리드 - 병 중심 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-10">
          <BottleCard
            bottleId={1}
            pillCount={sensorData?.bottle1Count ?? 0}
            maxPills={18}
            pillName={getPillName(1)}
            dhtData={sensorData?.dht1 ?? null}
            onDispense={handleDispense}
            onRefill={handleRefill}
            isDispensing={isExecuting || (sensorData?.isDispensing ?? false)}
            isRefilling={refillingBottle === 1}
            lang={lang}
          />
          <BottleCard
            bottleId={2}
            pillCount={sensorData?.bottle2Count ?? 0}
            maxPills={18}
            pillName={getPillName(2)}
            dhtData={sensorData?.dht2 ?? null}
            onDispense={handleDispense}
            onRefill={handleRefill}
            isDispensing={isExecuting || (sensorData?.isDispensing ?? false)}
            isRefilling={refillingBottle === 2}
            lang={lang}
          />
          <BottleCard
            bottleId={3}
            pillCount={sensorData?.bottle3Count ?? 0}
            maxPills={18}
            pillName={getPillName(3)}
            dhtData={sensorData?.dht3 ?? null}
            onDispense={handleDispense}
            onRefill={handleRefill}
            isDispensing={isExecuting || (sensorData?.isDispensing ?? false)}
            isRefilling={refillingBottle === 3}
            lang={lang}
          />
        </div>

        {/* 활동 로그 */}
        <div className="mb-10">
          <ActivityLog events={events} maxItems={15} />
        </div>

        {/* ====== 영양 분석 안내 섹션 ====== */}
        <section className="mb-10 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
          <h2 className="text-xl font-medium mb-2">
            {t("section.nutrition.title", lang)}
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
            {t("section.nutrition.desc", lang)}
          </p>
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-zinc-600 dark:text-zinc-300">
              {t("section.nutrition.content", lang)}{" "}
              <span className="font-semibold">
                {t("section.nutrition.highlight", lang)}
              </span>{" "}
              {t("section.nutrition.suffix", lang)}
            </p>
            <Link
              href="/analyse"
              className="px-4 py-2 rounded-lg bg-black text-white dark:bg-white dark:text-black text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors whitespace-nowrap"
            >
              {t("section.nutrition.button", lang)}
            </Link>
          </div>
        </section>

        {/* ====== 약 정보 안내 섹션 ====== */}
        <section className="mb-10 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
          <h2 className="text-xl font-medium mb-2">
            {t("section.pills.title", lang)}
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
            {t("section.pills.desc", lang)}
          </p>
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-zinc-600 dark:text-zinc-300">
              {t("section.pills.content", lang)}{" "}
              <span className="font-semibold">
                {t("section.pills.highlight", lang)}
              </span>
              {t("section.pills.suffix", lang)}
            </p>
            <Link
              href="/pills"
              className="px-4 py-2 rounded-lg bg-black text-white dark:bg-white dark:text-black text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors whitespace-nowrap"
            >
              {t("section.pills.button", lang)}
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
