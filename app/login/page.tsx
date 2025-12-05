"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { ThemeToggle } from "@/components/ThemeToggle";
import toast from "react-hot-toast";
import { Language, t } from "@/lib/i18n";

/**
 * 로그인 페이지 내용 컴포넌트
 */
function LoginContent() {
  const { user, loading, loginWithGoogle } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const [lang, setLang] = useState<Language>("ko");

  // 이미 로그인된 경우 대시보드로 리다이렉트
  useEffect(() => {
    if (!loading && user) {
      router.push("/dashboard");
    }
  }, [user, loading, router]);

  // permission_denied 에러 메시지 표시
  useEffect(() => {
    if (error === "permission_denied") {
      toast.error(t("page.login.permissionDeniedHint", lang), {
        duration: 6000,
      });
    }
  }, [error, lang]);

  // 로그인 처리
  const handleLogin = async () => {
    const loadingToast = toast.loading(t("page.login.loading", lang));
    try {
      await loginWithGoogle();
      toast.success(t("page.login.success", lang), { id: loadingToast });
      // onAuthStateChanged에서 자동으로 리다이렉트됨
    } catch (error) {
      console.error("Login failed:", error);
      if (error instanceof Error && error.message === "permission_denied") {
        toast.error(t("page.login.permissionDeniedHint", lang), {
          id: loadingToast,
          duration: 6000,
        });
      } else {
        toast.error(t("page.login.failed", lang), {
          id: loadingToast,
        });
      }
    }
  };

  // 로딩 중
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-black">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-black dark:border-white"></div>
      </div>
    );
  }

  // 이미 로그인된 경우 (리다이렉트 대기 중)
  if (user) {
    return null;
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-white dark:bg-black px-4">
      {/* 테마 토글 + 언어 토글 버튼 (우측 상단) */}
      <div className="fixed top-8 right-8 flex items-center gap-3">
        <button
          onClick={() => setLang((l) => (l === "ko" ? "en" : "ko"))}
          className="px-3 py-1.5 text-xs font-medium border border-zinc-300 dark:border-zinc-700 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        >
          {lang === "ko" ? "EN" : "한국어"}
        </button>
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md">
        {/* 로고/제목 */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-light tracking-tight mb-3 text-black dark:text-white">
            {t("page.login.title", lang)}
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 text-sm uppercase tracking-wider">
            {t("page.login.subtitle", lang)}
          </p>
        </div>

        {/* 권한 에러 메시지 */}
        {error === "permission_denied" && (
          <div className="mb-6 p-4 border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950 rounded">
            <p className="text-red-800 dark:text-red-200 text-sm text-center">
              <span className="font-medium">
                {t("page.login.permissionDenied", lang)}
              </span>
              <br />
              {t("page.login.permissionDeniedHint", lang)}
            </p>
          </div>
        )}

        {/* 로그인 카드 */}
        <div className="border border-zinc-200 dark:border-zinc-800 rounded p-8">
          <h2 className="text-2xl font-light text-black dark:text-white mb-6 text-center">
            Sign In
          </h2>

          <p className="text-zinc-600 dark:text-zinc-400 text-sm text-center mb-8">
            {lang === "ko"
              ? "대시보드에 액세스하려면 Google 계정으로 로그인하세요."
              : "Sign in with your Google account to access the dashboard."}
          </p>

          {/* Google 로그인 버튼 */}
          <button
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors text-sm uppercase tracking-wider font-medium"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            {t("page.login.googleLogin", lang)}
          </button>

          {/* 추가 정보 */}
          <p className="text-zinc-400 dark:text-zinc-600 text-xs text-center mt-6">
            {lang === "ko"
              ? "로그인하면 실시간 모니터링 및 제어 기능에 액세스할 수 있습니다."
              : "After signing in, you can access real-time monitoring and control features."}
          </p>
        </div>

        {/* 하단 링크 */}
        <Link
          href="/"
          className="mt-5 justify-center flex text-zinc-500 dark:text-zinc-500 hover:text-black dark:hover:text-white text-sm uppercase tracking-wider transition-colors"
        >
          ← {t("page.login.backToHome", lang)}
        </Link>
      </div>
    </div>
  );
}

/**
 * 로그인 페이지
 * Firebase Google 인증을 사용한 로그인
 */
export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-white dark:bg-black">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-black dark:border-white"></div>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
