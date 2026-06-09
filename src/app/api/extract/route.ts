import { NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

const API_URL = "https://api.deepseek.com/v1/chat/completions"
const ADMIN_EMAIL = process.env.ADMIN_EMAIL
const MAX_DAILY_EXTRACTIONS = parseInt(process.env.MAX_DAILY_API_CALLS || "3")

// ===== 分块配置 =====
const CHUNK_SIZE = 25000    // 每块最大字符数
const CHUNK_OVERLAP = 2000  // 块间重叠字符数
const MAX_CHUNKS = 20       // 最大分块数

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

/**
 * 智能分块：尽量在段落/句子边界切断，避免在句子中间分割
 */
function chunkText(text: string, maxChunkSize = CHUNK_SIZE, overlap = CHUNK_OVERLAP): string[] {
  if (text.length <= maxChunkSize) return [text]

  const chunks: string[] = []
  let start = 0

  while (start < text.length) {
    let end = start + maxChunkSize

    if (end < text.length) {
      // 从结束位置往前 500 字符内寻找合适的分割点
      const searchStart = Math.max(start, end - 500)
      const paragraphBreak = text.lastIndexOf("\n\n", end)
      const sentenceBreak = text.lastIndexOf("。", end)
      const lineBreak = text.lastIndexOf("\n", end)

      if (paragraphBreak > searchStart) {
        end = paragraphBreak + 1
      } else if (sentenceBreak > searchStart) {
        end = sentenceBreak + 1
      } else if (lineBreak > searchStart) {
        end = lineBreak + 1
      }
      // 都找不到就在 maxChunkSize 处硬切
    }

    chunks.push(text.slice(start, end))
    // 重叠：下一块从 end - overlap 开始，保证边界内容不丢失
    start = Math.max(start, end - overlap)
  }

  return chunks.slice(0, MAX_CHUNKS)
}

/** 合并去重：按问题前 20 个字符精确去重 */
function mergeQuestions(
  allQuestions: { question: string; answer: string }[]
): { question: string; answer: string }[] {
  const seen = new Set<string>()
  return allQuestions.filter((q) => {
    if (!q.question || !q.answer) return false
    const key = q.question.trim().slice(0, 20)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/**
 * 智能 JSON 提取：当 JSON.parse 失败时，尝试多种恢复手段
 * 返回解析后的对象，或 null（全部失败）
 */
function tryExtractJSON(content: string): { questions: { question: string; answer: string }[] } | null {
  // 第1步：直接解析
  try {
    const parsed = JSON.parse(content)
    if (parsed && typeof parsed === "object") return parsed
  } catch {
    // 继续尝试恢复
  }

  let cleaned = content

  // 第2步：去掉 Markdown 代码块标记
  cleaned = cleaned.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim()
  if (cleaned !== content) {
    try {
      const parsed = JSON.parse(cleaned)
      if (parsed && typeof parsed === "object") return parsed
    } catch {
      // 继续尝试
    }
  }

  // 第3步：正则提取 JSON 对象（最外层 {}）
  const objectMatch = cleaned.match(/\{(?:[^{}]|(?:\{[^{}]*\}))*\}/)
  if (objectMatch) {
    try {
      const parsed = JSON.parse(objectMatch[0])
      if (parsed && typeof parsed === "object") return parsed
    } catch {
      // 继续尝试
    }
  }

  // 第4步：正则提取 JSON 数组（最外层 []）
  const arrayMatch = cleaned.match(/\[(?:[^\[\]]|(?:\[[^\[\]]*\]))*\]/)
  if (arrayMatch) {
    try {
      const parsed = JSON.parse(arrayMatch[0])
      if (Array.isArray(parsed)) return { questions: parsed }
    } catch {
      // 继续尝试
    }
  }

  // 第5步：修复常见 JSON 错误后重试
  const fixes: ((s: string) => string)[] = [
    // 去掉对象/数组末尾多余的逗号
    (s) => s.replace(/,\s*}/g, "}").replace(/,\s*\]/g, "]"),
    // 去掉字符串中未转义的换行符
    (s) => s.replace(/("(?:[^"\\]|\\.)*?)\n+(")/g, "$1\\n$2"),
    // 把单引号替换为双引号（仅限 key 和 string 值）
    (s) => s.replace(/'/g, '"'),
  ]

  for (const fix of fixes) {
    try {
      const fixed = fix(cleaned)
      if (fixed === cleaned) continue
      const parsed = JSON.parse(fixed)
      if (parsed && typeof parsed === "object") return parsed
    } catch {
      continue
    }
  }

  return null
}

/**
 * 调用一次 DeepSeek API，含重试机制
 */
async function callDeepSeek(
  prompt: string,
  signal?: AbortSignal,
  retries = 1
): Promise<{ question: string; answer: string }[] | null> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        },
        signal,
        body: JSON.stringify({
          model: "deepseek-chat",
          max_tokens: 16384,
          temperature: 0.3,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content: `你是一个知识点提取助手。请从用户提供的文档中提取知识点问答对。

要求：
1. 每个独立的概念、定义、标题、列举项都提取为一对问答
2. 提取要全面，宁多勿少，不要遗漏
3. 使用中文

输出格式（直接输出 JSON，不要加任何额外文字）：
{"questions": [{"question": "问题", "answer": "答案"}, {"question": "问题", "answer": "答案"}]}

示例：
{"questions": [
  {"question": "什么是二叉树？", "answer": "二叉树是每个节点最多有两个子树的树结构"},
  {"question": "二叉树有哪些遍历方式？", "answer": "前序遍历、中序遍历、后序遍历"}
]}`,
            },
            { role: "user", content: prompt },
          ],
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(
          `DeepSeek API 错误 (尝试 ${attempt + 1}/${retries + 1}):`,
          response.status,
          errorText
        )
        if (attempt < retries) continue
        return null
      }

      const data = await response.json()
      const content = data.choices?.[0]?.message?.content

      if (!content) {
        if (attempt < retries) continue
        return null
      }

      // 解析 JSON（含智能恢复）
      const parsed = tryExtractJSON(content)
      if (!parsed) {
        console.error(`JSON 解析失败 (尝试 ${attempt + 1}/${retries + 1}):`, content.slice(0, 500))
        if (attempt < retries) continue
        return null
      }

      let questions: { question: string; answer: string }[]
      if (Array.isArray(parsed)) {
        questions = parsed
      } else if (parsed.questions && Array.isArray(parsed.questions)) {
        questions = parsed.questions
      } else {
        if (attempt < retries) continue
        return null
      }

      questions = questions.filter(
        (q) => q.question && q.answer && q.question.trim() && q.answer.trim()
      )

      return questions
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        console.error("请求超时，跳过该块")
        return null // 超时不重试
      }
      console.error(`API 调用异常 (尝试 ${attempt + 1}/${retries + 1}):`, err)
      if (attempt < retries) continue
      return null
    }
  }
  return null
}

