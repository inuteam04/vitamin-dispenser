"use client";

import {
  useState,
  useMemo,
  useEffect,
  useRef,
  ChangeEvent,
} from "react";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import { loadFoodDb, FoodRow, SelectedFood } from "@/lib/foodData";
import {
  loadDiseaseRules,
  DiseaseRule,
  getDiseaseCategories,
  DiseaseCategory,
} from "@/lib/diseaseRules";

import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { ref, get, set } from "firebase/database";

// ===== 타입 정의 (프로필용) =====
type Sex = "male" | "female" | "other" | "";
type ActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "active"
  | "very_active"
  | "";

type UserProfile = {
  name?: string;
  age?: number | null;
  sex?: Sex;
  heightCm?: number | null;
  weightKg?: number | null;
  activityLevel?: ActivityLevel;
  diseases?: string[];
};

// 약통 설정 타입
type PillConfig = {
  bottle1?: string;
  bottle2?: string;
  bottle3?: string;
};

// 권장 알약 구조
type PillRecommendation = {
  bottleId: 1 | 2 | 3;
  pillName: string;
  count: number;
  reason: string;
};

// 음식 이름 추출 헬퍼
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

// 숫자 필드 안전하게 꺼내기
function getNumberField(row: FoodRow, keys: string[]): number {
  const anyRow = row as Record<string, unknown>;
  for (const key of keys) {
    const v = anyRow[key];
    if (typeof v === "number" && !Number.isNaN(v)) return v;
    if (typeof v === "string") {
      const n = Number(v.replace(/,/g, ""));
      if (!Number.isNaN(n)) return n;
    }
  }
  return 0;
}

// 음식 100g 당 열량(kcal)
function getFoodKcalPer100g(row: FoodRow): number {
  return getNumberField(row, [
    "ENERGY_KCAL",
    "energy_kcal",
    "KCAL",
    "kcal",
    "열량",
    "열량(kcal)",
    "에너지(kcal)",
    "ENERGY",
  ]);
}

// 프로필 기반 권장 칼로리 계산
function estimateCalorieNeeds(profile: UserProfile | null) {
  if (!profile) {
    return {
      recommended: null,
      bmr: null,
      activityFactor: null,
      reason: "프로필이 없어 기본값을 사용합니다.",
      fallback: 2000,
    };
  }

  const { age, sex, heightCm, weightKg, activityLevel } = profile;

  const activityMap: Record<ActivityLevel | "", number> = {
    "": 1.2,
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
  };
  const factor = activityMap[activityLevel ?? ""] ?? 1.2;

  if (!age || !heightCm || !weightKg || !sex) {
    const fallback =
      sex === "female"
        ? 1800
        : sex === "male"
        ? 2200
        : 2000;
    return {
      recommended: fallback,
      bmr: null,
      activityFactor: factor,
      reason: "키/몸무게/나이 정보가 부족해 성별 기준 평균값으로 계산했습니다.",
      fallback,
    };
  }

  const base =
    10 * weightKg +
    6.25 * heightCm -
    5 * age +
    (sex === "male" ? 5 : sex === "female" ? -161 : 0);

  const bmr = base;
  const tdee = Math.round(bmr * factor);

  return {
    recommended: tdee,
    bmr: Math.round(bmr),
    activityFactor: factor,
    reason: "Mifflin-St Jeor 공식과 활동량을 이용해 계산한 예상 일일 필요 열량입니다.",
    fallback: null,
  };
}

