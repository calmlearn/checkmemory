"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { BookOpen, FileText, BarChart3, Search, LogOut, User, Shield } from "lucide-react"
import ThemeSwitcher from "@/components/ThemeSwitcher"
import SearchDialog from "@/components/SearchDialog"
import { createSupabaseBrowserClient } from "@/lib/supabase-client"
import { Button } from "@/components/ui/button"

const navItems = [
  { href: "/", label: "我的文档", icon: FileText },
  { href: "/quiz", label: "开始测验", icon: BookOpen },
  { href: "/statistics", label: "学习统计", icon: BarChart3 },
]

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const [searchOpen, setSearchOpen] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createSupabaseBrowserClient()
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? null)
      setLoading(false)
    })
  }, [])

  const handleLogout = async () => {
    const supabase = createSupabaseBrowserClient()
    await supabase.auth.signOut()
    router.push("/auth/login")
    router.refresh()
  }

  const goToProfile = () => {
    router.push("/profile")
  }

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b bg-background/40 backdrop-blur-2xl supports-[backdrop-filter]:bg-background/20">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          {/* 网站名称 */}
          <Link href="/" className="flex items-center gap-2 font-bold text-xl text-primary">
            <BookOpen className="h-6 w-6" />
            <span>记忆助手</span>
          </Link>

          {/* 右侧区域 */}
          <nav className="flex items-center gap-1" aria-label="主导航">
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
            <div className="ml-2 border-l pl-2 border-border flex items-center gap-1">
              <button
                className="inline-flex shrink-0 items-center justify-center border shadow-xs cursor-pointer h-11 w-11 rounded-full bg-transparent hover:bg-accent hover:text-accent-foreground transition-colors outline-none"
                onClick={() => setSearchOpen(true)}
                aria-label="搜索题目"
              >
                <Search className="h-5 w-5" />
              </button>
              <ThemeSwitcher />
              {!loading && userEmail && (
                <div className="flex items-center gap-1 ml-1">
                  <button
                    className="inline-flex shrink-0 items-center justify-center border shadow-xs cursor-pointer h-11 w-11 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors outline-none"
                    onClick={goToProfile}
                    aria-label="个人中心"
                  >
                    <User className="h-5 w-5" />
                  </button>
                </div>
              )}
            </div>
          </nav>
        </div>
      </header>
      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  )
}
