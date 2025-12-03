// lib/diseaseMap.ts

/**
 * 한국어 지병 라벨 ↔ CSV disease_entity(영문) 매핑
 * - 화면에는 왼쪽(한글)만 보여주고
 * - 내부 로직은 오른쪽(영문)으로 비교한다.
 */
export const DISEASE_KO_EN: Record<string, string> = {
  비만: "obesity",
  고혈압: "hypertension",
  당뇨병: "diabetes mellitus",
  심혈관질환: "cardiovascular disease",
  암: "cancer",
  골다공증: "osteoporosis",
  요로결석: "urinary stones",
  피부질환: "dermatitis",
};