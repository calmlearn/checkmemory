"use client"

import { useState, useEffect } from "react"
import { User, LogOut, Mail, Shield, Loader2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { createSupabaseBrowserClient } from "@/lib/supabase-client"
import { useRouter } from "next/navigation"

export default function ProfilePage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createSupabaseBrowserClient()
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) {
        setEmail(data.user.email)
        setIsAdmin(data.user.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL)
      }
      setLoading(false)
    })
  }, [])

  const handleLogout = async () => {
    const supabase = createSupabaseBrowserClient()
    await supabase.auth.signOut()
    router.push("/auth/login")
    router.refresh()
  }

  if (loading) {
    return <div className="max-w-md mx-auto py-20 text-center"><Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" /></div>
  }

  return (
    <div className="max-w-md mx-auto space-y-6 py-10">
      <div className="text-center space-y-2">
        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <User className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">个人中心</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            账号信息
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">邮箱</span>
            <span className="text-sm font-medium">{email}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">角色</span>
            {isAdmin ? (
              <Badge className="gap-1">
                <Shield className="h-3 w-3" /> 管理员
              </Badge>
            ) : (
              <Badge variant="secondary">普通用户</Badge>
            )}
          </div>
          {isAdmin && (
            <p className="text-xs text-muted-foreground mt-2">
              管理员账号：AI 提取不限次数
            </p>
          )}
        </CardContent>
      </Card>

      <Button variant="outline" className="w-full gap-2" onClick={handleLogout}>
        <LogOut className="h-4 w-4" /> 退出登录
      </Button>
    </div>
  )
}
