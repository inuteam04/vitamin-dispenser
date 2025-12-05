"use client";

import { DHTData } from "@/lib/types";
import { Language, t } from "@/lib/i18n";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  ReferenceLine,
} from "recharts";

interface TemperatureChartProps {
  dht1: DHTData | null;
  dht2: DHTData | null;
  dht3: DHTData | null;
  lang?: Language;
}

/**
 * 온도 현황 차트 컴포넌트
 * 3개 약통의 온도를 바 차트로 시각화
 */
export function TemperatureChart({
  dht1,
  dht2,
  dht3,
  lang = "ko",
}: TemperatureChartProps) {
  const data = [
    {
      name: `${t("bottle.title", lang)} 1`,
      temperature: dht1?.temperature ?? 0,
      humidity: dht1?.humidity ?? 0,
    },
    {
      name: `${t("bottle.title", lang)} 2`,
      temperature: dht2?.temperature ?? 0,
      humidity: dht2?.humidity ?? 0,
    },
    {
      name: `${t("bottle.title", lang)} 3`,
      temperature: dht3?.temperature ?? 0,
      humidity: dht3?.humidity ?? 0,
    },
  ];

  // 온도에 따른 바 색상
  const getBarColor = (temp: number) => {
    if (temp > 35) return "#ef4444"; // red-500
    if (temp > 30) return "#eab308"; // yellow-500
    return "#22c55e"; // green-500
  };

  return (
    <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
      <h3 className="text-sm uppercase tracking-wider text-zinc-500 dark:text-zinc-500 mb-4">
        {t("chart.temperature", lang)}
      </h3>

      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
          >
            <XAxis
              dataKey="name"
              tick={{ fill: "#71717a", fontSize: 12 }}
              axisLine={{ stroke: "#27272a" }}
              tickLine={false}
            />
            <YAxis
              domain={[0, 50]}
              tick={{ fill: "#71717a", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => `${value}°`}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const temp = payload[0].value as number;
                  const name = payload[0].payload.name;
                  const humidity = payload[0].payload.humidity;
                  return (
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 shadow-lg">
                      <p className="text-sm font-medium text-black dark:text-white">
                        {name}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {t("bottle.temp", lang)}: {temp.toFixed(1)}°C
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {t("bottle.humidity", lang)}: {humidity.toFixed(1)}%
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            {/* 경고 기준선 */}
            <ReferenceLine
              y={30}
              stroke="#eab308"
              strokeDasharray="4 4"
              strokeWidth={1}
            />
            <ReferenceLine
              y={35}
              stroke="#ef4444"
              strokeDasharray="4 4"
              strokeWidth={1}
            />
            <Bar dataKey="temperature" radius={[4, 4, 0, 0]} maxBarSize={60}>
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={getBarColor(entry.temperature)}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 범례 */}
      <div className="flex items-center justify-center gap-4 mt-4 text-xs text-zinc-500 dark:text-zinc-400">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-green-500" />
          <span>{lang === "ko" ? "정상 (<30°C)" : "Normal (<30°C)"}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-yellow-500" />
          <span>{lang === "ko" ? "경고 (30-35°C)" : "Warning (30-35°C)"}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-red-500" />
          <span>{lang === "ko" ? "위험 (>35°C)" : "Critical (>35°C)"}</span>
        </div>
      </div>
    </div>
  );
}
