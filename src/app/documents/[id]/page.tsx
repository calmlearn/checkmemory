"use client"

import { useState, useEffect, use } from "react"
import { ArrowLeft, BookOpen, Bookmark, Trash2, Loader2, Plus, PenSquare, FileText } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import ConfirmDialog from "@/components/ConfirmDialog"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"
import { getDocument, getQuestionsByDocument, toggleBookmark, addSingleQuestion, addQuestions, deleteQuestion } from "@/lib/db"
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

  // 单个添加
  const [showAddForm, setShowAddForm] = useState(false)
  const [newQuestion, setNewQuestion] = useState("")
  const [newAnswer, setNewAnswer] = useState("")
  const [adding, setAdding] = useState(false)

  // 批量添加
  const [showBatchForm, setShowBatchForm] = useState(false)
  const [batchText, setBatchText] = useState("")
  const [batchAdding, setBatchAdding] = useState(false)

  // 删除确认
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null)

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

  /** 刷新题目列表 */
  const refreshQuestions = async () => {
    const qs = await getQuestionsByDocument(docId)
    setQuestions(qs)
  }

  /** 切换收藏 */
  const handleToggleBookmark = async (questionId: number) => {
    const newVal = await toggleBookmark(questionId)
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === questionId ? { ...q, isBookmarked: newVal } : q
      )
    )
  }

  /** 单个添加题目 */
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
    await refreshQuestions()
    setAdding(false)
    toast.success("题目已添加")
  }

  /** 批量添加题目 */
  const handleBatchAdd = async () => {
    const text = batchText.trim()
    if (!text) {
      toast.error("请输入题目内容")
      return
    }

    // 解析格式：题目和答案用空行或 --- 分隔
    const pairs = text.split(/\n\s*\n|\n-{3,}\n/).filter(Boolean)
    const qaList: { question: string; answer: string }[] = []

    for (const pair of pairs) {
      const lines = pair.trim().split("\n").filter(Boolean)
      if (lines.length >= 2) {
        // 第一行是题目，剩余的合并为答案
        qaList.push({
          question: lines[0].trim(),
          answer: lines.slice(1).join("\n").trim(),
        })
      } else if (lines.length === 1) {
        // 只有一行，跳过（不完整）
        continue
      }
    }

    if (qaList.length === 0) {
      toast.error("未能解析出有效的题目，请检查格式")
      return
    }

    setBatchAdding(true)
    const questionsToAdd = qaList.map((qa) => ({
      documentId: docId,
      question: qa.question,
      answer: qa.answer,
      isBookmarked: false,
      createdAt: new Date(),
    }))
    await addQuestions(questionsToAdd)
    setBatchText("")
    setShowBatchForm(false)
    await refreshQuestions()
    setBatchAdding(false)
    toast.success(`成功添加 ${qaList.length} 道题目`)
  }

  /** 删除题目 */
  const handleDeleteQuestion = async (questionId: number) => {
    setDeleteTargetId(questionId)
  }

  const confirmDeleteQuestion = async () => {
    if (deleteTargetId === null) return
    await deleteQuestion(deleteTargetId)
    setQuestions((prev) => prev.filter((q) => q.id !== deleteTargetId))
    setDeleteTargetId(null)
    toast.success("题目已删除")
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 py-10">
        {/* 标题骨架 */}
        <div className="flex items-center gap-4">
          <Skeleton className="h-9 w-9 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        {/* 按钮骨架 */}
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-9 rounded-lg" />
          <Skeleton className="h-9 rounded-lg" />
        </div>
        {/* 题目骨架 */}
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="py-4 space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-16 w-full rounded-lg" />
              </CardContent>
            </Card>
          ))}
        </div>
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

      {/* 添加题目 - 两个按钮 */}
      {!showAddForm && !showBatchForm && (
        <div className="grid grid-cols-2 gap-3">
          <Button className="gap-2" variant="outline" onClick={() => setShowAddForm(true)}>
            <Plus className="h-4 w-4" /> 单个添加
          </Button>
          <Button className="gap-2" variant="outline" onClick={() => setShowBatchForm(true)}>
            <FileText className="h-4 w-4" /> 批量添加
          </Button>
        </div>
      )}

      {/* 单个添加表单 */}
      {showAddForm && (
        <Card>
          <CardContent className="py-4 space-y-3">
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
          </CardContent>
        </Card>
      )}

      {/* 批量添加表单 */}
      {showBatchForm && (
        <Card>
          <CardContent className="py-4 space-y-3">
            <div className="text-sm text-muted-foreground">
              每道题占两行以上：<strong>第一行是题目</strong>，<strong>后面是答案</strong>，题目之间用<strong>空行</strong>或 <strong>---</strong> 分隔
            </div>
            <Textarea
              placeholder={`什么是人工智能？\n人工智能是计算机科学的一个分支，致力于创建能够模拟人类智能的系统。\n\n机器学习的定义是什么？\n机器学习是AI的核心子领域，使计算机能够从数据中学习。\n\n深度学习和机器学习的关系？\n深度学习是机器学习的一个子集，使用多层神经网络。`}
              rows={10}
              value={batchText}
              onChange={(e) => setBatchText(e.target.value)}
            />
            <div className="flex gap-2">
              <Button onClick={handleBatchAdd} disabled={batchAdding}>
                <FileText className="h-4 w-4 mr-1" /> {batchAdding ? "添加中..." : "批量添加"}
              </Button>
              <Button variant="ghost" onClick={() => { setShowBatchForm(false); setBatchText("") }}>
                取消
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 题目列表 */}
      {questions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-muted-foreground">暂无题目</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              点击上方按钮添加题目
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
                      className={`h-10 w-10 ${
                        q.isBookmarked
                          ? "text-yellow-500"
                          : "text-muted-foreground md:opacity-0 md:group-hover:opacity-100"
                      }`}
                      onClick={() => q.id !== undefined && handleToggleBookmark(q.id)}
                      aria-label={q.isBookmarked ? "取消收藏" : "收藏题目"}
                    >
                      <Bookmark className="h-4 w-4" fill={q.isBookmarked ? "currentColor" : "none"} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 text-muted-foreground hover:text-destructive md:opacity-0 md:group-hover:opacity-100"
                      onClick={() => q.id !== undefined && handleDeleteQuestion(q.id)}
                      aria-label="删除题目"
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

      {/* 删除确认对话框 */}
      <ConfirmDialog
        open={deleteTargetId !== null}
        title="删除题目"
        description="确定要删除这道题吗？此操作不可撤销。"
        confirmText="删除"
        variant="destructive"
        onConfirm={confirmDeleteQuestion}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  )
}
