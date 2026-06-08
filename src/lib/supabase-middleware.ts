import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  // ===== 网站访问密码检查 =====
  const sitePassword = process.env.SITE_PASSWORD
  const path = request.nextUrl.pathname

  // 放行 gate 页面和验证 API（不需要密码 cookie）
  if (path.startsWith("/gate") || path.startsWith("/api/verify-gate")) {
    return supabaseResponse
  }

  if (sitePassword) {
    const hasAccess = request.cookies.get("site_access")?.value === "true"
    if (!hasAccess) {
      const url = request.nextUrl.clone()
      url.pathname = "/gate"
      return NextResponse.redirect(url)
    }
  }

  // ===== 登录状态检查 =====
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user && !path.startsWith("/auth")) {
    const url = request.nextUrl.clone()
    url.pathname = "/auth/login"
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
