"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { themes, type Theme } from "./theme-config"
// 重新导出供其他组件使用
export { themes, type Theme, THEME_IDS } from "./theme-config"

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
