"use client";

import { useEffect, useState, useCallback } from "react";
import { ref, onValue, off, DatabaseReference } from "firebase/database";
import { database } from "@/lib/firebase";

/**
 * Generic 타입을 활용한 재사용 가능한 실시간 데이터 Hook
 * @template T - Firebase에서 받아올 데이터 타입
 * @param path - Realtime Database 경로 (예: 'sensors/current')
 * @param initialValue - 초기값 (옵션)
 */
export function useRealtimeData<T>(
  path: string,
  initialValue?: T
): {
  data: T | null;
  loading: boolean;
  error: Error | null;
  retry: () => void;
} {
  const [data, setData] = useState<T | null>(initialValue ?? null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState<number>(0);

  const retry = useCallback(() => {
    setRetryCount((prev) => prev + 1);
    setError(null);
    setLoading(true);
  }, []);

  useEffect(() => {
    const dbRef: DatabaseReference = ref(database, path);
    let isSubscribed = true;

    // Firebase onValue 리스너 등록 (실시간 동기화)
    const unsubscribe = onValue(
      dbRef,
      (snapshot) => {
        if (!isSubscribed) return;

        if (snapshot.exists()) {
          const value = snapshot.val() as T;
          setData(value);
          setError(null);
        } else {
          // 데이터 없음 (초기 상태)
          setData(initialValue ?? null);
        }
        setLoading(false);
      },
      (err) => {
        if (!isSubscribed) return;
        console.error(`[useRealtimeData] Error on path "${path}":`, err);
        setError(err as Error);
        setLoading(false);
      }
    );

    // Cleanup: 컴포넌트 언마운트 시 리스너 해제 (메모리 누수 방지)
    return () => {
      isSubscribed = false;
      off(dbRef, "value", unsubscribe);
    };
  }, [path, initialValue, retryCount]);

  return { data, loading, error, retry };
}
