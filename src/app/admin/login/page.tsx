"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "登入失敗");
        return;
      }
      router.push("/admin/bookings");
      router.refresh();
    } catch {
      setError("網路異常，請稍後再試一次");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-paper p-6">
      <div className="w-full max-w-sm rounded-blob border-[3px] border-ink bg-card p-6 shadow-hardlg">
        <h1 className="mb-6 font-display text-xl font-bold text-ink">體驗登記系統｜後台登入</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm font-bold text-ink">
            帳號
            <input
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 h-10 w-full rounded-eight border-2 border-ink bg-card px-3 font-normal focus:border-[3px] focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/30"
            />
          </label>
          <label className="block text-sm font-bold text-ink">
            密碼
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 h-10 w-full rounded-eight border-2 border-ink bg-card px-3 font-normal focus:border-[3px] focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/30"
            />
          </label>
          {error && <p className="text-sm font-bold text-red">{error}</p>}
          <Button type="submit" variant="continue" disabled={submitting}>
            {submitting ? "登入中…" : "登入"}
          </Button>
        </form>
      </div>
    </main>
  );
}
