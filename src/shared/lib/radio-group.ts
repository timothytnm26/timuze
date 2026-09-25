import type { KeyboardEvent } from 'react'

/**
 * Arrow keys for a `role="radiogroup"` of buttons: move focus and select, wrapping around –
 * like native radios. Pair with a roving tabindex (only the checked radio is tabbable).
 */
export function onRadioGroupKeyDown(e: KeyboardEvent<HTMLElement>) {
  const items = [...e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]')]
  const i = items.indexOf(document.activeElement as HTMLButtonElement)
  const next = { ArrowDown: i + 1, ArrowRight: i + 1, ArrowUp: i - 1, ArrowLeft: i - 1 }[e.key]
  if (next === undefined || i < 0) return
  e.preventDefault()
  const item = items.at(next % items.length)
  item?.focus()
  item?.click()
}
