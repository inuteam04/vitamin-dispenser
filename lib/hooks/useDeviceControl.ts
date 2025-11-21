"use client";

import { useState, useCallback } from "react";
import { ref, set, push } from "firebase/database";
import { database } from "@/lib/firebase";
import { ControlCommand } from "@/lib/types";

/**
 * 디바이스 제어 Hook
 * ESP32가 '/commands' 경로를 구독하여 명령 실행
 */
export function useDeviceControl() {
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [lastError, setLastError] = useState<Error | null>(null);

  /**
   * 알약 배출 명령 전송
   */
  const dispense = useCallback(async (count: number = 1): Promise<void> => {
    setIsExecuting(true);
    setLastError(null);

    try {
      const commandsRef = ref(database, "commands");
      const command: ControlCommand = {
        action: "dispense",
        payload: { count },
        requestedAt: Date.now(),
      };

      // Firebase에 명령 Push (ESP32가 이를 감지하여 처리)
      await push(commandsRef, command);

      // UI 피드백을 위한 짧은 딜레이
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (err) {
      const error = err as Error;
      console.error("[useDeviceControl] Dispense failed:", error);
      setLastError(error);
      throw error;
    } finally {
      setIsExecuting(false);
    }
  }, []);

  /**
   * 온도 임계값 설정
   */
  const setTemperatureThreshold = useCallback(
    async (threshold: number): Promise<void> => {
      setIsExecuting(true);
      setLastError(null);

      try {
        const configRef = ref(database, "config/tempThreshold");
        await set(configRef, threshold);
      } catch (err) {
        const error = err as Error;
        console.error("[useDeviceControl] Set threshold failed:", error);
        setLastError(error);
        throw error;
      } finally {
        setIsExecuting(false);
      }
    },
    []
  );

  return {
    dispense,
    setTemperatureThreshold,
    isExecuting,
    lastError,
  };
}
