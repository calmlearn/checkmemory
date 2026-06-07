import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // 当前环境不支持 Turbopack，使用 Webpack
  webpack: (config) => {
    return config
  },
}

export default nextConfig
