import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const PARTICIPANT_PALETTE = [
  "#a78bfa",
  "#22d3ee",
  "#34d399",
  "#fbbf24",
  "#60a5fa",
  "#fb923c",
  "#2dd4bf",
  "#e879f9",
  "#a3e635",
  "#818cf8",
];

export function participantColor(name: string) {
  const key = name.trim().toLowerCase();
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return PARTICIPANT_PALETTE[h % PARTICIPANT_PALETTE.length];
}

export function formatMoney(value: number, currency: string) {
  const rounded = Math.round(value * 100) / 100;
  const isWhole = Math.abs(rounded - Math.trunc(rounded)) < 1e-9;
  const fractionDigits = isWhole ? 0 : 2;
  try {
    return new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency: currency || "RUB",
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(rounded);
  } catch {
    return `${rounded.toFixed(fractionDigits)} ${currency}`;
  }
}
