"use client"

import { useState, useEffect, useCallback } from "react"
import { Shuffle, Eye, EyeOff, Check, X, SkipForward, BookOpen } from "lucide-react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { getAllDocuments, getRandomQuestion, addQuizRecord, getQuestionCount } from "@/lib/db"
import type { Document, Question } from "@/types"
import { toast } from "sonner"

export default function QuizMode() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [selectedDocId, setSelectedDocId] = useState<number | undefined>(undefined)
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null)
  const [showAnswer, setShowAnswer] = useState(false)
  const [totalQuestions, setTotalQuestions] = useState(0)
  const [isStarted, setIsStarted] = useState(false)
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

  /** 抽题 */
  const drawQuestion = useCallback(async () => {
    const q = await getRandomQuestion(selectedDocId)
    setCurrentQuestion(q ?? null)
    setShowAnswer(false)
  }, [selectedDocId])

  /** 开始测验 */
  const handleStart = async () => {
    const count = selectedDocId
      ? await getQuestionCount(selectedDocId)
      : await getQuestionCount()

    if (count === 0) {
      toast.error("没有可用的题目", {
        description: "请先上传文档并等待 AI 提取完成",
      })
      return
    }

    setTotalQuestions(count)
    setIsStarted(true)
    await drawQuestion()
  }

  /** 标记已掌握 */
  const handleCorrect = async () => {
    if (!currentQuestion?.id) return
    await addQuizRecord({
      questionId: currentQuestion.id,
      isCorrect: true,
      createdAt: new Date(),
    })
    await drawQuestion()
  }

  /** 标记未掌握 */
  const handleWrong = async () => {
    if (!currentQuestion?.id) return
    await addQuizRecord({
      questionId: currentQuestion.id,
      isCorrect: false,
      createdAt: new Date(),
    })
    await drawQuestion()
  }

  /** 跳过 */
  const handleSkip = () => {
    drawQuestion()
  }

  /** 重新选择文档 */
  const handleBack = () => {
    setIsStarted(false)
    setCurrentQuestion(null)
    setShowAnswer(false)
  }

  // ====== 加载中 ======
  if (loading) {
    return (
      <div className="max-w-2xl mx-auto py-20 text-center text-muted-foreground">
        加载中...
      </div>
    )
  }

  // ====== 没有文档 ======
  if (documents.length === 0) {
    return (
      <div className="max-w-2xl mx-auto text-center space-y-4">
        <BookOpen className="h-16 w-16 text-muted-foreground/50 mx-auto" />
        <h2 className="text-xl font-semibold">还没有题目</h2>
        <p className="text-muted-foreground">
          请先在首页上传文档，等待 AI 提取完成后，再来开始测验
        </p>
      </div>
    )
  }

  // ====== 选择文档界面 ======
  if (!isStarted) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <Shuffle className="h-10 w-10 text-primary mx-auto" />
          <h1 className="text-2xl font-bold">随机测验</h1>
          <p className="text-muted-foreground">选择要测验的文档，点击开始</p>
        </div>

        {/* 文档选择 */}
        <div className="space-y-3">
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

        <Button size="lg" className="w-full" onClick={handleStart}>
          开始测验
        </Button>
      </div>
    )
  }

  // ====== 没有更多题目 ======
  if (!currentQuestion) {
    return (
      <div className="max-w-2xl mx-auto text-center space-y-4">
        <Check className="h-16 w-16 text-green-500 mx-auto" />
        <h2 className="text-xl font-semibold">全部答完！</h2>
        <p className="text-muted-foreground">
          当前题库的所有题目已完成
        </p>
        <Button onClick={handleBack}>返回选择</Button>
      </div>
    )
  }

  // ====== 答题界面 ======
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* 顶部信息 */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={handleBack}>
          返回选择
        </Button>
      </div>

      {/* 题目卡片 */}
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <Badge variant="secondary">
              剩余 {totalQuestions} 题
            </Badge>
            {selectedDocId && (
              <Badge variant="outline">
                {documents.find((d) => d.id === selectedDocId)?.title}
              </Badge>
            )}
          </div>
          <CardTitle className="text-xl mt-4 leading-relaxed">
            {currentQuestion.question}
          </CardTitle>
        </CardHeader>

        <CardContent>
          {showAnswer ? (
            /* 显示答案 */
            <div className="bg-primary/5 rounded-xl p-6 border border-primary/10">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                <BookOpen className="h-4 w-4" />
                <span>答案：</span>
              </div>
              <p className="text-base leading-relaxed whitespace-pre-wrap">
                {currentQuestion.answer}
              </p>
            </div>
          ) : (
            /* 隐藏答案 */
            <div className="text-center py-8">
              <Button
                size="lg"
                variant="outline"
                className="gap-2"
                onClick={() => setShowAnswer(true)}
              >
                <Eye className="h-5 w-5" />
                显示答案
              </Button>
            </div>
          )}
        </CardContent>

        {showAnswer && (
          <CardFooter className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={handleSkip}
            >
              <SkipForward className="h-4 w-4" />
              跳过
            </Button>
            <Button
              variant="outline"
              className="flex-1 gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
              onClick={handleWrong}
            >
              <X className="h-4 w-4" />
              未掌握
            </Button>
            <Button
              className="flex-1 gap-2"
              onClick={handleCorrect}
            >
              <Check className="h-4 w-4" />
              已掌握
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  )
}
