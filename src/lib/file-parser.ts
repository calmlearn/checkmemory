/**
 * 文件解析模块
 * 在浏览器中解析 PDF、Word、PPT 文件，提取纯文本内容
 */

import mammoth from "mammoth"
import JSZip from "jszip"

/** 支持的文档类型 */
export type FileType = "pdf" | "docx" | "pptx"

/** 解析结果 */
export interface ParseResult {
  /** 提取的纯文本内容 */
  text: string
  /** 文档标题（取文件名） */
  title: string
  /** 文件类型 */
  fileType: FileType
}

/**
 * 根据文件类型解析文件内容
 * @param file 上传的文件
 * @returns 解析后的文本内容
 */
export async function parseFile(file: File): Promise<ParseResult> {
  const fileName = file.name
  const fileType = getFileType(fileName)

  if (!fileType) {
    throw new Error(`不支持的文件格式: ${fileName}。请上传 PDF、Word (.docx) 或 PPT (.pptx) 文件。`)
  }

  const arrayBuffer = await file.arrayBuffer()

  let text: string
  switch (fileType) {
    case "pdf":
      text = await parsePDF(arrayBuffer)
      break
    case "docx":
      text = await parseWord(arrayBuffer)
      break
    case "pptx":
      text = await parsePPT(arrayBuffer)
      break
  }

  // 清理多余空白
  text = text.replace(/\s+/g, " ").trim()

  if (!text) {
    throw new Error("未能从文件中提取到文本内容，请检查文件是否为空。")
  }

  return {
    text,
    title: fileName.replace(/\.(pdf|docx|pptx)$/i, ""),
    fileType,
  }
}

/**
 * 获取文件类型
 */
function getFileType(fileName: string): FileType | null {
  const ext = fileName.toLowerCase().split(".").pop()
  if (ext === "pdf") return "pdf"
  if (ext === "docx") return "docx"
  if (ext === "pptx") return "pptx"
  return null
}

/**
 * 解析 PDF 文件（动态加载 pdfjs-dist，避免 SSR 报错）
 *
 * Worker 说明：
 * - pdfjs-dist v6 创建的是 Module Worker（{type: "module"}）
 * - 移动端 Safari 对 Module Worker 的 MIME 类型检查严格，
 *   .mjs 文件部署后可能被 CDN 返回错误的 Content-Type
 * - 将 worker 文件复制到 public/ 并重命名为 .js，
 *   确保所有环境下都有正确的 JavaScript MIME 类型
 * - 详见 next.config.ts 中的配置
 */
async function parsePDF(arrayBuffer: ArrayBuffer): Promise<string> {
  const pdfjs = await import("pdfjs-dist")

  // 通过 public/ 目录加载 worker，避免 MIME 类型问题
  if (typeof window !== "undefined") {
    pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js"
  }

  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise

  const pageTexts: string[] = []
  const totalPages = pdf.numPages

  for (let i = 1; i <= totalPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const text = content.items.map((item: any) => item.str).join(" ")
    pageTexts.push(text)
  }

  return pageTexts.join("\n\n")
}

/**
 * 解析 Word 文件 (.docx)
 */
async function parseWord(arrayBuffer: ArrayBuffer): Promise<string> {
  const result = await mammoth.extractRawText({ arrayBuffer })
  return result.value
}

/**
 * 解析 PPT 文件 (.pptx)
 * PPTX 本质是 ZIP 压缩包，内含 XML 文件
 */
async function parsePPT(arrayBuffer: ArrayBuffer): Promise<string> {
  const zip = await JSZip.loadAsync(arrayBuffer)
  const slideTexts: string[] = []

  // 获取所有幻灯片文件（按编号排序）
  const slideFiles = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort()

  for (const slideFile of slideFiles) {
    const content = await zip.files[slideFile].async("text")
    // 提取 XML 中的文本内容
    const text = content
      .replace(/<[^>]*>/g, " ")
      .replace(/&[^;]+;/g, " ")
      .replace(/\s+/g, " ")
      .trim()
    if (text) {
      slideTexts.push(text)
    }
  }

  return slideTexts.join("\n\n")
}
