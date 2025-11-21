"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SensorCardProps {
  children: ReactNode;
  className?: string;
}

interface SensorCardTitleProps {
  children: ReactNode;
  icon?: ReactNode;
}

interface SensorCardValueProps {
  value: string | number;
  unit?: string;
  status?: "normal" | "warning" | "error";
}

export function SensorCard({ children, className }: SensorCardProps) {
  return (
    <div
      className={cn(
        "border border-zinc-200 dark:border-zinc-800 rounded p-6 transition-all hover:border-zinc-300 dark:hover:border-zinc-700",
        className
      )}
    >
      {children}
    </div>
  );
}

SensorCard.Title = function SensorCardTitle({
  children,
  icon,
}: SensorCardTitleProps) {
  return (
    <div className="mb-6">
      {icon && <div className="mb-2">{icon}</div>}
      <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
        {children}
      </h3>
    </div>
  );
};

SensorCard.Value = function SensorCardValue({
  value,
  unit,
  status = "normal",
}: SensorCardValueProps) {
  const statusColors = {
    normal: "text-black dark:text-white",
    warning: "text-yellow-600 dark:text-yellow-400",
    error: "text-red-600 dark:text-red-400",
  };

  return (
    <div className="flex items-baseline gap-2 mb-4">
      <span
        className={cn(
          "text-5xl font-light tracking-tight",
          statusColors[status]
        )}
      >
        {value}
      </span>
      {unit && (
        <span className="text-xl text-zinc-400 dark:text-zinc-500 font-light">
          {unit}
        </span>
      )}
    </div>
  );
};

SensorCard.Description = function SensorCardDescription({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <p className="text-xs text-zinc-500 dark:text-zinc-500 uppercase tracking-wider">
      {children}
    </p>
  );
};
