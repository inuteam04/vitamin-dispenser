/**
 * 다국어 지원(i18n) 유틸리티
 * 한국어/영어 지원
 */

export type Language = "ko" | "en";

export const translations = {
  ko: {
    // 헤더
    "header.title": "비타민 디스펜서",
    "header.subtitle": "실시간 모니터링 및 제어",

    // 시스템 상태
    "system.label": "시스템",
    "system.idle": "대기 중",
    "system.dispensing": "배출 중",
    "system.cooling": "냉각 중",
    "system.error": "오류",
    "system.offline": "오프라인",

    // 연결 상태
    "connection.label": "연결",
    "connection.connected": "연결됨",
    "connection.disconnected": "연결 끊김",
    "connection.lastUpdate": "마지막 업데이트",
    "connection.justNow": "방금 전",
    "connection.secondsAgo": "초 전",
    "connection.minutesAgo": "분 전",
    "connection.hoursAgo": "시간 전",
    "connection.daysAgo": "일 전",
    "connection.noRecord": "기록 없음",

    // 팬 상태
    "fan.label": "냉각 팬",
    "fan.on": "작동 중",
    "fan.off": "정지",

    // 약통 카드
    "bottle.title": "약통",
    "bottle.pills": "알약",
    "bottle.temp": "온도",
    "bottle.humidity": "습도",
    "bottle.dispense": "배출",
    "bottle.dispensing": "배출 중...",
    "bottle.refill": "리필",
    "bottle.refilling": "리필 중...",
    "bottle.needsRefill": "보충 필요",
    "bottle.notSet": "미설정",

    // 활동 로그
    "activityLog.title": "활동 로그",
    "activityLog.empty": "아직 기록된 활동이 없습니다",
    "activityLog.expand": "개 더보기",
    "activityLog.collapse": "접기",

    // 차트
    "chart.temperature": "온도 현황",
    "chart.tempUnit": "°C",

    // 마지막 복용
    "lastDispensed.title": "마지막 복용",
    "lastDispensed.never": "기록 없음",
    "lastDispensed.ago": "전",

    // 섹션
    "section.nutrition.title": "영양 분석",
    "section.nutrition.desc":
      "오늘 먹은 음식을 입력하고 영양 상태를 분석하여 권장 알약 섭취량을 확인할 수 있습니다.",
    "section.nutrition.content": "식단 입력과 지병 선택을 통해",
    "section.nutrition.highlight": "맞춤형 영양 분석",
    "section.nutrition.suffix": "을 받아보세요.",
    "section.nutrition.button": "영양 분석하기",

    "section.pills.title": "약 정보",
    "section.pills.desc":
      "각 Bottle에 어떤 영양제가 들어있는지, 복용 목적과 주의사항을 한눈에 확인할 수 있습니다.",
    "section.pills.content": "Bottle 1, 2, 3에 들어간 약 성분과 권장 복용량은",
    "section.pills.highlight": "[약 정보 페이지]",
    "section.pills.suffix": "에서 관리합니다.",
    "section.pills.button": "약 정보 보러가기",

    // 에러
    "error.connection": "연결 오류",
    "error.retry": "다시 시도",
    "error.permissionDenied": "접근 권한이 없습니다. 자동으로 로그아웃됩니다.",

    // 토스트
    "toast.dispenseRequest": "에서 {count}개 배출 요청됨",
    "toast.dispenseFailed": "배출 요청 실패",
    "toast.refillSuccess": "리필 완료",
    "toast.refillFailed": "리필 실패",
    "toast.alreadyFull": "이미 가득 차 있습니다",

    // 시간
    "time.justNow": "방금 전",
    "time.minutesAgo": "분 전",
    "time.hoursAgo": "시간 전",
    "time.daysAgo": "일 전",

    // 페이지: 영양 분석
    "page.analyse.title": "영양 분석",
    "page.analyse.subtitle": "오늘 먹은 음식을 입력하고 영양 상태를 분석하세요",
    "page.analyse.profileHint":
      "프로필에 저장된 키·몸무게·활동량을 사용해 권장 열량과 비교합니다.",
    "page.analyse.loginHint":
      "로그인 후 프로필에 키·몸무게를 입력하면 더 정확한 분석이 가능합니다.",
    "page.analyse.foodSection": "오늘 먹은 음식",
    "page.analyse.searchPlaceholder": "음식명 검색 (예: 김치찌개, 삼겹살)",
    "page.analyse.analyzing": "분석 중...",
    "page.analyse.startAnalysis": "영양 분석 시작",

    // 페이지: 약 정보
    "page.pills.title": "약 정보 설정",
    "page.pills.subtitle":
      "각 약통(Bottle)에 어떤 종류의 영양제가 들어있는지 간단하게 설정하세요.",
    "page.pills.hint":
      "* 기능별로만 대략 설정해두고, 정확한 제품명·용량은 실제 병 라벨을 참고하세요.",
    "page.pills.sectionTitle": "Bottle 별 약 종류 선택",
    "page.pills.loading": "설정을 불러오는 중...",
    "page.pills.selectNone": "선택 안 함",
    "page.pills.save": "저장",
    "page.pills.saving": "저장 중...",
    "page.pills.saveSuccess": "약 정보가 저장되었습니다.",
    "page.pills.saveError": "약 정보를 저장하는 중 오류가 발생했습니다.",
    "page.pills.loginRequired": "로그인 후에 약 정보를 저장할 수 있습니다.",

    // 페이지: 프로필
    "page.profile.title": "프로필 설정",
    "page.profile.basicInfo": "기본 정보",
    "page.profile.name": "이름",
    "page.profile.age": "나이",
    "page.profile.sex": "성별",
    "page.profile.male": "남성",
    "page.profile.female": "여성",
    "page.profile.other": "기타",
    "page.profile.height": "키 (cm)",
    "page.profile.weight": "몸무게 (kg)",
    "page.profile.activityLevel": "활동 수준",
    "page.profile.diseases": "지병/건강 상태",
    "page.profile.save": "저장",
    "page.profile.saving": "저장 중...",
    "page.profile.saveSuccess": "프로필 저장 완료",
    "page.profile.saveError": "프로필 저장 실패",
    "page.profile.loginRequired": "로그인 후 이용 가능합니다.",
    "page.profile.loading": "로딩 중...",
    "page.profile.goToLogin": "로그인 이동",

    // 페이지: 로그인
    "page.login.title": "Vitamin Dispenser",
    "page.login.subtitle": "Authentication Required",
    "page.login.permissionDenied": "접근 권한이 없습니다.",
    "page.login.permissionDeniedHint": "허용된 계정으로 로그인해주세요.",
    "page.login.googleLogin": "Google로 로그인",
    "page.login.backToHome": "홈으로 돌아가기",
    "page.login.loading": "로그인 중...",
    "page.login.success": "로그인 성공!",
    "page.login.failed": "로그인에 실패했습니다. 다시 시도해주세요.",
  },
  en: {
    // Header
    "header.title": "Vitamin Dispenser",
    "header.subtitle": "Real-time Monitoring & Control",

    // System Status
    "system.label": "System",
    "system.idle": "Idle",
    "system.dispensing": "Dispensing",
    "system.cooling": "Cooling",
    "system.error": "Error",
    "system.offline": "Offline",

    // Connection Status
    "connection.label": "Connection",
    "connection.connected": "Connected",
    "connection.disconnected": "Disconnected",
    "connection.lastUpdate": "Last Update",
    "connection.justNow": "Just now",
    "connection.secondsAgo": "sec ago",
    "connection.minutesAgo": "min ago",
    "connection.hoursAgo": "hr ago",
    "connection.daysAgo": "days ago",
    "connection.noRecord": "No record",

    // Fan Status
    "fan.label": "Cooling Fan",
    "fan.on": "ON",
    "fan.off": "OFF",

    // Bottle Card
    "bottle.title": "Bottle",
    "bottle.pills": "Pills",
    "bottle.temp": "Temp",
    "bottle.humidity": "Humidity",
    "bottle.dispense": "Dispense",
    "bottle.dispensing": "Dispensing...",
    "bottle.refill": "Refill",
    "bottle.refilling": "Refilling...",
    "bottle.needsRefill": "Needs Refill",
    "bottle.notSet": "Not Set",

    // Activity Log
    "activityLog.title": "Activity Log",
    "activityLog.empty": "No activity recorded yet",
    "activityLog.expand": "more",
    "activityLog.collapse": "Collapse",

    // Chart
    "chart.temperature": "Temperature Status",
    "chart.tempUnit": "°C",

    // Last Dispensed
    "lastDispensed.title": "Last Dispensed",
    "lastDispensed.never": "No record",
    "lastDispensed.ago": "ago",

    // Sections
    "section.nutrition.title": "Nutrition Analysis",
    "section.nutrition.desc":
      "Enter the food you ate today and analyze your nutritional status to check recommended pill intake.",
    "section.nutrition.content": "Get",
    "section.nutrition.highlight": "personalized nutrition analysis",
    "section.nutrition.suffix": "through diet input and disease selection.",
    "section.nutrition.button": "Analyze Nutrition",

    "section.pills.title": "Pill Information",
    "section.pills.desc":
      "Check what supplements are in each bottle, their purpose, and precautions at a glance.",
    "section.pills.content":
      "Manage pill ingredients and recommended dosages for Bottles 1, 2, 3 on the",
    "section.pills.highlight": "[Pill Info Page]",
    "section.pills.suffix": ".",
    "section.pills.button": "View Pill Info",

    // Errors
    "error.connection": "Connection Error",
    "error.retry": "Retry",
    "error.permissionDenied":
      "Access denied. You will be automatically logged out.",

    // Toast
    "toast.dispenseRequest": "{count} pills dispense requested from",
    "toast.dispenseFailed": "Dispense request failed",
    "toast.refillSuccess": "Refill completed",
    "toast.refillFailed": "Refill failed",
    "toast.alreadyFull": "Already full",

    // Time
    "time.justNow": "Just now",
    "time.minutesAgo": "min ago",
    "time.hoursAgo": "hr ago",
    "time.daysAgo": "days ago",

    // Page: Nutrition Analysis
    "page.analyse.title": "Nutrition Analysis",
    "page.analyse.subtitle":
      "Enter today's food and analyze your nutritional status",
    "page.analyse.profileHint":
      "Uses height, weight, and activity level from your profile to compare with recommended calories.",
    "page.analyse.loginHint":
      "Log in and enter your height/weight in profile for more accurate analysis.",
    "page.analyse.foodSection": "Today's Food",
    "page.analyse.searchPlaceholder":
      "Search food (e.g., kimchi stew, pork belly)",
    "page.analyse.analyzing": "Analyzing...",
    "page.analyse.startAnalysis": "Start Analysis",

    // Page: Pill Info
    "page.pills.title": "Pill Information Settings",
    "page.pills.subtitle": "Set what type of supplements are in each bottle.",
    "page.pills.hint":
      "* Set only by function, refer to actual bottle labels for exact product names and dosages.",
    "page.pills.sectionTitle": "Select Pill Type by Bottle",
    "page.pills.loading": "Loading settings...",
    "page.pills.selectNone": "None",
    "page.pills.save": "Save",
    "page.pills.saving": "Saving...",
    "page.pills.saveSuccess": "Pill information saved.",
    "page.pills.saveError": "Error saving pill information.",
    "page.pills.loginRequired": "Login required to save pill information.",

    // Page: Profile
    "page.profile.title": "Profile Settings",
    "page.profile.basicInfo": "Basic Information",
    "page.profile.name": "Name",
    "page.profile.age": "Age",
    "page.profile.sex": "Gender",
    "page.profile.male": "Male",
    "page.profile.female": "Female",
    "page.profile.other": "Other",
    "page.profile.height": "Height (cm)",
    "page.profile.weight": "Weight (kg)",
    "page.profile.activityLevel": "Activity Level",
    "page.profile.diseases": "Health Conditions",
    "page.profile.save": "Save",
    "page.profile.saving": "Saving...",
    "page.profile.saveSuccess": "Profile saved",
    "page.profile.saveError": "Failed to save profile",
    "page.profile.loginRequired": "Login required.",
    "page.profile.loading": "Loading...",
    "page.profile.goToLogin": "Go to Login",

    // Page: Login
    "page.login.title": "Vitamin Dispenser",
    "page.login.subtitle": "Authentication Required",
    "page.login.permissionDenied": "Access denied.",
    "page.login.permissionDeniedHint":
      "Please login with an authorized account.",
    "page.login.googleLogin": "Login with Google",
    "page.login.backToHome": "Back to Home",
    "page.login.loading": "Logging in...",
    "page.login.success": "Login successful!",
    "page.login.failed": "Login failed. Please try again.",
  },
} as const;

