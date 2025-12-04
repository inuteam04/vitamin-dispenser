"use client";

import { useEffect, useMemo, useRef, useState, ChangeEvent } from "react";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import { loadFoodDb, FoodRow, SelectedFood } from "@/lib/foodData";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  Legend,
} from "recharts";

/* =========================
 *  공통 유틸 함수들
 * ========================= */

// 음식 이름 추출 (analyse와 동일한 로직 재사용)
function getFoodName(row: FoodRow): string {
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

// 문자열/숫자 → 숫자 파싱 헬퍼
function toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const s = String(value).trim();
  if (!s) return 0;
  const cleaned = s.replace(/[^\d.+-]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

// 여러 후보 컬럼명 중 처음으로 숫자 나오는 값 반환
function getNutrient(row: FoodRow, keys: string[]): number {
  const anyRow = row as Record<string, unknown>;
  for (const key of keys) {
    if (key in anyRow && anyRow[key] !== undefined && anyRow[key] !== null) {
      const n = toNumber(anyRow[key]);
      if (n !== 0) return n;
    }
  }
  return 0;
}

// CSV에 따라 유연하게 잡기 위한 키 후보들
function getCaloriesPer100g(row: FoodRow): number {
  return getNutrient(row, [
    "calories",
    "Calories",
    "CALORIES",
    "kcal",
    "KCAL",
    "ENERC_KCAL",
    "ENERGY_KCAL",
    "열량(kcal)",
    "열량",
    "에너지",
    "calories_kcal",
  ]);
}

function getCarbsPer100g(row: FoodRow): number {
  return getNutrient(row, [
    "carbs",
    "Carbs",
    "CARBS",
    "carbohydrate",
    "Carbohydrate",
    "CARBOHYDRATE",
    "탄수화물(g)",
    "탄수화물",
    "carb_g",
  ]);
}

function getProteinPer100g(row: FoodRow): number {
  return getNutrient(row, [
    "protein",
    "Protein",
    "PROTEIN",
    "단백질(g)",
    "단백질",
    "protein_g",
  ]);
}

function getFatPer100g(row: FoodRow): number {
  return getNutrient(row, [
    "fat",
    "Fat",
    "FAT",
    "lipid",
    "Lipid",
    "지방(g)",
    "지방",
    "fat_g",
  ]);
}

/* =========================
 *  영양 그래프용 타입 & 함수
 * ========================= */

type NutrientKey = "kcal" | "carb" | "protein" | "fat";

type Nutrition = Record<NutrientKey, number>;

interface NutrientStat {
  key: NutrientKey;
  label: string;
  required: number; // 권장량
  intake: number; // 섭취량
  percent: number; // 섭취량 / 권장량 * 100
}

// RDA(권장량)과 섭취량을 받아서 그래프용 데이터로 변환
function buildNutrientStats(rda: Nutrition, intake: Nutrition): NutrientStat[] {
  const items: { key: NutrientKey; label: string }[] = [
    { key: "kcal", label: "열량 (kcal)" },
    { key: "carb", label: "탄수화물 (g)" },
    { key: "protein", label: "단백질 (g)" },
    { key: "fat", label: "지방 (g)" },
  ];

  return items.map(({ key, label }) => {
    const required = rda[key] ?? 0;
    const taken = intake[key] ?? 0;
    const percent =
      required > 0 ? Math.round((taken / required) * 100) : 0;

    return {
      key,
      label,
      required,
      intake: taken,
      percent,
    };
  });
}

/* =========================
 *  그래프 컴포넌트
 * ========================= */

interface NutritionChartProps {
  stats: NutrientStat[];
}

function NutritionChart({ stats }: NutritionChartProps) {
  const chartData = useMemo(
    () =>
      stats.map((s) => ({
        name: s.label,
        percent: s.percent,
        requiredLine: 100, // 항상 100% 기준선
      })),
    [stats]
  );

  return (
    <div className="w-full h-80 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 bg-white/70 dark:bg-zinc-950/60">
      <h3 className="text-sm font-semibold mb-1">
        권장량 대비 섭취 비율 (%)
      </h3>
      <p className="text-[11px] text-zinc-500 mb-3">
        막대가 100%면 권장량 충족. 100% 미만은 부족, 130% 이상은 과다 섭취로 볼 수 있어요.
      </p>

      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData}>
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis
            tick={{ fontSize: 11 }}
            unit="%"
            domain={[0, (dataMax: number) => Math.max(140, dataMax + 20)]}
          />
          <Tooltip
            formatter={(value: any, name: string, props: any) => {
              const idx = props?.dataIndex ?? 0;
              const stat = stats[idx];

              if (name === "percent") {
                return [
                  `${value}% (섭취 ${stat.intake.toFixed(
                    1
                  )} / 권장 ${stat.required})`,
                  "섭취 비율",
                ];
              }
              if (name === "requiredLine") {
                return ["100%", "권장 기준"];
              }
              return [value, name];
            }}
          />
          <Legend
            formatter={(value) =>
              value === "percent" ? "섭취 비율" : "권장 기준(100%)"
            }
          />

          {/* 100% 기준선 */}
          <ReferenceLine
            y={100}
            stroke="#888888"
            strokeDasharray="4 4"
            label={{
              value: "100%",
              position: "right",
              fontSize: 11,
              fill: "#666666",
            }}
          />

          <Bar dataKey="percent" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* =========================
 *  페이지 컴포넌트
 * ========================= */

export default function NutritionPage() {
  const [foodDb, setFoodDb] = useState<FoodRow[]>([]);
  const [foodLoading, setFoodLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selectedFoods, setSelectedFoods] = useState<SelectedFood[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [hasAnalyzed, setHasAnalyzed] = useState(false);

  // 음식 DB 로드
  useEffect(() => {
    const run = async () => {
      try {
        const rows = await loadFoodDb();
        setFoodDb(rows);
      } catch (err) {
        console.error(err);
      } finally {
        setFoodLoading(false);
      }
    };
    run();
  }, []);

  // 드롭다운 외부 클릭 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 검색 필터
  const filteredFoods = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return foodDb
      .filter((row) => {
        const name = getFoodName(row);
        return name && name.toLowerCase().includes(q);
      })
      .slice(0, 20);
  }, [query, foodDb]);

  // 음식 추가
  const handleAddFood = (row: FoodRow) => {
    const name = getFoodName(row);
    if (!name) return;
    const exists = selectedFoods.find(
      (item) => getFoodName(item.food) === name
    );
    if (exists) return;
    setSelectedFoods((prev) => [...prev, { food: row, grams: 100 }]);
    setQuery("");
    setIsDropdownOpen(false);
    setHasAnalyzed(false);
  };

  // g 수정
  const handleChangeGrams =
    (index: number) => (e: ChangeEvent<HTMLInputElement>) => {
      const grams = Number(e.target.value) || 0;
      setSelectedFoods((prev) =>
        prev.map((item, i) => (i === index ? { ...item, grams } : item))
      );
      setHasAnalyzed(false);
    };

  // 음식 제거
  const handleRemoveFood = (index: number) => {
    setSelectedFoods((prev) => prev.filter((_, i) => i !== index));
    setHasAnalyzed(false);
  };

  // 영양 합계 계산
  const summary = useMemo(() => {
    if (selectedFoods.length === 0) {
      return {
        totalCalories: 0,
        totalCarbs: 0,
        totalProtein: 0,
        totalFat: 0,
        totalGrams: 0,
      };
    }

    let totalCalories = 0;
    let totalCarbs = 0;
    let totalProtein = 0;
    let totalFat = 0;
    let totalGrams = 0;

    for (const item of selectedFoods) {
      const grams = item.grams || 0;
      totalGrams += grams;

      const cal100 = getCaloriesPer100g(item.food);
      const carb100 = getCarbsPer100g(item.food);
      const prot100 = getProteinPer100g(item.food);
      const fat100 = getFatPer100g(item.food);

      const factor = grams / 100;

      totalCalories += cal100 * factor;
      totalCarbs += carb100 * factor;
      totalProtein += prot100 * factor;
      totalFat += fat100 * factor;
    }

    return {
      totalCalories,
      totalCarbs,
      totalProtein,
      totalFat,
      totalGrams,
    };
  }, [selectedFoods]);

  const handleAnalyze = () => {
    if (selectedFoods.length === 0) return;
    setHasAnalyzed(true);
  };

  /* -----------------------
   *  권장량 & 그래프 데이터
   * ----------------------- */

  // TODO: 이 값은 나이/성별/프로필에 따라 바꿀 수 있음 (지금은 예시)
  const userRda: Nutrition = {
    kcal: 2500,
    carb: 300,
    protein: 55,
    fat: 70,
  };

  const intake: Nutrition = useMemo(
    () => ({
      kcal: summary.totalCalories,
      carb: summary.totalCarbs,
      protein: summary.totalProtein,
      fat: summary.totalFat,
    }),
    [summary]
  );

  const nutrientStats = useMemo(
    () => buildNutrientStats(userRda, intake),
    [userRda, intake]
  );

  const shortageList = useMemo(
    () => nutrientStats.filter((s) => s.percent < 100),
    [nutrientStats]
  );
  const overList = useMemo(
    () => nutrientStats.filter((s) => s.percent > 100),
    [nutrientStats]
  );

  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white">
      {/* 헤더 */}
      <header className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-5xl mx-auto px-6 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-light tracking-tight">
              영양 분석 (칼로리 · 탄단지)
            </h1>
            <p className="text-zinc-500 text-sm mt-1">
              오늘 먹은 음식을 입력하고 칼로리와 탄수화물·단백질·지방을 한 번에
              계산해보세요.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/analyse"
              className="text-sm text-zinc-500 hover:text-black dark:hover:text-white transition-colors"
            >
              ← 식단 & 지병 분석
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {/* 음식 입력 영역 */}
        <section className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-6">
          <h2 className="text-lg font-medium mb-4">오늘 먹은 음식 입력</h2>

          <div className="relative mb-4" ref={dropdownRef}>
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setIsDropdownOpen(true);
              }}
              onFocus={() => setIsDropdownOpen(true)}
              placeholder="음식명 검색 (예: 김치찌개, 삼겹살, 비빔밥...)"
              className="w-full px-4 py-3 border border-zinc-300 dark:border-zinc-700 rounded bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
            />
            {isDropdownOpen &&
              query.trim() &&
              !foodLoading &&
              filteredFoods.length > 0 && (
                <div className="absolute z-10 mt-1 w-full max-h-60 overflow-auto border border-zinc-300 dark:border-zinc-700 rounded bg-white dark:bg-black shadow-lg">
                  {filteredFoods.map((row, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleAddFood(row)}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800 last:border-b-0"
                    >
                      {getFoodName(row)}
                    </button>
                  ))}
                </div>
              )}
            {foodLoading && (
              <p className="text-xs text-zinc-500 mt-2">
                음식 데이터 로딩 중...
              </p>
            )}
          </div>

          {/* 선택된 음식 목록 */}
          {selectedFoods.length === 0 ? (
            <p className="text-sm text-zinc-500">
              위 검색창에서 음식을 선택해 추가하세요. 기본 기준은 100g입니다.
            </p>
          ) : (
            <div className="space-y-2">
              {selectedFoods.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between gap-4 p-3 border border-zinc-200 dark:border-zinc-800 rounded"
                >
                  <span className="text-sm font-medium flex-1 truncate">
                    {getFoodName(item.food)}
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      value={item.grams}
                      onChange={handleChangeGrams(index)}
                      className="w-20 px-2 py-1 border border-zinc-300 dark:border-zinc-700 rounded text-sm bg-transparent text-center"
                    />
                    <span className="text-xs text-zinc-500">g</span>
                    <button
                      onClick={() => handleRemoveFood(index)}
                      className="text-xs text-zinc-500 hover:text-red-500 px-2"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 분석 버튼 */}
        <div className="flex justify-center">
          <button
            onClick={handleAnalyze}
            disabled={selectedFoods.length === 0}
            className="px-8 py-3 bg-black dark:bg-white text-white dark:text-black rounded font-medium text-sm uppercase tracking-wider hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50"
          >
            영양 분석 실행
          </button>
        </div>

        {/* 분석 결과 영역 */}
        {hasAnalyzed && (
          <section className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 space-y-6">
            <h2 className="text-lg font-medium mb-2">분석 결과</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 요약 카드 */}
              <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
                <h3 className="text-sm font-semibold mb-3">총 섭취량</h3>
                <p className="text-3xl font-light mb-1">
                  {summary.totalCalories.toFixed(0)}{" "}
                  <span className="text-base text-zinc-500">kcal</span>
                </p>
                <p className="text-xs text-zinc-500">
                  총 {summary.totalGrams.toFixed(0)} g 기준
                </p>
              </div>

              {/* 탄단지 카드 */}
              <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
                <h3 className="text-sm font-semibold mb-3">
                  탄수화물 · 단백질 · 지방
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">탄수화물</span>
                    <span className="font-mono">
                      {summary.totalCarbs.toFixed(1)} g
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">단백질</span>
                    <span className="font-mono">
                      {summary.totalProtein.toFixed(1)} g
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">지방</span>
                    <span className="font-mono">
                      {summary.totalFat.toFixed(1)} g
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 그래프 + 부족/과다 리스트 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <NutritionChart stats={nutrientStats} />
              </div>

              <div className="space-y-4 text-xs">
                <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-3">
                  <h3 className="text-xs font-semibold mb-2">
                    부족한 영양소
                  </h3>
                  {shortageList.length === 0 ? (
                    <p className="text-zinc-500">
                      부족한 영양소가 거의 없어요. 👍
                    </p>
                  ) : (
                    <ul className="space-y-1">
                      {shortageList.map((s) => (
                        <li key={s.key}>
                          <span className="font-medium">{s.label}</span>
                          {": "}
                          <span className="text-red-500">
                            {Math.max(0, 100 - s.percent)}% 부족
                          </span>{" "}
                          (섭취 {s.intake.toFixed(1)} / 권장 {s.required})
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-3">
                  <h3 className="text-xs font-semibold mb-2">
                    과다 섭취
                  </h3>
                  {overList.length === 0 ? (
                    <p className="text-zinc-500">
                      과다 섭취된 영양소는 없어요.
                    </p>
                  ) : (
                    <ul className="space-y-1">
                      {overList.map((s) => (
                        <li key={s.key}>
                          <span className="font-medium">{s.label}</span>
                          {": "}
                          <span className="text-orange-500">
                            {s.percent - 100}% 과다
                          </span>{" "}
                          (섭취 {s.intake.toFixed(1)} / 권장 {s.required})
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>

            {/* 선택한 음식 목록 요약 */}
            <div className="mt-4">
              <h3 className="text-sm font-semibold mb-2">
                분석에 사용된 음식
              </h3>
              <ul className="text-xs text-zinc-500 space-y-1">
                {selectedFoods.map((item, idx) => (
                  <li key={idx}>
                    · {getFoodName(item.food)} — {item.grams} g 기준
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
