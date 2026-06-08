/**
 * 云端数据库操作
 * 使用 Supabase 存储所有数据，跨设备同步
 */

import { createSupabaseBrowserClient } from "./supabase-client"
import type { Document, Question, QuizRecord } from "@/types"

// ========== 工具函数 ==========

async function getUserId(): Promise<string> {
  const supabase = createSupabaseBrowserClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("未登录")
  return user.id
}

function getClient() {
  return createSupabaseBrowserClient()
}

// 数据库行 → TypeScript 类型映射
function mapDoc(d: any): Document {
  return { id: d.id, title: d.title, fileType: d.file_type, status: d.status, createdAt: new Date(d.created_at) }
}

function mapQ(d: any): Question {
  return { id: d.id, documentId: d.document_id, question: d.question, answer: d.answer, isBookmarked: !!d.is_bookmarked, createdAt: new Date(d.created_at) }
}

function mapQR(d: any): QuizRecord {
  return { id: d.id, questionId: d.question_id, isCorrect: !!d.is_correct, createdAt: new Date(d.created_at) }
}

// ========== 文档操作 ==========

export async function addDocument(doc: Omit<Document, "id">): Promise<number> {
  const userId = await getUserId()
  const { data, error } = await getClient().from("documents").insert({
    user_id: userId, title: doc.title, file_type: doc.fileType,
    status: doc.status, created_at: doc.createdAt.toISOString(),
  }).select("id").single()
  if (error) throw error
  return data.id
}

export async function getAllDocuments(): Promise<Document[]> {
  const userId = await getUserId()
  const { data } = await getClient().from("documents").select("*").eq("user_id", userId).order("created_at", { ascending: false })
  return (data || []).map(mapDoc)
}

export async function getDocument(id: number): Promise<Document | undefined> {
  const userId = await getUserId()
  const { data } = await getClient().from("documents").select("*").eq("user_id", userId).eq("id", id).maybeSingle()
  return data ? mapDoc(data) : undefined
}

export async function updateDocumentStatus(id: number, status: Document["status"]): Promise<void> {
  await getClient().from("documents").update({ status }).eq("id", id)
}

export async function deleteDocument(id: number): Promise<void> {
  await getClient().from("documents").delete().eq("id", id)
}

export async function createManualDocument(title: string): Promise<number> {
  const userId = await getUserId()
  const { data, error } = await getClient().from("documents").insert({
    user_id: userId, title, file_type: "manual", status: "completed", created_at: new Date().toISOString(),
  }).select("id").single()
  if (error) throw error
  return data.id
}

// ========== 题目操作 ==========

export async function addQuestions(questions: Omit<Question, "id">[]): Promise<number[]> {
  const userId = await getUserId()
  const { data, error } = await getClient().from("questions").insert(
    questions.map((q) => ({
      user_id: userId, document_id: q.documentId, question: q.question, answer: q.answer,
      is_bookmarked: q.isBookmarked, created_at: q.createdAt.toISOString(),
    }))
  ).select("id")
  if (error) throw error
  return data.map((d: any) => d.id)
}

export async function addSingleQuestion(q: Omit<Question, "id">): Promise<number> {
  const userId = await getUserId()
  const { data, error } = await getClient().from("questions").insert({
    user_id: userId, document_id: q.documentId, question: q.question, answer: q.answer,
    is_bookmarked: q.isBookmarked, created_at: q.createdAt.toISOString(),
  }).select("id").single()
  if (error) throw error
  return data.id
}

export async function deleteQuestion(questionId: number): Promise<void> {
  await getClient().from("questions").delete().eq("id", questionId)
}

export async function getQuestionsByDocument(documentId: number): Promise<Question[]> {
  const { data } = await getClient().from("questions").select("*").eq("document_id", documentId).order("created_at", { ascending: true })
  return (data || []).map(mapQ)
}

export async function getAllQuestions(): Promise<Question[]> {
  const userId = await getUserId()
  const { data } = await getClient().from("questions").select("*").eq("user_id", userId).order("created_at", { ascending: false })
  return (data || []).map(mapQ)
}

export async function getQuestionsByIds(ids: number[]): Promise<Question[]> {
  if (ids.length === 0) return []
  const { data } = await getClient().from("questions").select("*").in("id", ids)
  return (data || []).map(mapQ)
}

export async function getBookmarkedQuestions(): Promise<Question[]> {
  const userId = await getUserId()
  const { data } = await getClient().from("questions").select("*").eq("user_id", userId).eq("is_bookmarked", true)
  return (data || []).map(mapQ)
}

export async function toggleBookmark(questionId: number): Promise<boolean> {
  const { data: existing } = await getClient().from("questions").select("is_bookmarked").eq("id", questionId).single()
  const newVal = !existing?.is_bookmarked
  await getClient().from("questions").update({ is_bookmarked: newVal }).eq("id", questionId)
  return newVal
}

export async function getRandomQuestion(documentId?: number): Promise<Question | undefined> {
  const userId = await getUserId()
  let query = getClient().from("questions").select("*").eq("user_id", userId)
  if (documentId) query = query.eq("document_id", documentId)

  const masteredIds = await getMasteredQuestionIds()
  if (masteredIds.length > 0) {
    query = query.not("id", "in", `(${masteredIds.join(",")})`)
  }

  const { data } = await query
  if (!data || data.length === 0) return undefined
  return mapQ(data[Math.floor(Math.random() * data.length)])
}

