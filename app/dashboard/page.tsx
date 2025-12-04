"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SensorCard } from "@/components/SensorCard";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ActivityLog } from "@/components/ActivityLog";
import { ProgressBar, RangeBar } from "@/components/ui/ProgressBar";
import { useRealtimeData } from "@/lib/hooks/useRealtimeData";
import { useAuth } from "@/lib/hooks/useAuth";
import {
  SensorData,
  SystemStatus,
  ActivityEvent,
  ActivityEventType,
} from "@/lib/types";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserMenu } from "@/components/UserMenu";
import { HamburgerMenu } from "@/components/HamburgerMenu";
import { withAuth } from "@/components/withAuth";
import toast from "react-hot-toast";
import { db } from "@/lib/firebase";
import { ref, get } from "firebase/database";

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

  // 활동 로그 상태
  // 마지막 데이터 업데이트 시간
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const previousDataRef = useRef<SensorData | null>(null);

  // 약통 설정 (약 이름 표시용)
  const [pillConfig, setPillConfig] = useState<PillConfig>({
    bottle1: "",
    bottle2: "",
    bottle3: "",
  });

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
    return pillConfig[key] || "미설정";
  };

  // permission_denied 에러 발생 시 자동 로그아웃
  useEffect(() => {
    if (error && error.message.includes("permission_denied")) {
      const handlePermissionDenied = async () => {
        toast.error("접근 권한이 없습니다. 자동으로 로그아웃됩니다.", {
          duration: 4000,
        });
        await logout();
        router.push("/login?error=permission_denied");
      };
      handlePermissionDenied();
    }
  }, [error, logout, router]);

  // 센서 데이터 변화 감지 및 이벤트 생성
  useEffect(() => {
    if (!sensorData || loading) return;

    // 데이터가 업데이트될 때마다 현재 시간 저장
    const now = new Date();
    requestAnimationFrame(() => setLastUpdate(now));

    const prevData = previousDataRef.current;

    // 첫 로드시에는 이벤트 생성하지 않음
    if (!prevData) {
      previousDataRef.current = sensorData;
      return;
    }

    const newEvents: ActivityEvent[] = [];

    // Bottle 1 배출 감지
    if (sensorData.bottle1Count < prevData.bottle1Count) {
      const dispensedCount = prevData.bottle1Count - sensorData.bottle1Count;
      newEvents.push({
        id: `${Date.now()}_bottle1_dispensed`,
        type: ActivityEventType.PILL_DISPENSED,
        message: `Bottle 1: 약 ${dispensedCount}개 배출됨 (${prevData.bottle1Count} → ${sensorData.bottle1Count}개)`,
        timestamp: Date.now(),
        data: { bottleId: 1, count: dispensedCount },
      });
    }

    // Bottle 2 배출 감지
    if (sensorData.bottle2Count < prevData.bottle2Count) {
      const dispensedCount = prevData.bottle2Count - sensorData.bottle2Count;
      newEvents.push({
        id: `${Date.now()}_bottle2_dispensed`,
        type: ActivityEventType.PILL_DISPENSED,
        message: `Bottle 2: 약 ${dispensedCount}개 배출됨 (${prevData.bottle2Count} → ${sensorData.bottle2Count}개)`,
        timestamp: Date.now(),
        data: { bottleId: 2, count: dispensedCount },
      });
    }

    // Bottle 3 배출 감지
    if (sensorData.bottle3Count < prevData.bottle3Count) {
      const dispensedCount = prevData.bottle3Count - sensorData.bottle3Count;
      newEvents.push({
        id: `${Date.now()}_bottle3_dispensed`,
        type: ActivityEventType.PILL_DISPENSED,
        message: `Bottle 3: 약 ${dispensedCount}개 배출됨 (${prevData.bottle3Count} → ${sensorData.bottle3Count}개)`,
        timestamp: Date.now(),
        data: { bottleId: 3, count: dispensedCount },
      });
    }

    // 팬 상태 변화 감지
    if (sensorData.fanStatus !== prevData.fanStatus) {
      // 평균 온도 계산
      const avgTemp =
        ((sensorData.dht1?.temperature ?? 0) +
          (sensorData.dht2?.temperature ?? 0) +
          (sensorData.dht3?.temperature ?? 0)) /
        3;
      if (sensorData.fanStatus === true) {
        newEvents.push({
          id: `${Date.now()}_fan_on`,
          type: ActivityEventType.FAN_ON,
          message: `냉각 팬 작동 시작 (평균 온도: ${avgTemp.toFixed(1)}°C)`,
          timestamp: Date.now(),
          data: { temperature: avgTemp },
        });
      } else {
        newEvents.push({
          id: `${Date.now()}_fan_off`,
          type: ActivityEventType.FAN_OFF,
          message: `냉각 팬 정지 (평균 온도: ${avgTemp.toFixed(1)}°C)`,
          timestamp: Date.now(),
          data: { temperature: avgTemp },
        });
      }
    }

    // 온도 경고 (각 병별로 체크)
    const bottles = [
      { id: 1, current: sensorData.dht1, prev: prevData.dht1 },
      { id: 2, current: sensorData.dht2, prev: prevData.dht2 },
      { id: 3, current: sensorData.dht3, prev: prevData.dht3 },
    ];

    bottles.forEach(({ id, current, prev }) => {
      const currentTemp = current?.temperature ?? 0;
      const prevTemp = prev?.temperature ?? 0;
      if (currentTemp > 35 && prevTemp <= 35) {
        newEvents.push({
          id: `${Date.now()}_temp_critical_bottle${id}`,
          type: ActivityEventType.TEMP_CRITICAL,
          message: `위험: Bottle ${id} 온도 과열 (${currentTemp.toFixed(1)}°C)`,
          timestamp: Date.now(),
          data: { temperature: currentTemp, bottleId: id },
        });
      } else if (currentTemp > 30 && currentTemp <= 35 && prevTemp <= 30) {
        newEvents.push({
          id: `${Date.now()}_temp_warning_bottle${id}`,
          type: ActivityEventType.TEMP_WARNING,
          message: `경고: Bottle ${id} 온도 상승 (${currentTemp.toFixed(1)}°C)`,
          timestamp: Date.now(),
          data: { temperature: currentTemp, bottleId: id },
        });
      }

      // 습도 경고
      const currentHumidity = current?.humidity ?? 0;
      const prevHumidity = prev?.humidity ?? 0;
      if (currentHumidity > 70 && prevHumidity <= 70) {
        newEvents.push({
          id: `${Date.now()}_humidity_warning_bottle${id}`,
          type: ActivityEventType.HUMIDITY_WARNING,
          message: `경고: Bottle ${id} 습도 과다 (${currentHumidity.toFixed(
            1
          )}%)`,
          timestamp: Date.now(),
          data: { humidity: currentHumidity, bottleId: id },
        });
      }
    });

    // Bottle 1 약 부족 경고
    if (sensorData.bottle1Count < 5 && prevData.bottle1Count >= 5) {
      newEvents.push({
        id: `${Date.now()}_bottle1_low`,
        type: ActivityEventType.PILL_LOW,
        message: `Bottle 1: 약 보충 필요 (남은 개수: ${sensorData.bottle1Count}개)`,
        timestamp: Date.now(),
        data: { bottleId: 1, pillCount: sensorData.bottle1Count },
      });
    }

    // Bottle 2 약 부족 경고
    if (sensorData.bottle2Count < 5 && prevData.bottle2Count >= 5) {
      newEvents.push({
        id: `${Date.now()}_bottle2_low`,
        type: ActivityEventType.PILL_LOW,
        message: `Bottle 2: 약 보충 필요 (남은 개수: ${sensorData.bottle2Count}개)`,
        timestamp: Date.now(),
        data: { bottleId: 2, pillCount: sensorData.bottle2Count },
      });
    }

    // Bottle 3 약 부족 경고
    if (sensorData.bottle3Count < 5 && prevData.bottle3Count >= 5) {
      newEvents.push({
        id: `${Date.now()}_bottle3_low`,
        type: ActivityEventType.PILL_LOW,
        message: `Bottle 3: 약 보충 필요 (남은 개수: ${sensorData.bottle3Count}개)`,
        timestamp: Date.now(),
        data: { bottleId: 3, pillCount: sensorData.bottle3Count },
      });
    }

    // 새로운 이벤트가 있으면 상태 업데이트
    if (newEvents.length > 0) {
      requestAnimationFrame(() =>
        setEvents((prev) => [...newEvents, ...prev].slice(0, 50))
      );
    }

    previousDataRef.current = sensorData;
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
            Connection Error
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400 mb-6 text-sm">
            {error.message}
          </p>
          <button
            onClick={retry}
            className="px-6 py-2 bg-black dark:bg-white text-white dark:text-black rounded hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors text-sm uppercase tracking-wider font-medium"
          >
            Retry
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
                Vitamin Dispenser
              </h1>
              <p className="text-zinc-600 dark:text-zinc-400 text-sm uppercase tracking-wider">
                Real-time Monitoring & Control
              </p>
            </div>
            <div className="flex items-center gap-3">
              <HamburgerMenu />
              <ThemeToggle />
              <UserMenu />
            </div>
          </div>
        </header>

        {/* 시스템 상태 배너 */}
        <div className="mb-10 flex items-center justify-between border border-zinc-200 dark:border-zinc-800 rounded px-6 py-4">
          <span className="text-sm text-zinc-500 dark:text-zinc-500 uppercase tracking-wider">
            System Status
          </span>
          <div className="flex items-center gap-3">
            <div
              className={`w-2 h-2 rounded-full ${
                systemStatus === SystemStatus.ERROR
                  ? "bg-red-500"
                  : systemStatus === SystemStatus.DISPENSING
                  ? "bg-yellow-500"
                  : systemStatus === SystemStatus.IDLE
                  ? "bg-green-500"
                  : "bg-zinc-600"
              }`}
            />
            <span className="text-black dark:text-white font-mono text-sm">
              {systemStatus}
            </span>
          </div>
        </div>

        {/* 센서 데이터 그리드 - 병 중심 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-10">
          {/* Bottle 1 카드 */}
          <SensorCard>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-semibold ${
                    sensorData && sensorData.bottle1Count < 5
                      ? "bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400"
                      : sensorData && sensorData.bottle1Count < 10
                      ? "bg-yellow-100 dark:bg-yellow-900/50 text-yellow-600 dark:text-yellow-400"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                  }`}
                >
                  1
                </div>
                <div>
                  <div className="text-lg font-medium text-black dark:text-white">
                    Bottle 1
                  </div>
                  <div className="text-sm text-zinc-500 dark:text-zinc-400">
                    {getPillName(1)}
                  </div>
                </div>
              </div>
              {sensorData && sensorData.bottle1Count < 5 && (
                <span className="px-2 py-1 text-xs font-medium bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 rounded-full">
                  보충 필요
                </span>
              )}
            </div>

            {/* 약 개수 */}
            <div className="mb-4">
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Pills
                </span>
                <div className="flex items-baseline gap-1">
                  <span
                    className={`text-3xl font-light tracking-tight ${
                      sensorData && sensorData.bottle1Count < 5
                        ? "text-red-600 dark:text-red-400"
                        : sensorData && sensorData.bottle1Count < 10
                        ? "text-yellow-600 dark:text-yellow-400"
                        : "text-black dark:text-white"
                    }`}
                  >
                    {sensorData?.bottle1Count ?? "--"}
                  </span>
                  <span className="text-sm text-zinc-400 dark:text-zinc-500">
                    / 18
                  </span>
                </div>
              </div>
              <ProgressBar
                value={sensorData?.bottle1Count ?? 0}
                max={18}
                status={
                  sensorData && sensorData.bottle1Count < 5
                    ? "error"
                    : sensorData && sensorData.bottle1Count < 10
                    ? "warning"
                    : "normal"
                }
                size="md"
              />
            </div>

            {/* 온습도 */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
              <div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                  Temp
                </div>
                <div className="flex items-baseline gap-1">
                  <span
                    className={`text-xl font-light ${
                      sensorData && (sensorData.dht1?.temperature ?? 0) > 30
                        ? "text-yellow-600 dark:text-yellow-400"
                        : "text-black dark:text-white"
                    }`}
                  >
                    {sensorData?.dht1?.temperature?.toFixed(1) ?? "--"}
                  </span>
                  <span className="text-xs text-zinc-400">°C</span>
                </div>
                <RangeBar
                  value={sensorData?.dht1?.temperature ?? 0}
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
                  Humidity
                </div>
                <div className="flex items-baseline gap-1">
                  <span
                    className={`text-xl font-light ${
                      sensorData && (sensorData.dht1?.humidity ?? 0) > 70
                        ? "text-yellow-600 dark:text-yellow-400"
                        : "text-black dark:text-white"
                    }`}
                  >
                    {sensorData?.dht1?.humidity?.toFixed(1) ?? "--"}
                  </span>
                  <span className="text-xs text-zinc-400">%</span>
                </div>
                <RangeBar
                  value={sensorData?.dht1?.humidity ?? 0}
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

          {/* Bottle 2 카드 */}
          <SensorCard>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-semibold ${
                    sensorData && sensorData.bottle2Count < 5
                      ? "bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400"
                      : sensorData && sensorData.bottle2Count < 10
                      ? "bg-yellow-100 dark:bg-yellow-900/50 text-yellow-600 dark:text-yellow-400"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                  }`}
                >
                  2
                </div>
                <div>
                  <div className="text-lg font-medium text-black dark:text-white">
                    Bottle 2
                  </div>
                  <div className="text-sm text-zinc-500 dark:text-zinc-400">
                    {getPillName(2)}
                  </div>
                </div>
              </div>
              {sensorData && sensorData.bottle2Count < 5 && (
                <span className="px-2 py-1 text-xs font-medium bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 rounded-full">
                  보충 필요
                </span>
              )}
            </div>

            {/* 약 개수 */}
            <div className="mb-4">
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Pills
                </span>
                <div className="flex items-baseline gap-1">
                  <span
                    className={`text-3xl font-light tracking-tight ${
                      sensorData && sensorData.bottle2Count < 5
                        ? "text-red-600 dark:text-red-400"
                        : sensorData && sensorData.bottle2Count < 10
                        ? "text-yellow-600 dark:text-yellow-400"
                        : "text-black dark:text-white"
                    }`}
                  >
                    {sensorData?.bottle2Count ?? "--"}
                  </span>
                  <span className="text-sm text-zinc-400 dark:text-zinc-500">
                    / 18
                  </span>
                </div>
              </div>
              <ProgressBar
                value={sensorData?.bottle2Count ?? 0}
                max={18}
                status={
                  sensorData && sensorData.bottle2Count < 5
                    ? "error"
                    : sensorData && sensorData.bottle2Count < 10
                    ? "warning"
                    : "normal"
                }
                size="md"
              />
            </div>

            {/* 온습도 */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
              <div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                  Temp
                </div>
                <div className="flex items-baseline gap-1">
                  <span
                    className={`text-xl font-light ${
                      sensorData && (sensorData.dht2?.temperature ?? 0) > 30
                        ? "text-yellow-600 dark:text-yellow-400"
                        : "text-black dark:text-white"
                    }`}
                  >
                    {sensorData?.dht2?.temperature?.toFixed(1) ?? "--"}
                  </span>
                  <span className="text-xs text-zinc-400">°C</span>
                </div>
                <RangeBar
                  value={sensorData?.dht2?.temperature ?? 0}
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
                  Humidity
                </div>
                <div className="flex items-baseline gap-1">
                  <span
                    className={`text-xl font-light ${
                      sensorData && (sensorData.dht2?.humidity ?? 0) > 70
                        ? "text-yellow-600 dark:text-yellow-400"
                        : "text-black dark:text-white"
                    }`}
                  >
                    {sensorData?.dht2?.humidity?.toFixed(1) ?? "--"}
                  </span>
                  <span className="text-xs text-zinc-400">%</span>
                </div>
                <RangeBar
                  value={sensorData?.dht2?.humidity ?? 0}
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

          {/* Bottle 3 카드 */}
          <SensorCard>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-semibold ${
                    sensorData && sensorData.bottle3Count < 5
                      ? "bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400"
                      : sensorData && sensorData.bottle3Count < 10
                      ? "bg-yellow-100 dark:bg-yellow-900/50 text-yellow-600 dark:text-yellow-400"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                  }`}
                >
                  3
                </div>
                <div>
                  <div className="text-lg font-medium text-black dark:text-white">
                    Bottle 3
                  </div>
                  <div className="text-sm text-zinc-500 dark:text-zinc-400">
                    {getPillName(3)}
                  </div>
                </div>
              </div>
              {sensorData && sensorData.bottle3Count < 5 && (
                <span className="px-2 py-1 text-xs font-medium bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 rounded-full">
                  보충 필요
                </span>
              )}
            </div>

            {/* 약 개수 */}
            <div className="mb-4">
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Pills
                </span>
                <div className="flex items-baseline gap-1">
                  <span
                    className={`text-3xl font-light tracking-tight ${
                      sensorData && sensorData.bottle3Count < 5
                        ? "text-red-600 dark:text-red-400"
                        : sensorData && sensorData.bottle3Count < 10
                        ? "text-yellow-600 dark:text-yellow-400"
                        : "text-black dark:text-white"
                    }`}
                  >
                    {sensorData?.bottle3Count ?? "--"}
                  </span>
                  <span className="text-sm text-zinc-400 dark:text-zinc-500">
                    / 18
                  </span>
                </div>
              </div>
              <ProgressBar
                value={sensorData?.bottle3Count ?? 0}
                max={18}
                status={
                  sensorData && sensorData.bottle3Count < 5
                    ? "error"
                    : sensorData && sensorData.bottle3Count < 10
                    ? "warning"
                    : "normal"
                }
                size="md"
              />
            </div>

            {/* 온습도 */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
              <div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                  Temp
                </div>
                <div className="flex items-baseline gap-1">
                  <span
                    className={`text-xl font-light ${
                      sensorData && (sensorData.dht3?.temperature ?? 0) > 30
                        ? "text-yellow-600 dark:text-yellow-400"
                        : "text-black dark:text-white"
                    }`}
                  >
                    {sensorData?.dht3?.temperature?.toFixed(1) ?? "--"}
                  </span>
                  <span className="text-xs text-zinc-400">°C</span>
                </div>
                <RangeBar
                  value={sensorData?.dht3?.temperature ?? 0}
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
                  Humidity
                </div>
                <div className="flex items-baseline gap-1">
                  <span
                    className={`text-xl font-light ${
                      sensorData && (sensorData.dht3?.humidity ?? 0) > 70
                        ? "text-yellow-600 dark:text-yellow-400"
                        : "text-black dark:text-white"
                    }`}
                  >
                    {sensorData?.dht3?.humidity?.toFixed(1) ?? "--"}
                  </span>
                  <span className="text-xs text-zinc-400">%</span>
                </div>
                <RangeBar
                  value={sensorData?.dht3?.humidity ?? 0}
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
        </div>

        {/* 활동 로그 */}
        <div className="mb-10">
          <ActivityLog events={events} maxItems={15} />
        </div>

        {/* ====== 영양 분석 안내 섹션 ====== */}
        <section className="mb-10 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
          <h2 className="text-xl font-medium mb-2">영양 분석</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
            오늘 먹은 음식을 입력하고 영양 상태를 분석하여 권장 알약 섭취량을
            확인할 수 있습니다.
          </p>
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-zinc-600 dark:text-zinc-300">
              {"식단 입력과 지병 선택을 통해 "}
              <span className="font-semibold">맞춤형 영양 분석</span>
              {"을 받아보세요."}
            </p>
            <Link
              href="/analyse"
              className="px-4 py-2 rounded-lg bg-black text-white dark:bg-white dark:text-black text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors whitespace-nowrap"
            >
              영양 분석하기
            </Link>
          </div>
        </section>

        {/* ====== 약 정보 안내 섹션 (폰트 기존 섹션이랑 통일) ====== */}
        <section className="mb-10 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
          <h2 className="text-xl font-medium mb-2">약 정보</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
            각 Bottle에 어떤 영양제가 들어있는지, 복용 목적과 주의사항을 한눈에
            확인할 수 있습니다.
          </p>
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-zinc-600 dark:text-zinc-300">
              {"Bottle 1, 2, 3에 들어간 약 성분과 권장 복용량은 "}
              <span className="font-semibold">[약 정보 페이지]</span>에서
              관리합니다.
            </p>
            <Link
              href="/pills"
              className="px-4 py-2 rounded-lg bg-black text-white dark:bg-white dark:text-black text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors whitespace-nowrap"
            >
              약 정보 보러가기
            </Link>
          </div>
        </section>

        {/* 데이터 갱신 시각 */}
        <footer className="text-center text-zinc-400 dark:text-zinc-600 text-xs font-mono uppercase tracking-wider">
          Last update:{" "}
          {lastUpdate ? lastUpdate.toLocaleTimeString("ko-KR") : "--"}
        </footer>
      </div>
    </div>
  );
}
