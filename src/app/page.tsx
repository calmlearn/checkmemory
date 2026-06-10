"use client"

import { useState, useEffect, useCallback } from "react"
import { FileText, BookOpen, Trash2, ChevronRight, Plus, PenSquare } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import FileUpload from "@/components/FileUpload"
import ConfirmDialog from "@/components/ConfirmDialog"
import { Skeleton } from "@/components/ui/skeleton"
import { getAllDocuments, deleteDocument, getQuestionCount, createManualDocument } from "@/lib/db"
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

/** 文档类型图标 */
const fileTypeLabels: Record<string, string> = {
  pdf: "PDF",
  docx: "DOCX",
  pptx: "PPTX",
  manual: "手动",
}

export default function HomePage() {
  const router = useRouter()
  const [documents, setDocuments] = useState<Document[]>([])
  const [questionCounts, setQuestionCounts] = useState<Record<number, number>>({})
  const [loading, setLoading] = useState(true)
  const [showCreateInput, setShowCreateInput] = useState(false)
  const [newDocTitle, setNewDocTitle] = useState("")
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null)

  /** 加载文档列表 */
  const loadDocuments = useCallback(async () => {
    setLoading(true)
    const docs = await getAllDocuments()
    setDocuments(docs)

    const counts: Record<number, number> = {}
    for (const doc of docs) {
      if (doc.id) {
        counts[doc.id] = await getQuestionCount(doc.id)
      }
    }
    setQuestionCounts(counts)
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
    <div className="max-w-4xl mx-auto space-y-8">
      {/* 页面标题 */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">我的文档</h1>
        <p className="text-muted-foreground">
          上传文件或手动创建题库，AI 自动提取知识点
        </p>
      </div>

      {/* 上传区域 */}
      <FileUpload onSuccess={loadDocuments} />

      {/* 创建自定义题库 */}
      <Card>
        <CardContent className="py-6">
          {showCreateInput ? (
            <div className="flex items-center gap-3">
              <Input
                placeholder="输入题库名称..."
                value={newDocTitle}
                onChange={(e) => setNewDocTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateManual()}
                autoFocus
              />
              <Button onClick={handleCreateManual}>创建</Button>
              <Button variant="ghost" onClick={() => { setShowCreateInput(false); setNewDocTitle("") }}>
                取消
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              className="w-full gap-2 border-dashed"
              onClick={() => setShowCreateInput(true)}
            >
              <PenSquare className="h-4 w-4" />
              创建自定义题库
            </Button>
          )}
        </CardContent>
      </Card>

      {/* 文档列表 */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          所有题库
        </h2>

        {loading ? (
          <div className="grid gap-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="py-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-5 w-5 rounded" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : documents.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-muted-foreground">还没有任何题库</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                上传文档或手动创建都可以
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 list-enter">
            {documents.map((doc, idx) => {
              const statusInfo = statusLabels[doc.status] || statusLabels.completed
              const count = questionCounts[doc.id!] ?? 0
              const typeLabel = fileTypeLabels[doc.fileType] || doc.fileType.toUpperCase()

              return (
                <Link key={doc.id} href={`/documents/${doc.id}`} style={{ "--i": idx } as React.CSSProperties}>
                  <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          {doc.fileType === "manual" ? (
                            <PenSquare className="h-5 w-5 text-primary shrink-0" />
                          ) : (
                            <FileText className="h-5 w-5 text-primary shrink-0" />
                          )}
                          <div className="min-w-0">
                            <p className="font-medium truncate">{doc.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {count} 道题目 · {typeLabel}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant={statusInfo.variant}>
                            {statusInfo.label}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={(e) => doc.id && handleDelete(e, doc.id)}
                          >
                            <Trash2 className="h-4 w-4" />
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

      {/* 使用说明 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            使用说明
          </CardTitle>
          <CardDescription>三种方式创建题库</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
            <li>上传文档（PDF / Word / PPT），AI 自动提取知识点</li>
            <li>手动创建自定义题库，自由添加题目</li>
            <li>在「开始测验」中随机抽题，巩固记忆</li>
          </ol>
        </CardContent>
      </Card>

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
