// lib/logs.ts
import { db } from "@/lib/firebase";
import { ref as dbRef, set, get } from "firebase/database";

export type NutritionLog = {
  timestamp: number;
  requirementLabel: string;
  deficient: {
    nutrientKey: string;
    label: string;
    ratio: number;
  }[];
  supplements: {
    pillName: string;
    nutrientLabel: string;
  }[];
};

function getTodayKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * 오늘 날짜 기준으로 영양 분석 로그 저장
 * 경로: users/{uid}/logs/{YYYY-MM-DD}/{timestamp}
 */
export async function saveNutritionLog(userId: string, log: NutritionLog) {
  const dateKey = getTodayKey();
  const key = String(log.timestamp);
  const ref = dbRef(db, `users/${userId}/logs/${dateKey}/${key}`);
  await set(ref, log);
}

/**
 * 최근 N개의 영양 로그 로딩 (날짜/시간 역순)
 * 단순히 최근 날짜 + 최근 timestamp 위주로 수집
 */
export async function loadRecentLogs(
  userId: string,
  limit: number = 5
): Promise<NutritionLog[]> {
  const rootRef = dbRef(db, `users/${userId}/logs`);
  const snap = await get(rootRef);
  if (!snap.exists()) return [];

  const logsByDate = snap.val() as Record<string, Record<string, NutritionLog>>;
  const dateKeys = Object.keys(logsByDate).sort().reverse(); // 최신 날짜 우선

  const result: NutritionLog[] = [];

  for (const dateKey of dateKeys) {
    const dayLogs = logsByDate[dateKey];
    if (!dayLogs) continue;

    const tsKeys = Object.keys(dayLogs).sort().reverse(); // 최신 시간 우선
    for (const ts of tsKeys) {
      const log = dayLogs[ts];
      if (log) {
        result.push(log);
        if (result.length >= limit) return result;
      }
    }
  }

  return result;
}
