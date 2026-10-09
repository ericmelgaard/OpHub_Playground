import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
        secondary:
          "border-transparent bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
        destructive:
          "border-transparent bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300",
        outline: "border-gray-200 text-gray-700 dark:border-gray-700 dark:text-gray-300",
        breakfast: "border-transparent bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400",
        lunch: "border-transparent bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400",
        dinner: "border-transparent bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
        lateNight: "border-transparent bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-400",
        custom: "border-transparent bg-gray-50 text-gray-600 dark:bg-gray-900/20 dark:text-gray-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }