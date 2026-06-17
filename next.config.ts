import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // 确保 PDF.js worker 使用的 .mjs 文件有正确的 MIME 类型
  // 见 src/lib/file-parser.ts 中的说明
  async headers() {
    return [
      {
        source: "/pdf.worker.min.js",
        headers: [{ key: "Content-Type", value: "application/javascript" }],
      },
    ]
  },
}

export default nextConfig
