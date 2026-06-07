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

// ========== 题目操作 ==========

/** 批量添加题目 */
export async function addQuestions(
  questions: Omit<Question, "id">[]
): Promise<number[]> {
  return await db.questions.bulkAdd(questions as Question[], { allKeys: true })
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

/** 随机获取一道题（可指定文档） */
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

  const randomIndex = Math.floor(Math.random() * questions.length)
  return questions[randomIndex]
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

/** 获取答错的题目 ID 列表 */
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

  return Array.from(latest.entries())
    .filter(([_, record]) => !record.isCorrect)
    .map(([id]) => id)
}

/** 获取答题统计 */
export async function getQuizStats(): Promise<{
  total: number
  correct: number
  wrong: number
}> {
  const allRecords = await db.quizRecords.toArray()

  // 按题目分组，取最新一条记录
  const latest: Map<number, QuizRecord> = new Map()
  for (const r of allRecords) {
    const existing = latest.get(r.questionId)
    if (!existing || r.createdAt > existing.createdAt) {
      latest.set(r.questionId, r)
    }
  }

  const entries = Array.from(latest.values())
  const correct = entries.filter((r) => r.isCorrect).length
  return {
    total: entries.length,
    correct,
    wrong: entries.length - correct,
  }
}

export default db
