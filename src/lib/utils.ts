import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Guards a post-auth redirect target against open-redirect abuse: must be a
 * same-origin relative path (single leading `/`, never `//` or an embedded
 * `://`).
 */
export function isSafeRedirectPath(path: string | undefined | null): path is string {
  return (
    typeof path === "string" &&
    path.startsWith("/") &&
    !path.startsWith("//") &&
    !path.includes("://")
  );
}
