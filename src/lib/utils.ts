import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getProxiedImageUrl(url?: string): string {
  if (!url) return '';
  // Don't proxy local images
  if (url.startsWith('/') || url.startsWith('blob:')) return url;
  return `/api/image-proxy?url=${encodeURIComponent(url)}`;
}
