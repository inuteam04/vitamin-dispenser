"use client";

import { useEffect, useState, useCallback } from "react";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import { app } from "@/lib/firebase";

// 허용된 이메일 목록
const ALLOWED_EMAILS = [
  "seungbin@inu.ac.kr",
  "yckimdaniel@inu.ac.kr",
  "beajun22@inu.ac.kr",
  "jina040602@inu.ac.kr",
];

/**
 * Firebase Google 로그인 Hook
 */
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const auth = getAuth(app);
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser && firebaseUser.email) {
        // 허용된 이메일인지 확인
        if (ALLOWED_EMAILS.includes(firebaseUser.email)) {
          setUser(firebaseUser);
        } else {
          // 허용되지 않은 이메일이면 로그아웃
          await signOut(auth);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Google 로그인
  const loginWithGoogle = useCallback(async () => {
    const auth = getAuth(app);
    const provider = new GoogleAuthProvider();
    // 계정 선택 화면 표시
    provider.setCustomParameters({
      prompt: "select_account",
    });

    const result = await signInWithPopup(auth, provider);

    // 로그인 후 이메일 확인
    if (result.user.email && !ALLOWED_EMAILS.includes(result.user.email)) {
      await signOut(auth);
      throw new Error("permission_denied");
    }
  }, []);

  // 로그아웃
  const logout = useCallback(async () => {
    const auth = getAuth(app);
    await signOut(auth);
  }, []);

  return { user, loading, loginWithGoogle, logout };
}
