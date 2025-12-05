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
import { Language, t } from "@/lib/i18n";

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
  const [lang, setLang] = useState<Language>("ko");

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
      toast.error(t("page.profile.loginRequired", lang));
      return;
    }

    setSaving(true);

    try {
      await set(ref(db, `users/${user.uid}/profile`), profile);
      toast.success(t("page.profile.saveSuccess", lang));
    } catch (err) {
      console.error(err);
      toast.error(t("page.profile.saveError", lang));
    } finally {
      setSaving(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-zinc-500">
        {t("page.profile.loading", lang)}
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-white dark:bg-black text-center text-zinc-500 p-20">
        <p className="mb-4">{t("page.profile.loginRequired", lang)}</p>
        <Link href="/login" className="text-blue-500 underline">
          {t("page.profile.goToLogin", lang)}
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white">
      {/* 헤더 */}
      <header className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-3xl mx-auto px-6 py-6 flex items-center justify-between">
          <h1 className="text-3xl font-light">
            {t("page.profile.title", lang)}
          </h1>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setLang((l) => (l === "ko" ? "en" : "ko"))}
              className="px-3 py-1.5 text-xs font-medium border border-zinc-300 dark:border-zinc-700 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              {lang === "ko" ? "EN" : "한국어"}
            </button>
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
            <h2 className="text-lg font-medium">
              {t("page.profile.basicInfo", lang)}
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-zinc-500">
                  {t("page.profile.name", lang)}
                </label>
                <input
                  type="text"
                  value={profile.name ?? ""}
                  onChange={handleChange("name")}
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded bg-transparent text-sm"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-500">
                  {t("page.profile.age", lang)}
                </label>
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
              <label className="text-xs text-zinc-500">
                {t("page.profile.sex", lang)}
              </label>
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
                        ? t("page.profile.male", lang)
                        : sx === "female"
                        ? t("page.profile.female", lang)
                        : t("page.profile.other", lang)}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </section>

          {/* 신체 */}
          <section className="space-y-3">
            <h2 className="text-lg font-medium">
              {lang === "ko" ? "신체 정보" : "Body Information"}
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-zinc-500">
                  {t("page.profile.height", lang)}
                </label>
                <input
                  type="number"
                  value={profile.heightCm ?? ""}
                  onChange={handleChange("heightCm")}
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded bg-transparent text-sm"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-500">
                  {t("page.profile.weight", lang)}
                </label>
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
            <h2 className="text-lg font-medium">
              {t("page.profile.activityLevel", lang)}
            </h2>

            <select
              value={profile.activityLevel ?? ""}
              onChange={handleChange("activityLevel")}
              className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded bg-transparent text-sm"
            >
              <option value="">{lang === "ko" ? "선택" : "Select"}</option>
              <option value="sedentary">
                {lang === "ko" ? "거의 운동 안함" : "Sedentary"}
              </option>
              <option value="light">
                {lang === "ko" ? "가벼운 활동" : "Lightly Active"}
              </option>
              <option value="moderate">
                {lang === "ko" ? "보통 수준" : "Moderately Active"}
              </option>
              <option value="active">
                {lang === "ko" ? "활동적" : "Active"}
              </option>
              <option value="very_active">
                {lang === "ko" ? "매우 활동적" : "Very Active"}
              </option>
            </select>
          </section>

          {/* 지병 - CSV 기반 전체 */}
          <section className="space-y-3">
            <h2 className="text-lg font-medium">
              {t("page.profile.diseases", lang)}
            </h2>

            {diseaseLoading ? (
              <p className="text-sm text-zinc-500">
                {lang === "ko"
                  ? "지병 데이터 로딩중..."
                  : "Loading health data..."}
              </p>
            ) : diseaseCategories.length === 0 ? (
              <p className="text-sm text-zinc-500">
                {lang === "ko"
                  ? "지병 데이터 없음"
                  : "No health data available"}
              </p>
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
              {saving
                ? t("page.profile.saving", lang)
                : t("page.profile.save", lang)}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
