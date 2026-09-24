"use client";

import Button from "./Button";

// 彈窗規範（ui/_preview/09_頁首彈窗與驗證.png）：遮罩墨黑 45% 不透明、
// 彈窗圓角 blob(32)、陰影 6,6。用於額滿、重複預約、未開放等提示。
export default function Modal({
  title,
  description,
  onClose
}: {
  title: string;
  description?: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 p-4">
      <div className="w-full max-w-sm rounded-[28px] bg-white p-6 text-center shadow-soft">
        <p className="text-lg font-bold text-ink">{title}</p>
        {description && <p className="mt-2 text-sm text-muted">{description}</p>}
        <Button variant="pink" onClick={onClose} className="mt-5">
          知道了
        </Button>
      </div>
    </div>
  );
}
