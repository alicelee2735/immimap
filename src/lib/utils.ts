import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

// Registers the ImmiMap identity tokens (globals.css) as recognized color
// names so conflicting Tailwind color utilities (e.g. `text-primary-foreground`
// vs `text-ink-navy`) resolve correctly instead of both landing in the class list.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      color: ["ink-navy", "route-blue", "signal-amber", "paper", "charcoal"],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
