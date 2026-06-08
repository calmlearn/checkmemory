import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function POST(request: Request) {
  const { password } = await request.json()
  const sitePassword = process.env.SITE_PASSWORD

  // 如果没有设置 SITE_PASSWORD，直接放行
  if (!sitePassword) {
    return NextResponse.json({ success: true })
  }

  if (password !== sitePassword) {
    return NextResponse.json({ success: false, error: "密码错误" }, { status: 401 })
  }

  // 设置 cookie，30 天有效
  const cookieStore = await cookies()
  cookieStore.set("site_access", "true", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 天
    path: "/",
  })

  return NextResponse.json({ success: true })
}