export async function getQuestionCount(documentId?: number): Promise<number> {
  const userId = await getUserId()
  let query = getClient().from("questions").select("*", { count: "exact", head: true }).eq("user_id", userId)
  if (documentId) query = query.eq("document_id", documentId)
  const { count } = await query
  return count || 0
}

// ========== 答题记录 ==========

export async function addQuizRecord(record: Omit<QuizRecord, "id">): Promise<number> {
  const userId = await getUserId()
  const { data, error } = await getClient().from("quiz_records").insert({
    user_id: userId, question_id: record.questionId, is_correct: record.isCorrect, created_at: record.createdAt.toISOString(),
  }).select("id").single()
  if (error) throw error
  return data.id
}

export async function getRecordsByQuestion(questionId: number): Promise<QuizRecord[]> {
  const { data } = await getClient().from("quiz_records").select("*").eq("question_id", questionId).order("created_at", { ascending: false })
  return (data || []).map(mapQR)
}

export async function getAllQuizRecords(): Promise<QuizRecord[]> {
  const userId = await getUserId()
  const { data } = await getClient().from("quiz_records").select("*").eq("user_id", userId)
  return (data || []).map(mapQR)
}

export async function deleteQuizRecordsByQuestion(questionId: number): Promise<void> {
  await getClient().from("quiz_records").delete().eq("question_id", questionId)
}

// ========== 错题与掌握逻辑 ==========

export async function getWrongQuestionIds(): Promise<number[]> {
  const userId = await getUserId()
  const { data: records } = await getClient().from("quiz_records")
    .select("question_id, is_correct").eq("user_id", userId).order("created_at", { ascending: false })
  if (!records || records.length === 0) return []

  const latest = new Map<number, boolean>()
  for (const r of records) {
    if (!latest.has(r.question_id)) latest.set(r.question_id, r.is_correct)
  }

  const wrongIds = Array.from(latest.entries()).filter(([_, c]) => !c).map(([id]) => id)
  const masteredIds = await getMasteredQuestionIds()
  const masteredSet = new Set(masteredIds)
  return wrongIds.filter((id) => !masteredSet.has(id))
}

export async function getWrongQuestionIdsByDocument(docId: number): Promise<number[]> {
  const allWrongIds = await getWrongQuestionIds()
  if (allWrongIds.length === 0) return []
  const { data } = await getClient().from("questions").select("id").eq("document_id", docId)
  const docIds = new Set((data || []).map((q: any) => q.id))
  return allWrongIds.filter((id) => docIds.has(id))
}

export async function isQuestionWrong(questionId: number): Promise<boolean> {
  const { data } = await getClient().from("quiz_records").select("is_correct").eq("question_id", questionId).order("created_at", { ascending: false }).limit(1)
  return data && data.length > 0 ? !data[0].is_correct : false
}

export async function getCorrectCount(questionId: number): Promise<number> {
  const { count } = await getClient().from("quiz_records").select("*", { count: "exact", head: true }).eq("question_id", questionId).eq("is_correct", true)
  return count || 0
}

export async function isQuestionMastered(questionId: number): Promise<boolean> {
  return (await getCorrectCount(questionId)) >= 3
}

export async function getMasteredQuestionIds(): Promise<number[]> {
  const userId = await getUserId()
  const { data: records } = await getClient().from("quiz_records").select("question_id").eq("user_id", userId).eq("is_correct", true)
  if (!records) return []

  const countMap = new Map<number, number>()
  for (const r of records) {
    countMap.set(r.question_id, (countMap.get(r.question_id) || 0) + 1)
  }
  return Array.from(countMap.entries()).filter(([_, c]) => c >= 3).map(([id]) => id)
}

export async function getQuizStats() {
  const userId = await getUserId()
  const { data: allQuestions } = await getClient().from("questions").select("id").eq("user_id", userId)
  const totalCount = allQuestions?.length || 0
  if (totalCount === 0) return { total: 0, correct: 0, wrong: 0, masteredCount: 0, inProgress: 0 }

  const questionIds = allQuestions!.map((q: any) => q.id)
  const { data: allRecords } = await getClient().from("quiz_records").select("question_id, is_correct").eq("user_id", userId)

  const correctCounts = new Map<number, number>()
  const latestRecord = new Map<number, boolean>()
  for (const r of allRecords || []) {
    if (r.is_correct) correctCounts.set(r.question_id, (correctCounts.get(r.question_id) || 0) + 1)
    if (!latestRecord.has(r.question_id)) latestRecord.set(r.question_id, r.is_correct)
  }

  let masteredCount = 0, inProgress = 0, wrong = 0
  for (const qId of questionIds) {
    const cc = correctCounts.get(qId) || 0
    if (cc >= 3) masteredCount++
    else if (cc > 0) inProgress++
    if (latestRecord.get(qId) === false && cc < 3) wrong++
  }

  return { total: totalCount, correct: masteredCount, wrong, masteredCount, inProgress }
}

export const MASTERED_THRESHOLD = 3
export function getMasteredThreshold() { return MASTERED_THRESHOLD }

export async function searchQuestions(keyword: string): Promise<Question[]> {
  const userId = await getUserId()
  if (!keyword.trim()) return []
  const kw = keyword.trim()
  const { data } = await getClient().from("questions").select("*").eq("user_id", userId)
    .or(`question.ilike.%${kw}%,answer.ilike.%${kw}%`).limit(50)
  return (data || []).map(mapQ)
}
