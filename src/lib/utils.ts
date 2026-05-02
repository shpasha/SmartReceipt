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

export function participantColor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return PARTICIPANT_PALETTE[h % PARTICIPANT_PALETTE.length];
}

export function formatMoney(value: number, currency: string) {
  try {
    return new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency: currency || "RUB",
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
}
