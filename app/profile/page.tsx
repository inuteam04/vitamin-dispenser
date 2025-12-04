"use client";

import { useState, useEffect, ChangeEvent, FormEvent, useMemo } from "react";

import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";

import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { ref, get, set } from "firebase/database";
import toast from "react-hot-toast";

import {
  loadDiseaseRules,
  getDiseaseCategories,
  DiseaseRule,
  DiseaseCategory,
} from "@/lib/diseaseRules";
import { HamburgerMenu } from "@/components/HamburgerMenu";

// ===== 타입 정의 =====
type Sex = "male" | "female" | "other" | "";
type ActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "active"
  | "very_active"
  | "";

type UserProfile = {
  name?: string;
  age?: number | null;
  sex?: Sex;
  heightCm?: number | null;
  weightKg?: number | null;
  activityLevel?: ActivityLevel;
  diseases?: string[];
};

// 숫자 파싱
function parseNumberOrNull(value: string): number | null {
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);

  const [profile, setProfile] = useState<UserProfile>({
    name: "",
    age: null,
    sex: "",
    heightCm: null,
    weightKg: null,
    activityLevel: "",
    diseases: [],
  });

  const [saving, setSaving] = useState(false);

  // === 지병 옵션 (CSV 기반 전체) ===
  const [diseaseRules, setDiseaseRules] = useState<DiseaseRule[]>([]);
  const [diseaseLoading, setDiseaseLoading] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set()
  );

  // diseaseRules 로딩
  useEffect(() => {
    const run = async () => {
      try {
        const rules = await loadDiseaseRules();
        setDiseaseRules(rules);
      } catch (err) {
        console.error(err);
      } finally {
        setDiseaseLoading(false);
      }
    };
    run();
  }, []);

  const diseaseOptions = useMemo(() => {
    const set = new Set<string>();
    diseaseRules.forEach((r) => {
      const name = r.label || r.value;
      if (name) set.add(name);
    });
    return Array.from(set).sort();
  }, [diseaseRules]);

  const diseaseCategories: DiseaseCategory[] = useMemo(() => {
    return getDiseaseCategories(diseaseOptions);
  }, [diseaseOptions]);

  const toggleCategory = (categoryName: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryName)) {
        next.delete(categoryName);
      } else {
        next.add(categoryName);
      }
      return next;
    });
  };

  const toggleDisease = (name: string) => {
    setProfile((prev) => {
      const set = new Set(prev.diseases ?? []);
      if (set.has(name)) {
        set.delete(name);
      } else {
        set.add(name);
      }
      return { ...prev, diseases: Array.from(set) };
    });
  };

  // 로그인 + 프로필 로드
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (!firebaseUser) {
        setInitialLoading(false);
        return;
      }

      try {
        const snap = await get(ref(db, `users/${firebaseUser.uid}/profile`));
        if (snap.exists()) {
          setProfile(snap.val() as UserProfile);
        }
      } catch (err) {
        console.error("Failed to load profile", err);
      } finally {
        setInitialLoading(false);
      }
    });

    return () => unsub();
  }, []);

  const handleChange =
    (field: keyof UserProfile) =>
    (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const v = e.target.value;

      if (field === "age" || field === "heightCm" || field === "weightKg") {
        setProfile((prev) => ({
          ...prev,
          [field]: v === "" ? null : parseNumberOrNull(v),
        }));
        return;
      }

      setProfile((prev) => ({ ...prev, [field]: v }));
    };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("로그인 후 이용 가능합니다.");
      return;
    }

    setSaving(true);

    try {
      await set(ref(db, `users/${user.uid}/profile`), profile);
      toast.success("프로필 저장 완료");
    } catch (err) {
      console.error(err);
      toast.error("프로필 저장 실패");
    } finally {
      setSaving(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-zinc-500">
        로딩 중...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-white dark:bg-black text-center text-zinc-500 p-20">
        <p className="mb-4">로그인 후 이용 가능합니다.</p>
        <Link href="/login" className="text-blue-500 underline">
          로그인 이동
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white">
      {/* 헤더 */}
      <header className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-3xl mx-auto px-6 py-6 flex items-center justify-between">
          <h1 className="text-3xl font-light">프로필 설정</h1>
          <div className="flex items-center gap-4">
            <HamburgerMenu />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        <form
          onSubmit={handleSubmit}
          className="space-y-10 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6"
        >
          {/* 기본 정보 */}
          <section className="space-y-3">
            <h2 className="text-lg font-medium">기본 정보</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-zinc-500">이름</label>
                <input
                  type="text"
                  value={profile.name ?? ""}
                  onChange={handleChange("name")}
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded bg-transparent text-sm"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-500">나이</label>
                <input
                  type="number"
                  min={0}
                  value={profile.age ?? ""}
                  onChange={handleChange("age")}
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded bg-transparent text-sm"
                />
              </div>
            </div>

            {/* 성별 */}
            <div className="space-y-1">
              <label className="text-xs text-zinc-500">성별</label>
              <div className="flex gap-4 text-sm">
                {["male", "female", "other"].map((sx) => (
                  <label key={sx} className="flex items-center gap-2">
                    <input
                      type="radio"
                      value={sx}
                      checked={profile.sex === sx}
                      onChange={handleChange("sex")}
                      className="w-4 h-4"
                    />
                    <span>
                      {sx === "male"
                        ? "남성"
                        : sx === "female"
                        ? "여성"
                        : "기타"}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </section>

          {/* 신체 */}
          <section className="space-y-3">
            <h2 className="text-lg font-medium">신체 정보</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-zinc-500">키(cm)</label>
                <input
                  type="number"
                  value={profile.heightCm ?? ""}
                  onChange={handleChange("heightCm")}
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded bg-transparent text-sm"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-500">몸무게(kg)</label>
                <input
                  type="number"
                  value={profile.weightKg ?? ""}
                  onChange={handleChange("weightKg")}
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded bg-transparent text-sm"
                />
              </div>
            </div>
          </section>

          {/* 활동량 */}
          <section className="space-y-3">
            <h2 className="text-lg font-medium">활동량</h2>

            <select
              value={profile.activityLevel ?? ""}
              onChange={handleChange("activityLevel")}
              className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded bg-transparent text-sm"
            >
              <option value="">선택</option>
              <option value="sedentary">거의 운동 안함</option>
              <option value="light">가벼운 활동</option>
              <option value="moderate">보통 수준</option>
              <option value="active">활동적</option>
              <option value="very_active">매우 활동적</option>
            </select>
          </section>

          {/* 지병 - CSV 기반 전체 */}
          <section className="space-y-3">
            <h2 className="text-lg font-medium">지병 / 질환 (전체 목록)</h2>

            {diseaseLoading ? (
              <p className="text-sm text-zinc-500">지병 데이터 로딩중...</p>
            ) : diseaseCategories.length === 0 ? (
              <p className="text-sm text-zinc-500">지병 데이터 없음</p>
            ) : (
              <div className="space-y-3">
                {diseaseCategories.map((category) => {
                  const isOpen = expandedCategories.has(category.name);

                  return (
                    <div
                      key={category.name}
                      className="border border-zinc-200 dark:border-zinc-700 rounded-lg"
                    >
                      <button
                        type="button"
                        onClick={() => toggleCategory(category.name)}
                        className="w-full px-4 py-3 flex justify-between items-center text-sm bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      >
                        <span className="flex items-center gap-2">
                          <span className="text-lg">{category.icon}</span>
                          {category.name}
                        </span>
                        <span className={`${isOpen ? "rotate-180" : ""}`}>
                          ▼
                        </span>
                      </button>

                      {isOpen && (
                        <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                          {category.diseases.map((d) => (
                            <label
                              key={d}
                              className={`flex items-center gap-2 p-2 rounded cursor-pointer
                                ${
                                  profile.diseases?.includes(d)
                                    ? "bg-zinc-100 dark:bg-zinc-800"
                                    : "hover:bg-zinc-50 dark:hover:bg-zinc-900"
                                }
                              `}
                            >
                              <input
                                type="checkbox"
                                checked={profile.diseases?.includes(d) ?? false}
                                onChange={() => toggleDisease(d)}
                                className="w-4 h-4"
                              />
                              <span>{d}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* 저장 */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 rounded bg-black dark:bg-white text-white dark:text-black text-sm"
            >
              {saving ? "저장 중..." : "프로필 저장"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
