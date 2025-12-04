"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/lib/hooks/useAuth";
import { db } from "@/lib/firebase";
import { ref, get, set } from "firebase/database";
import toast from "react-hot-toast";

type PillConfig = {
  bottle1?: string;
  bottle2?: string;
  bottle3?: string;
};

const PILL_OPTIONS: string[] = [
  "",
  "종합비타민",
  "비타민 D",
  "오메가3",
  "유산균",
  "비타민 B군",
  "눈 건강(루테인 등)",
  "철분/빈혈",
];

export default function PillsPage() {
  const { user, loading } = useAuth();
  const [config, setConfig] = useState<PillConfig>({
    bottle1: "",
    bottle2: "",
    bottle3: "",
  });
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [saving, setSaving] = useState(false);

  // 기존 설정 불러오기
  useEffect(() => {
    if (loading) return;

    const run = async () => {
      if (!user) {
        setLoadingConfig(false);
        return;
      }
      try {
        setLoadingConfig(true);
        const snap = await get(ref(db, `users/${user.uid}/pillConfig`));
        if (snap.exists()) {
          const data = snap.val() as PillConfig;
          setConfig({
            bottle1: data.bottle1 ?? "",
            bottle2: data.bottle2 ?? "",
            bottle3: data.bottle3 ?? "",
          });
        }
      } catch (err) {
        console.error("Failed to load pill config", err);
        toast.error("약 정보 설정을 불러오는 중 오류가 발생했습니다.");
      } finally {
        setLoadingConfig(false);
      }
    };

    run();
  }, [user, loading]);

  const handleChange =
    (key: keyof PillConfig) => (e: React.ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value;
      setConfig((prev) => ({
        ...prev,
        [key]: value,
      }));
    };

  const handleSave = async () => {
    if (!user) {
      toast.error("로그인 후에 약 정보를 저장할 수 있습니다.");
      return;
    }
    try {
      setSaving(true);
      await set(ref(db, `users/${user.uid}/pillConfig`), config);
      toast.success("약 정보가 저장되었습니다.");
    } catch (err) {
      console.error("Failed to save pill config", err);
      toast.error("약 정보를 저장하는 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white">
      {/* 헤더 */}
      <header className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-5xl mx-auto px-6 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-light tracking-tight">약 정보 설정</h1>
            <p className="text-zinc-500 text-sm mt-1">
              각 약통(Bottle)에 어떤 종류의 영양제가 들어있는지 간단하게
              설정하세요.
            </p>
            <p className="text-xs text-zinc-400 mt-1">
              * 기능별로만 대략 설정해두고, 정확한 제품명·용량은 실제 병 라벨을
              참고하세요.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="text-sm text-zinc-500 hover:text-black dark:hover:text-white transition-colors"
            >
              ← Dashboard
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* 메인 */}
      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        <section className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-6">
          <h2 className="text-lg font-medium mb-4">Bottle 별 약 종류 선택</h2>

          {loading || loadingConfig ? (
            <p className="text-sm text-zinc-500">설정을 불러오는 중...</p>
          ) : (
            <div className="space-y-6">
              {/* Bottle 1 */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">Bottle 1</p>
                  <p className="text-xs text-zinc-500 mt-1">
                    아침에 자주 먹는 메인 영양제 등으로 설정해두면 좋습니다.
                  </p>
                </div>
                <select
                  value={config.bottle1 ?? ""}
                  onChange={handleChange("bottle1")}
                  className="w-full md:w-64 px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
                >
                  <option value="">선택 안 함</option>
                  {PILL_OPTIONS.filter((v) => v !== "").map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              {/* Bottle 2 */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">Bottle 2</p>
                  <p className="text-xs text-zinc-500 mt-1">
                    보조 영양제(오메가3, 유산균 등)를 넣어두는 용도로 사용할 수
                    있습니다.
                  </p>
                </div>
                <select
                  value={config.bottle2 ?? ""}
                  onChange={handleChange("bottle2")}
                  className="w-full md:w-64 px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
                >
                  <option value="">선택 안 함</option>
                  {PILL_OPTIONS.filter((v) => v !== "").map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              {/* Bottle 3 */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">Bottle 3</p>
                  <p className="text-xs text-zinc-500 mt-1">
                    추가로 관리하고 싶은 약(눈 건강, 철분 등)을 넣어둘 수
                    있습니다.
                  </p>
                </div>
                <select
                  value={config.bottle3 ?? ""}
                  onChange={handleChange("bottle3")}
                  className="w-full md:w-64 px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
                >
                  <option value="">선택 안 함</option>
                  {PILL_OPTIONS.filter((v) => v !== "").map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-6 py-2 bg-black dark:bg-white text-white dark:text-black rounded text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-60"
                >
                  {saving ? "저장 중..." : "저장하기"}
                </button>
              </div>
            </div>
          )}
        </section>

        <section className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-6">
          <h2 className="text-lg font-medium mb-2">설정 사용 방법</h2>
          <ul className="text-sm text-zinc-600 dark:text-zinc-300 list-disc pl-5 space-y-1">
            <li>여기서 설정한 약 이름은 대시보드의 Bottle 카드에 표시됩니다.</li>
            <li>
              나중에 하드웨어(ESP32)랑 연동하면, 각 Bottle에 맞는 분배
              기록/알림에도 활용할 수 있습니다.
            </li>
            <li>정확한 복용량, 상호작용 등은 반드시 의사/약사와 상의하세요.</li>
          </ul>
        </section>
      </main>
    </div>
  );
}
