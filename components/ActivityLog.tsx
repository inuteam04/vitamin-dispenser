"use client";

import { useState } from "react";
import { ActivityEvent, ActivityEventType } from "@/lib/types";

interface ActivityLogProps {
  events: ActivityEvent[];
  maxItems?: number;
  defaultVisible?: number;
}

/**
 * 활동 로그 컴포넌트
 * 시스템 이벤트를 시간순으로 표시
 */
export function ActivityLog({
  events,
  maxItems = 50,
  defaultVisible = 5,
}: ActivityLogProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const sortedEvents = [...events]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, maxItems);

  const displayedEvents = isExpanded
    ? sortedEvents
    : sortedEvents.slice(0, defaultVisible);

  if (sortedEvents.length === 0) {
    return (
      <div className="border border-zinc-200 dark:border-zinc-800 rounded p-6 text-center text-zinc-400 dark:text-zinc-600 text-sm">
        No activity recorded yet
      </div>
    );
  }

  return (
    <div className="border border-zinc-200 dark:border-zinc-800 rounded">
      <div className="border-b border-zinc-200 dark:border-zinc-800 px-6 py-4">
        <h2 className="text-sm uppercase tracking-wider text-zinc-500 dark:text-zinc-500">
          Activity Log
        </h2>
      </div>
      <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
        {displayedEvents.map((event) => (
          <ActivityLogItem key={event.id} event={event} />
        ))}
      </div>
      {sortedEvents.length > defaultVisible && (
        <div className="border-t border-zinc-200 dark:border-zinc-800 px-6 py-4 text-center">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white transition-colors uppercase tracking-wider font-medium"
          >
            {isExpanded
              ? "접기"
              : `${sortedEvents.length - defaultVisible}개 더보기`}
          </button>
        </div>
      )}
    </div>
  );
}

interface ActivityLogItemProps {
  event: ActivityEvent;
}

function ActivityLogItem({ event }: ActivityLogItemProps) {
  const { icon, color } = getEventStyle(event.type);
  const timeAgo = getTimeAgo(event.timestamp);

  return (
    <div className="px-6 py-4 flex items-start gap-4 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
      <div
        className={`shrink-0 w-8 h-8 rounded-full ${color} flex items-center justify-center text-sm`}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-black dark:text-white">{event.message}</p>
        <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-1 font-mono">
          {timeAgo}
        </p>
      </div>
    </div>
  );
}

/**
 * 이벤트 타입별 아이콘과 색상 반환
 */
function getEventStyle(type: ActivityEventType): {
  icon: string;
  color: string;
} {
  switch (type) {
    case ActivityEventType.PILL_DISPENSED:
      return { icon: "💊", color: "bg-blue-100 dark:bg-blue-900/30" };
    case ActivityEventType.FAN_ON:
      return { icon: "🌀", color: "bg-cyan-100 dark:bg-cyan-900/30" };
    case ActivityEventType.FAN_OFF:
      return { icon: "⏹️", color: "bg-zinc-100 dark:bg-zinc-800" };
    case ActivityEventType.TEMP_WARNING:
      return { icon: "⚠️", color: "bg-yellow-100 dark:bg-yellow-900/30" };
    case ActivityEventType.TEMP_CRITICAL:
      return { icon: "🔥", color: "bg-red-100 dark:bg-red-900/30" };
    case ActivityEventType.HUMIDITY_WARNING:
      return { icon: "💧", color: "bg-yellow-100 dark:bg-yellow-900/30" };
    case ActivityEventType.PILL_LOW:
      return { icon: "⚠️", color: "bg-orange-100 dark:bg-orange-900/30" };
    default:
      return { icon: "ℹ️", color: "bg-zinc-100 dark:bg-zinc-800" };
  }
}

/**
 * 상대 시간 계산
 */
function getTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}일 전`;
  if (hours > 0) return `${hours}시간 전`;
  if (minutes > 0) return `${minutes}분 전`;
  if (seconds > 0) return `${seconds}초 전`;
  return "방금 전";
}
