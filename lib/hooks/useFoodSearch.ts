// lib/hooks/useFoodSearch.ts
// 음식 검색 훅 (점진적 캐싱 + 디바운스)

import { useState, useEffect, useRef, useCallback } from "react";
import {
  FoodNutritionData,
  searchFoodWithCache,
  clearFoodCache,
} from "../foodApi";
import { FoodRow } from "../foodData";
import { toFoodRow } from "../foodApi";

type UseFoodSearchOptions = {
  debounceMs?: number; // 디바운스 시간 (기본 300ms)
  minChars?: number; // 최소 검색 글자 수 (기본 1)
};

type UseFoodSearchReturn = {
  results: FoodNutritionData[]; // API 원본 결과
  foodRows: FoodRow[]; // FoodRow로 변환된 결과
  isLoading: boolean;
  error: string | null;
  search: (query: string) => void; // 수동 검색
  clearCache: () => void; // 캐시 초기화
};

export function useFoodSearch(
  query: string,
  options: UseFoodSearchOptions = {}
): UseFoodSearchReturn {
  const { debounceMs = 300, minChars = 1 } = options;

  const [results, setResults] = useState<FoodNutritionData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 최신 요청 추적 (이전 요청 무시용)
  const latestQueryRef = useRef<string>("");
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 검색 실행
  const executeSearch = useCallback(
    async (searchQuery: string) => {
      const q = searchQuery.trim();
      latestQueryRef.current = q;

      // 최소 글자 미만
      if (q.length < minChars) {
        setResults([]);
        setIsLoading(false);
        setError(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const data = await searchFoodWithCache(q, minChars);

        // 최신 요청인지 확인
        if (latestQueryRef.current === q) {
          setResults(data);
        }
      } catch (err) {
        if (latestQueryRef.current === q) {
          setError(err instanceof Error ? err.message : "검색 오류");
          setResults([]);
        }
      } finally {
        if (latestQueryRef.current === q) {
          setIsLoading(false);
        }
      }
    },
    [minChars]
  );

  // 디바운스된 검색
  useEffect(() => {
    // 이전 타이머 취소
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // 빈 쿼리면 즉시 초기화
    if (!query.trim()) {
      setResults([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    // 디바운스 타이머 설정
    debounceTimerRef.current = setTimeout(() => {
      executeSearch(query);
    }, debounceMs);

    // 클린업
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query, debounceMs, executeSearch]);

  // 수동 검색 (디바운스 없이 즉시)
  const search = useCallback(
    (q: string) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      executeSearch(q);
    },
    [executeSearch]
  );

  // FoodRow로 변환
  const foodRows = results.map(toFoodRow);

  return {
    results,
    foodRows,
    isLoading,
    error,
    search,
    clearCache: clearFoodCache,
  };
}
