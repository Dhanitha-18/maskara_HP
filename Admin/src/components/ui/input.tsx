import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2 text-base shadow-sm transition-all outline-none selection:bg-blue-100 selection:text-blue-900 file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-slate-900 placeholder:text-slate-400 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm hover:border-slate-300 hover:bg-slate-50",
        "focus-visible:border-blue-500 focus-visible:ring-4 focus-visible:ring-blue-500/20 focus-visible:bg-white",
        "aria-invalid:border-rose-500 aria-invalid:ring-rose-500/20",
        className
      )}
      {...props}
    />
  )
}

export { Input }
