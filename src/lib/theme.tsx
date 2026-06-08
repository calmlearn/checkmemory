"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"

/** 主题定义 */
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

interface ThemeContextType {
  currentTheme: string
  setTheme: (theme: string) => void
}

const ThemeContext = createContext<ThemeContextType>({
  currentTheme: "blue",
  setTheme: () => {},
})

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [currentTheme, setCurrentTheme] = useState("blue")

  useEffect(() => {
    // 从 localStorage 读取主题
    const saved = localStorage.getItem("app-theme")
    if (saved && themes.some((t) => t.id === saved)) {
      setCurrentTheme(saved)
      document.documentElement.setAttribute("data-theme", saved)
    } else {
      document.documentElement.setAttribute("data-theme", "blue")
    }
  }, [])

  const setTheme = (themeId: string) => {
    setCurrentTheme(themeId)
    document.documentElement.setAttribute("data-theme", themeId)
    localStorage.setItem("app-theme", themeId)
  }

  return (
    <ThemeContext.Provider value={{ currentTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
