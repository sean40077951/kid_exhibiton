"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

const TABS = [
  { href: "/admin/bookings", label: "預約查詢" },
  { href: "/admin/sessions", label: "名額管理" },
  { href: "/admin/settings", label: "活動設定" }
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  // 登入頁不需要這層導覽列（也還沒登入，不該顯示登出按鈕）。
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/admin/logout", { method: "POST" });
      router.push("/admin/login");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b-[3px] border-ink bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <nav className="flex gap-2">
            {TABS.map((tab) => {
              const active = pathname === tab.href;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`rounded-eight border-2 px-3 py-1.5 text-sm font-bold transition ${
                    active ? "border-ink bg-navy text-white" : "border-transparent text-ink hover:bg-line/40"
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="rounded-eight border-2 border-ink px-3 py-1.5 text-sm font-bold text-ink hover:bg-line/40 disabled:opacity-40"
          >
            {loggingOut ? "登出中…" : "登出"}
          </button>
        </div>
      </header>
      {children}
    </div>
  );
}
