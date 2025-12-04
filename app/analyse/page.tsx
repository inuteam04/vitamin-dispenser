"use client";

import { useState, useMemo, useEffect, useRef, ChangeEvent } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { FoodRow, SelectedFood } from "@/lib/foodData";
import { useFoodSearch } from "@/lib/hooks/useFoodSearch";
import {
  loadDiseaseRules,
  DiseaseRule,
  getDiseaseCategories,
  DiseaseCategory,
} from "@/lib/diseaseRules";

import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { ref, get } from "firebase/database";
import { HamburgerMenu } from "@/components/HamburgerMenu";
import { useDeviceControl } from "@/lib/hooks/useDeviceControl";
import { useRealtimeData } from "@/lib/hooks/useRealtimeData";
import { SensorData } from "@/lib/types";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from "recharts";
import { withAuth } from "@/components/withAuth";
import { ErrorBoundary } from "@/components/ErrorBoundary";

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

// 음식 100g당 탄수화물(g)
function getCarbsPer100g(row: FoodRow): number {
  return getNumberField(row, [
    "carbs",
    "Carbs",
    "CARBS",
    "carbohydrate",
    "Carbohydrate",
    "CARBOHYDRATE",
    "탄수화물(g)",
    "탄수화물",
    "carb_g",
    "CHO_G",
  ]);
}

// 음식 100g당 단백질(g)
function getProteinPer100g(row: FoodRow): number {
  return getNumberField(row, [
    "protein",
    "Protein",
    "PROTEIN",
    "단백질(g)",
    "단백질",
    "protein_g",
    "PROT_G",
  ]);
}

// 음식 100g당 지방(g)
function getFatPer100g(row: FoodRow): number {
  return getNumberField(row, [
    "fat",
    "Fat",
    "FAT",
    "lipid",
    "Lipid",
    "지방(g)",
    "지방",
    "fat_g",
    "FAT_G",
  ]);
}

// 영양소 타입
type NutrientKey = "kcal" | "carb" | "protein" | "fat";
type Nutrition = Record<NutrientKey, number>;

interface NutrientStat {
  key: NutrientKey;
  label: string;
  required: number;
  intake: number;
  percent: number;
}

