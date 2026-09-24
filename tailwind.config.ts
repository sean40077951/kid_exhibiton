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
        hotyellow: "#FFC81E", // 送出鍵按下

        // 「體驗登記系統」視覺（業主提供 Figma 參考稿），只套用在使用者端預約流程，
        // 後台管理頁維持原本「Monster Play System」風格不動，所以這組是新增、不是取代。
        pink: "#EC1C8D", // 主色：按鈕／選中狀態
        pinkdeep: "#C2166F", // 按下／深色狀態
        skyblue: "#2FA3DE", // 裝飾背景（波浪）
        olive: "#C6CE49", // 裝飾背景（波浪）
        cream2: "#F7F1E3", // 卡片底色
        tagyellow: "#F0C93E", // 標籤／提醒色塊
        boxgrey: "#EFECE3" // 唯讀欄位（例如日期顯示框）底色
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
        hardlg: "6px 6px 0 #121212",
        soft: "0 8px 24px rgba(30,20,10,0.12)",
        softsm: "0 2px 10px rgba(30,20,10,0.08)"
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
