"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

const TABS = [
  { href: "/admin/bookings", label: "預約查詢" },
  { href: "/admin/sessions", label: "名額管理" }
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
    <div className="min-h-screen bg-white">
      <header className="border-b border-black/10">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <nav className="flex gap-1">
            {TABS.map((tab) => {
              const active = pathname === tab.href;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`rounded px-3 py-1.5 text-sm font-bold ${
                    active ? "bg-black text-white" : "text-black/70 hover:bg-black/5"
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
            className="rounded border border-black/20 px-3 py-1 text-sm hover:bg-black/5 disabled:opacity-40"
          >
            {loggingOut ? "登出中…" : "登出"}
          </button>
        </div>
      </header>
      {children}
    </div>
  );
}
