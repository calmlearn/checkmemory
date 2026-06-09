"use client"

import { useState } from "react"
import { BookOpen, Lock, Loader2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

export default function GatePage() {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!password) {
      toast.error("请输入访问密码")
      return
    }
    setLoading(true)
    const res = await fetch("/api/verify-gate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    })
    setLoading(false)

    if (res.ok) {
      window.location.href = "/auth/login"
    } else {
      toast.error("密码错误，请重试")
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/5">
      <Card className="w-full max-w-sm shadow-xl">
        <CardHeader className="text-center">
          <BookOpen className="h-12 w-12 text-primary mx-auto mb-2" />
          <CardTitle className="text-2xl">记忆助手</CardTitle>
          <CardDescription>请输入访问密码</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="password"
              placeholder="访问密码"
              className="pl-10"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              autoFocus
            />
          </div>
          <Button className="w-full" onClick={handleSubmit} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            进入
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
