import type { ButtonHTMLAttributes, AnchorHTMLAttributes } from 'react'
import { cn } from '../lib/cn'

type Variant = 'primary' | 'ghost' | 'outline'
type Size = 'sm' | 'md' | 'lg'

const base =
  'inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-[transform,background-color,color,box-shadow] duration-200 active:scale-[.97] disabled:pointer-events-none disabled:opacity-50 cursor-pointer select-none pixel:active:scale-100'
// pixel buttons sit on a hard shadow and "press" into it
const pixelRaised =
  'pixel:shadow-[4px_4px_0_0_#05060c] pixel:hover:shadow-[4px_4px_0_0_var(--skin-accent)] pixel:active:translate-[4px] pixel:active:shadow-none'
const variants: Record<Variant, string> = {
  primary: cn(
    'bg-brand text-canvas hover:bg-brand-strong hover:shadow-[0_0_40px_-8px_var(--skin-brand)] minimal:hover:shadow-none',
    'glass:shadow-[inset_0_1px_0_rgb(255_255_255/.45)]',
    pixelRaised,
  ),
  ghost: 'text-ink-muted hover:text-ink hover:bg-surface-2',
  outline: cn(
    'border border-line text-ink hover:border-ink-faint hover:bg-surface-2',
    'glass:bg-surface glass:backdrop-blur-xl pixel:border-2 pixel:bg-surface',
    pixelRaised,
  ),
}
const sizes: Record<Size, string> = {
  sm: 'h-8 px-3.5 text-sm',
  md: 'h-10 px-5 text-sm',
  lg: 'h-13 px-7 text-base',
}

export const buttonClass = (variant: Variant = 'primary', size: Size = 'md', className?: string) =>
  cn(base, variants[variant], sizes[size], className)

export function Button({
  variant,
  size,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return <button type="button" className={buttonClass(variant, size, className)} {...props} />
}

export function ButtonLink({
  variant,
  size,
  className,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & { variant?: Variant; size?: Size }) {
  return <a className={buttonClass(variant, size, className)} {...props} />
}
