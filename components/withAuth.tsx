"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";

export function withAuth<P extends object>(
  Component: React.ComponentType<P>
): React.ComponentType<P> {
  const AuthenticatedComponent = (props: P) => {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
      // 로딩이 끝났고 사용자가 없으면 로그인 페이지로 리다이렉트
      if (!loading && !user) {
        router.push("/login");
      }
    }, [user, loading, router]);

    // 로딩 중
    if (loading) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-white dark:bg-black">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-black dark:border-white"></div>
        </div>
      );
    }

    // 인증되지 않은 경우 (리다이렉트 대기 중)
    if (!user) {
      return null;
    }

    // 인증된 경우 컴포넌트 렌더링
    return <Component {...props} />;
  };

  // 디버깅을 위한 displayName 설정
  AuthenticatedComponent.displayName = `withAuth(${
    Component.displayName || Component.name || "Component"
  })`;

  return AuthenticatedComponent;
}
