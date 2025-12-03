// lib/diseaseRules.ts

/**
 * DiseaseRule 타입
 * - 현재 CSV 구조: value(영문), label(한글)
 * - 기존 코드 호환을 위해 추가 필드도 포함
 */
export type DiseaseRule = {
  // 현재 CSV 구조에 맞는 필드
  value: string; // 영문 지병명 (예: "obesity")
  label: string; // 한글 지병명 (예: "비만")

  // 기존 코드 호환용 필드 (옵션)
  disease?: string; // = value (영문 지병명)
  keyword?: string; // 음식 키워드 (현재 CSV에 없음)
  warning?: string; // 경고 메시지 (현재 CSV에 없음)

  // dashboard에서 사용하는 필드
  food_entity: string; // 음식 이름
  disease_entity: string; // 질병 이름 (= value)
  sentence: string; // 설명 문장
  disease_doid: string; // DOID 코드
  is_cause: string; // "1.0"이면 위험
  is_treat: string; // "1.0"이면 완화에 도움
};

/**
 * CSV 파서 - 현재 disease_rules.csv 구조에 맞춤
 * 구조: value,label
 */
function parseDiseaseRuleCsv(text: string): DiseaseRule[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const firstLine = lines[0];
  if (!firstLine) return [];

  const headers = firstLine.split(",").map((h) => h.trim());
  const rules: DiseaseRule[] = [];

  for (let i = 1; i < lines.length; i++) {
    const raw = lines[i];
    if (!raw) continue;

    const trimmedRaw = raw.trim();
    if (!trimmedRaw) continue;

    const cols = trimmedRaw.split(",");

    const row: Record<string, string> = {};
    headers.forEach((header, idx) => {
      row[header] = (cols[idx] ?? "").replace(/^"|"$/g, "").trim();
    });

    // value, label 구조
    const value = row["value"] ?? "";
    const label = row["label"] ?? "";

    rules.push({
      value,
      label,
      disease: value, // 기존 코드 호환
      keyword: "", // 현재 CSV에 없음
      warning: "", // 현재 CSV에 없음
      food_entity: "", // 현재 CSV에 없음
      disease_entity: value, // dashboard 호환
      sentence: "", // 현재 CSV에 없음
      disease_doid: "", // 현재 CSV에 없음
      is_cause: "", // 현재 CSV에 없음
      is_treat: "", // 현재 CSV에 없음
    });
  }

  return rules;
}

/**
 * /public/disease_rules.csv 로부터 규칙 불러오기
 */
export async function loadDiseaseRules(): Promise<DiseaseRule[]> {
  const res = await fetch("/disease_rules.csv");
  if (!res.ok) {
    throw new Error(`Failed to load disease_rules.csv: ${res.status}`);
  }

  const text = await res.text();
  return parseDiseaseRuleCsv(text);
}

/**
 * 에러 발생 시 빈 배열 반환하는 안전 버전
 */
export async function loadDiseaseRulesSafe(): Promise<DiseaseRule[]> {
  try {
    return await loadDiseaseRules();
  } catch (err) {
    console.error("Failed to load disease rules:", err);
    return [];
  }
}

/**
 * 중복 제거된 질병 이름 목록 (영문)
 */
export function extractUniqueDiseases(rules: DiseaseRule[]): string[] {
  const set = new Set<string>();
  for (const r of rules) {
    if (r.value) set.add(r.value);
  }
  return Array.from(set).sort();
}

/**
 * 영문 → 한글 지병명 매핑 객체 생성
 */
export function createDiseaseMap(rules: DiseaseRule[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const r of rules) {
    if (r.value && r.label) {
      map[r.value] = r.label;
    }
  }
  return map;
}

/**
 * 질환 카테고리 정의
 */
export type DiseaseCategory = {
  name: string;
  icon: string;
  diseases: string[];
};

/**
 * 질환을 카테고리별로 그룹화
 * 한글 라벨 기준으로 분류
 */
export function getDiseaseCategories(
  diseaseLabels: string[]
): DiseaseCategory[] {
  // 카테고리 정의 (한글 라벨 기준)
  const categoryDefinitions: {
    name: string;
    icon: string;
    keywords: string[];
  }[] = [
    {
      name: "심혈관 질환",
      icon: "❤️",
      keywords: ["심혈관", "심장", "동맥", "심근", "뇌졸중", "고혈압", "CVD"],
    },
    {
      name: "대사 질환",
      icon: "🔬",
      keywords: ["당뇨", "비만", "대사", "고혈당"],
    },
    {
      name: "신경/인지 질환",
      icon: "🧠",
      keywords: ["알츠하이머", "치매", "인지", "신경퇴행", "신경관"],
    },
    {
      name: "염증/알레르기",
      icon: "🛡️",
      keywords: ["알레르기", "염증", "아토피", "류머티즘"],
    },
    {
      name: "뼈/관절",
      icon: "🦴",
      keywords: ["골다공", "골 손실", "관절"],
    },
    {
      name: "호흡기/감염",
      icon: "🫁",
      keywords: ["천식", "호흡기", "기관지", "감염", "유방염"],
    },
    {
      name: "암/종양",
      icon: "🔴",
      keywords: ["암", "발암", "종양"],
    },
    {
      name: "소화기/신장",
      icon: "💧",
      keywords: ["신장", "결석"],
    },
  ];

  const categorized: DiseaseCategory[] = [];
  const usedDiseases = new Set<string>();

  // 각 카테고리에 맞는 질환 분류
  for (const catDef of categoryDefinitions) {
    const matched = diseaseLabels.filter((label) => {
      if (usedDiseases.has(label)) return false;
      return catDef.keywords.some((kw) => label.includes(kw));
    });

    if (matched.length > 0) {
      matched.forEach((d) => usedDiseases.add(d));
      categorized.push({
        name: catDef.name,
        icon: catDef.icon,
        diseases: matched.sort(),
      });
    }
  }

  // 분류되지 않은 질환은 "기타"로
  const uncategorized = diseaseLabels.filter((d) => !usedDiseases.has(d));
  if (uncategorized.length > 0) {
    categorized.push({
      name: "기타",
      icon: "📋",
      diseases: uncategorized.sort(),
    });
  }

  return categorized;
}