// 지병 + 식사량 → 알약 추천 간단 로직
function computePillRecommendations(
  totalCalories: number,
  calorieNeeds: ReturnType<typeof estimateCalorieNeeds>,
  selectedDiseases: string[],
  pillConfig: PillConfig | null
): PillRecommendation[] {
  if (!pillConfig) return [];

  const recs: PillRecommendation[] = [];

  const recommended = calorieNeeds.recommended ?? calorieNeeds.fallback ?? 2000;
  const ratio =
    totalCalories > 0 && recommended > 0
      ? totalCalories / recommended
      : 1;

  const hasHeartIssue = selectedDiseases.some(
    (d) =>
      d.includes("심혈관") ||
      d.includes("고지혈") ||
      d.toLowerCase().includes("cardio")
  );
  const hasBoneIssue = selectedDiseases.some(
    (d) =>
      d.includes("골다공") ||
      d.includes("뼈") ||
      d.toLowerCase().includes("osteo")
  );
  const hasAnemia = selectedDiseases.some(
    (d) =>
      d.includes("빈혈") ||
      d.toLowerCase().includes("anemia")
  );

  const addRec = (
    bottleId: 1 | 2 | 3,
    pillName: string,
    count: number,
    reason: string
  ) => {
    if (!pillName) return;
    recs.push({ bottleId, pillName, count, reason });
  };

  const bottleNames: { id: 1 | 2 | 3; name?: string }[] = [
    { id: 1, name: pillConfig.bottle1 },
    { id: 2, name: pillConfig.bottle2 },
    { id: 3, name: pillConfig.bottle3 },
  ];

  bottleNames.forEach(({ id, name }) => {
    if (!name) return;

    let count = 1;
    let reason = "일반적인 1일 권장량 기준 1정을 권장합니다.";

    if (ratio < 0.8 && (name.includes("종합비타민") || name.includes("비타민"))) {
      reason =
        "오늘 전체 섭취 열량이 권장량보다 적어, 부족한 영양 보충을 위해 1정을 권장합니다.";
    }

    if (hasHeartIssue && name.includes("오메가")) {
      reason =
        "심혈관 건강 관련 질환이 선택되어 있어, 오메가3 1정을 보조용으로 권장합니다.";
    }

    if (hasBoneIssue && name.includes("비타민 D")) {
      reason =
        "뼈 건강 관련 질환이 선택되어 있어, 비타민 D 1정을 보조용으로 권장합니다.";
    }

    if (hasAnemia && (name.includes("철분") || name.toLowerCase().includes("iron"))) {
      reason =
        "빈혈 관련 질환이 선택되어 있어, 철분 1정을 보조용으로 권장합니다.";
    }

    if (ratio > 1.2) {
      reason +=
        " (※ 오늘 섭취 열량이 권장량보다 높은 편이라, 추가 영양제 섭취는 과하지 않도록 주의하세요.)";
    }

    addRec(id, name, count, reason);
  });

  return recs;
}

