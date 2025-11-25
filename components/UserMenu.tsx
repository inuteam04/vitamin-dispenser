"use client";

import { useAuth } from "@/lib/hooks/useAuth";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

/**
 * 사용자 메뉴 컴포넌트
 * 사용자 정보 표시 및 로그아웃 기능 제공
 */
export function UserMenu() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    const loadingToast = toast.loading("로그아웃 중...");
    try {
      await logout();
      toast.success("로그아웃되었습니다.", { id: loadingToast });
      router.push("/login");
    } catch (error) {
      console.error("Logout failed:", error);
      toast.error("로그아웃에 실패했습니다.", { id: loadingToast });
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="flex items-center gap-4">
      {/* 로그아웃 버튼 */}
      <button
        onClick={handleLogout}
        className="px-4 py-2 border border-zinc-200 dark:border-zinc-800 rounded hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors text-sm uppercase tracking-wider font-medium text-black dark:text-white"
        title="로그아웃"
      >
        <span className="hidden sm:inline">Sign Out</span>
        <span className="sm:hidden">
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
        </span>
      </button>
    </div>
  );
}
