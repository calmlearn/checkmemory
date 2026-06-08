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
      <PopoverTrigger className="inline-flex shrink-0 items-center justify-center border shadow-xs cursor-pointer h-9 w-9 rounded-full bg-transparent hover:bg-accent hover:text-accent-foreground transition-colors outline-none">
        <Palette className="h-4 w-4" />
      </PopoverTrigger>
      <PopoverContent className="w-48" align="end">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground px-1">切换主题</p>
          <div className="grid grid-cols-5 gap-2">
            {themes.map((theme) => (
              <button
                key={theme.id}
                className={`
                  w-8 h-8 rounded-full border-2 transition-all cursor-pointer
                  ${currentTheme === theme.id
                    ? "border-foreground scale-110 ring-2 ring-offset-2 ring-offset-background"
                    : "border-transparent hover:scale-110"
                  }
                `}
                style={{ backgroundColor: theme.color }}
                onClick={() => setTheme(theme.id)}
                title={theme.name}
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