// RDA 기준 영양소 통계 생성
function buildNutrientStats(rda: Nutrition, intake: Nutrition): NutrientStat[] {
  const items: { key: NutrientKey; label: string }[] = [
    { key: "kcal", label: "열량" },
    { key: "carb", label: "탄수화물" },
    { key: "protein", label: "단백질" },
    { key: "fat", label: "지방" },
  ];

  return items.map(({ key, label }) => {
    const required = rda[key] ?? 0;
    const taken = intake[key] ?? 0;
    const percent = required > 0 ? Math.round((taken / required) * 100) : 0;
    return { key, label, required, intake: taken, percent };
  });
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
    const fallback = sex === "female" ? 1800 : sex === "male" ? 2200 : 2000;
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
    reason:
      "Mifflin-St Jeor 공식과 활동량을 이용해 계산한 예상 일일 필요 열량입니다.",
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
    totalCalories > 0 && recommended > 0 ? totalCalories / recommended : 1;

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
    (d) => d.includes("빈혈") || d.toLowerCase().includes("anemia")
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

    const count = 1;
    let reason = "일반적인 1일 권장량 기준 1정을 권장합니다.";

    if (
      ratio < 0.8 &&
      (name.includes("종합비타민") || name.includes("비타민"))
    ) {
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

    if (
      hasAnemia &&
      (name.includes("철분") || name.toLowerCase().includes("iron"))
    ) {
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

/**
 * 메인 대시보드 페이지
 * 인증된 사용자만 접근 가능
 */
function AnalysisPage() {
  return (
    <ErrorBoundary>
      <AnalysisContent />
    </ErrorBoundary>
  );
}

// 인증 보호 적용
export default withAuth(AnalysisPage);

function AnalysisContent() {
  // 음식 검색 (API 기반)
  const [query, setQuery] = useState("");
  const [selectedFoods, setSelectedFoods] = useState<SelectedFood[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // API 검색 훅 (점진적 캐싱 + 디바운스)
  const {
    foodRows: searchResults,
    isLoading: foodLoading,
    error: searchError,
  } = useFoodSearch(query, {
    debounceMs: 300,
    minChars: 1,
  });

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

  // 지병 섹션 접기/펼치기
  const [isDiseaseExpanded, setIsDiseaseExpanded] = useState(true);

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

  // 개별 약통 배출용 hook
  const { dispense, isExecuting, lastError } = useDeviceControl();
  const [singleDispenseMessage, setSingleDispenseMessage] = useState<
    string | null
  >(null);

  // 실시간 센서 데이터 (약 개수 확인용)
  const { data: sensorData } = useRealtimeData<SensorData>("sensors", {
    bottle1Count: 0,
    bottle2Count: 0,
    bottle3Count: 0,
    dht1: { temperature: 0, humidity: 0 },
    dht2: { temperature: 0, humidity: 0 },
    dht3: { temperature: 0, humidity: 0 },
    lastDispensed: 0,
    isDispensing: false,
    fanStatus: false,
    photoDetected: false,
    timestamp: 0,
  });

  // 약통별 남은 개수 가져오기
  const getBottleCount = (bottleId: 1 | 2 | 3): number => {
    if (!sensorData) return 0;
    switch (bottleId) {
      case 1:
        return sensorData.bottle1Count ?? 0;
      case 2:
        return sensorData.bottle2Count ?? 0;
      case 3:
        return sensorData.bottle3Count ?? 0;
    }
  };

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
        console.error(
          "Failed to load profile / pillConfig in analyse page",
          err
        );
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

  // 검색 결과 (API 훅에서 가져옴, 최대 20개)
  const filteredFoods = useMemo(() => {
    return searchResults.slice(0, 20);
  }, [searchResults]);

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
      // 숫자만 추출 후 앞의 0 제거
      const rawValue =
        e.target.value.replace(/\D/g, "").replace(/^0+/, "") || "0";
      const grams = Number(rawValue);

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

  // 음식 총 섭취 영양소
  const totalNutrition = useMemo(() => {
    let kcal = 0;
    let carbs = 0;
    let protein = 0;
    let fat = 0;

    selectedFoods.forEach((item) => {
      const g = item.grams || 0;
      const factor = g / 100;
      kcal += getFoodKcalPer100g(item.food) * factor;
      carbs += getCarbsPer100g(item.food) * factor;
      protein += getProteinPer100g(item.food) * factor;
      fat += getFatPer100g(item.food) * factor;
    });

    return {
      calories: Math.round(kcal),
      carbs: Math.round(carbs * 10) / 10,
      protein: Math.round(protein * 10) / 10,
      fat: Math.round(fat * 10) / 10,
    };
  }, [selectedFoods]);

  // 프로필 기반 권장 칼로리
  const calorieNeeds = useMemo(() => estimateCalorieNeeds(profile), [profile]);

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
          Math.round((totalNutrition.calories / calorieNeeds.recommended) * 100)
        )
      : null;

  // 권장량 (성인 기준 기본값, 프로필 기반 확장 가능)
  const userRda: Nutrition = useMemo(
    () => ({
      kcal: calorieNeeds.recommended ?? calorieNeeds.fallback ?? 2000,
      carb: 300,
      protein: 55,
      fat: 70,
    }),
    [calorieNeeds]
  );

  const intake: Nutrition = useMemo(
    () => ({
      kcal: totalNutrition.calories,
      carb: totalNutrition.carbs,
      protein: totalNutrition.protein,
      fat: totalNutrition.fat,
    }),
    [totalNutrition]
  );

  const nutrientStats = useMemo(
    () => buildNutrientStats(userRda, intake),
    [userRda, intake]
  );

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

  // 디스펜서 배출 요청 (권장량 기반 자동 배출)
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

      // pillRecommendations를 순회하면서 각각 dispense 호출
      const results: string[] = [];
      for (const rec of pillRecommendations) {
        if (rec.count > 0) {
          await dispense(rec.bottleId, rec.count);
          results.push(`${rec.pillName} ${rec.count}정`);
        }
      }

      if (results.length > 0) {
        setDispenseMessage(`배출 요청 완료: ${results.join(", ")}`);
      } else {
        setDispenseMessage("배출할 알약이 없습니다.");
      }
    } catch (err) {
      console.error("Failed to send dispense request", err);
      setDispenseError("디스펜서 요청 중 오류가 발생했습니다.");
    } finally {
      setIsDispensing(false);
    }
  };

  // 개별 약통 배출 요청 (useDeviceControl hook 사용)
  const handleSingleDispense = async (
    bottleId: 1 | 2 | 3,
    count: number,
    pillName: string
  ) => {
    setSingleDispenseMessage(null);

    if (!user) {
      setSingleDispenseMessage("로그인 후 사용 가능합니다.");
      return;
    }

    try {
      await dispense(bottleId, count);
      setSingleDispenseMessage(
        `${pillName} ${count}정 배출 요청 완료! (Bottle ${bottleId})`
      );
    } catch (err) {
      console.error("Failed to dispense:", err);
      setSingleDispenseMessage(
        `배출 실패: ${lastError?.message || "알 수 없는 오류"}`
      );
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
                프로필에 저장된 키·몸무게·활동량을 사용해 권장 열량과
                비교합니다.
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
            <HamburgerMenu />
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
            {isDropdownOpen && query.trim() && !foodLoading && (
              <div className="absolute z-10 mt-1 w-full max-h-60 overflow-auto border border-zinc-300 dark:border-zinc-700 rounded bg-white dark:bg-black shadow-lg">
                {filteredFoods.length > 0 ? (
                  filteredFoods.map((row, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleAddFood(row)}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800 last:border-b-0"
                    >
                      {getFoodName(row)}
                    </button>
                  ))
                ) : (
                  <p className="px-4 py-3 text-sm text-zinc-500">
                    &quot;{query}&quot;에 대한 검색 결과가 없습니다
                  </p>
                )}
              </div>
            )}
            {foodLoading && query.trim() && (
              <p className="text-xs text-zinc-500 mt-2">검색 중...</p>
            )}
            {searchError && (
              <p className="text-xs text-red-500 mt-2">
                검색 오류: {searchError}
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
                      type="text"
                      inputMode="numeric" // 모바일에서 숫자 키패드 표시
                      pattern="[0-9]*" // iOS 숫자 키패드
                      value={item.grams} // 0일 때 빈칸으로 표시
                      onChange={handleChangeGrams(index)}
                      onBlur={(e) => {
                        // 포커스 잃을 때 빈칸이면 0으로
                        if (e.target.value === "") {
                          setSelectedFoods((prev) =>
                            prev.map((food, i) =>
                              i === index ? { ...food, grams: 0 } : food
                            )
                          );
                        }
                      }}
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
        <section className="border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
          {/* 섹션 헤더 (접기/펼치기) */}
          <button
            type="button"
            onClick={() => setIsDiseaseExpanded(!isDiseaseExpanded)}
            className="w-full px-6 py-4 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <div>
              <h2 className="text-lg font-medium text-left">
                지병 선택 (선택사항)
              </h2>
              <p className="text-sm text-zinc-500 text-left mt-1">
                해당되는 질환이 있으면 선택하세요. 관련 주의사항을
                안내해드립니다.
              </p>
            </div>
            <div className="flex items-center gap-3">
              {selectedDiseases.length > 0 && (
                <span className="px-2 py-0.5 bg-black dark:bg-white text-white dark:text-black text-xs rounded-full">
                  {selectedDiseases.length}개 선택
                </span>
              )}
              <span
                className={`text-zinc-400 transition-transform ${
                  isDiseaseExpanded ? "rotate-180" : ""
                }`}
              >
                ▼
              </span>
            </div>
          </button>

          {/* 접히는 콘텐츠 */}
          {isDiseaseExpanded && (
            <div className="p-6 border-t border-zinc-200 dark:border-zinc-800">
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
            </div>
          )}

          {/* 접혀있을 때 선택된 질환 미리보기 */}
          {!isDiseaseExpanded && selectedDiseases.length > 0 && (
            <div className="px-6 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
              <div className="flex flex-wrap gap-2">
                {selectedDiseases.slice(0, 5).map((d) => (
                  <span
                    key={d}
                    className="px-2 py-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded text-xs"
                  >
                    {d}
                  </span>
                ))}
                {selectedDiseases.length > 5 && (
                  <span className="px-2 py-1 text-xs text-zinc-500">
                    +{selectedDiseases.length - 5}개 더
                  </span>
                )}
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
          <section className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 space-y-6">
            <h2 className="text-lg font-medium">분석 결과</h2>

            {/* 상단 요약 카드 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 text-center">
                <p className="text-xs text-zinc-500 mb-1">총 섭취량</p>
                <p className="text-2xl font-light">{totalGrams}</p>
                <p className="text-xs text-zinc-400">g</p>
              </div>
              <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 text-center">
                <p className="text-xs text-zinc-500 mb-1">열량</p>
                <p className="text-2xl font-light">{totalNutrition.calories}</p>
                <p className="text-xs text-zinc-400">kcal</p>
              </div>
              <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 text-center">
                <p className="text-xs text-zinc-500 mb-1">탄수화물</p>
                <p className="text-2xl font-light">{totalNutrition.carbs}</p>
                <p className="text-xs text-zinc-400">g</p>
              </div>
              <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 text-center">
                <p className="text-xs text-zinc-500 mb-1">단백질</p>
                <p className="text-2xl font-light">{totalNutrition.protein}</p>
                <p className="text-xs text-zinc-400">g</p>
              </div>
            </div>

            {/* 영양소 비율 그래프 */}
            <div
              className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 select-none outline-none focus:outline-none"
              tabIndex={-1}
            >
              <h3 className="text-sm font-semibold mb-1">
                권장량 대비 섭취 비율
              </h3>
              <p className="text-xs text-zinc-500 mb-4">
                100%가 권장량 충족입니다. 80% 미만은 부족, 120% 초과는 과다
                섭취입니다.
              </p>
              <div
                className="h-64 outline-none focus:outline-none"
                style={{ outline: "none" }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={nutrientStats}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
                    style={{ outline: "none" }}
                  >
                    <defs>
                      {/* 흰색 발광 효과용 필터 */}
                      <filter
                        id="glow-white"
                        x="-50%"
                        y="-50%"
                        width="200%"
                        height="200%"
                      >
                        <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                        <feFlood
                          floodColor="#ffffff"
                          floodOpacity="0.6"
                          result="glowColor"
                        />
                        <feComposite
                          in="glowColor"
                          in2="coloredBlur"
                          operator="in"
                          result="softGlow"
                        />
                        <feMerge>
                          <feMergeNode in="softGlow" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                    </defs>
                    <XAxis
                      type="number"
                      domain={[
                        0,
                        (dataMax: number) => Math.max(150, dataMax + 20),
                      ]}
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <YAxis
                      type="category"
                      dataKey="label"
                      tick={{ fontSize: 12 }}
                      width={60}
                    />
                    <Tooltip
                      cursor={false}
                      content={({ active, payload }) => {
                        if (!active || !payload || !payload[0]) return null;
                        const stat = payload[0].payload as NutrientStat;
                        return (
                          <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 shadow-lg">
                            <p className="text-sm font-medium text-black dark:text-white">
                              {stat.label}
                            </p>
                            <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-1">
                              {stat.intake} / {stat.required} ({stat.percent}%)
                            </p>
                          </div>
                        );
                      }}
                    />
                    <Bar
                      dataKey="percent"
                      radius={[0, 4, 4, 0]}
                      style={{ cursor: "default", outline: "none" }}
                    >
                      {nutrientStats.map((entry, index) => {
                        const color =
                          entry.percent < 80
                            ? "#10b981"
                            : entry.percent <= 120
                            ? "#f59e0b"
                            : "#ef4444";
                        return (
                          <Cell
                            key={`cell-${index}`}
                            fill={color}
                            style={{
                              outline: "none",
                              transition: "filter 0.2s ease",
                            }}
                            onMouseEnter={(e) => {
                              (e.target as SVGElement).style.filter =
                                "url(#glow-white)";
                            }}
                            onMouseLeave={(e) => {
                              (e.target as SVGElement).style.filter = "none";
                            }}
                          />
                        );
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {/* 범례 */}
              <div className="flex items-center justify-center gap-6 mt-4 text-xs text-zinc-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-emerald-500" />
                  부족 (&lt;80%)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-amber-500" />
                  적정 (80~120%)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-red-500" />
                  과다 (&gt;120%)
                </span>
              </div>
            </div>

            {/* 상세 영양 정보 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 부족한 영양소 */}
              <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  부족한 영양소
                </h3>
                {nutrientStats.filter((s) => s.percent < 80).length === 0 ? (
                  <p className="text-xs text-zinc-500">
                    모든 영양소가 충분합니다 👍
                  </p>
                ) : (
                  <ul className="space-y-2 text-xs">
                    {nutrientStats
                      .filter((s) => s.percent < 80)
                      .map((s) => (
                        <li
                          key={s.key}
                          className="flex justify-between items-center"
                        >
                          <span>{s.label}</span>
                          <span className="text-emerald-600 dark:text-emerald-400">
                            {100 - s.percent}% 부족
                          </span>
                        </li>
                      ))}
                  </ul>
                )}
              </div>

              {/* 과다 섭취 */}
              <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  과다 섭취
                </h3>
                {nutrientStats.filter((s) => s.percent > 120).length === 0 ? (
                  <p className="text-xs text-zinc-500">
                    과다 섭취된 영양소가 없습니다
                  </p>
                ) : (
                  <ul className="space-y-2 text-xs">
                    {nutrientStats
                      .filter((s) => s.percent > 120)
                      .map((s) => (
                        <li
                          key={s.key}
                          className="flex justify-between items-center"
                        >
                          <span>{s.label}</span>
                          <span className="text-red-600 dark:text-red-400">
                            {s.percent - 100}% 초과
                          </span>
                        </li>
                      ))}
                  </ul>
                )}
              </div>
            </div>

            {/* 권장 열량 비교 */}
            <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 bg-zinc-50/60 dark:bg-zinc-900/40">
              <h3 className="text-sm font-semibold mb-3">
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
                    </div>
                  )}
                </>
              )}
            </div>

            {/* 권장 알약 섭취 + 디스펜서 배출 */}
            <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 bg-zinc-50/50 dark:bg-zinc-900/40 space-y-3">
              <h3 className="text-sm font-semibold mb-3">
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
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {pillRecommendations.map((rec) => {
                      const remainingCount = getBottleCount(rec.bottleId);
                      const isLow = remainingCount < 5;
                      const isEmpty = remainingCount < rec.count;
                      const canDispense = !isEmpty && !isExecuting && user;

                      return (
                        <div
                          key={rec.bottleId}
                          className={`rounded-lg p-4 flex flex-col transition-all ${
                            isEmpty
                              ? "border-2 border-red-300 dark:border-red-500/50 bg-red-50/50 dark:bg-red-950/20"
                              : isLow
                              ? "border-2 border-yellow-300 dark:border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-950/20"
                              : "border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/30"
                          }`}
                        >
                          {/* 상단: Bottle 번호 + 남은 개수 */}
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                                  isEmpty
                                    ? "bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400"
                                    : isLow
                                    ? "bg-yellow-100 dark:bg-yellow-900/50 text-yellow-600 dark:text-yellow-400"
                                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                                }`}
                              >
                                {rec.bottleId}
                              </div>
                              <div>
                                <span className="text-xs text-zinc-500 block">
                                  Bottle {rec.bottleId}
                                </span>
                                <span
                                  className={`text-xs font-medium ${
                                    isEmpty
                                      ? "text-red-500 dark:text-red-400"
                                      : isLow
                                      ? "text-yellow-600 dark:text-yellow-400"
                                      : "text-zinc-600 dark:text-zinc-400"
                                  }`}
                                >
                                  {isEmpty
                                    ? "⚠ 재고 부족"
                                    : isLow
                                    ? "잔여 적음"
                                    : "정상"}
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              <div
                                className={`text-lg font-semibold ${
                                  isEmpty
                                    ? "text-red-600 dark:text-red-400"
                                    : isLow
                                    ? "text-yellow-600 dark:text-yellow-400"
                                    : "text-black dark:text-white"
                                }`}
                              >
                                {remainingCount}
                              </div>
                              <div className="text-[10px] text-zinc-400">
                                / 18 pills
                              </div>
                            </div>
                          </div>

                          {/* 프로그레스 바 */}
                          <div className="w-full h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden mb-3">
                            <div
                              className={`h-full rounded-full transition-all ${
                                isEmpty
                                  ? "bg-red-500"
                                  : isLow
                                  ? "bg-yellow-500"
                                  : "bg-emerald-500"
                              }`}
                              style={{
                                width: `${(remainingCount / 18) * 100}%`,
                              }}
                            />
                          </div>

                          {/* 약 이름 + 권장량 */}
                          <div className="flex items-center justify-between mb-2">
                            <p className="font-medium text-sm">
                              {rec.pillName}
                            </p>
                            <span className="px-2 py-0.5 bg-black dark:bg-white text-white dark:text-black text-xs rounded-full">
                              {rec.count}정
                            </span>
                          </div>

                          {/* 추천 이유 */}
                          <p className="text-[11px] text-zinc-500 leading-relaxed mb-3 flex-1">
                            {rec.reason}
                          </p>

                          {/* 배출 버튼 */}
                          <button
                            onClick={() =>
                              handleSingleDispense(
                                rec.bottleId,
                                rec.count,
                                rec.pillName
                              )
                            }
                            disabled={!canDispense}
                            className={`w-full px-3 py-2.5 rounded text-xs font-medium transition-colors mt-auto ${
                              isEmpty
                                ? "bg-red-100 dark:bg-red-900/30 text-red-500 dark:text-red-400 cursor-not-allowed"
                                : canDispense
                                ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black hover:bg-zinc-700 dark:hover:bg-zinc-300"
                                : "bg-zinc-200 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed"
                            }`}
                          >
                            {isExecuting
                              ? "배출 중..."
                              : isEmpty
                              ? `재고 부족 (${remainingCount}개 남음)`
                              : `${rec.count}정 배출하기`}
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {/* 개별 배출 메시지 */}
                  {singleDispenseMessage && (
                    <p
                      className={`text-xs mt-3 text-center ${
                        singleDispenseMessage.includes("실패")
                          ? "text-red-500"
                          : "text-emerald-500"
                      }`}
                    >
                      {singleDispenseMessage}
                    </p>
                  )}

                  {/* 디스펜서 배출 버튼 */}
                  <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                    <button
                      onClick={handleDispense}
                      disabled={
                        isDispensing ||
                        pillRecommendations.length === 0 ||
                        !user
                      }
                      className="w-full px-4 py-3 bg-black dark:bg-white text-white dark:text-black rounded-lg text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50"
                    >
                      {isDispensing
                        ? "디스펜서로 전송 중..."
                        : "권장량대로 디스펜서에 배출 요청"}
                    </button>
                    {dispenseMessage && (
                      <p className="text-xs text-emerald-500 mt-2 text-center">
                        {dispenseMessage}
                      </p>
                    )}
                    {dispenseError && (
                      <p className="text-xs text-red-500 mt-2 text-center">
                        {dispenseError}
                      </p>
                    )}
                  </div>
                </>
              )}
              <p className="text-[11px] text-zinc-500 mt-2">
                ※ 이 추천은 참고용이며, 실제 복용량·복용 여부는 반드시
                의사/약사와 상의하세요.
              </p>
            </div>

            {/* 분석에 사용된 음식 */}
            <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-4">
              <h3 className="text-sm font-semibold mb-3">분석에 사용된 음식</h3>
              <div className="flex flex-wrap gap-2">
                {selectedFoods.map((item, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full text-xs"
                  >
                    {getFoodName(item.food)} · {item.grams}g
                  </span>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
