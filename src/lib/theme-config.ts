/**
 * 主题配置（纯数据，无客户端指令）
 * 可同时在服务端和客户端导入
 */

export interface Theme {
  id: string
  name: string
  color: string // 预览色
}

/** 可选主题列表 */
export const themes: Theme[] = [
  { id: "blue", name: "淡蓝", color: "#4A9EFF" },
  { id: "green", name: "清新绿", color: "#22C55E" },
  { id: "orange", name: "暖橙", color: "#F97316" },
  { id: "pink", name: "粉红", color: "#EC4899" },
  { id: "purple", name: "紫色", color: "#A855F7" },
]

/** 主题 ID 列表 */
export const THEME_IDS = themes.map((t) => t.id)
