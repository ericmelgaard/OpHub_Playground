import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        breakfast: "border-transparent bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400",
        lunch: "border-transparent bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400",
        dinner: "border-transparent bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
        lateNight: "border-transparent bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400",
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