import { BookOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function QuizPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center space-y-3">
        <BookOpen className="h-12 w-12 text-primary mx-auto" />
        <h1 className="text-2xl font-bold">随机测验</h1>
        <p className="text-muted-foreground">
          先从首页上传文档并提取知识点，再来开始测验吧！
        </p>
        <Link href="/">
          <Button>去上传文档</Button>
        </Link>
      </div>
    </div>
  )
}
