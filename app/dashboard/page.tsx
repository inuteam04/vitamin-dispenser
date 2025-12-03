"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
import { withAuth } from "@/components/withAuth";
import toast from "react-hot-toast";

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
  const { logout } = useAuth();
  const router = useRouter();
  const {
    data: sensorData,
    loading,
    error,
    retry,
  } = useRealtimeData<SensorData>("sensors", {
    temparature: 0,
    humidity: 0,
    bottle1Count: 18,
    bottle2Count: 18,
    bottle3Count: 6,
    lastDispensed: 0,
    isDispensing: false,
    fanStatus: false,
    timestamp: 0,
  });

  // 활동 로그 상태
  // 마지막 데이터 업데이트 시간
  const lastUpdateRef = useRef<Date | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const previousDataRef = useRef<SensorData | null>(null);

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
    lastUpdateRef.current = now;
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
      const temp = sensorData.temparature ?? 0;
      if (sensorData.fanStatus === true) {
        newEvents.push({
          id: `${Date.now()}_fan_on`,
          type: ActivityEventType.FAN_ON,
          message: `냉각 팬 작동 시작 (온도: ${temp.toFixed(1)}°C)`,
          timestamp: Date.now(),
          data: { temperature: temp },
        });
      } else {
        newEvents.push({
          id: `${Date.now()}_fan_off`,
          type: ActivityEventType.FAN_OFF,
          message: `냉각 팬 정지 (온도: ${temp.toFixed(1)}°C)`,
          timestamp: Date.now(),
          data: { temperature: temp },
        });
      }
    }

    // 온도 경고
    const currentTemp = sensorData.temparature ?? 0;
    const prevTemp = prevData.temparature ?? 0;
    if (currentTemp > 35 && prevTemp <= 35) {
      newEvents.push({
        id: `${Date.now()}_temp_critical`,
        type: ActivityEventType.TEMP_CRITICAL,
        message: `위험: 온도 과열 (${currentTemp.toFixed(1)}°C)`,
        timestamp: Date.now(),
        data: { temperature: currentTemp },
      });
    } else if (currentTemp > 30 && currentTemp <= 35 && prevTemp <= 30) {
      newEvents.push({
        id: `${Date.now()}_temp_warning`,
        type: ActivityEventType.TEMP_WARNING,
        message: `경고: 온도 상승 (${currentTemp.toFixed(1)}°C)`,
        timestamp: Date.now(),
        data: { temperature: currentTemp },
      });
    }

    // 습도 경고
    const currentHumidity = sensorData.humidity ?? 0;
    const prevHumidity = prevData.humidity ?? 0;
    if (currentHumidity > 70 && prevHumidity <= 70) {
      newEvents.push({
        id: `${Date.now()}_humidity_warning`,
        type: ActivityEventType.HUMIDITY_WARNING,
        message: `경고: 습도 과다 (${currentHumidity.toFixed(1)}%)`,
        timestamp: Date.now(),
        data: { humidity: currentHumidity },
      });
    }

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
    if (sensorData.temparature > 35) return SystemStatus.ERROR;
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

        {/* 센서 데이터 그리드 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
          {/* 모바일: 온도 + 습도 통합 카드 */}
          <SensorCard className="lg:hidden">
            <SensorCard.Title>Environment</SensorCard.Title>
            <div className="grid grid-cols-2 gap-6">
              {/* Temperature */}
              <div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3">
                  Temperature
                </div>
                <div className="flex items-baseline gap-2 mb-2">
                  <span
                    className={`text-4xl font-light tracking-tight ${
                      sensorData && sensorData.temparature > 30
                        ? "text-yellow-600 dark:text-yellow-400"
                        : "text-black dark:text-white"
                    }`}
                  >
                    {sensorData?.temparature?.toFixed(1) ?? "--"}
                  </span>
                  <span className="text-lg text-zinc-400 dark:text-zinc-500 font-light">
                    °C
                  </span>
                </div>
                <RangeBar
                  value={sensorData?.temparature ?? 0}
                  min={0}
                  max={50}
                  optimalMin={15}
                  optimalMax={25}
                  warningThreshold={30}
                  className="mb-2"
                />
                <p className="text-xs text-zinc-500 dark:text-zinc-500 uppercase tracking-wider">
                  Optimal: 15-25°C
                </p>
              </div>

              {/* Humidity */}
              <div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3">
                  Humidity
                </div>
                <div className="flex items-baseline gap-2 mb-2">
                  <span
                    className={`text-4xl font-light tracking-tight ${
                      sensorData && sensorData.humidity > 70
                        ? "text-yellow-600 dark:text-yellow-400"
                        : "text-black dark:text-white"
                    }`}
                  >
                    {sensorData?.humidity?.toFixed(1) ?? "--"}
                  </span>
                  <span className="text-lg text-zinc-400 dark:text-zinc-500 font-light">
                    %
                  </span>
                </div>
                <RangeBar
                  value={sensorData?.humidity ?? 0}
                  min={0}
                  max={100}
                  optimalMin={40}
                  optimalMax={60}
                  warningThreshold={70}
                  className="mb-2"
                />
                <p className="text-xs text-zinc-500 dark:text-zinc-500 uppercase tracking-wider">
                  Optimal: 40-60%
                </p>
              </div>
            </div>
          </SensorCard>

          {/* 데스크톱: 온도 카드 */}
          <SensorCard className="hidden lg:block">
            <SensorCard.Title>Temperature</SensorCard.Title>
            <SensorCard.Value
              value={sensorData?.temparature?.toFixed(1) ?? "--"}
              unit="°C"
              status={
                sensorData && sensorData.temparature > 30 ? "warning" : "normal"
              }
            />
            <RangeBar
              value={sensorData?.temparature ?? 0}
              min={0}
              max={50}
              optimalMin={15}
              optimalMax={25}
              warningThreshold={30}
              className="mb-3"
            />
            <SensorCard.Description>Optimal: 15-25°C</SensorCard.Description>
          </SensorCard>

          {/* 데스크톱: 습도 카드 */}
          <SensorCard className="hidden lg:block">
            <SensorCard.Title>Humidity</SensorCard.Title>
            <SensorCard.Value
              value={sensorData?.humidity?.toFixed(1) ?? "--"}
              unit="%"
              status={
                sensorData && sensorData.humidity > 70 ? "warning" : "normal"
              }
            />
            <RangeBar
              value={sensorData?.humidity ?? 0}
              min={0}
              max={100}
              optimalMin={40}
              optimalMax={60}
              warningThreshold={70}
              className="mb-3"
            />
            <SensorCard.Description>Optimal: 40-60%</SensorCard.Description>
          </SensorCard>

          <SensorCard>
            <SensorCard.Title>Pill Bottles</SensorCard.Title>
            <div className="space-y-4">
              {/* Bottle 1 */}
              <div className="pb-4 border-b border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Bottle 1
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span
                      className={`text-lg font-light tracking-tight ${
                        sensorData && sensorData.bottle1Count < 5
                          ? "text-red-600 dark:text-red-400"
                          : sensorData && sensorData.bottle1Count < 10
                          ? "text-yellow-600 dark:text-yellow-400"
                          : "text-black dark:text-white"
                      }`}
                    >
                      {sensorData?.bottle1Count ?? "--"}
                    </span>
                    <span className="text-xs text-zinc-400 dark:text-zinc-500 font-light">
                      /18
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
                  className="mb-1"
                />
                <p className="text-xs text-zinc-500 dark:text-zinc-500">
                  {sensorData && sensorData.bottle1Count < 5
                    ? "Refill required"
                    : sensorData && sensorData.bottle1Count < 10
                    ? "Running low"
                    : "Normal"}
                </p>
              </div>

              {/* Bottle 2 */}
              <div className="pb-4 border-b border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Bottle 2
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span
                      className={`text-lg font-light tracking-tight ${
                        sensorData && sensorData.bottle2Count < 5
                          ? "text-red-600 dark:text-red-400"
                          : sensorData && sensorData.bottle2Count < 10
                          ? "text-yellow-600 dark:text-yellow-400"
                          : "text-black dark:text-white"
                      }`}
                    >
                      {sensorData?.bottle2Count ?? "--"}
                    </span>
                    <span className="text-xs text-zinc-400 dark:text-zinc-500 font-light">
                      /18
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
                  className="mb-1"
                />
                <p className="text-xs text-zinc-500 dark:text-zinc-500">
                  {sensorData && sensorData.bottle2Count < 5
                    ? "Refill required"
                    : sensorData && sensorData.bottle2Count < 10
                    ? "Running low"
                    : "Normal"}
                </p>
              </div>

              {/* Bottle 3 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Bottle 3
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span
                      className={`text-lg font-light tracking-tight ${
                        sensorData && sensorData.bottle3Count < 5
                          ? "text-red-600 dark:text-red-400"
                          : sensorData && sensorData.bottle3Count < 10
                          ? "text-yellow-600 dark:text-yellow-400"
                          : "text-black dark:text-white"
                      }`}
                    >
                      {sensorData?.bottle3Count ?? "--"}
                    </span>
                    <span className="text-xs text-zinc-400 dark:text-zinc-500 font-light">
                      /18
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
                  className="mb-1"
                />
                <p className="text-xs text-zinc-500 dark:text-zinc-500">
                  {sensorData && sensorData.bottle3Count < 5
                    ? "Refill required"
                    : sensorData && sensorData.bottle3Count < 10
                    ? "Running low"
                    : "Normal"}
                </p>
              </div>
            </div>
          </SensorCard>
        </div>

        {/* 활동 로그 */}
        <div className="mb-10">
          <ActivityLog events={events} maxItems={15} />
        </div>

        {/* 데이터 갱신 시각 */}
        <footer className="text-center text-zinc-400 dark:text-zinc-600 text-xs font-mono uppercase tracking-wider">
          Last update:{" "}
          {lastUpdate ? lastUpdate.toLocaleTimeString("ko-KR") : "--"}
        </footer>
      </div>
    </div>
  );
}
