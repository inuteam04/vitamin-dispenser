/**
 * 센서 데이터 타입 정의
 * Hardware Spec: DHT11/BME280 + Photo Interrupter + IR Proximity
 */
export interface SensorData {
  temperature: number; // 섭씨 온도 (°C)
  humidity: number; // 상대습도 (%)
  pillCount: number; // 현재 남은 알약 개수
  lastDispensed: number; // 마지막 배출 시간 (Unix Timestamp)
  isDispensing: boolean; // 배출 중 여부 (Photo Interrupter 감지)
  fanStatus: "off" | "on"; // 쿨링팬 상태
  timestamp: number; // 데이터 갱신 시간
}

/**
 * 제어 명령 타입 (Web -> ESP32)
 */
export interface ControlCommand {
  action: "dispense" | "reset" | "setThreshold";
  payload?: {
    count?: number; // 배출 개수 (기본값: 1)
    tempThreshold?: number; // 온도 임계값 (기본값: 30°C)
  };
  requestedAt: number; // 요청 시각
}

/**
 * 시스템 상태 열거형
 */
export enum SystemStatus {
  IDLE = "idle",
  DISPENSING = "dispensing",
  COOLING = "cooling",
  ERROR = "error",
  OFFLINE = "offline",
}

/**
 * 알림 타입
 */
export interface Alert {
  id: string;
  type: "warning" | "error" | "info";
  message: string;
  timestamp: number;
  acknowledged: boolean;
}

/**
 * 사용 이력 (일별 통계)
 */
export interface UsageHistory {
  date: string; // YYYY-MM-DD
  dispensedCount: number; // 당일 배출 횟수
  avgTemperature: number;
  avgHumidity: number;
}

/**
 * 활동 이벤트 타입
 */
export enum ActivityEventType {
  PILL_DISPENSED = "pill_dispensed",
  FAN_ON = "fan_on",
  FAN_OFF = "fan_off",
  TEMP_WARNING = "temp_warning",
  TEMP_CRITICAL = "temp_critical",
  HUMIDITY_WARNING = "humidity_warning",
  PILL_LOW = "pill_low",
  DISPENSING_START = "dispensing_start",
  DISPENSING_END = "dispensing_end",
}

/**
 * 활동 로그 이벤트
 */
export interface ActivityEvent {
  id: string;
  type: ActivityEventType;
  message: string;
  timestamp: number;
  data?: Record<string, unknown>; // 추가 데이터 (온도값, 개수 등)
}
