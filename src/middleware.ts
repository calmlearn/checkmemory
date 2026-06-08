import { type NextRequest } from "next/server"
import { updateSession } from "@/lib/supabase-middleware"

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    // 所有页面都需要登录（除了 auth 开头的）
    "/((?!_next/static|_next/image|favicon.ico|auth/.*).*)",
  ],
}
