import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Compose Tailwind classes inline; later classes win over conflicting earlier ones. */
export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs))
