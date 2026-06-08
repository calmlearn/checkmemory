/** 文档状态 */
export type DocumentStatus = "processing" | "completed" | "error"

/** 上传的文档 */
export interface Document {
  id?: number
  title: string
  fileType: "pdf" | "docx" | "pptx" | "manual"
  status: DocumentStatus
  createdAt: Date
}

/** 知识点题目 */
export interface Question {
  id?: number
  documentId: number
  question: string
  answer: string
  isBookmarked: boolean
  createdAt: Date
}

/** 答题记录 */
export interface QuizRecord {
  id?: number
  questionId: number
  isCorrect: boolean
  createdAt: Date
}

/** AI 提取返回的结果 */
export interface ExtractedQA {
  question: string
  answer: string
}
