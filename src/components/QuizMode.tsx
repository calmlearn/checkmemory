"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Shuffle,
  Eye,
  Check,
  X,
  SkipForward,
  BookOpen,
  AlertCircle,
  Trash2,
  ChevronLeft,
  CheckCircle2,
} from "lucide-react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  getAllDocuments,
  getRandomQuestion,
  addQuizRecord,
  getQuestionCount,
  getWrongQuestionIds,
  getWrongQuestionIdsByDocument,
  getQuestionsByIds,
  deleteQuizRecordsByQuestion,
  isQuestionWrong,
} from "@/lib/db"
import type { Document, Question } from "@/types"
import { toast } from "sonner"

type Mode = "select" | "normal" | "wrong-review"

export default function QuizMode() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [selectedDocId, setSelectedDocId] = useState<number | undefined>(undefined)
  const [mode, setMode] = useState<Mode>("select")

  // 普通抽查
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null)
  const [showAnswer, setShowAnswer] = useState(false)
  const [totalQuestions, setTotalQuestions] = useState(0)
  const [isWrong, setIsWrong] = useState(false)

  // 错题复习
  const [wrongQuestions, setWrongQuestions] = useState<Question[]>([])
  const [wrongIndex, setWrongIndex] = useState(0)
  const [showWrongAnswer, setShowWrongAnswer] = useState(false)

  const [loading, setLoading] = useState(true)

  /** 加载文档列表 */
  useEffect(() => {
    async function load() {
      const docs = await getAllDocuments()
      setDocuments(docs.filter((d) => d.status === "completed"))
      setLoading(false)
    }
    load()
  }, [])

  // ===== 普通抽查逻辑 =====

  const drawQuestion = useCallback(async () => {
    const q = await getRandomQuestion(selectedDocId)
    setCurrentQuestion(q ?? null)
    setShowAnswer(false)
    if (q?.id) {
      const wrong = await isQuestionWrong(q.id)
      setIsWrong(wrong)
    } else {
      setIsWrong(false)
    }
  }, [selectedDocId])

  const handleStartNormal = async () => {
    const count = selectedDocId
      ? await getQuestionCount(selectedDocId)
      : await getQuestionCount()
    if (count === 0) {
      toast.error("没有可用的题目")
      return
    }
    setTotalQuestions(count)
    setMode("normal")
    await drawQuestion()
  }

  const handleCorrect = async () => {
    if (!currentQuestion?.id) return
    await addQuizRecord({ questionId: currentQuestion.id, isCorrect: true, createdAt: new Date() })
    await drawQuestion()
  }

  const handleWrong = async () => {
    if (!currentQuestion?.id) return
    await addQuizRecord({ questionId: currentQuestion.id, isCorrect: false, createdAt: new Date() })
    await drawQuestion()
  }

  const handleSkipNormal = () => drawQuestion()

  const handleDeleteWrongFromNormal = async () => {
    if (!currentQuestion?.id) return
    await deleteQuizRecordsByQuestion(currentQuestion.id)
    toast.success("已从错题集中移除")
    await drawQuestion()
  }

  // ===== 错题复习逻辑 =====

  /** Fisher-Yates 洗牌算法 */
  const shuffleArray = <T,>(arr: T[]): T[] => {
    const shuffled = [...arr]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }

  const handleStartWrongReview = async () => {
    let wrongIds: number[]
    if (selectedDocId === undefined) {
      wrongIds = await getWrongQuestionIds()
    } else {
      wrongIds = await getWrongQuestionIdsByDocument(selectedDocId)
    }
    if (wrongIds.length === 0) {
      toast.error("没有错题", { description: "继续保持！" })
      return
    }
    const questions = await getQuestionsByIds(wrongIds)
    setWrongQuestions(shuffleArray(questions))
    setWrongIndex(0)
    setShowWrongAnswer(false)
    setMode("wrong-review")
  }

  const handleNextWrong = () => {
    if (wrongIndex < wrongQuestions.length - 1) {
      setWrongIndex(wrongIndex + 1)
      setShowWrongAnswer(false)
    }
  }

  /** 错题复习：已掌握 = 删除记录 + 下一题（不重新打乱） */
  const handleMasteredWrong = async () => {
    const q = wrongQuestions[wrongIndex]
    if (!q?.id) return
    await deleteQuizRecordsByQuestion(q.id)
    const newList = wrongQuestions.filter((_, i) => i !== wrongIndex)
    if (newList.length === 0) {
      setMode("select")
      return
    }
    // 移除后继续走原有顺序，如果到底了就重新打乱
    if (wrongIndex >= newList.length) {
      setWrongQuestions(shuffleArray(newList))
      setWrongIndex(0)
    } else {
      setWrongQuestions(newList)
      // wrongIndex 不变，自然指向下一题
    }
    setShowWrongAnswer(false)
  }

  /** 错题复习：未掌握 = 下一题，到底后重新打乱循环 */
  const handleUnmasteredWrong = () => {
    if (wrongIndex < wrongQuestions.length - 1) {
      setWrongIndex(wrongIndex + 1)
    } else {
      // 全部抽完一轮，重新打乱开始下一轮
      setWrongQuestions(shuffleArray(wrongQuestions))
      setWrongIndex(0)
    }
    setShowWrongAnswer(false)
  }

  const handleBack = () => {
    setMode("select")
    setCurrentQuestion(null)
    setShowAnswer(false)
    setShowWrongAnswer(false)
  }

  // ====== 加载中 ======
  if (loading) {
    return <div className="max-w-2xl mx-auto py-20 text-center text-muted-foreground">加载中...</div>
  }

  // ====== 没有文档 ======
  if (documents.length === 0) {
    return (
      <div className="max-w-2xl mx-auto text-center space-y-4">
        <BookOpen className="h-16 w-16 text-muted-foreground/50 mx-auto" />
        <h2 className="text-xl font-semibold">还没有题目</h2>
        <p className="text-muted-foreground">请先在首页上传文档，等待 AI 提取完成后，再来开始测验</p>
      </div>
    )
  }

  // ====== 模式选择界面 ======
  if (mode === "select") {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <Shuffle className="h-10 w-10 text-primary mx-auto" />
          <h1 className="text-2xl font-bold">测验</h1>
          <p className="text-muted-foreground">选择模式和文档</p>
        </div>

        {/* 文档选择 */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">选择文档</p>
          <Button
            variant={selectedDocId === undefined ? "default" : "outline"}
            className="w-full justify-start"
            onClick={() => setSelectedDocId(undefined)}
          >
            全部文档
          </Button>
          {documents.map((doc) => (
            <Button
              key={doc.id}
              variant={selectedDocId === doc.id ? "default" : "outline"}
              className="w-full justify-start"
              onClick={() => setSelectedDocId(doc.id)}
            >
              {doc.title}
            </Button>
          ))}
        </div>

        {/* 模式选择 */}
        <div className="grid grid-cols-2 gap-4">
          <Card
            className="cursor-pointer hover:bg-accent/50 transition-colors"
            onClick={handleStartNormal}
          >
            <CardContent className="py-6 text-center">
              <Shuffle className="h-8 w-8 text-primary mx-auto mb-3" />
              <p className="font-medium">普通抽查</p>
              <p className="text-xs text-muted-foreground mt-1">随机抽取题目</p>
            </CardContent>
          </Card>
          <Card
            className="cursor-pointer hover:bg-accent/50 transition-colors"
            onClick={handleStartWrongReview}
          >
            <CardContent className="py-6 text-center">
              <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-3" />
              <p className="font-medium">错题复习</p>
              <p className="text-xs text-muted-foreground mt-1">只复习答错的题</p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // ====== 普通抽查没有题目 ======
  if (mode === "normal" && !currentQuestion) {
    return (
      <div className="max-w-2xl mx-auto text-center space-y-4">
        <Check className="h-16 w-16 text-green-500 mx-auto" />
        <h2 className="text-xl font-semibold">全部答完！</h2>
        <Button onClick={handleBack}>返回选择</Button>
      </div>
    )
  }

  // ====== 普通抽查答题 ======
  if (mode === "normal" && currentQuestion) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <Button variant="ghost" size="sm" onClick={handleBack}>
          <ChevronLeft className="h-4 w-4 mr-1" /> 返回
        </Button>

        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">剩余 {totalQuestions} 题</Badge>
                {selectedDocId && (
                  <Badge variant="outline">
                    {documents.find((d) => d.id === selectedDocId)?.title}
                  </Badge>
                )}
              </div>
              {/* 错题标记 + 删除 */}
              {isWrong && (
                <div className="flex items-center gap-2">
                  <Badge variant="destructive" className="gap-1">
                    <AlertCircle className="h-3 w-3" />
                    曾答错
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    title="从错题集移除"
                    onClick={handleDeleteWrongFromNormal}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
            <CardTitle className="text-xl mt-4 leading-relaxed">{currentQuestion.question}</CardTitle>
          </CardHeader>

          <CardContent>
            {showAnswer ? (
              <div className="bg-primary/5 rounded-xl p-6 border border-primary/10">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                  <BookOpen className="h-4 w-4" />
                  <span>答案：</span>
                </div>
                <p className="text-base leading-relaxed whitespace-pre-wrap">{currentQuestion.answer}</p>
              </div>
            ) : (
              <div className="text-center py-8">
                <Button size="lg" variant="outline" className="gap-2" onClick={() => setShowAnswer(true)}>
                  <Eye className="h-5 w-5" /> 显示答案
                </Button>
              </div>
            )}
          </CardContent>

          {showAnswer && (
            <CardFooter className="flex gap-3">
              <Button variant="outline" className="flex-1 gap-2" onClick={handleSkipNormal}>
                <SkipForward className="h-4 w-4" /> 跳过
              </Button>
              <Button variant="outline" className="flex-1 gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700" onClick={handleWrong}>
                <X className="h-4 w-4" /> 未掌握
              </Button>
              <Button className="flex-1 gap-2" onClick={handleCorrect}>
                <Check className="h-4 w-4" /> 已掌握
              </Button>
            </CardFooter>
          )}
        </Card>
      </div>
    )
  }

  // ====== 错题复习没有错题 ======
  if (mode === "wrong-review" && wrongQuestions.length === 0) {
    return (
      <div className="max-w-2xl mx-auto text-center space-y-4">
        <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
        <h2 className="text-xl font-semibold">没有错题了！</h2>
        <Button onClick={handleBack}>返回选择</Button>
      </div>
    )
  }

  // ====== 错题复习答题 ======
  const current = wrongQuestions[wrongIndex]
  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <Button variant="ghost" size="sm" onClick={handleBack}>
        <ChevronLeft className="h-4 w-4 mr-1" /> 返回
      </Button>

      <Card className="shadow-lg border-2 border-red-200">
        <CardHeader>
          {selectedDocId && (
            <Badge variant="outline" className="mb-2 w-fit">
              {documents.find((d) => d.id === selectedDocId)?.title}
            </Badge>
          )}
          <CardTitle className="text-xl mt-2 leading-relaxed">{current?.question}</CardTitle>
        </CardHeader>

        <CardContent>
          {showWrongAnswer ? (
            <div className="bg-primary/5 rounded-xl p-6 border border-primary/10">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                <BookOpen className="h-4 w-4" />
                <span>答案：</span>
              </div>
              <p className="text-base leading-relaxed whitespace-pre-wrap">{current?.answer}</p>
            </div>
          ) : (
            <div className="text-center py-8">
              <Button size="lg" variant="outline" className="gap-2" onClick={() => setShowWrongAnswer(true)}>
                <Eye className="h-5 w-5" /> 显示答案
              </Button>
            </div>
          )}
        </CardContent>

        {showWrongAnswer && (
          <CardFooter className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
              onClick={handleUnmasteredWrong}
            >
              <X className="h-4 w-4" /> 未掌握
            </Button>
            <Button className="flex-1 gap-2" onClick={handleMasteredWrong}>
              <Check className="h-4 w-4" /> 已掌握
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  )
}