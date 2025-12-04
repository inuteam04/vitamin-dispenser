/**
 * DHT 센서 데이터 (온습도)
 */
export interface DHTData {
  temperature: number; // 섭씨 온도 (°C)
  humidity: number; // 상대습도 (%)
}

/**
 * 센서 데이터 타입 정의
 * Hardware Spec: DHT11/BME280 + Photo Interrupter + IR Proximity
 */
export interface SensorData {
  bottle1Count: number; // Bottle 1 남은 알약 개수
  bottle2Count: number; // Bottle 2 남은 알약 개수
  bottle3Count: number; // Bottle 3 남은 알약 개수
  dht1: DHTData; // Bottle 1 온습도 센서
  dht2: DHTData; // Bottle 2 온습도 센서
  dht3: DHTData; // Bottle 3 온습도 센서
  lastDispensed: number; // 마지막 배출 시간 (Unix Timestamp)
  isDispensing: boolean; // 배출 중 여부 (Photo Interrupter 감지)
  fanStatus: boolean; // 쿨링팬 상태
  photoDetected: boolean; // 포토 센서 감지 여부
  timestamp: number; // 데이터 갱신 시간
}

/**
 * 제어 명령 타입 (Web -> ESP32)
 */
export interface ControlCommand {
  action: "dispense" | "reset" | "setThreshold";
  bottleNumber: 1 | 2 | 3; // 배출할 병 번호 (dispense 시)
  count: number; // 배출할 알약 개수 (dispense 시)
  requestedAt: number; // 요청 시각
  status?: "pending" | "completed" | "failed"; // 명령 상태
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
