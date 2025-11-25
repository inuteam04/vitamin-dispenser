"use client";

import { Toaster } from "react-hot-toast";

/**
 * Toast 알림 Provider
 * react-hot-toast의 Toaster 컴포넌트를 감싸는 클라이언트 컴포넌트
 */
export function ToastProvider() {
  return (
    <Toaster
      position="top-center"
      reverseOrder={false}
      toastOptions={{
        // 기본 스타일
        duration: 4000,
        style: {
          background: "var(--toast-bg)",
          color: "var(--toast-text)",
          border: "1px solid var(--toast-border)",
          padding: "12px 20px",
          fontSize: "14px",
          fontWeight: "500",
        },
        // 성공 토스트
        success: {
          duration: 3000,
          iconTheme: {
            primary: "#10b981",
            secondary: "#ffffff",
          },
        },
        // 에러 토스트
        error: {
          duration: 5000,
          iconTheme: {
            primary: "#ef4444",
            secondary: "#ffffff",
          },
        },
        // 로딩 토스트
        loading: {
          duration: Infinity,
        },
      }}
    />
  );
}
