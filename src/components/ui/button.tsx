import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[1.35rem] border-2 border-[rgb(var(--ink-rgb)/0.14)] text-sm font-medium transition-[transform,box-shadow,background-color,color,border-color] duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30 aria-invalid:border-destructive aria-invalid:ring-destructive/20 active:translate-y-px",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[0_4px_0_rgb(var(--ink-rgb)/0.16)] hover:-translate-y-px hover:bg-primary/90",
        destructive:
          "border-transparent bg-destructive text-white shadow-[0_4px_0_rgb(var(--ink-rgb)/0.14)] hover:-translate-y-px hover:bg-destructive/90 focus-visible:ring-destructive/20",
        outline:
          "bg-card text-foreground shadow-[0_4px_0_rgb(var(--ink-rgb)/0.1)] hover:-translate-y-px hover:bg-accent",
        secondary:
          "bg-secondary text-secondary-foreground shadow-[0_4px_0_rgb(var(--ink-rgb)/0.1)] hover:-translate-y-px hover:bg-secondary/90",
        ghost:
          "border-transparent bg-transparent text-foreground shadow-none hover:border-border hover:bg-card/80",
        link: "border-transparent bg-transparent text-primary shadow-none underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-5 py-2 has-[>svg]:px-4",
        sm: "h-8 gap-1.5 rounded-[1.1rem] px-3.5 has-[>svg]:px-3",
        lg: "h-11 rounded-[1.55rem] px-6 has-[>svg]:px-5",
        icon: "size-10 rounded-[1.1rem]",
        "icon-sm": "size-8 rounded-[1rem]",
        "icon-lg": "size-11 rounded-[1.2rem]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
