"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BookOpen, FileText, BarChart3 } from "lucide-react"
import ThemeSwitcher from "@/components/ThemeSwitcher"

const navItems = [
  { href: "/", label: "我的文档", icon: FileText },
  { href: "/quiz", label: "开始测验", icon: BookOpen },
  { href: "/statistics", label: "学习统计", icon: BarChart3 },
]

export default function Navbar() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* 网站名称 */}
        <Link href="/" className="flex items-center gap-2 font-bold text-xl text-primary">
          <BookOpen className="h-6 w-6" />
          <span>记忆助手</span>
        </Link>

        {/* 导航链接 */}
        <nav className="flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                <item.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            )
          })}
          <div className="ml-2 border-l pl-2 border-border">
            <ThemeSwitcher />
          </div>
        </nav>
      </div>
    </header>
  )
}
