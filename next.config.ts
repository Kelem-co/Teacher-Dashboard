import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Let Next.js handle HMR inherently, no need for the custom Vite HMR logic
  env: {
    GEMINI_API_KEY: process.env.GEMINI_API_KEY || "",
  }
};

export default nextConfig;
