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

/**
 * Firebase Google 로그인 Hook
 */
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const auth = getAuth(app);
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user ?? null);
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
    await signInWithPopup(auth, provider);
  }, []);

  // 로그아웃
  const logout = useCallback(async () => {
    const auth = getAuth(app);
    await signOut(auth);
  }, []);

  return { user, loading, loginWithGoogle, logout };
}
