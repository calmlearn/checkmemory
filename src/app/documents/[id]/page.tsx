"use client"

import { useState, useEffect, use } from "react"
import { ArrowLeft, BookOpen, Bookmark, Trash2, Loader2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { getDocument, getQuestionsByDocument, toggleBookmark } from "@/lib/db"
import type { Document, Question } from "@/types"
import { useRouter } from "next/navigation"

interface PageProps {
  params: Promise<{ id: string }>
}

export default function DocumentDetailPage({ params }: PageProps) {
  const resolvedParams = use(params)
  const router = useRouter()
  const docId = parseInt(resolvedParams.id)
  const [doc, setDoc] = useState<Document | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (isNaN(docId)) {
        router.push("/")
        return
      }
      const document = await getDocument(docId)
      if (!document) {
        router.push("/")
        return
      }
      setDoc(document)
      const qs = await getQuestionsByDocument(docId)
      setQuestions(qs)
      setLoading(false)
    }
    load()
  }, [docId, router])

  /** 切换收藏 */
  const handleToggleBookmark = async (questionId: number) => {
    const newVal = await toggleBookmark(questionId)
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === questionId ? { ...q, isBookmarked: newVal } : q
      )
    )
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto py-20 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
      </div>
    )
  }

  if (!doc) return null

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* 返回按钮和标题 */}
      <div className="flex items-center gap-4">
        <Link href="/">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{doc.title}</h1>
          <p className="text-sm text-muted-foreground">
            {doc.fileType.toUpperCase()} · 共 {questions.length} 道题目
          </p>
        </div>
      </div>

      {/* 题目列表 */}
      {questions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-muted-foreground">暂未提取到题目</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {questions.map((q, index) => (
            <Card key={q.id} className="group">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <span className="text-primary font-mono text-sm">#{index + 1}</span>
                      {q.question}
                    </CardTitle>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-8 w-8 shrink-0 ${
                      q.isBookmarked
                        ? "text-yellow-500"
                        : "text-muted-foreground opacity-0 group-hover:opacity-100"
                    }`}
                    onClick={() => q.id !== undefined && handleToggleBookmark(q.id)}
                  >
                    <Bookmark
                      className="h-4 w-4"
                      fill={q.isBookmarked ? "currentColor" : "none"}
                    />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="bg-accent/50 rounded-lg p-4">
                  <p className="text-sm font-medium text-muted-foreground mb-1">答案：</p>
                  <p className="text-sm">{q.answer}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
