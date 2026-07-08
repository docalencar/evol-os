import { TextareaHTMLAttributes } from "react"

import { cn } from "@/utils/cn"

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-24 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-evol-blue focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}
