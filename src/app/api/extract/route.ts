import { NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

const API_URL = "https://api.deepseek.com/v1/chat/completions"
const ADMIN_EMAIL = process.env.ADMIN_EMAIL
const MAX_DAILY_CALLS = parseInt(process.env.MAX_DAILY_API_CALLS || "10")

/** 获取用户今日已调用次数 */
async function getTodayUsage(userId: string, supabase: any): Promise<number> {
  const today = new Date().toISOString().split("T")[0]
  const { data } = await supabase
    .from("user_usage")
    .select("call_count")
    .eq("user_id", userId)
    .eq("date", today)
    .maybeSingle()
  return data?.call_count ?? 0
}

/** 记录一次调用 */
async function incrementUsage(userId: string, supabase: any) {
  const today = new Date().toISOString().split("T")[0]
  const { data: existing } = await supabase
    .from("user_usage")
    .select("id, call_count")
    .eq("user_id", userId)
    .eq("date", today)
    .maybeSingle()

  if (existing) {
    await supabase
      .from("user_usage")
      .update({ call_count: existing.call_count + 1 })
      .eq("id", existing.id)
  } else {
    await supabase
      .from("user_usage")
      .insert({ user_id: userId, date: today, call_count: 1 })
  }
}

/** AI 提取 API - 带身份验证和配额控制 */
export async function POST(request: Request) {
  try {
    // 1. 验证用户身份
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

    // 2. 检查配额（管理员不限量）
    const isAdmin = user.email === ADMIN_EMAIL
    if (!isAdmin) {
      const todayUsage = await getTodayUsage(user.id, supabase)
      if (todayUsage >= MAX_DAILY_CALLS) {
        return NextResponse.json(
          { error: `今日额度已用完（每日 ${MAX_DAILY_CALLS} 次），明天再来` },
          { status: 429 }
        )
      }
    }

    // 3. 解析请求
    const { text, title } = await request.json()
    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "请提供有效的文本内容" }, { status: 400 })
    }
    if (text.length < 10) {
      return NextResponse.json({ error: "文本内容太少" }, { status: 400 })
    }

    // 4. 调用 DeepSeek API
    const maxChars = 60000
    const trimmedText = text.length > maxChars
      ? text.slice(0, maxChars) + "\n\n...（文档过长，已截取前部内容）"
      : text

    const SYSTEM_PROMPT = `你是一个专业的知识点提取助手。你的任务是**逐字逐句**阅读用户提供的文档内容，**不遗漏任何一个知识点**，将其全部提取为"问题-答案"对。

=== 强制要求 ===
1. 逐段分析文档内容，每一个独立的观点、定义、概念、标题、列举项都必须提取为单独的问答对
2. 文档中的每一个标题/小标题都应作为一个问题
3. 对于"第一、第二、第三"或"1.2.3."这类列举，每一项都要单独提取
4. 如果有表格内容，表格中的每一行都要提取为一个问答对
5. 即使是常识性内容也要提取，不要做价值判断
6. 每份文档提取的数量没有上限，提取得越多越好
7. 使用中文输出

你必须返回一个 JSON 对象，格式如下：
{
  "questions": [
    {"question": "问题内容", "answer": "答案内容"},
    {"question": "问题内容", "answer": "答案内容"}
  ]
}`

    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        max_tokens: 16384,
        temperature: 0.3,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `请从以下文档内容中提取所有知识点问答对。\n\n文档标题：${title || "未命名"}\n\n文档内容：\n${trimmedText}` },
        ],
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("DeepSeek API 错误:", response.status, errorText)
      return NextResponse.json({ error: "AI 服务调用失败，请稍后重试" }, { status: 502 })
    }

    // 5. 调用成功，记录使用量
    if (!isAdmin) {
      await incrementUsage(user.id, supabase)
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content

    // 6. 解析 JSON
    let questions: { question: string; answer: string }[]
    try {
      const parsed = JSON.parse(content)
      if (Array.isArray(parsed)) {
        questions = parsed
      } else if (parsed.questions && Array.isArray(parsed.questions)) {
        questions = parsed.questions
      } else {
        return NextResponse.json({ error: "AI 返回格式异常" }, { status: 502 })
      }
    } catch {
      console.error("JSON 解析失败:", content)
      return NextResponse.json({ error: "AI 返回格式异常" }, { status: 502 })
    }

    questions = questions.filter(
      (q) => q.question && q.answer && q.question.trim() && q.answer.trim()
    )

    return NextResponse.json({ questions })
  } catch (error) {
    console.error("提取 API 错误:", error)
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 })
  }
}
