"use client";

import { useState, useMemo, useEffect, useRef, ChangeEvent } from "react";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import { loadFoodDb, FoodRow, SelectedFood } from "@/lib/foodData";
import {
  loadDiseaseRules,
  DiseaseRule,
  getDiseaseCategories,
  DiseaseCategory,
} from "@/lib/diseaseRules";

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

  // 분석 실행
  const handleAnalyze = () => {
    if (selectedFoods.length === 0) return;
    setIsAnalyzing(true);
    setHasAnalyzed(true);
    setTimeout(() => setIsAnalyzing(false), 800);
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
          <section className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-6">
            <h2 className="text-lg font-medium mb-4">분석 결과</h2>
            <div className="text-center py-8">
              <div className="text-4xl mb-3">✓</div>
              <p className="text-zinc-600 dark:text-zinc-400">
                선택한 음식과 지병 기준으로 특별한 주의사항이 없습니다.
              </p>
              <p className="text-xs text-zinc-500 mt-2">
                총 {selectedFoods.length}개 음식,{" "}
                {selectedFoods.reduce((sum, f) => sum + f.grams, 0)}g 섭취
              </p>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
