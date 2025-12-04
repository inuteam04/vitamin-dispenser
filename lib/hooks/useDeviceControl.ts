"use client";

import { useState, useCallback } from "react";
import { ref, get, set } from "firebase/database";
import { database } from "@/lib/firebase";

export function useDeviceControl() {
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [lastError, setLastError] = useState<Error | null>(null);

  const dispense = useCallback(
    async (bottleNumber: 1 | 2 | 3, count: number): Promise<void> => {
      setIsExecuting(true);
      setLastError(null);

      try {
        // ★ 단일 노드에 덮어쓰기 (push 대신 set)
        const controlRef = ref(database, "control/dispense");

        await set(controlRef, {
          bottleNumber: bottleNumber,
          count: count,
          status: "pending", // ESP32가 이걸 보고 처리
          requestedAt: Date.now(),
          completedAt: null,
        });

        // UI 피드백용 짧은 딜레이
        await new Promise((resolve) => setTimeout(resolve, 300));
      } catch (err) {
        const error = err as Error;
        console.error("[useDeviceControl] Dispense failed:", error);
        setLastError(error);
        throw error;
      } finally {
        setIsExecuting(false);
      }
    },
    []
  );

  const refillBottle = useCallback(
    async (bottleNumber: 1 | 2 | 3, amount: number): Promise<void> => {
      try {
        const countRef = ref(database, `sensors/bottle${bottleNumber}Count`);
        const snapshot = await get(countRef);
        const current = snapshot.val() || 0;
        await set(countRef, current + amount);
      } catch (err) {
        console.error("[Refill] Failed:", err);
        throw err;
      }
    },
    []
  );

  return {
    dispense,
    refillBottle,
    isExecuting,
    lastError,
  };
}
