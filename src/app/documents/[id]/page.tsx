"use client"

import { useState, useEffect, use } from "react"
import { ArrowLeft, BookOpen, Bookmark, Trash2, Loader2, Plus, PenSquare } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { getDocument, getQuestionsByDocument, toggleBookmark, addSingleQuestion, deleteQuestion } from "@/lib/db"
import type { Document, Question } from "@/types"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

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
  const [showAddForm, setShowAddForm] = useState(false)
  const [newQuestion, setNewQuestion] = useState("")
  const [newAnswer, setNewAnswer] = useState("")
  const [adding, setAdding] = useState(false)

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

  /** 添加题目 */
  const handleAddQuestion = async () => {
    const q = newQuestion.trim()
    const a = newAnswer.trim()
    if (!q || !a) {
      toast.error("请填写题目和答案")
      return
    }
    setAdding(true)
    await addSingleQuestion({
      documentId: docId,
      question: q,
      answer: a,
      isBookmarked: false,
      createdAt: new Date(),
    })
    setNewQuestion("")
    setNewAnswer("")
    setShowAddForm(false)
    const qs = await getQuestionsByDocument(docId)
    setQuestions(qs)
    setAdding(false)
    toast.success("题目已添加")
  }

  /** 删除题目 */
  const handleDeleteQuestion = async (questionId: number) => {
    if (confirm("确定要删除这道题吗？")) {
      await deleteQuestion(questionId)
      setQuestions((prev) => prev.filter((q) => q.id !== questionId))
      toast.success("题目已删除")
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto py-20 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
      </div>
    )
  }

  if (!doc) return null

  const isManual = doc.fileType === "manual"

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* 返回按钮和标题 */}
      <div className="flex items-center gap-4">
        <Link href="/">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{doc.title}</h1>
          <p className="text-sm text-muted-foreground">
            {isManual ? "手动题库" : doc.fileType.toUpperCase()} · 共 {questions.length} 道题目
          </p>
        </div>
        {isManual && (
          <Badge variant="outline" className="gap-1">
            <PenSquare className="h-3 w-3" /> 手动
          </Badge>
        )}
      </div>

      {/* 添加题目按钮/表单 */}
      <Card>
        <CardContent className="py-4">
          {showAddForm ? (
            <div className="space-y-3">
              <Input
                placeholder="输入题目..."
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
              />
              <Input
                placeholder="输入答案..."
                value={newAnswer}
                onChange={(e) => setNewAnswer(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddQuestion()}
              />
              <div className="flex gap-2">
                <Button onClick={handleAddQuestion} disabled={adding}>
                  <Plus className="h-4 w-4 mr-1" /> 添加
                </Button>
                <Button variant="ghost" onClick={() => { setShowAddForm(false); setNewQuestion(""); setNewAnswer("") }}>
                  取消
                </Button>
              </div>
            </div>
          ) : (
            <Button className="w-full gap-2" variant="outline" onClick={() => setShowAddForm(true)}>
              <Plus className="h-4 w-4" /> 添加题目
            </Button>
          )}
        </CardContent>
      </Card>

      {/* 题目列表 */}
      {questions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-muted-foreground">暂无题目</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              点击上方「添加题目」按钮来创建第一道题
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {questions.map((q, index) => (
            <Card key={q.id} className="group">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base flex items-center gap-2">
                      <span className="text-primary font-mono text-sm shrink-0">#{index + 1}</span>
                      <span className="break-words">{q.question}</span>
                    </CardTitle>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`h-8 w-8 ${
                        q.isBookmarked
                          ? "text-yellow-500"
                          : "text-muted-foreground opacity-0 group-hover:opacity-100"
                      }`}
                      onClick={() => q.id !== undefined && handleToggleBookmark(q.id)}
                    >
                      <Bookmark className="h-4 w-4" fill={q.isBookmarked ? "currentColor" : "none"} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100"
                      onClick={() => q.id !== undefined && handleDeleteQuestion(q.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="bg-accent/50 rounded-lg p-4">
                  <p className="text-sm font-medium text-muted-foreground mb-1">答案：</p>
                  <p className="text-sm whitespace-pre-wrap">{q.answer}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
