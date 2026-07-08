import { InputHTMLAttributes } from "react";
import { cn } from "@/utils/cn";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-evol-blue focus:ring-2 focus:ring-blue-100",
        className
      )}
      {...props}
    />
  );
}
