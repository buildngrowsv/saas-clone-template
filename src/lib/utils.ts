/**
 * Utility functions shared across the application.
 *
 * WHY THIS FILE:
 * This is the standard shadcn/ui utility file. The `cn()` function merges
 * Tailwind CSS classes with proper conflict resolution. For example,
 * cn("px-4", "px-6") returns "px-6" (not "px-4 px-6").
 *
 * IMPORTED BY:
 * Every shadcn/ui component and any custom component that uses conditional classes.
 * This is the most-imported utility in the codebase.
 */
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind CSS classes with conflict resolution.
 *
 * Uses clsx for conditional class joining and tailwind-merge for deduplication.
 * Example: cn("text-red-500", isActive && "text-blue-500") properly resolves
 * the conflict instead of applying both colors.
 *
 * @param inputs - Class names, objects, or arrays to merge
 * @returns Merged class string with conflicts resolved
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
