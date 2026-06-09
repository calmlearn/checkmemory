"use client"

import { useState } from "react"
import { BookOpen, Loader2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createSupabaseBrowserClient } from "@/lib/supabase-client"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)

  const handleRegister = async () => {
    if (!email || !password) {
      toast.error("请填写邮箱和密码")
      return
    }
    if (password.length < 6) {
      toast.error("密码至少 6 位")
      return
    }
    if (password !== confirmPassword) {
      toast.error("两次密码输入不一致")
      return
    }
    setLoading(true)
    const supabase = createSupabaseBrowserClient()
    const { error } = await supabase.auth.signUp({ email, password })
    setLoading(false)

    if (error) {
      toast.error("注册失败", { description: error.message })
      return
    }
    toast.success("注册成功！验证邮件已发送到您的 QQ 邮箱，请查收并点击链接完成验证（如未收到请检查垃圾箱）")
    router.push("/auth/login")
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <BookOpen className="h-10 w-10 text-primary mx-auto mb-2" />
          <CardTitle className="text-2xl">注册</CardTitle>
          <CardDescription>创建一个新账号</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            type="email"
            placeholder="邮箱"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            type="password"
            placeholder="密码（至少6位）"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Input
            type="password"
            placeholder="确认密码"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleRegister()}
          />
          <Button className="w-full" onClick={handleRegister} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            注册
          </Button>
          <p className="text-sm text-center text-muted-foreground">
            已有账号？
            <Link href="/auth/login" className="text-primary hover:underline ml-1">
              登录
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
