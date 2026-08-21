import type { Config } from "tailwindcss";

// 這些是「引擎」預設的佔位視覺樣式（placeholder theme）。
// 之後拿到品牌風格圖片後，直接替換這裡的色票即可套用到全站，
// 不需要改各元件的程式碼（對應 PROJECT_SPEC.md 第 11 節「設定化優先」原則）。
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: "#F3E6D8", // 底色（目前用桃色調，對應線稿）
          panel: "#FBD9BE", // 主要面板底色
          primary: "#1B5E70", // 深藍綠，主要按鈕／深色區塊
          "primary-dark": "#14424F",
          accent: "#F5A623", // 橘黃色，重點強調（場次卡片、Logo 色塊）
          success: "#3FA65B", // 完成／成功狀態
          danger: "#D64545", // 額滿／不可取消警示
          warning: "#E8B923" // 名額緊張
        }
      },
      fontFamily: {
        sans: [
          "'Noto Sans TC'",
          "system-ui",
          "-apple-system",
          "sans-serif"
        ]
      }
    }
  },
  plugins: []
};

export default config;