export default function AnalysisPage() {
  // 음식 DB
  const [foodDb, setFoodDb] = useState<FoodRow[]>([]);
  const [foodLoading, setFoodLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selectedFoods, setSelectedFoods] = useState<SelectedFood[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 지병 데이터
  const [diseaseRules, setDiseaseRules] = useState<DiseaseRule[]>([]);
  const [diseaseLoading, setDiseaseLoading] = useState(true);
  const [selectedDiseases, setSelectedDiseases] = useState<string[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set()
  );

  // 분석 상태
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);

  // 유저 & 프로필
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  // 약통 설정
  const [pillConfig, setPillConfig] = useState<PillConfig | null>(null);
  const [pillLoading, setPillLoading] = useState(true);

  // 디스펜서 요청 상태
  const [isDispensing, setIsDispensing] = useState(false);
  const [dispenseMessage, setDispenseMessage] = useState<string | null>(null);
  const [dispenseError, setDispenseError] = useState<string | null>(null);

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

  // 드롭다운 외부 클릭 감지
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
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // 지병 데이터 로드
  useEffect(() => {
    const run = async () => {
      try {
        const rules = await loadDiseaseRules();
        setDiseaseRules(rules);
      } catch (err) {
        console.error(err);
      } finally {
        setDiseaseLoading(false);
      }
    };
    run();
  }, []);

  // 로그인/프로필 + 약통 설정 로드
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (!firebaseUser) {
        setProfile(null);
        setProfileLoading(false);
        setPillConfig(null);
        setPillLoading(false);
        return;
      }
      try {
        setProfileLoading(true);
        setPillLoading(true);

        const snap = await get(ref(db, `users/${firebaseUser.uid}/profile`));
        if (snap.exists()) {
          const data = snap.val() as UserProfile;
          setProfile(data);
        } else {
          setProfile(null);
        }

        const pillSnap = await get(
          ref(db, `users/${firebaseUser.uid}/pillConfig`)
        );
        if (pillSnap.exists()) {
          const pc = pillSnap.val() as PillConfig;
          setPillConfig({
            bottle1: pc.bottle1 ?? "",
            bottle2: pc.bottle2 ?? "",
            bottle3: pc.bottle3 ?? "",
          });
        } else {
          setPillConfig(null);
        }
      } catch (err) {
        console.error("Failed to load profile / pillConfig in analyse page", err);
        setProfile(null);
        setPillConfig(null);
      } finally {
        setProfileLoading(false);
        setPillLoading(false);
      }
    });

    return () => unsub();
  }, []);

  // 지병 옵션 추출
  const diseaseOptions = useMemo(() => {
    const set = new Set<string>();
    diseaseRules.forEach((r) => {
      const name = r.label || r.value;
      if (name) set.add(name);
    });
    return Array.from(set).sort();
  }, [diseaseRules]);

  // 질환 카테고리 그룹화
  const diseaseCategories = useMemo(() => {
    return getDiseaseCategories(diseaseOptions);
  }, [diseaseOptions]);

  // 카테고리 토글
  const toggleCategory = (categoryName: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryName)) {
        next.delete(categoryName);
      } else {
        next.add(categoryName);
      }
      return next;
    });
  };

  // 카테고리별 선택 개수
  const getCategorySelectedCount = (category: DiseaseCategory) => {
    return category.diseases.filter((d) => selectedDiseases.includes(d)).length;
  };

  // 음식 검색 필터
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
  };

  // 섭취량 변경
  const handleChangeGrams =
    (index: number) => (e: ChangeEvent<HTMLInputElement>) => {
      const grams = Number(e.target.value) || 0;
      setSelectedFoods((prev) =>
        prev.map((item, i) => (i === index ? { ...item, grams } : item))
      );
    };

  // 음식 제거
  const handleRemoveFood = (index: number) => {
    setSelectedFoods((prev) => prev.filter((_, i) => i !== index));
  };

  // 지병 토글
  const toggleDisease = (disease: string) => {
    setSelectedDiseases((prev) =>
      prev.includes(disease)
        ? prev.filter((d) => d !== disease)
        : [...prev, disease]
    );
  };

  // 음식 총 섭취 열량
  const totalNutrition = useMemo(() => {
    let kcal = 0;

    selectedFoods.forEach((item) => {
      const per100 = getFoodKcalPer100g(item.food);
      const g = item.grams || 0;
      kcal += (per100 * g) / 100;
    });

    return {
      calories: Math.round(kcal),
    };
  }, [selectedFoods]);

  // 프로필 기반 권장 칼로리
  const calorieNeeds = useMemo(
    () => estimateCalorieNeeds(profile),
    [profile]
  );

  // 분석 실행
  const handleAnalyze = () => {
    if (selectedFoods.length === 0) return;
    setIsAnalyzing(true);
    setHasAnalyzed(true);
    setTimeout(() => setIsAnalyzing(false), 800);
  };

  const totalGrams = useMemo(
    () => selectedFoods.reduce((sum, f) => sum + f.grams, 0),
    [selectedFoods]
  );

  const calorieRatio =
    calorieNeeds.recommended && totalNutrition.calories > 0
      ? Math.min(
          999,
          Math.round(
            (totalNutrition.calories / calorieNeeds.recommended) * 100
          )
        )
      : null;

  // 알약 추천 계산
  const pillRecommendations = useMemo(
    () =>
      computePillRecommendations(
        totalNutrition.calories,
        calorieNeeds,
        selectedDiseases,
        pillConfig
      ),
    [totalNutrition.calories, calorieNeeds, selectedDiseases, pillConfig]
  );

  // 디스펜서 배출 요청
  const handleDispense = async () => {
    setDispenseMessage(null);
    setDispenseError(null);

    if (!user) {
      setDispenseError("로그인 후 사용 가능합니다.");
      return;
    }
    if (!pillConfig || pillRecommendations.length === 0) {
      setDispenseError("권장 알약 정보가 없습니다.");
      return;
    }

    try {
      setIsDispensing(true);

      const ts = Date.now();
      const commandRef = ref(
        db,
        `devices/${user.uid}/dispenseRequests/${ts}`
      );

      await set(commandRef, {
        createdAt: ts,
        status: "pending",
        totalCalories: totalNutrition.calories,
        recommendedCalories:
          calorieNeeds.recommended ?? calorieNeeds.fallback ?? 2000,
        selectedDiseases,
        items: pillRecommendations.map((r) => ({
          bottleId: r.bottleId,
          pillName: r.pillName,
          count: r.count,
        })),
      });

      setDispenseMessage("디스펜서에 알약 배출 요청을 전송했습니다.");
    } catch (err) {
      console.error("Failed to send dispense request", err);
      setDispenseError("디스펜서 요청 중 오류가 발생했습니다.");
    } finally {
      setIsDispensing(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white">
      {/* 헤더 */}
      <header className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-5xl mx-auto px-6 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-light tracking-tight">영양 분석</h1>
            <p className="text-zinc-500 text-sm mt-1">
              오늘 먹은 음식을 입력하고 영양 상태를 분석하세요
            </p>
            {user && !profileLoading && (
              <p className="text-xs text-zinc-400 mt-1">
                프로필에 저장된 키·몸무게·활동량을 사용해 권장 열량과 비교합니다.
              </p>
            )}
            {!user && (
              <p className="text-xs text-zinc-400 mt-1">
                로그인 후 프로필에 키·몸무게를 입력하면 더 정확한 분석이
                가능합니다.
              </p>
            )}
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="text-sm text-zinc-500 hover:text-black dark:hover:text-white transition-colors"
            >
              ← Dashboard
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {/* 음식 검색 섹션 */}
        <section className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-6">
          <h2 className="text-lg font-medium mb-4">오늘 먹은 음식</h2>

          {/* 검색창 */}
          <div className="relative mb-4" ref={dropdownRef}>
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setIsDropdownOpen(true);
              }}
              onFocus={() => setIsDropdownOpen(true)}
              placeholder="음식명 검색 (예: 김치찌개, 삼겹살)"
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
              위 검색창에서 음식을 검색하고 추가하세요
            </p>
          ) : (
            <div className="space-y-2">
              {selectedFoods.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between gap-4 p-3 border border-zinc-200 dark:border-zinc-800 rounded"
                >
                  <span className="text-sm font-medium flex-1">
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

        {/* 지병 선택 섹션 */}
        <section className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-6">
          <h2 className="text-lg font-medium mb-4">지병 선택 (선택사항)</h2>
          <p className="text-sm text-zinc-500 mb-4">
            해당되는 질환이 있으면 선택하세요. 관련 주의사항을 안내해드립니다.
          </p>

          {diseaseLoading ? (
            <p className="text-sm text-zinc-500">지병 목록 로딩 중...</p>
          ) : diseaseCategories.length === 0 ? (
            <p className="text-sm text-zinc-500">지병 데이터가 없습니다.</p>
          ) : (
            <div className="space-y-3">
              {diseaseCategories.map((category) => {
                const isExpanded = expandedCategories.has(category.name);
                const selectedCount = getCategorySelectedCount(category);

                return (
                  <div
                    key={category.name}
                    className="border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden"
                  >
                    {/* 카테고리 헤더 */}
                    <button
                      type="button"
                      onClick={() => toggleCategory(category.name)}
                      className="w-full px-4 py-3 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{category.icon}</span>
                        <span className="font-medium text-sm">
                          {category.name}
                        </span>
                        <span className="text-xs text-zinc-500">
                          ({category.diseases.length}개)
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        {selectedCount > 0 && (
                          <span className="px-2 py-0.5 bg-black dark:bg-white text-white dark:text-black text-xs rounded-full">
                            {selectedCount}개 선택
                          </span>
                        )}
                        <span
                          className={`text-zinc-400 transition-transform ${
                            isExpanded ? "rotate-180" : ""
                          }`}
                        >
                          ▼
                        </span>
                      </div>
                    </button>

                    {/* 질환 목록 */}
                    {isExpanded && (
                      <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-2 border-t border-zinc-200 dark:border-zinc-800">
                        {category.diseases.map((name) => (
                          <label
                            key={name}
                            className={`flex items-center gap-2 text-sm cursor-pointer p-2 rounded transition-colors ${
                              selectedDiseases.includes(name)
                                ? "bg-zinc-100 dark:bg-zinc-800"
                                : "hover:bg-zinc-50 dark:hover:bg-zinc-900"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={selectedDiseases.includes(name)}
                              onChange={() => toggleDisease(name)}
                              className="w-4 h-4 accent-black dark:accent-white"
                            />
                            <span>{name}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* 선택된 질환 표시 */}
          {selectedDiseases.length > 0 && (
            <div className="mt-4 p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
              <p className="text-xs text-zinc-500 mb-2">선택된 질환:</p>
              <div className="flex flex-wrap gap-2">
                {selectedDiseases.map((d) => (
                  <span
                    key={d}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded text-xs"
                  >
                    {d}
                    <button
                      type="button"
                      onClick={() => toggleDisease(d)}
                      className="text-zinc-400 hover:text-red-500 ml-1"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* 분석 버튼 */}
        <div className="flex justify-center">
          <button
            onClick={handleAnalyze}
            disabled={selectedFoods.length === 0 || isAnalyzing}
            className="px-8 py-3 bg-black dark:bg-white text-white dark:text-black rounded font-medium text-sm uppercase tracking-wider hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50"
          >
            {isAnalyzing ? "분석 중..." : "영양 분석 시작"}
          </button>
        </div>

        {/* 분석 결과 */}
        {hasAnalyzed && !isAnalyzing && (
          <section className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 space-y-4">
            <h2 className="text-lg font-medium mb-2">분석 결과</h2>

            {/* 상단 요약 */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="text-3xl md:text-4xl">✓</div>
                <div>
                  <p className="text-zinc-600 dark:text-zinc-300 text-sm">
                    선택한 음식 기준으로{" "}
                    <span className="font-semibold">
                      총 {totalGrams}g,{" "}
                      {totalNutrition.calories > 0
                        ? `${totalNutrition.calories} kcal`
                        : "열량 정보 없음"}
                    </span>{" "}
                    을 섭취했습니다.
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">
                    지병과 알레르기 정보는 참고용이며, 실제 진단이나 처방을
                    대체하지 않습니다.
                  </p>
                </div>
              </div>
            </div>

            {/* 권장 섭취량 비교 */}
            <div className="mt-2 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 bg-zinc-50/60 dark:bg-zinc-900/40">
              <h3 className="text-sm font-semibold mb-2">
                일일 권장 열량과 비교
              </h3>

              {profileLoading ? (
                <p className="text-xs text-zinc-500">
                  프로필 정보를 불러오는 중입니다...
                </p>
              ) : (
                <>
                  <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-3">
                    <div className="space-y-1">
                      <p className="text-xs text-zinc-500">
                        예상 필요 열량 (프로필 기준)
                      </p>
                      <p className="text-lg font-semibold">
                        {calorieNeeds.recommended
                          ? `${calorieNeeds.recommended} kcal/일`
                          : `${calorieNeeds.fallback ?? 2000} kcal/일 (기본값)`}
                      </p>
                      <p className="text-[11px] text-zinc-500">
                        {calorieNeeds.reason}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-zinc-500">
                        오늘 입력된 섭취 열량
                      </p>
                      <p className="text-lg font-semibold">
                        {totalNutrition.calories > 0
                          ? `${totalNutrition.calories} kcal`
                          : "열량 데이터가 없는 음식 위주입니다."}
                      </p>
                    </div>
                  </div>

                  {calorieRatio !== null && (
                    <div className="mt-2">
                      <div className="flex justify-between text-xs text-zinc-500 mb-1">
                        <span>권장 섭취량 대비</span>
                        <span>{calorieRatio}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                        <div
                          className={`h-2 rounded-full ${
                            calorieRatio < 80
                              ? "bg-emerald-500"
                              : calorieRatio <= 120
                              ? "bg-yellow-500"
                              : "bg-red-500"
                          }`}
                          style={{
                            width: `${Math.min(calorieRatio, 130)}%`,
                          }}
                        />
                      </div>
                      <p className="mt-1 text-[11px] text-zinc-500">
                        80% 미만: 다소 적음 / 80~120%: 적정 / 120% 초과:
                        과잉 섭취 가능성
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* 권장 알약 섭취 + 디스펜서 배출 */}
            <div className="mt-4 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 bg-zinc-50/50 dark:bg-zinc-900/40 space-y-3">
              <h3 className="text-sm font-semibold mb-1">
                오늘 식사 기준 권장 알약 섭취
              </h3>

              {pillLoading ? (
                <p className="text-xs text-zinc-500">
                  약 정보 설정을 불러오는 중입니다...
                </p>
              ) : !pillConfig ||
                (!pillConfig.bottle1 &&
                  !pillConfig.bottle2 &&
                  !pillConfig.bottle3) ? (
                <p className="text-xs text-zinc-500">
                  아직 약 정보가 설정되지 않았습니다. 상단 메뉴에서{" "}
                  <span className="font-semibold">약 정보 설정</span> 페이지로
                  이동해 Bottle 별 약 종류를 먼저 지정해 주세요.
                </p>
              ) : pillRecommendations.length === 0 ? (
                <p className="text-xs text-zinc-500">
                  선택한 질환과 식사량 기준으로 특별히 강조되는 알약은 없습니다.
                  기본 복용 계획에 따라 섭취하시고, 필요 시 전문가와 상의하세요.
                </p>
              ) : (
                <>
                  <div className="space-y-2">
                    {pillRecommendations.map((rec) => (
                      <div
                        key={rec.bottleId}
                        className="border border-zinc-200 dark:border-zinc-800 rounded-md px-3 py-2 text-xs"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold">
                            Bottle {rec.bottleId} — {rec.pillName}
                          </span>
                          <span className="text-[11px] text-zinc-500">
                            권장: {rec.count}정
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-500">
                          {rec.reason}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* 디스펜서 배출 버튼 */}
                  <div className="mt-3 flex flex-col gap-2">
                    <button
                      onClick={handleDispense}
                      disabled={
                        isDispensing ||
                        pillRecommendations.length === 0 ||
                        !user
                      }
                      className="w-full md:w-auto px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded text-xs font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50"
                    >
                      {isDispensing
                        ? "디스펜서로 전송 중..."
                        : "위 권장량대로 디스펜서에 배출 요청 보내기"}
                    </button>
                    {dispenseMessage && (
                      <p className="text-[11px] text-emerald-500">
                        {dispenseMessage}
                      </p>
                    )}
                    {dispenseError && (
                      <p className="text-[11px] text-red-500">
                        {dispenseError}
                      </p>
                    )}
                    <p className="text-[11px] text-zinc-500">
                      ESP32 쪽에서는 Firebase 경로{" "}
                      <code className="px-1 py-0.5 rounded bg-zinc-900/60 text-[10px]">
                        devices/&lt;uid&gt;/dispenseRequests/&lt;timestamp&gt;
                      </code>{" "}
                      를 구독해서, <code>items</code>에 있는{" "}
                      <code>bottleId</code>, <code>count</code>대로 모터를
                      돌리면 됩니다.
                    </p>
                  </div>
                </>
              )}
              <p className="text-[11px] text-zinc-500 mt-1">
                ※ 이 추천은 참고용이며, 실제 복용량·복용 여부는 반드시 의사/약사와
                상의하는 것을 권장합니다.
              </p>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