// ===== POST 主处理函数 =====

export async function POST(request: Request) {
  try {
    // 1. 验证用户身份
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
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
      if (todayUsage >= MAX_DAILY_EXTRACTIONS) {
        return NextResponse.json(
          { error: `今日提取次数已用完（每日限制 ${MAX_DAILY_EXTRACTIONS} 次），明天再来` },
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

    // 4. 分块处理
    const chunks = chunkText(text)
    const totalChunks = chunks.length
    const allQuestions: { question: string; answer: string }[] = []
    let failedChunks = 0

    if (totalChunks === 1) {
      // 短文档：单次调用，不走分块逻辑
      const abortController = new AbortController()
      const timeout = setTimeout(() => abortController.abort(), 60000)

      const questions = await callDeepSeek(
        `请从以下文档内容中提取所有知识点问答对。\n\n文档标题：${title || "未命名"}\n\n文档内容：\n${text}`,
        abortController.signal
      )
      clearTimeout(timeout)

      if (!questions || questions.length === 0) {
        return NextResponse.json({ error: "AI 提取失败，请稍后重试" }, { status: 502 })
      }

      // 记录使用量
      if (!isAdmin) {
        await incrementUsage(user.id, supabase)
      }

      return NextResponse.json({ questions })
    }

    // --- 长文档：分段提取 ---
    console.log(
      `文档过长（${text.length} 字符），已分为 ${totalChunks} 块处理`
    )

    for (let i = 0; i < totalChunks; i++) {
      const chunkNum = i + 1
      console.log(`正在处理第 ${chunkNum}/${totalChunks} 块...`)

      const abortController = new AbortController()
      const timeout = setTimeout(() => abortController.abort(), 60000)

      const questions = await callDeepSeek(
        `你正在处理一篇长文档的第 ${chunkNum}/${totalChunks} 部分。请专注分析本段内容，提取所有知识点问答对，不要遗漏本段中的任何定义、概念、列举项、表格内容。\n\n文档标题：${title || "未命名"}\n\n文档内容（第 ${chunkNum}/${totalChunks} 部分）：\n${chunks[i]}`,
        abortController.signal
      )
      clearTimeout(timeout)

      if (questions && questions.length > 0) {
        allQuestions.push(...questions)
        console.log(`第 ${chunkNum}/${totalChunks} 块提取到 ${questions.length} 道题`)
      } else {
        failedChunks++
        console.warn(`第 ${chunkNum}/${totalChunks} 块提取失败`)
      }
    }

    // 5. 无论分了多少块，只计 1 次配额
    if (!isAdmin) {
      await incrementUsage(user.id, supabase)
    }

    // 6. 合并去重
    const merged = mergeQuestions(allQuestions)

    if (merged.length === 0) {
      return NextResponse.json(
        { error: "提取失败，未能从文档中提取出题目" },
        { status: 502 }
      )
    }

    // 7. 构造返回结果
    const result: { questions: typeof merged; partial?: boolean; message?: string } = {
      questions: merged,
    }
    if (failedChunks > 0) {
      result.partial = true
      result.message = `文档较长，部分内容提取可能不完整（${failedChunks}/${totalChunks} 块提取失败）`
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("提取 API 错误:", error)
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 })
  }
}