export type TranslationKey = keyof (typeof translations)["ko"];

/**
 * 번역 함수
 */
export function t(
  key: TranslationKey,
  lang: Language = "ko",
  params?: Record<string, string | number>
): string {
  let text: string = translations[lang][key] || translations["ko"][key] || key;

  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      text = text.replace(`{${k}}`, String(v));
    });
  }

  return text;
}

/**
 * 시스템 상태 번역
 */
export function getSystemStatusText(
  status: string,
  lang: Language = "ko"
): string {
  const statusMap: Record<string, TranslationKey> = {
    idle: "system.idle",
    dispensing: "system.dispensing",
    cooling: "system.cooling",
    error: "system.error",
    offline: "system.offline",
  };
  return t(statusMap[status] || "system.offline", lang);
}

/**
 * 상대 시간 포맷 (다국어)
 */
export function formatTimeAgo(
  timestamp: number,
  lang: Language = "ko"
): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return t("time.justNow", lang);
  if (minutes < 60)
    return lang === "ko"
      ? `${minutes}${t("time.minutesAgo", lang)}`
      : `${minutes} ${t("time.minutesAgo", lang)}`;
  if (hours < 24)
    return lang === "ko"
      ? `${hours}${t("time.hoursAgo", lang)}`
      : `${hours} ${t("time.hoursAgo", lang)}`;
  return lang === "ko"
    ? `${days}${t("time.daysAgo", lang)}`
    : `${days} ${t("time.daysAgo", lang)}`;
}
