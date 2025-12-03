// lib/dispenser.ts
import { db } from "@/lib/firebase";
import { ref as dbRef, get, set } from "firebase/database";

export type DispenserSlotId =
  | "vitamin_c"
  | "calcium_d"
  | "iron"
  | "protein"
  | "fiber"
  | "multivitamin";

export function mapPillNameToSlotId(pillName: string): DispenserSlotId | null {
  const name = pillName.toLowerCase();

  if (name.includes("비타민 c")) return "vitamin_c";
  if (name.includes("칼슘")) return "calcium_d";
  if (name.includes("철분")) return "iron";
  if (name.includes("단백질")) return "protein";
  if (name.includes("식이섬유")) return "fiber";
  if (name.includes("종합")) return "multivitamin";

  return null;
}

export type SupplementForDispense = {
  pillName: string;
  nutrientLabel: string;
};

export type DispenseResult = {
  insufficient: {
    slotId: DispenserSlotId;
    pillName: string;
    nutrientLabel: string;
  }[];
};

/**
 * 디스펜서에서 영양제를 떨어뜨리는 동작 (임시 IoT 시뮬레이션)
 * - 각 추천 1개당 알약 1개씩 감소한다고 가정
 * - DB 경로: /dispenser/slots/{slotId}/count
 * - 재고가 0이면 감소시키지 않고 insufficient 목록에 기록
 */
export async function dispenseSupplementsToDispenser(
  supplements: SupplementForDispense[]
): Promise<DispenseResult> {
  const insufficient: DispenseResult["insufficient"] = [];

  if (supplements.length === 0) {
    return { insufficient };
  }

  for (const s of supplements) {
    const slotId = mapPillNameToSlotId(s.pillName);
    if (!slotId) continue;

    const countRef = dbRef(db, `dispenser/slots/${slotId}/count`);
    const snap = await get(countRef);
    const current = snap.exists() ? Number(snap.val()) : 0;

    if (current <= 0) {
      insufficient.push({ slotId, pillName: s.pillName, nutrientLabel: s.nutrientLabel });
      continue;
    }

    const next = Math.max(0, current - 1);
    await set(countRef, next);
  }

  const logRef = dbRef(db, `dispenser/lastDrop`);
  await set(logRef, {
    timestamp: Date.now(),
    items: supplements.map((s) => ({
      pillName: s.pillName,
      nutrient: s.nutrientLabel,
    })),
  });

  return { insufficient };
}
