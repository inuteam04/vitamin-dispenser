"use client";

import { useState } from "react";
import Link from "next/link";

interface MenuItem {
  href: string;
  label: string;
}

interface HamburgerMenuProps {
  items?: MenuItem[];
}

const DEFAULT_MENU_ITEMS: MenuItem[] = [
  { href: "/dashboard", label: "대시보드" },
  { href: "/analyse", label: "영양 분석" },
  { href: "/profile", label: "프로필 설정" },
  { href: "/pills", label: "약 정보" },
];

export function HamburgerMenu({
  items = DEFAULT_MENU_ITEMS,
}: HamburgerMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleClose = () => setIsOpen(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
        aria-label="메뉴"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          {isOpen ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M6 18L18 6M6 6l12 12"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 6h16M4 12h16M4 18h16"
            />
          )}
        </svg>
      </button>

      {isOpen && (
        <>
          {/* 백드롭 */}
          <div className="fixed inset-0 z-40" onClick={handleClose} />
          {/* 메뉴 */}
          <div className="absolute right-0 top-12 z-50 w-48 border border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-black shadow-lg overflow-hidden">
            <nav className="py-2">
              {items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={handleClose}
                  className="block px-4 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </>
      )}
    </div>
  );
}
