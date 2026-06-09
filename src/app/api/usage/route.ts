import { NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

const ADMIN_EMAIL = process.env.ADMIN_EMAIL
const MAX_DAILY = 3
const MAX_FILE_SIZE_MB = 20

export async function GET() {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll() {},
        },
      }
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 })
    }

    const isAdmin = user.email === ADMIN_EMAIL
    let todayUsage = 0

    if (!isAdmin) {
      const today = new Date().toISOString().split("T")[0]
      const { data } = await supabase
        .from("user_usage")
        .select("call_count")
        .eq("user_id", user.id)
        .eq("date", today)
        .maybeSingle()
      todayUsage = data?.call_count ?? 0
    }

    return NextResponse.json({
      used: todayUsage,
      limit: MAX_DAILY,
      remaining: isAdmin ? -1 : Math.max(0, MAX_DAILY - todayUsage),
      isAdmin,
      maxFileSizeMB: isAdmin ? -1 : MAX_FILE_SIZE_MB,
    })
  } catch (error) {
    console.error("获取使用量失败:", error)
    return NextResponse.json({ error: "服务器错误" }, { status: 500 })
  }
}
