"use client";

import { ButtonHTMLAttributes } from "react";

type Variant = "submit" | "continue" | "secondary";

const VARIANT_CLASS: Record<Variant, string> = {
  // 送出鍵：主要送出動作（確認送出、已確認資料無誤）
  submit: "bg-hotred text-white active:bg-hotyellow active:text-ink",
  // 可繼續：一般的下一步／彈窗確認
  continue: "bg-green text-white",
  // 次要動作：返回、再預約另一天
  secondary: "bg-paper text-ink"
};

// 按鈕組規範（ui/_preview/01_按鈕組.png）：圓角滿、描邊 3px 墨黑、硬陰影 4,4，
// 按下時陰影歸零、本體位移 4px（無模糊，維持印刷感）。
export default function Button({
  variant = "continue",
  className = "",
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      {...props}
      disabled={disabled}
      className={`w-full rounded-full border-[3px] border-ink px-6 py-3 font-display text-base font-bold shadow-hard transition-[transform,box-shadow] duration-100 active:translate-x-1 active:translate-y-1 active:shadow-none disabled:cursor-not-allowed disabled:border-ink disabled:bg-stone disabled:text-white disabled:active:translate-x-0 disabled:active:translate-y-0 disabled:active:shadow-hard ${VARIANT_CLASS[variant]} ${className}`}
    >
      {props.children}
    </button>
  );
}
