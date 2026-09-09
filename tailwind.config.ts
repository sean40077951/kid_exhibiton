import type { Config } from "tailwindcss";

// 「Monster Play System」設計系統色票／規範，來源：ui/_preview/10_色票與規範.png
// 硬邊插畫風格：純位移陰影（無模糊）、3px 墨黑描邊、大圓角。
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        paper: "#FCF9F3", // 頁面底色
        card: "#FFFDF9", // 卡片底色
        ink: "#121212", // 文字與描邊
        muted: "#7A736A", // 次要文字
        line: "#E2DCD1", // 分隔線／停用
        red: "#D8362B", // 警示／進度
        yellow: "#EFB11F", // 強調／滲透
        green: "#2F8F5B", // 可用／成功
        teal: "#4FA5A0", // 策展區
        purple: "#6E4E9E", // disco 區
        navy: "#274C9B", // 資訊／等中
        orange: "#E8571F", // 加油站
        stone: "#9C9691", // 停用按鈕
        hotred: "#E8231A", // 送出鍵
        hotyellow: "#FFC81E" // 送出鍵按下
      },
      borderRadius: {
        eight: "8px",
        toy: "24px",
        blob: "32px"
        // pill 用 tailwind 內建的 rounded-full 即可
      },
      boxShadow: {
        hardsm: "3px 3px 0 #121212",
        hard: "4px 4px 0 #121212",
        hardlg: "6px 6px 0 #121212"
      },
      fontFamily: {
        sans: ["'Noto Sans TC'", "'Noto Sans TC Ext'", "'PingFang TC'", "'Microsoft JhengHei'", "sans-serif"],
        display: ["'Bricolage Grotesque'", "'Noto Sans TC'", "'Noto Sans TC Ext'", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;
