import { NextResponse } from "next/server"

/**
 * AI 提取 API
 * 接收文档文本，调用 DeepSeek API 提取问题和知识点
 */

// DeepSeek API 配置
const API_KEY = process.env.DEEPSEEK_API_KEY
const API_URL = "https://api.deepseek.com/v1/chat/completions"

/** 系统提示词 - 指导 AI 如何提取问答 */
const SYSTEM_PROMPT = `你是一个专业的知识点提取助手。你的任务是从用户提供的文档内容中，尽可能完整地提取所有"问题-答案"对，帮助用户复习记忆。

核心要求：
1. 提取文档中每一个可以转化为问答的知识点，不要遗漏
2. 如果文档中有明确的标题/章节，每个标题都可以作为一个问题（如"什么是XXX？"）
3. 对于列举型内容（如"第一点、第二点"），每条都要提取为单独的问答对
4. 问题要清晰具体，答案要准确完整
5. 返回格式必须是 JSON 数组，每个元素包含 question 和 answer 字段
6. 使用中文输出
7. 务必尽可能多地提取，宁多勿少

返回格式示例：
[
  {"question": "问题内容", "answer": "答案内容"},
  {"question": "问题内容", "answer": "答案内容"}
]`

export async function POST(request: Request) {
  try {
    // 检查 API 密钥
    if (!API_KEY) {
      return NextResponse.json(
        { error: "服务端未配置 DeepSeek API 密钥，请在 .env.local 中设置 DEEPSEEK_API_KEY" },
        { status: 500 }
      )
    }

    // 解析请求体
    const { text, title } = await request.json()

    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "请提供有效的文本内容" },
        { status: 400 }
      )
    }

    if (text.length < 10) {
      return NextResponse.json(
        { error: "文本内容太少，无法提取知识点" },
        { status: 400 }
      )
    }

    // 调用 DeepSeek API（兼容 OpenAI 格式）
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        max_tokens: 16384,
        temperature: 0.3,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `请从以下文档内容中提取知识点问答对。请仔细阅读全文，提取所有可能的考点，不要遗漏。\n\n文档标题：${title || "未命名"}\n\n文档内容：\n${text.slice(0, 60000)}`,
          },
        ],
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("DeepSeek API 错误:", response.status, errorText)
      return NextResponse.json(
        { error: "AI 服务调用失败，请稍后重试" },
        { status: 502 }
      )
    }

    const data = await response.json()

    // OpenAI 兼容格式解析
    const content = data.choices?.[0]?.message?.content
    if (!content) {
      return NextResponse.json(
        { error: "AI 返回结果为空" },
        { status: 502 }
      )
    }

    // 尝试从返回内容中提取 JSON
    let questions: { question: string; answer: string }[]

    try {
      // 尝试直接解析
      questions = JSON.parse(content)
    } catch {
      // 如果直接解析失败，尝试从 markdown 代码块中提取 JSON
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (jsonMatch) {
        questions = JSON.parse(jsonMatch[1].trim())
      } else {
        // 尝试从文本中提取数组部分
        const arrayMatch = content.match(/\[[\s\S]*\]/)
        if (arrayMatch) {
          questions = JSON.parse(arrayMatch[0])
        } else {
          console.error("无法解析 AI 返回内容:", content)
          return NextResponse.json(
            { error: "AI 返回格式异常，请重试" },
            { status: 502 }
          )
        }
      }
    }

    // 确保结果是数组
    if (!Array.isArray(questions)) {
      return NextResponse.json(
        { error: "AI 返回格式异常" },
        { status: 502 }
      )
    }

    // 过滤无效条目
    questions = questions.filter(
      (q) => q.question && q.answer && q.question.trim() && q.answer.trim()
    )

    return NextResponse.json({ questions })
  } catch (error) {
    console.error("提取 API 错误:", error)
    return NextResponse.json(
      { error: "服务器内部错误，请稍后重试" },
      { status: 500 }
    )
  }
}
