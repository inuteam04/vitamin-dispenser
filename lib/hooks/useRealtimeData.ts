"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { ref, onValue, off, DatabaseReference } from "firebase/database";
import { database } from "@/lib/firebase";

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

  // 이렇게 하면 initialValue가 바뀌어도 useEffect를 트리거하지 않으면서
  // 내부 로직에서는 최신 값을 참조할 수 있습니다.
  const initialValueRef = useRef<T | undefined>(initialValue);

  // 렌더링 될 때마다 Ref 업데이트
  useEffect(() => {
    initialValueRef.current = initialValue;
  }, [initialValue]);

  const retry = useCallback(() => {
    setRetryCount((prev) => prev + 1);
    setError(null);
    setLoading(true);
  }, []);

  useEffect(() => {
    const dbRef: DatabaseReference = ref(database, path);
    let isSubscribed = true;

    const unsubscribe = onValue(
      dbRef,
      (snapshot) => {
        if (!isSubscribed) return;

        if (snapshot.exists()) {
          const value = snapshot.val() as T;
          setData(value);
          setError(null);
        } else {
          // Ref에 저장된 최신 초기값 사용
          setData(initialValueRef.current ?? null);
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

    return () => {
      isSubscribed = false;
      off(dbRef, "value", unsubscribe);
    };
    // 의존성 배열에서 initialValue 제거
    // 이제 초기값 객체가 새로 생성되어도 구독이 끊어졌다 다시 연결되지 않습니다.
  }, [path, retryCount]);

  return { data, loading, error, retry };
}
