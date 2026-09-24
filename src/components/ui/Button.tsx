"use client";

import { ButtonHTMLAttributes } from "react";

type Variant = "submit" | "continue" | "secondary" | "pink" | "pink-outline";

const VARIANT_CLASS: Record<Variant, string> = {
  // 送出鍵：主要送出動作（確認送出、已確認資料無誤）
  submit: "bg-hotred text-white active:bg-hotyellow active:text-ink",
  // 可繼續：一般的下一步／彈窗確認
  continue: "bg-green text-white",
  // 次要動作：返回、再預約另一天
  secondary: "bg-paper text-ink",
  // 「體驗登記系統」新版視覺（業主提供 Figma 參考稿）用的兩種，見下面 FLAT_VARIANTS
  pink: "",
  "pink-outline": ""
};

// 新版設計沒有硬陰影／粗描邊的印刷感，走扁平圓角膠囊，這兩種要跳過舊版 base class。
const FLAT_VARIANTS: Variant[] = ["pink", "pink-outline"];
const FLAT_CLASS: Record<"pink" | "pink-outline", string> = {
  pink: "bg-pink text-white active:bg-pinkdeep disabled:bg-boxgrey disabled:text-muted",
  "pink-outline": "border-2 border-pink bg-white text-pink active:bg-pink/10 disabled:border-boxgrey disabled:text-muted"
};

// 按鈕組規範（ui/_preview/01_按鈕組.png）：圓角滿、描邊 3px 墨黑、硬陰影 4,4，
// 按下時陰影歸零、本體位移 4px（無模糊，維持印刷感）。
export default function Button({
  variant = "continue",
  className = "",
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  if (FLAT_VARIANTS.includes(variant)) {
    return (
      <button
        {...props}
        disabled={disabled}
        className={`w-full rounded-full px-6 py-3 text-base font-bold transition-colors duration-150 disabled:cursor-not-allowed ${FLAT_CLASS[variant as "pink" | "pink-outline"]} ${className}`}
      >
        {props.children}
      </button>
    );
  }

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
