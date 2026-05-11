"use client"

import * as React from "react"
import * as AvatarPrimitive from "@radix-ui/react-avatar"

import { cn } from "@/lib/utils"

function Avatar({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Root>) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      className={cn(
        "relative flex size-8 shrink-0 overflow-hidden rounded-[1.35rem] border border-[rgb(var(--ink-rgb)/0.14)] bg-card shadow-[0_4px_0_rgb(var(--ink-rgb)/0.08)]",
        className
      )}
      {...props}
    />
  )
}

function AvatarImage({
  className,
  referrerPolicy = "no-referrer",
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Image>) {
  const src =
    typeof props.src === "string" && props.src.trim().length > 0
      ? props.src
      : undefined

  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn("aspect-square size-full", className)}
      referrerPolicy={referrerPolicy}
      src={src}
      {...props}
    />
  )
}

function AvatarFallback({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        "bg-muted flex size-full items-center justify-center rounded-[1.2rem] text-foreground",
        className
      )}
      {...props}
    />
  )
}

export { Avatar, AvatarImage, AvatarFallback }
