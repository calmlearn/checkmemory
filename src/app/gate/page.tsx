"use client"

import { useRef, useState } from "react"
import { BookOpen, Lock, Loader2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"

export default function GatePage() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const password = inputRef.current?.value?.trim()
    if (!password) {
      toast.error("请输入访问密码")
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/verify-gate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      })

      if (res.ok) {
        window.location.href = "/auth/login"
      } else {
        toast.error("密码错误，请重试")
      }
    } catch {
      toast.error("网络错误，请重试")
    } finally {
      setLoading(false)
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
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={inputRef}
                type="password"
                placeholder="访问密码"
                autoComplete="current-password"
                className="pl-10"
                defaultValue=""
                autoFocus
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              进入
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
