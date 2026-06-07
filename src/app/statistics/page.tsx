import { BarChart3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function StatisticsPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center space-y-3">
        <BarChart3 className="h-12 w-12 text-primary mx-auto" />
        <h1 className="text-2xl font-bold">学习统计</h1>
        <p className="text-muted-foreground">
          上传文档并开始答题后，这里会显示你的学习进度和正确率统计。
        </p>
        <Link href="/">
          <Button>去上传文档</Button>
        </Link>
      </div>
    </div>
  )
}
