"use client"

import { useState, useEffect, useCallback } from "react"
import {
  FileText, BookOpen, Trash2, ChevronRight, PenSquare,
  CheckCircle2, BarChart3, Upload, Sparkles,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import FileUpload from "@/components/FileUpload"
import ConfirmDialog from "@/components/ConfirmDialog"
import { Skeleton } from "@/components/ui/skeleton"
import {
  getAllDocuments, deleteDocument, getQuestionCount, createManualDocument,
  getMasteredQuestionIds, getWrongQuestionIds,
} from "@/lib/db"
import type { Document } from "@/types"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

/** 文档状态对应的中文标签 */
const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  processing: { label: "处理中", variant: "secondary" },
  completed: { label: "已完成", variant: "default" },
  error: { label: "失败", variant: "destructive" },
}

/** 文档类型配置 */
const fileTypeConfig: Record<string, { label: string; color: string }> = {
  pdf: { label: "PDF", color: "text-red-500 bg-red-500/10" },
  docx: { label: "DOCX", color: "text-blue-500 bg-blue-500/10" },
  pptx: { label: "PPTX", color: "text-orange-500 bg-orange-500/10" },
  manual: { label: "手动", color: "text-purple-500 bg-purple-500/10" },
}

export default function HomePage() {
  const router = useRouter()
  const [documents, setDocuments] = useState<Document[]>([])
  const [questionCounts, setQuestionCounts] = useState<Record<number, number>>({})
  const [loading, setLoading] = useState(true)
  const [showCreateInput, setShowCreateInput] = useState(false)
  const [newDocTitle, setNewDocTitle] = useState("")
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null)

  // 学习概览统计
  const [totalQuestions, setTotalQuestions] = useState(0)
  const [masteredCount, setMasteredCount] = useState(0)
  const [wrongCount, setWrongCount] = useState(0)

  /** 加载文档列表和统计数据 */
  const loadDocuments = useCallback(async () => {
    setLoading(true)
    const docs = await getAllDocuments()
    setDocuments(docs)

    const counts: Record<number, number> = {}
    let totalQ = 0
    for (const doc of docs) {
      if (doc.id) {
        const c = await getQuestionCount(doc.id)
        counts[doc.id] = c
        totalQ += c
      }
    }
    setQuestionCounts(counts)
    setTotalQuestions(totalQ)

    // 加载掌握和错题统计
    const [masteredIds, wrongIds] = await Promise.all([
      getMasteredQuestionIds(),
      getWrongQuestionIds(),
    ])
    setMasteredCount(masteredIds.length)
    setWrongCount(wrongIds.length)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadDocuments()
  }, [loadDocuments])

  /** 删除文档 */
  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.preventDefault()
    e.stopPropagation()
    setDeleteTarget(id)
  }

  const confirmDelete = async () => {
    if (deleteTarget === null) return
    await deleteDocument(deleteTarget)
    setDeleteTarget(null)
    await loadDocuments()
  }

  /** 创建自定义题库 */
  const handleCreateManual = async () => {
    const title = newDocTitle.trim()
    if (!title) {
      toast.error("请输入题库名称")
      return
    }
    const docId = await createManualDocument(title)
    setShowCreateInput(false)
    setNewDocTitle("")
    await loadDocuments()
    router.push(`/documents/${docId}`)
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* ===== 页面标题 ===== */}
      <div className="text-center space-y-2 page-header mb-8">
        <h1 className="text-3xl font-bold">我的文档</h1>
        <p className="text-muted-foreground">
          上传文件或手动创建题库，AI 自动提取知识点
        </p>
      </div>

      {/* ===== 上传区域 ===== */}
      <FileUpload onSuccess={loadDocuments} />

      {/* ===== 学习概览 ===== */}
      {!loading && documents.length > 0 && (
        <div className="grid grid-cols-3 gap-3 my-6">
          <Card className="no-glow">
            <CardContent className="py-3 px-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <FileText className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-lg font-bold">{totalQuestions}</p>
                <p className="text-xs text-muted-foreground">总题目</p>
              </div>
            </CardContent>
          </Card>
          <Card className="no-glow">
            <CardContent className="py-3 px-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              </div>
              <div>
                <p className="text-lg font-bold text-green-600 dark:text-green-400">{masteredCount}</p>
                <p className="text-xs text-muted-foreground">已掌握</p>
              </div>
            </CardContent>
          </Card>
          <Card className="no-glow">
            <CardContent className="py-3 px-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
                <BarChart3 className="h-4 w-4 text-red-500" />
              </div>
              <div>
                <p className="text-lg font-bold text-red-600 dark:text-red-400">{wrongCount}</p>
                <p className="text-xs text-muted-foreground">待复习</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ===== 创建自定义题库 + 文档列表 ===== */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            所有题库
          </h2>

          {/* 创建自定义题库按钮 */}
          {showCreateInput ? (
            <div className="flex items-center gap-2">
              <Input
                placeholder="题库名称..."
                className="w-44"
                value={newDocTitle}
                onChange={(e) => setNewDocTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateManual()}
                autoFocus
              />
              <Button size="sm" onClick={handleCreateManual}>创建</Button>
              <Button size="sm" variant="ghost" onClick={() => { setShowCreateInput(false); setNewDocTitle("") }}>
                取消
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => setShowCreateInput(true)}
            >
              <PenSquare className="h-4 w-4" />
              新建题库
            </Button>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardContent className="py-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : documents.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="h-16 w-16 rounded-full bg-primary/5 flex items-center justify-center mx-auto mb-4">
                <Upload className="h-8 w-8 text-primary/50" />
              </div>
              <p className="text-lg font-medium text-muted-foreground">还没有任何题库</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                上传文档或手动创建，AI 自动提取知识点
              </p>
              <Button variant="outline" className="mt-4 gap-2" onClick={() => setShowCreateInput(true)}>
                <PenSquare className="h-4 w-4" /> 创建第一份题库
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 list-enter">
            {documents.map((doc, idx) => {
              const statusInfo = statusLabels[doc.status] || statusLabels.completed
              const count = questionCounts[doc.id!] ?? 0
              const ftConfig = fileTypeConfig[doc.fileType] || { label: doc.fileType.toUpperCase(), color: "text-primary bg-primary/10" }

              return (
                <Link key={doc.id} href={`/documents/${doc.id}`} style={{ "--i": idx } as React.CSSProperties}>
                  <Card className="card-hover cursor-pointer h-full no-glow">
                    <CardContent className="py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <div className={`h-10 w-10 rounded-lg ${ftConfig.color} flex items-center justify-center shrink-0`}>
                            {doc.fileType === "manual" ? (
                              <PenSquare className="h-5 w-5" />
                            ) : (
                              <FileText className="h-5 w-5" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium truncate">{doc.title}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-muted-foreground">{count} 道题目</span>
                              <span className={`text-xs px-1.5 py-0.5 rounded ${ftConfig.color}`}>
                                {ftConfig.label}
                              </span>
                            </div>
                            {/* 简单进度条 */}
                            {doc.status === "completed" && totalQuestions > 0 && (
                              <div className="mt-2 h-1 bg-secondary rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-primary rounded-full transition-all duration-500"
                                  style={{ width: `${totalQuestions > 0 ? (count / Math.max(...Object.values(questionCounts))) * 100 : 0}%` }}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Badge variant={statusInfo.variant} className="hidden sm:inline-flex">
                            {statusInfo.label}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            className="text-muted-foreground hover:text-destructive"
                            onClick={(e) => doc.id && handleDelete(e, doc.id)}
                            aria-label="删除文档"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* ===== 使用说明 ===== */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="no-glow">
          <CardContent className="py-5 text-center">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <Upload className="h-5 w-5 text-primary" />
            </div>
            <p className="font-medium text-sm">上传文档</p>
            <p className="text-xs text-muted-foreground mt-1">PDF / Word / PPT 自动提取</p>
          </CardContent>
        </Card>
        <Card className="no-glow">
          <CardContent className="py-5 text-center">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <p className="font-medium text-sm">AI 提取</p>
            <p className="text-xs text-muted-foreground mt-1">自动生成题目和答案</p>
          </CardContent>
        </Card>
        <Card className="no-glow">
          <CardContent className="py-5 text-center">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <p className="font-medium text-sm">随机测验</p>
            <p className="text-xs text-muted-foreground mt-1">抽题巩固记忆</p>
          </CardContent>
        </Card>
      </div>

      {/* 删除确认对话框 */}
      <ConfirmDialog
        open={deleteTarget !== null}
        title="删除文档"
        description="确定要删除该文档及其所有题目吗？此操作不可撤销。"
        confirmText="删除"
        variant="destructive"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
