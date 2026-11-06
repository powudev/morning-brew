import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 靜態輸出到 out/,部署到 Cloudflare Pages;寫入類 API 由 functions/ 的 Pages Function 處理
  output: "export",
  // /menu -> /menu/index.html,Cloudflare Pages 不需額外 rewrite
  trailingSlash: true,
  // 靜態輸出不支援預設 image loader;圖片預先轉 WebP/AVIF
  images: { unoptimized: true },
  // 兩個語系各有根 layout,未匹配路由的 404 由 app/global-not-found.tsx 處理
  experimental: { globalNotFound: true },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
