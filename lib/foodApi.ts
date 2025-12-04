// lib/foodApi.ts
// 공공데이터 포털 음식 영양정보 API + 점진적 캐싱 전략

// ============== API 타입 ==============

export interface FoodApiRequestParams {
  serviceKey: string;
  foodNm: string;
}

export interface FoodNutritionData {
  // 식품 기본 정보
  foodNm?: string;
  nutConSrtrQua?: string | number; // 영양성분함량기준량
  enerc?: string | number; // 에너지(kcal)
  water?: string | number; // 수분(g)
  prot?: string | number; // 단백질(g)
  fatce?: string | number; // 지방(g)
  ash?: string | number; // 회분(g)
  chocdf?: string | number; // 탄수화물(g)
  sugar?: string | number; // 당류(g)
  fibtg?: string | number; // 식이섬유(g)

  // 무기질
  ca?: string | number; // 칼슘(mg)
  fe?: string | number; // 철(mg)
  p?: string | number; // 인(mg)
  k?: string | number; // 칼륨(mg)
  nat?: string | number; // 나트륨(mg)

  // 비타민
  vitaRae?: string | number; // 비타민 A(μg RAE)
  retol?: string | number; // 레티놀(μg)
  cartb?: string | number; // 베타카로틴(μg)
  thia?: string | number; // 티아민(mg)
  ribf?: string | number; // 리보플라빈(mg)
  nia?: string | number; // 니아신(mg)
  vitc?: string | number; // 비타민 C(mg)
  vitd?: string | number; // 비타민 D(μg)

  // 지질
  chole?: string | number; // 콜레스테롤(mg)
  fasat?: string | number; // 포화지방산(g)
  fatrn?: string | number; // 트랜스지방산(g)
}

// ============== 캐시 ==============

type FoodCache = {
  query: string; // 캐시된 검색어
  results: FoodNutritionData[]; // 캐시된 결과
  timestamp: number; // 캐시 시간
};

// 메모리 캐시 (앱 실행 중 유지)
let foodCache: FoodCache | null = null;

// 캐시 유효 시간 (5분)
const CACHE_TTL_MS = 5 * 60 * 1000;

// ============== API 호출 ==============

// 내부 API Route 사용 (CORS 우회)
const API_URL = "/api/food/search";

// 내부 API 응답 타입
interface InternalApiResponse {
  items?: FoodNutritionData[];
  totalCount?: number;
  error?: string;
}

/**
 * 내부 API Route를 통해 음식 검색 (CORS 문제 해결)
 */
async function fetchFoodApi(foodNm: string): Promise<FoodNutritionData[]> {
  const params = new URLSearchParams({
    q: foodNm,
    limit: "100",
  });

  const res = await fetch(`${API_URL}?${params.toString()}`);

  if (!res.ok) {
    throw new Error(`API 요청 실패: ${res.status}`);
  }

  const data: InternalApiResponse = await res.json();

  if (data.error) {
    throw new Error(data.error);
  }

  return data.items || [];
}

// ============== 점진적 캐싱 검색 ==============

/**
 * 음식명이 쿼리를 포함하는지 체크
 */
function matchesQuery(food: FoodNutritionData, query: string): boolean {
  const name = (food.foodNm || "").toLowerCase();
  return name.includes(query.toLowerCase());
}

/**
 * 캐시가 유효한지 체크
 */
function isCacheValid(): boolean {
  if (!foodCache) return false;
  return Date.now() - foodCache.timestamp < CACHE_TTL_MS;
}

/**
 * 점진적 캐싱 검색
 *
 * 전략:
 * 1. "딸" 입력 → API 호출 → 캐시 저장
 * 2. "딸기" 입력 → 캐시에서 "딸기" 포함 결과 필터링
 *    - 결과 있음 → 캐시 결과 반환 (API 호출 X)
 *    - 결과 없음 → API 재호출 → 캐시 갱신
 * 3. "딸기라" 입력 → 동일 로직
 *
 * @param query 검색어
 * @param minChars 최소 검색 글자 수 (기본 1)
 */
