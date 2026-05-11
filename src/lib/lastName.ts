const KEY = "smartreceipt:lastName";

export function getLastName(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}

export function setLastName(name: string): void {
  if (typeof window === "undefined") return;
  const trimmed = name.trim();
  if (!trimmed) return;
  try {
    window.localStorage.setItem(KEY, trimmed);
  } catch {}
}
