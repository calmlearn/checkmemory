"use client"

import { useState, useEffect, useCallback } from "react"
import {
  BarChart3,
  CheckCircle2,
  XCircle,
  Bookmark,
  Download,
  FileText,
  Loader2,
  AlertCircle,
  BookOpen,
  Check,
  Undo2,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  getAllDocuments,
  getQuestionsByDocument,
  getQuizStats,
  getWrongQuestionIds,
  getQuestionsByIds,
  getBookmarkedQuestions,
  getQuestionCount,
  getRecordsByQuestion,
  addQuizRecord,
  getCorrectCount,
  getMasteredQuestionIds,
  deleteQuizRecordsByQuestion,
  getAllQuestions,
} from "@/lib/db"
import type { Document, Question } from "@/types"
import { toast } from "sonner"

export default function StatisticsPage() {
  const [loading, setLoading] = useState(true)
  const [documents, setDocuments] = useState<Document[]>([])
  const [selectedDocId, setSelectedDocId] = useState<number | undefined>(undefined)
  const [stats, setStats] = useState({ total: 0, correct: 0, wrong: 0, masteredCount: 0, inProgress: 0 })
  const [wrongQuestions, setWrongQuestions] = useState<Question[]>([])
  const [bookmarkedQuestions, setBookmarkedQuestions] = useState<Question[]>([])
  const [masteredQuestions, setMasteredQuestions] = useState<Question[]>([])

  /** 加载数据（按选中文档筛选） */
  const loadStats = useCallback(async () => {
    setLoading(true)
    const docs = await getAllDocuments()
    const completedDocs = docs.filter((d) => d.status === "completed")
    setDocuments(completedDocs)

    await loadDataForDoc(selectedDocId, completedDocs)

    setLoading(false)
  }, [selectedDocId])

  /** 加载某个文档（或全部）的统计数据 */
  const loadDataForDoc = async (docId: number | undefined, docs?: Document[]) => {
    const allDocs = docs || (await getAllDocuments()).filter((d) => d.status === "completed")

    // 总体统计（可选文档）
    let quizStats: { total: number; correct: number; wrong: number; masteredCount: number; inProgress: number }

    if (docId === undefined) {
      // 全部文档
      quizStats = await getQuizStats()
    } else {
      // 指定文档：统计该文档下所有题目的答题情况
      const questions = await getQuestionsByDocument(docId)
      let masteredCount = 0
      let inProgress = 0
      let wrong = 0
      for (const q of questions) {
        if (!q.id) continue
        const correctCount = await getCorrectCount(q.id)
        const records = await getRecordsByQuestion(q.id)
        if (correctCount >= 3) {
          masteredCount++
        } else if (correctCount > 0) {
          inProgress++
        }
        if (records.length > 0) {
          const latest = records.reduce((a, b) =>
            a.createdAt > b.createdAt ? a : b
          )
          if (!latest.isCorrect && correctCount < 3) {
            wrong++
          }
        }
      }
      quizStats = { total: questions.length, correct: masteredCount, wrong, masteredCount, inProgress }
    }
    setStats(quizStats)

    // 错题（按文档筛选）
    const allWrongIds = await getWrongQuestionIds()
    let filteredWrongIds = allWrongIds
    if (docId !== undefined) {
      const docQuestions = await getQuestionsByDocument(docId)
      const docQuestionIds = new Set(docQuestions.map((q) => q.id).filter(Boolean))
      filteredWrongIds = allWrongIds.filter((id) => docQuestionIds.has(id))
    }
    const wrongQs = await getQuestionsByIds(filteredWrongIds)
    setWrongQuestions(wrongQs)

    // 收藏（按文档筛选）
    const allBookmarked = await getBookmarkedQuestions()
    if (docId !== undefined) {
      setBookmarkedQuestions(allBookmarked.filter((q) => q.documentId === docId))
    } else {
      setBookmarkedQuestions(allBookmarked)
    }

    // 已掌握题目（按文档筛选）
    const allMasteredIds = await getMasteredQuestionIds()
    let filteredMasteredIds = allMasteredIds
    if (docId !== undefined) {
      const docQuestions = await getQuestionsByDocument(docId)
      const docQuestionIds = new Set(docQuestions.map((q) => q.id).filter(Boolean) as number[])
      filteredMasteredIds = allMasteredIds.filter((id) => docQuestionIds.has(id))
    }
    const masteredQs = await getQuestionsByIds(filteredMasteredIds)
    setMasteredQuestions(masteredQs)
  }

  useEffect(() => {
    loadStats()
  }, [loadStats])

  /** 切换文档 */
  const handleSelectDoc = async (docId: number | undefined) => {
    setLoading(true)
    setSelectedDocId(docId)
    await loadDataForDoc(docId)
    setLoading(false)
  }

  /** 标记为已掌握（直接计为3次答对，从错题集移除） */
  const handleMastered = async (questionId: number) => {
    const now = new Date()
    // 一次添加3条答对记录，直接达到掌握门槛
    await addQuizRecord({ questionId, isCorrect: true, createdAt: now })
    await addQuizRecord({ questionId, isCorrect: true, createdAt: now })
    await addQuizRecord({ questionId, isCorrect: true, createdAt: now })
    await loadDataForDoc(selectedDocId)
    toast.success("已标记为掌握")
  }

  /** 移回题库：删除所有答题记录，题目重新可被抽取 */
  const handleUnmaster = async (questionId: number) => {
    await deleteQuizRecordsByQuestion(questionId)
    await loadDataForDoc(selectedDocId)
    toast.success("已移回题库")
  }

  /** 导出错题集 */
  const handleExportWrong = () => {
    if (wrongQuestions.length === 0) return
    const prefix = selectedDocId
      ? documents.find((d) => d.id === selectedDocId)?.title || "错题集"
      : "全部_错题集"
    let text = `=== ${prefix} ===\n\n`
    wrongQuestions.forEach((q, i) => {
      text += `第 ${i + 1} 题：${q.question}\n`
      text += `答案：${q.answer}\n\n`
    })
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${prefix}_${new Date().toLocaleDateString()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  /** 导出收藏 */
  const handleExportBookmarked = () => {
    if (bookmarkedQuestions.length === 0) return
    const prefix = selectedDocId
      ? documents.find((d) => d.id === selectedDocId)?.title || "收藏"
      : "全部_收藏"
    let text = `=== ${prefix} ===\n\n`
    bookmarkedQuestions.forEach((q, i) => {
      text += `第 ${i + 1} 题：${q.question}\n`
      text += `答案：${q.answer}\n\n`
    })
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${prefix}_${new Date().toLocaleDateString()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const accuracy = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0

  // ====== 文档选择界面 ======
  if (!loading && documents.length === 0) {
    return (
      <div className="max-w-2xl mx-auto text-center space-y-4 py-12">
        <BarChart3 className="h-16 w-16 text-muted-foreground/50 mx-auto" />
        <h2 className="text-xl font-semibold">还没有数据</h2>
        <p className="text-muted-foreground">
          请先在首页上传文档并开始答题
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 页面标题 */}
      <div className="text-center space-y-2">
        <BarChart3 className="h-10 w-10 text-primary mx-auto" />
        <h1 className="text-2xl font-bold">学习统计</h1>
        <p className="text-muted-foreground">选择文档查看对应的学习数据</p>
      </div>

      {/* 文档选择器 */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={selectedDocId === undefined ? "default" : "outline"}
          size="sm"
          onClick={() => handleSelectDoc(undefined)}
        >
          全部文档
        </Button>
        {documents.map((doc) => (
          <Button
            key={doc.id}
            variant={selectedDocId === doc.id ? "default" : "outline"}
            size="sm"
            onClick={() => handleSelectDoc(doc.id)}
          >
            {doc.title}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="py-20 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
        </div>
      ) : (
        <>
          {/* 统计概览 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="py-6 text-center">
                <BookOpen className="h-6 w-6 text-primary mx-auto mb-2" />
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">总题数</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-6 text-center">
                <CheckCircle2 className="h-6 w-6 text-green-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-green-600">{stats.correct}</p>
                <p className="text-sm text-muted-foreground">已掌握 (答对3次)</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-6 text-center">
                <BarChart3 className="h-6 w-6 text-orange-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-orange-600">{stats.inProgress}</p>
                <p className="text-sm text-muted-foreground">答题中</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-6 text-center">
                <XCircle className="h-6 w-6 text-red-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-red-600">{stats.wrong}</p>
                <p className="text-sm text-muted-foreground">未掌握</p>
              </CardContent>
            </Card>
          </div>

          {/* 掌握进度环 + 统计说明 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="md:col-span-1">
              <CardContent className="py-6 flex flex-col items-center">
                {/* SVG 进度环 */}
                <div className="relative w-32 h-32">
                  <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
                    {/* 背景圆环 */}
                    <circle
                      cx="60" cy="60" r="52"
                      fill="none"
                      stroke="oklch(0.9 0.03 240)"
                      strokeWidth="10"
                      className="dark:stroke-[oklch(0.3_0_0)]"
                    />
                    {/* 进度圆环 */}
                    <circle
                      cx="60" cy="60" r="52"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="10"
                      strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 52}
                      strokeDashoffset={2 * Math.PI * 52 * (1 - (stats.total > 0 ? stats.correct / stats.total : 0))}
                      className="text-primary transition-all duration-700"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-primary">{accuracy}%</p>
                      <p className="text-xs text-muted-foreground">掌握率</p>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-3">
                  答对 3 次即掌握
                </p>
              </CardContent>
            </Card>

            {/* 统计详情卡片 */}
            <Card className="md:col-span-2">
              <CardContent className="py-6 space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">已掌握</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-green-600 dark:text-green-400">{stats.correct}</span>
                    <span className="text-muted-foreground">题</span>
                  </div>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full transition-all duration-500" style={{ width: `${stats.total > 0 ? (stats.correct / stats.total) * 100 : 0}%` }} />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">答题中</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-orange-600 dark:text-orange-400">{stats.inProgress}</span>
                    <span className="text-muted-foreground">题</span>
                  </div>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div className="bg-orange-500 h-2 rounded-full transition-all duration-500" style={{ width: `${stats.total > 0 ? (stats.inProgress / stats.total) * 100 : 0}%` }} />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">未掌握</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-red-600 dark:text-red-400">{stats.wrong}</span>
                    <span className="text-muted-foreground">题</span>
                  </div>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div className="bg-red-500 h-2 rounded-full transition-all duration-500" style={{ width: `${stats.total > 0 ? (stats.wrong / stats.total) * 100 : 0}%` }} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 详细标签页 */}
          <Tabs defaultValue="mastered">
            <TabsList className="w-full">
              <TabsTrigger value="mastered" className="flex-1">
                已掌握
                {masteredQuestions.length > 0 && (
                  <Badge className="ml-2 bg-green-500">{masteredQuestions.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="wrong" className="flex-1">
                错题集
                {wrongQuestions.length > 0 && (
                  <Badge variant="destructive" className="ml-2">{wrongQuestions.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="bookmarked" className="flex-1">
                收藏
                {bookmarkedQuestions.length > 0 && (
                  <Badge className="ml-2 bg-yellow-500">{bookmarkedQuestions.length}</Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* 已掌握 */}
            <TabsContent value="mastered" className="space-y-4">
              {masteredQuestions.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
                    <p className="text-muted-foreground">还没有已掌握的题目</p>
                    <p className="text-sm text-muted-foreground/70 mt-1">在测验中对同一道题答对 3 次即可掌握</p>
                  </CardContent>
                </Card>
              ) : (
                masteredQuestions.map((q) => (
                  <Card key={q.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-4">
                        <CardTitle className="text-base flex items-start gap-2 flex-1 min-w-0">
                          <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                          <span className="break-words">{q.question}</span>
                        </CardTitle>
                        <Button
                          variant="outline"
                          size="sm"
                          className="shrink-0 gap-1"
                          onClick={() => q.id !== undefined && handleUnmaster(q.id)}
                        >
                          <Undo2 className="h-3.5 w-3.5" /> 移回题库
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
                ))
              )}
            </TabsContent>

            {/* 错题集 */}
            <TabsContent value="wrong" className="space-y-4">
              {wrongQuestions.length > 0 && (
                <div className="flex justify-end">
                  <Button variant="outline" size="sm" className="gap-2" onClick={handleExportWrong}>
                    <Download className="h-4 w-4" />
                    导出错题集
                  </Button>
                </div>
              )}
              {wrongQuestions.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
                    <p className="text-muted-foreground">暂无错题，继续保持！</p>
                  </CardContent>
                </Card>
              ) : (
                wrongQuestions.map((q) => (
                  <Card key={q.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-4">
                        <CardTitle className="text-base flex items-start gap-2 flex-1 min-w-0">
                          <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                          <span className="break-words">{q.question}</span>
                        </CardTitle>
                        <Button
                          variant="outline"
                          size="sm"
                          className="shrink-0 text-green-600 border-green-200 hover:bg-green-50 gap-1"
                          onClick={() => q.id !== undefined && handleMastered(q.id)}
                        >
                          <Check className="h-3.5 w-3.5" /> 已掌握
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
                ))
              )}
            </TabsContent>

            {/* 收藏 */}
            <TabsContent value="bookmarked" className="space-y-4">
              {bookmarkedQuestions.length > 0 && (
                <div className="flex justify-end">
                  <Button variant="outline" size="sm" className="gap-2" onClick={handleExportBookmarked}>
                    <Download className="h-4 w-4" />
                    导出收藏
                  </Button>
                </div>
              )}
              {bookmarkedQuestions.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Bookmark className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                    <p className="text-muted-foreground">还没有收藏题目</p>
                    <p className="text-sm text-muted-foreground/70 mt-1">
                      在文档详情中点击书签图标即可收藏
                    </p>
                  </CardContent>
                </Card>
              ) : (
                bookmarkedQuestions.map((q) => (
                  <Card key={q.id}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-start gap-2">
                        <Bookmark className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5 fill-yellow-500" />
                        <span className="break-words">{q.question}</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-accent/50 rounded-lg p-4">
                        <p className="text-sm font-medium text-muted-foreground mb-1">答案：</p>
                        <p className="text-sm">{q.answer}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  )
}
