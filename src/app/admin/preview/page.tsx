"use client";

import { useState } from "react";
import BookingWizard from "@/components/booking/BookingWizard";
import { todayDateStringInTaipei } from "@/lib/timezone";

const WEEKDAY = ["日", "一", "二", "三", "四", "五", "六"];

function shiftDate(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// 讓管理者提前檢查「某一天」的前台畫面會長怎樣：場次資料有沒有排對、
// 場次一多會不會跑版。下面實際渲染的是跟民眾看到的完全一樣的 BookingWizard，
// 只是關閉了 QR 門禁與展期結束判斷、送出登記時不會真的建立預約（見 previewMode）。
export default function AdminPreviewPage() {
  const today = todayDateStringInTaipei();
  const [date, setDate] = useState(today);

  const weekday = WEEKDAY[new Date(`${date}T12:00:00+08:00`).getDay()];

  return (
    <main className="mx-auto max-w-[1400px] p-4">
      <h1 className="mb-1 font-display text-xl font-bold text-ink">前台預覽</h1>
      <p className="mb-4 text-xs text-muted">
        下面看到的畫面跟民眾在該日期會看到的完全一樣，僅供檢視——這裡按「確認登記」不會真的建立預約。
      </p>

      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-eight border-2 border-ink bg-card p-3">
        <button
          type="button"
          onClick={() => setDate((d) => shiftDate(d, -1))}
          className="rounded-eight border-2 border-ink px-3 py-1.5 text-sm font-bold text-ink hover:bg-line/40"
        >
          ← 前一天
        </button>
        <input
          type="date"
          value={date}
          onChange={(e) => e.target.value && setDate(e.target.value)}
          className="rounded-eight border-2 border-ink bg-card px-2 py-1.5 text-sm"
        />
        <button
          type="button"
          onClick={() => setDate((d) => shiftDate(d, 1))}
          className="rounded-eight border-2 border-ink px-3 py-1.5 text-sm font-bold text-ink hover:bg-line/40"
        >
          後一天 →
        </button>
        {date !== today && (
          <button
            type="button"
            onClick={() => setDate(today)}
            className="rounded-eight border-2 border-dashed border-line px-3 py-1.5 text-xs font-bold text-muted hover:bg-line/40"
          >
            回到今天
          </button>
        )}
        <span className="ml-auto text-xs font-bold text-muted">
          {date.replace(/-/g, "/")}（週{weekday}）
        </span>
      </div>

      <div className="overflow-hidden rounded-eight border-2 border-dashed border-line">
        <BookingWizard previewMode previewDate={date} />
      </div>
    </main>
  );
}
