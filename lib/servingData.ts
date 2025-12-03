// lib/servingData.ts

export type ServingRow = {
  category: string; // 예: "국/탕", "밥", "면류"
  keyword: string; // 예: "김치찌개", "국밥", "라면"
  grams: number; // 1인분 g
};

// 아주 단순한 CSV 파서 (쉴표 기준, 따옴표 처리 X)
function parseServingCsv(text: string): ServingRow[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const firstLine = lines[0];
  if (!firstLine) return [];

  const headers = firstLine.split(",").map((h) => h.trim());
  const rows: ServingRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i];
    if (!rawLine) continue;

    const line = rawLine.trim();
    if (!line) continue;

    const cols = line.split(",");

    const get = (key: string) => {
      const idx = headers.indexOf(key);
      if (idx === -1) return "";
      return (cols[idx] ?? "").trim();
    };

    const category = get("category") || get("분류") || "";
    const keyword = get("keyword") || get("이름") || get("food") || "";
    const gramsStr = get("grams") || get("g") || get("gram") || "";
    const grams = Number(gramsStr) || 0;

    if (!keyword || !grams) continue;

    rows.push({
      category,
      keyword,
      grams,
    });
  }

  return rows;
}

// ✅ 여기가 핵심: 반드시 "/serving_default.csv" 처럼 슬래시로 시작
export async function loadServingDefaults(): Promise<ServingRow[]> {
  // SSR 단계에서는 fetch 안 함
  if (typeof window === "undefined") return [];

  try {
    const res = await fetch("/serving_default.csv"); // 🔴 상대경로 말고 절대경로

    if (!res.ok) {
      console.error(
        "Failed to load serving defaults",
        res.status,
        res.statusText
      );
      return [];
    }

    const text = await res.text();
    return parseServingCsv(text);
  } catch (err) {
    console.error("Failed to load serving defaults", err);
    return [];
  }
}

// 간단한 1인분 추정 로직
export function estimateServingGrams(
  food: Record<string, unknown>,
  servingDefaults: ServingRow[]
): number | null {
  if (!servingDefaults.length) return null;

  const name: string =
    String(
      food.FOOD_NM_KR ||
        food.FOOD_NAME ||
        food["식품명"] ||
        food["식품명(국문)"] ||
        ""
    ) || "";

  const lowerName = name.toLowerCase();

  // 키워드가 이름에 포함되는 것 우선
  const candidates = servingDefaults.filter((row) =>
    lowerName.includes(row.keyword.toLowerCase())
  );

  if (candidates.length === 0) return null;

  // 일단 첫 번째 후보 사용 (필요하면 더 고도화)
  const first = candidates[0];
  return first ? first.grams : null;
}
