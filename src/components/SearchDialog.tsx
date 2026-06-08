"use client"

import { useState, useEffect, useRef } from "react"
import { Search, FileText, PenSquare, Loader2, X } from "lucide-react"
import { searchQuestions, getAllDocuments } from "@/lib/db"
import type { Question } from "@/types"
import Link from "next/link"

interface SearchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function SearchDialog({ open, onOpenChange }: SearchDialogProps) {
  const [keyword, setKeyword] = useState("")
  const [results, setResults] = useState<Question[]>([])
  const [docMap, setDocMap] = useState<Record<number, { title: string; fileType: string }>>({})
  const [searching, setSearching] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setKeyword("")
      setResults([])
      getAllDocuments().then((docs) => {
        const map: Record<number, { title: string; fileType: string }> = {}
        docs.forEach((d) => {
          if (d.id) map[d.id] = { title: d.title, fileType: d.fileType }
        })
        setDocMap(map)
      })
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  useEffect(() => {
    if (!keyword.trim()) {
      setResults([])
      return
    }
    setSearching(true)
    const timer = setTimeout(async () => {
      const res = await searchQuestions(keyword)
      setResults(res)
      setSearching(false)
    }, 300)
    return () => clearTimeout(timer)
  }, [keyword])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      {/* 背景遮罩 */}
      <div className="fixed inset-0 bg-black/40" onClick={() => onOpenChange(false)} />

      {/* 搜索面板 */}
      <div className="relative z-50 w-full max-w-xl mx-4 bg-background rounded-xl shadow-2xl border overflow-hidden">
        {/* 搜索输入框 */}
        <div className="flex items-center gap-3 px-4 py-3 border-b">
          <Search className="h-5 w-5 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="搜索题目或答案关键词..."
            className="flex-1 bg-transparent outline-none text-base"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && onOpenChange(false)}
          />
          {keyword && (
            <button className="text-muted-foreground hover:text-foreground" onClick={() => setKeyword("")}>
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* 搜索结果 */}
        <div className="max-h-[50vh] overflow-y-auto">
          {searching ? (
            <div className="py-12 text-center text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
              搜索中...
            </div>
          ) : keyword && results.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              未找到匹配的题目
            </div>
          ) : results.length > 0 ? (
            <div className="divide-y">
              {results.map((q) => {
                const doc = q.documentId !== undefined ? docMap[q.documentId] : undefined
                return (
                  <Link
                    key={q.id}
                    href={`/documents/${q.documentId}`}
                    className="block px-4 py-3 hover:bg-accent/50 transition-colors"
                    onClick={() => onOpenChange(false)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium line-clamp-2">{q.question}</p>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                          答案：{q.answer}
                        </p>
                      </div>
                      {doc && (
                        <span className="text-xs text-muted-foreground shrink-0 flex items-center gap-1 mt-0.5">
                          {doc.fileType === "manual" ? (
                            <PenSquare className="h-3 w-3" />
                          ) : (
                            <FileText className="h-3 w-3" />
                          )}
                          {doc.title}
                        </span>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground text-sm">
              输入关键词搜索题目
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
