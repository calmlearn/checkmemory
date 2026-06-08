import Dexie, { type Table } from "dexie"
import type { Document, Question, QuizRecord } from "@/types"

/** 本地数据库 - 使用 IndexedDB 存储所有数据 */
class MemoryDB extends Dexie {
  documents!: Table<Document, number>
  questions!: Table<Question, number>
  quizRecords!: Table<QuizRecord, number>

  constructor() {
    super("MemoryDB")
    this.version(1).stores({
      documents: "++id, title, status, createdAt",
      questions: "++id, documentId, isBookmarked, createdAt",
      quizRecords: "++id, questionId, isCorrect, createdAt",
    })
  }
}

const db = new MemoryDB()

// ========== 文档操作 ==========

/** 添加文档 */
export async function addDocument(doc: Omit<Document, "id">): Promise<number> {
  return await db.documents.add(doc as Document)
}

/** 获取所有文档（按时间倒序） */
export async function getAllDocuments(): Promise<Document[]> {
  return await db.documents.orderBy("createdAt").reverse().toArray()
}

/** 获取单个文档 */
export async function getDocument(id: number): Promise<Document | undefined> {
  return await db.documents.get(id)
}

/** 更新文档状态 */
export async function updateDocumentStatus(
  id: number,
  status: Document["status"]
): Promise<void> {
  await db.documents.update(id, { status })
}

/** 删除文档及其关联的所有问题 */
export async function deleteDocument(id: number): Promise<void> {
  await db.transaction("rw", db.documents, db.questions, db.quizRecords, async () => {
    const questionIds = await db.questions
      .where("documentId")
      .equals(id)
      .primaryKeys()

    // 删除该文档下的所有答题记录
    for (const qId of questionIds) {
      await db.quizRecords.where("questionId").equals(qId).delete()
    }

    // 删除该文档下的所有问题
    await db.questions.where("documentId").equals(id).delete()

    // 删除文档本身
    await db.documents.delete(id)
  })
}

/** 创建手动题库文档 */
export async function createManualDocument(title: string): Promise<number> {
  return await db.documents.add({
    title,
    fileType: "manual",
    status: "completed",
    createdAt: new Date(),
  })
}

// ========== 题目操作 ==========

/** 批量添加题目 */
export async function addQuestions(
  questions: Omit<Question, "id">[]
): Promise<number[]> {
  return await db.questions.bulkAdd(questions as Question[], { allKeys: true })
}

/** 添加单道题目 */
export async function addSingleQuestion(
  q: Omit<Question, "id">
): Promise<number> {
  return await db.questions.add(q as Question)
}

/** 删除单道题目及其答题记录 */
export async function deleteQuestion(questionId: number): Promise<void> {
  await db.transaction("rw", db.questions, db.quizRecords, async () => {
    await db.quizRecords.where("questionId").equals(questionId).delete()
    await db.questions.delete(questionId)
  })
}

/** 获取某个文档下的所有题目 */
export async function getQuestionsByDocument(
  documentId: number
): Promise<Question[]> {
  return await db.questions
    .where("documentId")
    .equals(documentId)
    .toArray()
}

/** 获取所有题目 */
export async function getAllQuestions(): Promise<Question[]> {
  return await db.questions.toArray()
}

/** 根据 ID 列表批量获取题目 */
export async function getQuestionsByIds(ids: number[]): Promise<Question[]> {
  if (ids.length === 0) return []
  return await db.questions.where("id").anyOf(ids).toArray()
}

/** 获取所有收藏的题目 */
export async function getBookmarkedQuestions(): Promise<Question[]> {
  return await db.questions
    .where("isBookmarked")
    .equals(1)
    .toArray()
}

/** 切换收藏状态 */
export async function toggleBookmark(questionId: number): Promise<boolean> {
  const q = await db.questions.get(questionId)
  if (!q) return false
  const newVal = !q.isBookmarked
  await db.questions.update(questionId, { isBookmarked: newVal })
  return newVal
}

/** 随机获取一道题（可指定文档，排除已掌握 >=3 次的题目） */
export async function getRandomQuestion(
  documentId?: number
): Promise<Question | undefined> {
  let questions: Question[]

  if (documentId) {
    questions = await db.questions
      .where("documentId")
      .equals(documentId)
      .toArray()
  } else {
    questions = await db.questions.toArray()
  }

  if (questions.length === 0) return undefined

  // 排除已掌握的题目
  const masteredIds = await getMasteredQuestionIds()
  const masteredSet = new Set(masteredIds)
  const available = questions.filter((q) => q.id !== undefined && !masteredSet.has(q.id))

  if (available.length === 0) return undefined

  const randomIndex = Math.floor(Math.random() * available.length)
  return available[randomIndex]
}

/** 获取题目总数 */
export async function getQuestionCount(documentId?: number): Promise<number> {
  if (documentId) {
    return await db.questions.where("documentId").equals(documentId).count()
  }
  return await db.questions.count()
}

// ========== 答题记录操作 ==========

/** 添加答题记录 */
export async function addQuizRecord(
  record: Omit<QuizRecord, "id">
): Promise<number> {
  return await db.quizRecords.add(record as QuizRecord)
}

/** 获取某道题的答题记录 */
export async function getRecordsByQuestion(
  questionId: number
): Promise<QuizRecord[]> {
  return await db.quizRecords
    .where("questionId")
    .equals(questionId)
    .toArray()
}

