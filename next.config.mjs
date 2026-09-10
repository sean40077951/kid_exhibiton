/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Next.js 14 要手動開這個才會執行 instrumentation.ts（15 版之後預設就會執行，不用開）。
  // 用來在伺服器啟動時註冊每日自動備份的排程（見 src/instrumentation.ts）。
  experimental: {
    instrumentationHook: true
  }
};

export default nextConfig;
