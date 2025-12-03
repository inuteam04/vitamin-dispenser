"use client";

import {
  useEffect,
  useState,
  useCallback,
  ChangeEvent,
  FormEvent,
} from "react";
import Link from "next/link";
import { auth, db } from "@/lib/firebase";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  User,
} from "firebase/auth";
import { ref, get, set } from "firebase/database";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  loadDiseaseRules,
  DiseaseRule,
  getDiseaseCategories,
  DiseaseCategory,
} from "@/lib/diseaseRules";

type Sex = "male" | "female" | "other" | "";

type UserProfile = {
  name: string;
  age: number | null;
  sex: Sex;
  diseases: string[];
};

const defaultProfile: UserProfile = {
  name: "",
  age: null,
  sex: "",
  diseases: [],
};

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);
  const [profileLoading, setProfileLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);

  const [diseaseRules, setDiseaseRules] = useState<DiseaseRule[]>([]);
  const [diseaseLoading, setDiseaseLoading] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set()
  );

  // Auth 상태 감시
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setAuthLoading(false);

      if (firebaseUser) {
        setProfileLoading(true);
        try {
          const snap = await get(ref(db, `users/${firebaseUser.uid}/profile`));
          if (snap.exists()) {
            const data = snap.val() as Partial<UserProfile>;
            setProfile({
              ...defaultProfile,
              ...data,
              diseases: Array.isArray(data.diseases) ? data.diseases : [],
            });
          } else {
            setProfile(defaultProfile);
          }
        } catch (err) {
          console.error("Failed to load profile", err);
        } finally {
          setProfileLoading(false);
        }
      } else {
        setProfile(defaultProfile);
      }
    });
    return () => unsub();
  }, []);

  // 지병 데이터 로드
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

  const diseaseOptions = Array.from(
    new Set(diseaseRules.map((r) => r.label || r.value).filter(Boolean))
  ).sort();

  const diseaseCategories = getDiseaseCategories(diseaseOptions);

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

  const getCategorySelectedCount = (category: DiseaseCategory) => {
    return category.diseases.filter((d) => profile.diseases.includes(d)).length;
  };

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: unknown) {
      console.error(err);
      setAuthError(err instanceof Error ? err.message : "로그인 실패");
    }
  };

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (err: unknown) {
      console.error(err);
      setAuthError(err instanceof Error ? err.message : "회원가입 실패");
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  const handleProfileChange =
    (field: keyof UserProfile) =>
    (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      if (field === "age") {
        const value = e.target.value;
        setProfile((prev) => ({
          ...prev,
          age: value ? Number(value) : null,
        }));
      } else {
        setProfile((prev) => ({
          ...prev,
          [field]: e.target.value,
        }));
      }
    };

  const toggleDisease = (disease: string) => {
    setProfile((prev) => ({
      ...prev,
      diseases: prev.diseases.includes(disease)
        ? prev.diseases.filter((d) => d !== disease)
        : [...prev.diseases, disease],
    }));
  };

  const handleSaveProfile = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (!user) return;
      setSaving(true);
      try {
        await set(ref(db, `users/${user.uid}/profile`), profile);
      } catch (err) {
        console.error("Failed to save profile", err);
      } finally {
        setSaving(false);
      }
    },
    [user, profile]
  );

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-black">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-black dark:border-white"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white">
      {/* 헤더 */}
      <header className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-3xl mx-auto px-6 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-light tracking-tight">프로필</h1>
            <p className="text-zinc-500 text-sm mt-1">
              사용자 정보 및 건강 프로필 관리
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

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-8">
        {/* 로그인 상태 표시 */}
        <section className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-medium">계정</h2>
              {user ? (
                <p className="text-sm text-zinc-500 mt-1">{user.email}</p>
              ) : (
                <p className="text-sm text-zinc-500 mt-1">
                  로그인이 필요합니다
                </p>
              )}
            </div>
            {user && (
              <button
                onClick={handleLogout}
                className="text-sm text-zinc-500 hover:text-black dark:hover:text-white"
              >
                로그아웃
              </button>
            )}
          </div>
        </section>

        {/* 로그인 폼 (비로그인 시) */}
        {!user && (
          <section className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-6">
            <h2 className="text-lg font-medium mb-4">로그인</h2>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm text-zinc-600 dark:text-zinc-400 mb-1">
                  이메일
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded bg-transparent text-sm"
                  placeholder="example@email.com"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-600 dark:text-zinc-400 mb-1">
                  비밀번호
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded bg-transparent text-sm"
                  placeholder="6자 이상"
                />
              </div>
              {authError && <p className="text-sm text-red-500">{authError}</p>}
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="px-6 py-2 bg-black dark:bg-white text-white dark:text-black rounded text-sm font-medium"
                >
                  로그인
                </button>
                <button
                  type="button"
                  onClick={handleRegister}
                  className="px-6 py-2 border border-zinc-300 dark:border-zinc-700 rounded text-sm"
                >
                  회원가입
                </button>
              </div>
            </form>
          </section>
        )}

        {/* 프로필 설정 (로그인 시) */}
        {user && (
          <form onSubmit={handleSaveProfile} className="space-y-6">
            <section className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-6">
              <h2 className="text-lg font-medium mb-4">기본 정보</h2>
              {profileLoading ? (
                <p className="text-sm text-zinc-500">로딩 중...</p>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-zinc-600 dark:text-zinc-400 mb-1">
                      이름
                    </label>
                    <input
                      type="text"
                      value={profile.name}
                      onChange={handleProfileChange("name")}
                      className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded bg-transparent text-sm"
                      placeholder="홍길동"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-zinc-600 dark:text-zinc-400 mb-1">
                        나이
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={120}
                        value={profile.age ?? ""}
                        onChange={handleProfileChange("age")}
                        className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded bg-transparent text-sm"
                        placeholder="25"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-zinc-600 dark:text-zinc-400 mb-1">
                        성별
                      </label>
                      <select
                        value={profile.sex}
                        onChange={handleProfileChange("sex")}
                        className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded bg-transparent text-sm"
                      >
                        <option value="">선택</option>
                        <option value="male">남성</option>
                        <option value="female">여성</option>
                        <option value="other">기타</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </section>

            <section className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-6">
              <h2 className="text-lg font-medium mb-4">건강 정보</h2>
              <p className="text-sm text-zinc-500 mb-4">
                해당되는 질환을 선택하세요. 맞춤 영양 분석에 활용됩니다.
              </p>
              {diseaseLoading ? (
                <p className="text-sm text-zinc-500">로딩 중...</p>
              ) : (
                <div className="space-y-3">
                  {diseaseCategories.map((category) => {
                    const isExpanded = expandedCategories.has(category.name);
                    const selectedCount = getCategorySelectedCount(category);

                    return (
                      <div
                        key={category.name}
                        className="border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden"
                      >
                        {/* 카테고리 헤더 */}
                        <button
                          type="button"
                          onClick={() => toggleCategory(category.name)}
                          className="w-full px-4 py-3 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-lg">{category.icon}</span>
                            <span className="font-medium text-sm">
                              {category.name}
                            </span>
                            <span className="text-xs text-zinc-500">
                              ({category.diseases.length}개)
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            {selectedCount > 0 && (
                              <span className="px-2 py-0.5 bg-black dark:bg-white text-white dark:text-black text-xs rounded-full">
                                {selectedCount}개 선택
                              </span>
                            )}
                            <span
                              className={`text-zinc-400 transition-transform ${
                                isExpanded ? "rotate-180" : ""
                              }`}
                            >
                              ▼
                            </span>
                          </div>
                        </button>

                        {/* 질환 목록 */}
                        {isExpanded && (
                          <div className="p-4 grid grid-cols-2 md:grid-cols-3 gap-2 border-t border-zinc-200 dark:border-zinc-800">
                            {category.diseases.map((name) => (
                              <label
                                key={name}
                                className={`flex items-center gap-2 text-sm cursor-pointer p-2 rounded transition-colors ${
                                  profile.diseases.includes(name)
                                    ? "bg-zinc-100 dark:bg-zinc-800"
                                    : "hover:bg-zinc-50 dark:hover:bg-zinc-900"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={profile.diseases.includes(name)}
                                  onChange={() => toggleDisease(name)}
                                  className="w-4 h-4 accent-black dark:accent-white"
                                />
                                <span>{name}</span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              {profile.diseases.length > 0 && (
                <div className="mt-4 p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
                  <p className="text-xs text-zinc-500 mb-2">선택된 질환:</p>
                  <div className="flex flex-wrap gap-2">
                    {profile.diseases.map((d) => (
                      <span
                        key={d}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded text-xs"
                      >
                        {d}
                        <button
                          type="button"
                          onClick={() => toggleDisease(d)}
                          className="text-zinc-400 hover:text-red-500 ml-1"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </section>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-8 py-3 bg-black dark:bg-white text-white dark:text-black rounded font-medium text-sm uppercase tracking-wider disabled:opacity-50"
              >
                {saving ? "저장 중..." : "프로필 저장"}
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
