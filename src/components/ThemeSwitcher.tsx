"use client"

import { Palette } from "lucide-react"
import { themes, useTheme } from "@/lib/theme"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export default function ThemeSwitcher() {
  const { currentTheme, setTheme } = useTheme()

  return (
    <Popover>
      <PopoverTrigger className="inline-flex shrink-0 items-center justify-center border shadow-xs cursor-pointer h-11 w-11 rounded-full bg-transparent hover:bg-accent hover:text-accent-foreground transition-colors outline-none" aria-label="切换主题">
        <Palette className="h-5 w-5" />
      </PopoverTrigger>
      <PopoverContent className="w-56" align="end">
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground px-1">切换主题</p>
          <div className="grid grid-cols-5 gap-2">
            {themes.map((theme) => (
              <button
                key={theme.id}
                className={`
                  w-11 h-11 rounded-full border-2 transition-all cursor-pointer mx-auto
                  ${currentTheme === theme.id
                    ? "border-foreground scale-110 ring-2 ring-offset-2 ring-offset-background"
                    : "border-transparent hover:scale-110"
                  }
                `}
                style={{ backgroundColor: theme.color }}
                onClick={() => setTheme(theme.id)}
                aria-label={`切换到${theme.name}主题`}
              />
            ))}
          </div>
          <p className="text-xs text-center text-muted-foreground pt-1">
            {themes.find((t) => t.id === currentTheme)?.name}
          </p>
        </div>
      </PopoverContent>
    </Popover>
  )
}
