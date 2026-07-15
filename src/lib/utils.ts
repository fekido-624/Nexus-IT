import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Floor plan zones can list more than one port (e.g. "D10, D13") — split into individual tokens.
export function parsePortNumbers(portNumber?: string | null): string[] {
  if (!portNumber) return []
  return portNumber.split(/[,;]/).map((p) => p.trim()).filter(Boolean)
}