export async function searchFoodWithCache(
  query: string,
  minChars: number = 1
): Promise<FoodNutritionData[]> {
  const q = query.trim();

  // 최소 글자 수 미만이면 빈 배열
  if (q.length < minChars) {
    return [];
  }

  // 캐시가 유효하고, 현재 쿼리가 캐시된 쿼리로 시작하는 경우
  if (isCacheValid() && foodCache && q.startsWith(foodCache.query)) {
    // 캐시된 결과에서 필터링
    const filtered = foodCache.results.filter((food) => matchesQuery(food, q));

    // 필터링 결과가 있으면 반환 (API 호출 X)
    if (filtered.length > 0) {
      console.log(
        `[Cache Hit] "${q}" → ${filtered.length}개 (from "${foodCache.query}")`
      );
      return filtered;
    }

    // 필터링 결과가 없으면 API 재호출
    console.log(`[Cache Miss] "${q}" - 캐시에 매칭 결과 없음, API 재호출`);
  }

  // API 호출
  console.log(`[API Call] "${q}"`);
  const results = await fetchFoodApi(q);

  // 캐시 갱신
  foodCache = {
    query: q,
    results,
    timestamp: Date.now(),
  };

  return results;
}

/**
 * 캐시 초기화 (필요시 사용)
 */
export function clearFoodCache(): void {
  foodCache = null;
}

/**
 * 현재 캐시 상태 조회 (디버깅용)
 */
export function getCacheStatus(): {
  hasCache: boolean;
  query?: string;
  count?: number;
  age?: number;
} {
  if (!foodCache) {
    return { hasCache: false };
  }

  return {
    hasCache: true,
    query: foodCache.query,
    count: foodCache.results.length,
    age: Date.now() - foodCache.timestamp,
  };
}

// ============== FoodRow 변환 (기존 시스템 호환) ==============

import { FoodRow } from "./foodData";

/**
 * API 응답을 기존 FoodRow 형식으로 변환
 */
export function toFoodRow(data: FoodNutritionData): FoodRow {
  return {
    FOOD_NM_KR: data.foodNm || "",
    // 기준량 (보통 100g)
    serving_size: parseNum(data.nutConSrtrQua) || 100,
    // 주요 영양소
    energy_kcal: parseNum(data.enerc),
    protein_g: parseNum(data.prot),
    fat_g: parseNum(data.fatce),
    carbohydrate_g: parseNum(data.chocdf),
    sugar_g: parseNum(data.sugar),
    fiber_g: parseNum(data.fibtg),
    sodium_mg: parseNum(data.nat),
    // 무기질
    calcium_mg: parseNum(data.ca),
    iron_mg: parseNum(data.fe),
    phosphorus_mg: parseNum(data.p),
    potassium_mg: parseNum(data.k),
    // 비타민
    vitA_ug: parseNum(data.vitaRae),
    vitC_mg: parseNum(data.vitc),
    vitD_ug: parseNum(data.vitd),
    thiamin_mg: parseNum(data.thia),
    riboflavin_mg: parseNum(data.ribf),
    niacin_mg: parseNum(data.nia),
    // 지질
    cholesterol_mg: parseNum(data.chole),
    saturatedFat_g: parseNum(data.fasat),
    transFat_g: parseNum(data.fatrn),
    // 기타
    water_g: parseNum(data.water),
    ash_g: parseNum(data.ash),
  };
}

/**
 * 문자열/숫자를 숫자로 변환
 */
function parseNum(val: string | number | undefined): number {
  if (val === undefined || val === null || val === "") return 0;
  const num = typeof val === "number" ? val : parseFloat(val);
  return isNaN(num) ? 0 : num;
}

/**
 * API 검색 + FoodRow 변환 (기존 시스템과 호환되는 헬퍼)
 */
export async function searchFoodAsRows(query: string): Promise<FoodRow[]> {
  const results = await searchFoodWithCache(query);
  return results.map(toFoodRow);
}
