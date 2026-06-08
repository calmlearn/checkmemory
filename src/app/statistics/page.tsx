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
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  getAllDocuments,
  getAllQuestions,
  getQuizStats,
  getWrongQuestionIds,
  getQuestionsByIds,
  getBookmarkedQuestions,
  getQuestionCount,
  getRecordsByQuestion,
} from "@/lib/db"
import type { Document, Question } from "@/types"

export default function StatisticsPage() {
  const [loading, setLoading] = useState(true)
  const [documents, setDocuments] = useState<Document[]>([])
  const [stats, setStats] = useState({ total: 0, correct: 0, wrong: 0 })
  const [wrongQuestions, setWrongQuestions] = useState<Question[]>([])
  const [bookmarkedQuestions, setBookmarkedQuestions] = useState<Question[]>([])
  const [docStats, setDocStats] = useState<{ id: number; title: string; total: number; correct: number; wrong: number }[]>([])

  const loadStats = useCallback(async () => {
    setLoading(true)
    const docs = await getAllDocuments()
    const completedDocs = docs.filter((d) => d.status === "completed")
    setDocuments(completedDocs)

    // 总体统计
    const quizStats = await getQuizStats()
    setStats(quizStats)

    // 错题
    const wrongIds = await getWrongQuestionIds()
    const wrongQs = await getQuestionsByIds(wrongIds)
    setWrongQuestions(wrongQs)

    // 收藏
    const bookmarked = await getBookmarkedQuestions()
    setBookmarkedQuestions(bookmarked)

    // 每个文档的学习进度
    const dStats: typeof docStats = []
    for (const doc of completedDocs) {
      if (!doc.id) continue
      const total = await getQuestionCount(doc.id)
      const questions = await getAllQuestions()
      const docQuestions = questions.filter((q) => q.documentId === doc.id)
      let correct = 0
      let wrong = 0
      for (const q of docQuestions) {
        if (!q.id) continue
        const records = await getRecordsByQuestion(q.id)
        if (records.length > 0) {
          // 取最新一条记录
          const latest = records.reduce((a, b) =>
            a.createdAt > b.createdAt ? a : b
          )
          if (latest.isCorrect) correct++
          else wrong++
        }
      }
      dStats.push({ id: doc.id, title: doc.title, total, correct, wrong })
    }
    setDocStats(dStats)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  /** 导出错题集 */
  const handleExportWrong = () => {
    if (wrongQuestions.length === 0) return
    let text = "=== 错题集 ===\n\n"
    wrongQuestions.forEach((q, i) => {
      text += `第 ${i + 1} 题：${q.question}\n`
      text += `答案：${q.answer}\n\n`
    })
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `错题集_${new Date().toLocaleDateString()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  /** 导出收藏题目 */
  const handleExportBookmarked = () => {
    if (bookmarkedQuestions.length === 0) return
    let text = "=== 收藏题目 ===\n\n"
    bookmarkedQuestions.forEach((q, i) => {
      text += `第 ${i + 1} 题：${q.question}\n`
      text += `答案：${q.answer}\n\n`
    })
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `收藏题目_${new Date().toLocaleDateString()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-20 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
      </div>
    )
  }

  /** 正确率显示 */
  const accuracy = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 页面标题 */}
      <div className="text-center space-y-2">
        <BarChart3 className="h-10 w-10 text-primary mx-auto" />
        <h1 className="text-2xl font-bold">学习统计</h1>
        <p className="text-muted-foreground">查看你的学习进度和答题情况</p>
      </div>

      {/* 总体概览卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="py-6 text-center">
            <FileText className="h-6 w-6 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold">{documents.length}</p>
            <p className="text-sm text-muted-foreground">文档数</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-6 text-center">
            <BookOpen className="h-6 w-6 text-blue-500 mx-auto mb-2" />
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-sm text-muted-foreground">已答题数</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-6 text-center">
            <CheckCircle2 className="h-6 w-6 text-green-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-green-600">{stats.correct}</p>
            <p className="text-sm text-muted-foreground">答对</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-6 text-center">
            <XCircle className="h-6 w-6 text-red-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-red-600">{stats.wrong}</p>
            <p className="text-sm text-muted-foreground">答错</p>
          </CardContent>
        </Card>
        <Card className="md:col-span-4">
          <CardContent className="py-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium">总正确率</span>
              <span className="text-2xl font-bold text-primary">{accuracy}%</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-3">
              <div
                className="bg-primary h-3 rounded-full transition-all duration-500"
                style={{ width: `${accuracy}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 详细统计 */}
      <Tabs defaultValue="documents">
        <TabsList className="w-full">
          <TabsTrigger value="documents" className="flex-1">文档进度</TabsTrigger>
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

        {/* 文档进度 */}
        <TabsContent value="documents" className="space-y-4">
          {docStats.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                还没有答题记录
              </CardContent>
            </Card>
          ) : (
            docStats.map((ds) => {
              const dAccuracy = ds.total > 0 ? Math.round((ds.correct / ds.total) * 100) : 0
              return (
                <Card key={ds.id}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">{ds.title}</CardTitle>
                    <CardDescription>
                      共 {ds.total} 题 · 已答 {ds.correct + ds.wrong} 题 ·
                      正确率 {dAccuracy}%
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${dAccuracy}%` }}
                      />
                    </div>
                  </CardContent>
                </Card>
              )
            })
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
                  <CardTitle className="text-base flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                    {q.question}
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

        {/* 收藏题目 */}
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
                    {q.question}
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
    </div>
  )
}
