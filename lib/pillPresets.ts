export type PillBottleInfo = {
  id: 1 | 2 | 3;
  name: string;
  description: string;
  targetDiseases: string[];
  dosagePerDay: string;
};

export const PILL_BOTTLES: PillBottleInfo[] = [
  {
    id: 1,
    name: "종합 비타민",
    description: "전반적인 영양 밸런스 보충용 기본 비타민",
    targetDiseases: ["비만", "고혈압", "심혈관 질환"],
    dosagePerDay: "하루 1정 (식사 후)",
  },
  {
    id: 2,
    name: "비타민 D + 칼슘",
    description: "뼈 건강, 골다공증 예방 및 면역력 강화",
    targetDiseases: ["골다공증"],
    dosagePerDay: "하루 1정 또는 의사 처방에 따름",
  },
  {
    id: 3,
    name: "오메가-3",
    description: "혈중 지질 개선 및 심혈관 건강 관리용",
    targetDiseases: ["심혈관 질환", "고혈압"],
    dosagePerDay: "하루 1~2정 (식사와 함께)",
  },
];
