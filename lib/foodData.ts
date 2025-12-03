// lib/foodData.ts

// CSV 한 줄 타입 (유연하게)
export type FoodRow = {
  [key: string]: string | number;
};

// 사용자가 선택한 음식 타입
export type SelectedFood = {
  food: FoodRow; // 실제 CSV 1줄
  grams: number; // 섭취량 (g)
};

// 권장량 프로필 키
export type RequirementProfileKey = "adult_male" | "adult_female";

// 각 영양소 메타 정보
type NutrientMeta = {
  label: string; // 화면에 보여줄 이름
  unit: string; // 단위
  required: number; // 권장량
};

// 권장량 프로필 전체 타입
export type RequirementProfile = {
  key: RequirementProfileKey;
  label: string;
  nutrients: {
    [nutrientKey: string]: NutrientMeta;
  };
};

// ---------------- CSV 파싱 ----------------

// CSV 문자열 파싱 + 숫자 변환
function parseCsv(text: string): FoodRow[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const firstLine = lines[0];
  if (!firstLine) return [];

  const headers = firstLine.split(",").map((h) => h.trim());
  const rows: FoodRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    let cols = line.split(",");

    while (cols.length < headers.length) cols.push("");
    if (cols.length > headers.length) cols = cols.slice(0, headers.length);

    const row: FoodRow = {};
    headers.forEach((header, idx) => {
      const raw = cols[idx]?.trim() ?? "";
      const num = Number(raw);
      row[header] = isNaN(num) ? raw : num;
    });

    rows.push(row);
  }

  return rows;
}

// CSV 불러오기 (파일 이름: food_nutrition_grouped.csv)
export async function loadFoodDb(): Promise<FoodRow[]> {
  const res = await fetch("/food_nutrition_grouped.csv");
  if (!res.ok) {
    throw new Error("CSV 파일 로드 실패");
  }

  const text = await res.text();
  return parseCsv(text);
}

// ---------------- 섭취량 계산 ----------------

// CSV에서 음식 이름 얻기 (page.tsx와 동일한 로직에 맞춰서)
export function getFoodName(row: FoodRow): string {
  const anyRow = row as Record<string, unknown>;
  return (
    (anyRow.FOOD_NM_KR as string) ||
    (anyRow.FOOD_NAME as string) ||
    (anyRow["식품명"] as string) ||
    (anyRow["음식명"] as string) ||
    (anyRow["FoodName"] as string) ||
    (Object.values(row)[0] as string | undefined) ||
    ""
  );
}

// 선택된 음식들로부터 전체 섭취 영양소 합계 계산
export function computeIntake(
  selected: SelectedFood[]
): Record<string, number> {
  const total: Record<string, number> = {};

  selected.forEach(({ food, grams }) => {
    const factor = grams / 100; // CSV가 100g 기준이라고 가정

    Object.keys(food).forEach((key) => {
      if (key === "FOOD_NM_KR") return;

      const v = Number((food as Record<string, unknown>)[key]);
      if (!isFinite(v)) return;

      if (total[key] == null) total[key] = 0;
      total[key] += v * factor;
    });
  });

  // 열량/단백질/지방/탄수/나트륨 등 주요 키를 heuristic으로 매핑
  const entries = Object.entries(total);

  const findValue = (predicate: (lowerKey: string) => boolean): number => {
    for (const [k, v] of entries) {
      const lower = k.toLowerCase();
      if (predicate(lower)) {
        return v;
      }
    }
    return 0;
  };

  // energy_kcal
  if (total["energy_kcal"] == null) {
    total["energy_kcal"] = findValue(
      (k) => k.includes("kcal") || k.includes("열량") || k.includes("energy")
    );
  }

  // protein_g
  if (total["protein_g"] == null) {
    total["protein_g"] = findValue(
      (k) =>
        k.includes("protein") ||
        k.includes("단백질") ||
        k === "prot" ||
        k.includes("_prot")
    );
  }

  // fat_g
  if (total["fat_g"] == null) {
    total["fat_g"] = findValue((k) => k === "fat" || k.includes("지방"));
  }

  // carbohydrate_g
  if (total["carbohydrate_g"] == null) {
    total["carbohydrate_g"] = findValue(
      (k) =>
        k === "cho" ||
        k.includes("carbo") ||
        k.includes("탄수") ||
        k.includes("당질")
    );
  }

  // sodium_mg
  if (total["sodium_mg"] == null) {
    total["sodium_mg"] = findValue(
      (k) => k.includes("나트륨") || k === "na" || k.includes("sodium")
    );
  }

  return total;
}

// ---------------- 권장량 프로필 ----------------

export function getRequirementProfile(
  key: RequirementProfileKey
): RequirementProfile {
  // 대략적인 예시값 (한국 성인 기준 대략)
  const maleNutrients: { [k: string]: NutrientMeta } = {
    energy_kcal: {
      label: "열량",
      unit: "kcal",
      required: 2600,
    },
    protein_g: {
      label: "단백질",
      unit: "g",
      required: 60,
    },
    fat_g: {
      label: "지방",
      unit: "g",
      required: 65,
    },
    carbohydrate_g: {
      label: "탄수화물",
      unit: "g",
      required: 330,
    },
    sodium_mg: {
      label: "나트륨",
      unit: "mg",
      required: 2000,
    },
  };

  const femaleNutrients: { [k: string]: NutrientMeta } = {
    energy_kcal: {
      label: "열량",
      unit: "kcal",
      required: 2100,
    },
    protein_g: {
      label: "단백질",
      unit: "g",
      required: 50,
    },
    fat_g: {
      label: "지방",
      unit: "g",
      required: 55,
    },
    carbohydrate_g: {
      label: "탄수화물",
      unit: "g",
      required: 260,
    },
    sodium_mg: {
      label: "나트륨",
      unit: "mg",
      required: 2000,
    },
  };

  if (key === "adult_female") {
    return {
      key,
      label: "성인 여성 기준 (대략)",
      nutrients: femaleNutrients,
    };
  }

  return {
    key: "adult_male",
    label: "성인 남성 기준 (대략)",
    nutrients: maleNutrients,
  };
}

// ---------------- 섭취 vs 권장 비교 ----------------

export type CompareRow = {
  nutrientKey: string;
  label: string;
  unit: string;
  intake: number;
  requirement: number;
  ratio: number; // intake / requirement
  status: "low" | "ok" | "high";
};

export function compareIntake(
  intake: Record<string, number>,
  profile: RequirementProfile
): CompareRow[] {
  const rows: CompareRow[] = [];

  for (const [nutrientKey, meta] of Object.entries(profile.nutrients)) {
    const have = Number(intake[nutrientKey] ?? 0);
    const need = meta.required;
    const ratio = need > 0 ? have / need : 0;

    let status: "low" | "ok" | "high" = "ok";
    if (ratio < 0.8) status = "low";
    else if (ratio > 1.3) status = "high";

    rows.push({
      nutrientKey,
      label: meta.label,
      unit: meta.unit,
      intake: have,
      requirement: need,
      ratio,
      status,
    });
  }

  return rows;
}

// ---------------- 부족 영양소 ----------------

// threshold = 0.8 이면, 80% 미만인 영양소만 반환
export function getDeficientNutrients(
  comparison: CompareRow[],
  threshold: number = 0.8
): CompareRow[] {
  return comparison.filter((row) => {
    if (!row.requirement || row.requirement <= 0) return false;
    const ratio = row.intake / row.requirement;
    return ratio < threshold;
  });
}
