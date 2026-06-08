"use client"

import { useState, useEffect, useCallback } from "react"
import { FileText, BookOpen, Trash2, ChevronRight } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import FileUpload from "@/components/FileUpload"
import { getAllDocuments, deleteDocument, getQuestionCount } from "@/lib/db"
import type { Document } from "@/types"
import Link from "next/link"

/** 文档状态对应的中文标签 */
const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  processing: { label: "处理中", variant: "secondary" },
  completed: { label: "已完成", variant: "default" },
  error: { label: "失败", variant: "destructive" },
}

export default function HomePage() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [questionCounts, setQuestionCounts] = useState<Record<number, number>>({})
  const [loading, setLoading] = useState(true)

  /** 加载文档列表 */
  const loadDocuments = useCallback(async () => {
    setLoading(true)
    const docs = await getAllDocuments()
    setDocuments(docs)

    // 获取每个文档的题目数量
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
    if (confirm("确定要删除该文档及其所有题目吗？")) {
      await deleteDocument(id)
      await loadDocuments()
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* 页面标题 */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">我的文档</h1>
        <p className="text-muted-foreground">
          上传 PDF、Word 或 PPT 文件，AI 自动提取知识点
        </p>
      </div>

      {/* 上传区域 */}
      <FileUpload onSuccess={loadDocuments} />

      {/* 文档列表 */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          已上传的文档
        </h2>

        {loading ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              加载中...
            </CardContent>
          </Card>
        ) : documents.length === 0 ? (
          /* 空状态 */
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-muted-foreground">还没有上传文档</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                上传文档后，AI 会自动提取知识点
              </p>
            </CardContent>
          </Card>
        ) : (
          /* 文档列表 */
          <div className="grid gap-3">
            {documents.map((doc) => {
              const statusInfo = statusLabels[doc.status] || statusLabels.completed
              const count = questionCounts[doc.id!] ?? 0

              return (
                <Link key={doc.id} href={`/documents/${doc.id}`}>
                  <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          <FileText className="h-5 w-5 text-primary shrink-0" />
                          <div className="min-w-0">
                            <p className="font-medium truncate">{doc.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {count} 道题目 · {doc.fileType.toUpperCase()}
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
          <CardDescription>三步轻松开始学习</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
            <li>上传文档（PDF / Word / PPT）</li>
            <li>AI 自动提取问题和知识点</li>
            <li>在「开始测验」中随机抽题，巩固记忆</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  )
}
