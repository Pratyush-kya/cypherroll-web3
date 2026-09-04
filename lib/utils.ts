import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCrypto(val: number, decimals: number = 4): string {
  return val.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: decimals,
  });
}

export function truncateHash(hash: string, lead: number = 6, tail: number = 4): string {
  if (!hash) return "";
  if (hash.length <= lead + tail) return hash;
  return `${hash.substring(0, lead)}...${hash.substring(hash.length - tail)}`;
}
