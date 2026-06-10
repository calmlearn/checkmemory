import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import Navbar from "@/components/Navbar"
import { Toaster } from "@/components/ui/sonner"
import { ThemeProvider } from "@/lib/theme"
import { THEME_IDS } from "@/lib/theme-config"

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
                  var ids = ${JSON.stringify(THEME_IDS)};
                  if (theme && ids.indexOf(theme) !== -1) {
                    document.documentElement.setAttribute('data-theme', theme);
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-background">
        {/* 跳到主内容的链接（键盘用户可见） */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-lg focus:text-sm focus:font-medium"
        >
          跳到主要内容
        </a>
        <ThemeProvider>
          <Navbar />
          <main id="main-content" className="flex-1 container mx-auto px-4 py-6">
            {children}
          </main>
          <footer className="gradient-divider py-4 text-center text-sm text-muted-foreground">
            <div className="container mx-auto px-4">
              记忆助手
            </div>
          </footer>
          <Toaster position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  )
}
