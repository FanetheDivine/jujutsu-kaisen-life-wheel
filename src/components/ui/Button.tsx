import { cva, type VariantProps } from 'class-variance-authority'
import type { ButtonHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

const buttonVariants = cva(
  'cursor-pointer rounded-sm border px-3.5 py-2 font-body text-[13px] tracking-[0.04em] transition duration-200 ease-out-quart hover:border-vermillion hover:text-vermillion active:translate-y-px disabled:cursor-not-allowed disabled:opacity-[0.38] disabled:transform-none',
  {
    variants: {
      variant: {
        default: 'border-line bg-surface text-ink',
        primary:
          'border-vermillion bg-vermillion px-[26px] py-3 text-[15px] font-medium tracking-[0.14em] text-[#fff4e8] hover:bg-hl hover:text-white',
        ghost: 'border-line bg-transparent text-ink',
      },
      size: {
        default: '',
        sm: 'px-2.5 py-1.5 text-xs',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
)

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>

export function Button({ className, variant, size, type = 'button', ...props }: ButtonProps) {
  return (
    <button type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  )
}
