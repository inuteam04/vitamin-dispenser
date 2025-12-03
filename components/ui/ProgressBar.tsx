import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number;
  max: number;
  status?: "normal" | "warning" | "error";
  animate?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
}

/**
 * 재사용 가능한 프로그레스 바 컴포넌트
 */
export function ProgressBar({
  value,
  max,
  status = "normal",
  animate = true,
  className,
  size = "sm",
}: ProgressBarProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  const heightClass = {
    sm: "h-1.5",
    md: "h-2",
    lg: "h-3",
  }[size];

  const statusColor = {
    normal: "bg-green-500 dark:bg-green-400",
    warning: "bg-yellow-500 dark:bg-yellow-400",
    error: "bg-red-500 dark:bg-red-400",
  }[status];

  return (
    <div
      className={cn(
        "w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden",
        heightClass,
        className
      )}
    >
      <div
        className={cn(
          statusColor,
          heightClass,
          "rounded-full",
          animate && "transition-all duration-500 ease-out"
        )}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}

interface RangeBarProps {
  value: number;
  min: number;
  max: number;
  optimalMin: number;
  optimalMax: number;
  warningThreshold?: number;
  animate?: boolean;
  className?: string;
}

/**
 * 범위 표시 바 컴포넌트
 */
export function RangeBar({
  value,
  min,
  max,
  optimalMin,
  optimalMax,
  warningThreshold,
  animate = true,
  className,
}: RangeBarProps) {
  const range = max - min;
  const valuePosition = Math.min(
    Math.max(((value - min) / range) * 100, 0),
    100
  );
  const optimalStart = ((optimalMin - min) / range) * 100;
  const optimalWidth = ((optimalMax - optimalMin) / range) * 100;

  // 상태 판별: 적정 범위 내면 normal, 경고 임계값 초과면 warning
  const isInOptimalRange = value >= optimalMin && value <= optimalMax;
  const isWarning = warningThreshold !== undefined && value > warningThreshold;

  const indicatorColor = isWarning
    ? "bg-yellow-500 dark:bg-yellow-400"
    : isInOptimalRange
    ? "bg-green-500 dark:bg-green-400"
    : "bg-zinc-500 dark:bg-zinc-400";

  return (
    <div className={cn("relative w-full h-2", className)}>
      {/* 배경 바 */}
      <div className="absolute inset-0 bg-zinc-200 dark:bg-zinc-800 rounded-full" />

      {/* 적정 범위 표시 */}
      <div
        className="absolute top-0 bottom-0 bg-green-500/20 dark:bg-green-400/20 rounded-full"
        style={{
          left: `${optimalStart}%`,
          width: `${optimalWidth}%`,
        }}
      />

      {/* 현재 값 인디케이터 */}
      <div
        className={cn(
          "absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full shadow-sm border-2 border-white dark:border-black",
          indicatorColor,
          animate && "transition-all duration-500 ease-out"
        )}
        style={{
          left: `${valuePosition}%`,
          transform: `translateX(-50%) translateY(-50%)`,
        }}
      />
    </div>
  );
}
