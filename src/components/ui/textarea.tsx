import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "border-input placeholder:text-muted-foreground flex field-sizing-content min-h-20 w-full rounded-[1.45rem] border-2 bg-card px-4 py-3 text-base shadow-[inset_0_1px_0_rgb(var(--paper-soft-rgb)/0.98)] transition-[color,box-shadow,border-color,background-color] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/25 aria-invalid:border-destructive aria-invalid:ring-destructive/20 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
