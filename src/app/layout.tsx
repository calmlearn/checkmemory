import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import Navbar from "@/components/Navbar"
import { Toaster } from "@/components/ui/sonner"
import { ThemeProvider } from "@/lib/theme"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "记忆助手 - 知识点记忆网站",
  description: "上传文档，AI自动提取知识点，随机测验帮你巩固记忆",
}

// 可用的主题列表，与 theme.ts 保持一致
const THEMES = ["blue", "green", "orange", "pink", "purple"]

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="zh-CN"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      // 在 HTML 渲染前同步读取 localStorage 设置主题，防止闪烁
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('app-theme');
                  var themes = ${JSON.stringify(THEMES)};
                  if (theme && themes.indexOf(theme) !== -1) {
                    document.documentElement.setAttribute('data-theme', theme);
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-background">
        <ThemeProvider>
          <Navbar />
          <main className="flex-1 container mx-auto px-4 py-6">
            {children}
          </main>
          <footer className="border-t py-4 text-center text-sm text-muted-foreground">
            <div className="container mx-auto px-4">
              记忆助手 - 数据保存在本地浏览器中
            </div>
          </footer>
          <Toaster position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  )
}
