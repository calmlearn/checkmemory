/**
 * 邮箱验证回调路由
 * 用户点击验证邮件中的链接后跳转到此页面
 * 交换 auth code 为 session，然后跳转到首页
 */
import { NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/"

  if (code) {
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // 验证失败，跳转到登录页
  return NextResponse.redirect(`${origin}/auth/login?error=验证失败或链接已过期，请重新注册`)
}
