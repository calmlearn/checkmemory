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
 */
async function parsePDF(arrayBuffer: ArrayBuffer): Promise<string> {
  const pdfjs = await import("pdfjs-dist")

  // 配置 worker（仅在浏览器环境）
  if (typeof window !== "undefined") {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url
    ).toString()
  }

  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise
  const pageTexts: string[] = []

  for (let i = 1; i <= pdf.numPages; i++) {
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
