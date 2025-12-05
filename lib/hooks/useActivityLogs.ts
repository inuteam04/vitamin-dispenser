"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ref,
  onValue,
  query,
  orderByChild,
  limitToLast,
} from "firebase/database";
import { database } from "@/lib/firebase";
import { ActivityEvent, ActivityEventType } from "@/lib/types";

/**
 * Firebase에서 받아오는 활동 로그 데이터 타입
 */
interface FirebaseActivityLog {
  type: string;
  bottleId?: number;
  count?: number;
  temperature?: number;
  humidity?: number;
  timestamp: number;
  message: string;
}

/**
 * Firebase 활동 로그를 ActivityEvent 형식으로 변환
 */
function convertToActivityEvent(
  id: string,
  log: FirebaseActivityLog
): ActivityEvent {
  // Firebase에서 오는 type을 ActivityEventType으로 매핑
  const typeMap: Record<string, ActivityEventType> = {
    PILL_DISPENSED: ActivityEventType.PILL_DISPENSED,
    FAN_ON: ActivityEventType.FAN_ON,
    FAN_OFF: ActivityEventType.FAN_OFF,
    TEMP_WARNING: ActivityEventType.TEMP_WARNING,
    TEMP_CRITICAL: ActivityEventType.TEMP_CRITICAL,
    HUMIDITY_WARNING: ActivityEventType.HUMIDITY_WARNING,
    PILL_LOW: ActivityEventType.PILL_LOW,
    DISPENSING_START: ActivityEventType.DISPENSING_START,
    DISPENSING_END: ActivityEventType.DISPENSING_END,
  };

  const eventType = typeMap[log.type] || ActivityEventType.PILL_DISPENSED;

  // 추가 데이터 구성
  const data: Record<string, unknown> = {};
  if (log.bottleId !== undefined) data.bottleId = log.bottleId;
  if (log.count !== undefined) data.count = log.count;
  if (log.temperature !== undefined) data.temperature = log.temperature;
  if (log.humidity !== undefined) data.humidity = log.humidity;

  // timestamp가 초 단위인 경우 밀리초로 변환 (10자리면 초, 13자리면 밀리초)
  const timestampMs =
    log.timestamp < 10000000000 ? log.timestamp * 1000 : log.timestamp;

  return {
    id,
    type: eventType,
    message: log.message,
    timestamp: timestampMs,
    data: Object.keys(data).length > 0 ? data : undefined,
  };
}

/**
 * Firebase에서 활동 로그를 실시간으로 가져오는 훅
 * @param limit 가져올 최대 로그 수 (기본값: 50)
 */
export function useActivityLogs(limit: number = 50): {
  events: ActivityEvent[];
  loading: boolean;
  error: Error | null;
  retry: () => void;
} {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState<number>(0);

  const retry = useCallback(() => {
    setRetryCount((prev) => prev + 1);
    setError(null);
    setLoading(true);
  }, []);

  useEffect(() => {
    const logsRef = ref(database, "activityLogs");
    // timestamp 기준으로 정렬하고 최신 limit개만 가져옴
    const logsQuery = query(
      logsRef,
      orderByChild("timestamp"),
      limitToLast(limit)
    );

    let isSubscribed = true;

    const unsubscribe = onValue(
      logsQuery,
      (snapshot) => {
        if (!isSubscribed) return;

        if (snapshot.exists()) {
          const data = snapshot.val() as Record<string, FirebaseActivityLog>;

          // 객체를 배열로 변환하고 timestamp 기준 내림차순 정렬 (최신순)
          const eventsList = Object.entries(data)
            .map(([id, log]) => convertToActivityEvent(id, log))
            .sort((a, b) => b.timestamp - a.timestamp);

          setEvents(eventsList);
          setError(null);
        } else {
          setEvents([]);
        }
        setLoading(false);
      },
      (err) => {
        if (!isSubscribed) return;
        console.error("[useActivityLogs] Error:", err);
        setError(err as Error);
        setLoading(false);
      }
    );

    return () => {
      isSubscribed = false;
      unsubscribe();
    };
  }, [limit, retryCount]);

  return { events, loading, error, retry };
}
