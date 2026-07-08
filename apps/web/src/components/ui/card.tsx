import { HTMLAttributes } from "react";
import { cn } from "@/utils/cn";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-card border border-slate-200 bg-white p-6 shadow-sm", className)}
      {...props}
    />
  );
}