/** 获取所有答题记录 */
export async function getAllQuizRecords(): Promise<QuizRecord[]> {
  return await db.quizRecords.toArray()
}

/** 获取答错的题目 ID 列表（排除已掌握 >=3 次的题目） */
export async function getWrongQuestionIds(): Promise<number[]> {
  const records = await db.quizRecords.toArray()

  // 按题目分组，取最新一次记录
  const latest: Map<number, QuizRecord> = new Map()
  for (const r of records) {
    const existing = latest.get(r.questionId)
    if (!existing || r.createdAt > existing.createdAt) {
      latest.set(r.questionId, r)
    }
  }

  const wrongIds = Array.from(latest.entries())
    .filter(([_, record]) => !record.isCorrect)
    .map(([id]) => id)

  // 排除已掌握的题目
  const masteredIds = await getMasteredQuestionIds()
  const masteredSet = new Set(masteredIds)
  return wrongIds.filter((id) => !masteredSet.has(id))
}

/** 获取指定文档中的错题 ID 列表 */
export async function getWrongQuestionIdsByDocument(docId: number): Promise<number[]> {
  const allWrongIds = await getWrongQuestionIds()
  if (allWrongIds.length === 0) return []
  const docQuestions = await db.questions.where("documentId").equals(docId).toArray()
  const docQuestionIds = new Set(docQuestions.map((q) => q.id).filter(Boolean) as number[])
  return allWrongIds.filter((id) => docQuestionIds.has(id))
}

/** 判断某道题是否已被标记为答错 */
export async function isQuestionWrong(questionId: number): Promise<boolean> {
  const records = await db.quizRecords.where("questionId").equals(questionId).toArray()
  if (records.length === 0) return false
  const latest = records.reduce((a, b) => (a.createdAt > b.createdAt ? a : b))
  return !latest.isCorrect
}

/** 获取某道题答对次数 */
export async function getCorrectCount(questionId: number): Promise<number> {
  const correctRecords = await db.quizRecords
    .where("questionId")
    .equals(questionId)
    .filter((r) => r.isCorrect)
    .count()
  return correctRecords
}

/** 判断某道题是否达到掌握次数（3次答对） */
const MASTERED_THRESHOLD = 3
export async function isQuestionMastered(questionId: number): Promise<boolean> {
  const count = await getCorrectCount(questionId)
  return count >= MASTERED_THRESHOLD
}

/** 获取所有已掌握的题目 ID（答对 >= 3 次） */
export async function getMasteredQuestionIds(): Promise<number[]> {
  const allRecords = await db.quizRecords.toArray()
  const correctCounts = new Map<number, number>()
  for (const r of allRecords) {
    if (r.isCorrect) {
      correctCounts.set(r.questionId, (correctCounts.get(r.questionId) || 0) + 1)
    }
  }
  return Array.from(correctCounts.entries())
    .filter(([_, count]) => count >= MASTERED_THRESHOLD)
    .map(([id]) => id)
}

/** 获取掌握阈值 */
export function getMasteredThreshold(): number {
  return MASTERED_THRESHOLD
}

/** 删除某道题的所有答题记录（用于从错题集中移除） */
export async function deleteQuizRecordsByQuestion(questionId: number): Promise<void> {
  await db.quizRecords.where("questionId").equals(questionId).delete()
}

/** 获取答题统计 */
export async function getQuizStats(): Promise<{
  total: number          // 已答题数（有记录即可，不限次数）
  correct: number        // 已掌握数（答对 >= 3 次）
  wrong: number          // 最新记录为答错且未掌握
  masteredCount: number  // 已掌握总次数（所有题累计答对次数）
  inProgress: number     // 答题中（有答对记录但未满 3 次）
}> {
  const allQuestions = await db.questions.toArray()
  const allRecords = await db.quizRecords.toArray()

  // 按题目分组统计
  const questionStats = new Map<number, { correctCount: number; hasWrong: boolean }>()
  const latestRecord = new Map<number, QuizRecord>()

  for (const r of allRecords) {
    // 统计正确次数
    if (r.isCorrect) {
      const stats = questionStats.get(r.questionId) || { correctCount: 0, hasWrong: false }
      stats.correctCount++
      questionStats.set(r.questionId, stats)
    }
    // 记录最新记录
    const existing = latestRecord.get(r.questionId)
    if (!existing || r.createdAt > existing.createdAt) {
      latestRecord.set(r.questionId, r)
    }
  }

  // 按题目分组后，更新 hasWrong
  for (const [qId, record] of latestRecord) {
    if (!record.isCorrect) {
      const stats = questionStats.get(qId) || { correctCount: 0, hasWrong: false }
      stats.hasWrong = true
      questionStats.set(qId, stats)
    }
  }

  let masteredCount = 0
  let inProgress = 0
  let wrong = 0

  for (const [_, stats] of questionStats) {
    if (stats.correctCount >= MASTERED_THRESHOLD) {
      masteredCount++
    } else if (stats.correctCount > 0) {
      inProgress++
    }
    if (stats.hasWrong && stats.correctCount < MASTERED_THRESHOLD) {
      wrong++
    }
  }

  return {
    total: questionStats.size,
    correct: masteredCount,
    wrong,
    masteredCount: masteredCount,
    inProgress,
  }
}

export default db
