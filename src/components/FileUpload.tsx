"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { Upload, FileText, X, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { parseFile, type FileType } from "@/lib/file-parser"
import { addDocument, addQuestions } from "@/lib/db"

interface FileUploadProps {
  /** 上传成功后的回调 */
  onSuccess?: () => void
}

export default function FileUpload({ onSuccess }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentFile, setCurrentFile] = useState<File | null>(null)
  const [progressText, setProgressText] = useState("")
  const [usageInfo, setUsageInfo] = useState<{
    used: number
    limit: number
    remaining: number
    isAdmin: boolean
    maxFileSizeMB: number
  } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20MB

  // 获取当前用户的使用量信息
  useEffect(() => {
    fetch("/api/usage")
      .then((r) => r.json())
      .then((data) => setUsageInfo(data))
      .catch(() => {})
  }, [])

  /** 检查文件类型是否支持 */
  const isSupportedFile = (file: File): boolean => {
    const name = file.name.toLowerCase()
    return name.endsWith(".pdf") || name.endsWith(".docx") || name.endsWith(".pptx")
  }

  /** 处理上传的文件 */
  const handleFile = useCallback(async (file: File) => {
    if (!isSupportedFile(file)) {
      toast.error("不支持的文件格式", {
        description: "请上传 PDF、Word (.docx) 或 PPT (.pptx) 文件",
      })
      return
    }

    if (!usageInfo?.isAdmin && file.size > MAX_FILE_SIZE) {
      toast.error("文件太大", {
        description: "非管理员用户上传的文件不能超过 20MB",
      })
      return
    }

    setCurrentFile(file)
    setIsProcessing(true)
    setProgressText("正在解析文件...")

    try {
      // 1. 解析文件内容
      const parseResult = await parseFile(file)

      setProgressText("正在调用 AI 提取知识点（文档较长请耐心等待）...")

      // 2. 将文档存入本地数据库
      const docId = await addDocument({
        title: parseResult.title,
        fileType: parseResult.fileType,
        status: "processing",
        createdAt: new Date(),
      })

      // 3. 调用 AI 提取问题和答案（120s 超时，移动端网络可能较慢）
      const extractAbort = new AbortController()
      const extractTimeout = setTimeout(() => extractAbort.abort(), 120_000)

      const response = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: extractAbort.signal,
        body: JSON.stringify({
          text: parseResult.text,
          title: parseResult.title,
        }),
      })
      clearTimeout(extractTimeout)

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: "AI 提取失败，请稍后重试" }))
        throw new Error(errData.error || "AI 提取失败，请稍后重试")
      }

      const data = await response.json()
      const qaList = data.questions

      if (!qaList || qaList.length === 0) {
        throw new Error("未能从文件中提取出题目，请检查文件内容")
      }

      // 4. 将提取的题目存入本地数据库
      const questions = qaList.map((qa: { question: string; answer: string }) => ({
        documentId: docId,
        question: qa.question,
        answer: qa.answer,
        isBookmarked: false,
        createdAt: new Date(),
      }))

      await addQuestions(questions)

      // 5. 更新文档状态为完成
      const { updateDocumentStatus } = await import("@/lib/db")
      await updateDocumentStatus(docId, "completed")

      if (data.partial) {
        toast.warning("提取完成（部分内容可能有遗漏）", {
          description: `共提取了 ${questions.length} 道题目。${data.message || ""}`,
        })
      } else {
        toast.success("提取完成！", {
          description: `共提取了 ${questions.length} 道题目`,
        })
      }

      setCurrentFile(null)
      onSuccess?.()
    } catch (error) {
      const message = error instanceof Error ? error.message : "处理失败"
      const detail = error instanceof Error ? error.stack || "" : ""
      console.error("文件提取失败:", message, detail, {
        fileName: currentFile?.name,
        fileSize: currentFile?.size,
      })
      // 区分超时错误，给更友好的提示
      if (error instanceof DOMException && error.name === "AbortError") {
        toast.error("处理超时", {
          description: "提取耗时较长，请在网络稳定的环境下重试，或尝试较小的文件",
        })
      } else {
        toast.error("处理失败", { description: message })
      }
    } finally {
      setIsProcessing(false)
      setProgressText("")
      setCurrentFile(null)
    }
  }, [onSuccess, usageInfo?.isAdmin])

  /** 拖拽事件 */
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile]
  )

  /** 点击上传 */
  const handleClick = () => {
    inputRef.current?.click()
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    // 重置 input，允许重复上传同一文件
    e.target.value = ""
  }

  return (
    <div>
      {/* 隐藏的文件选择器 */}
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,.pptx"
        className="hidden"
        onChange={handleInputChange}
      />

      {/* 拖拽上传区域 */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={isProcessing ? undefined : handleClick}
        onKeyDown={isProcessing ? undefined : (e) => { if (e.key === "Enter" || e.key === " ") handleClick() }}
        role="button"
        tabIndex={isProcessing ? -1 : 0}
        aria-label="点击上传或拖拽文件到此处"
        className={`
          relative border-2 border-dashed rounded-xl p-12 text-center cursor-pointer
          transition-all duration-200
          ${
            isDragging
              ? "border-primary bg-primary/5 scale-[1.02]"
              : "border-muted-foreground/25 hover:border-primary/50 hover:bg-accent/50"
          }
          ${isProcessing ? "pointer-events-none opacity-70" : ""}
        `}
      >
        {isProcessing ? (
          /* 处理中的状态 */
          <div className="flex flex-col items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
            <div>
              <p className="text-lg font-medium">正在处理...</p>
              <p className="text-sm text-muted-foreground mt-1">{progressText}</p>
            </div>
            {currentFile && (
              <p className="text-sm text-muted-foreground">
                {currentFile.name}
              </p>
            )}
            {/* 进度条 */}
            <div className="w-48 h-1.5 bg-secondary rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full animate-pulse" style={{ width: "60%" }} />
            </div>
          </div>
        ) : (
          /* 默认状态 */
          <div className="flex flex-col items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Upload className="h-8 w-8 text-primary" />
            </div>
            <div>
              <p className="text-lg font-medium">
                点击上传或拖拽文件到此处
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                支持 PDF、Word (.docx)、PPT (.pptx) 格式
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 使用量信息 */}
      {usageInfo && (
        <div className="mt-3 text-sm text-muted-foreground text-center">
          {usageInfo.isAdmin ? (
            <span>👑 管理员：文件大小不限，提取次数不限</span>
          ) : (
            <span>
              📊 今日剩余提取 <strong>{usageInfo.remaining}/{usageInfo.limit}</strong> 次
              {" | "}
              📁 文件最大 <strong>{usageInfo.maxFileSizeMB}MB</strong>
            </span>
          )}
        </div>
      )}
    </div>
  )
}
