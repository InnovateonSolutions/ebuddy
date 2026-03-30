import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-primary/10 text-primary',
        secondary: 'bg-secondary text-secondary-foreground',
        destructive: 'bg-destructive/10 text-destructive',
        outline: 'border border-current',
        negocio: 'bg-blue-100 text-blue-700',
        personal: 'bg-green-100 text-green-700',
        alta: 'bg-red-100 text-red-700',
        media: 'bg-amber-100 text-amber-700',
        baja: 'bg-slate-100 text-slate-600',
        pending: 'bg-slate-100 text-slate-600',
        in_progress: 'bg-blue-100 text-blue-700',
        done: 'bg-green-100 text-green-700',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
