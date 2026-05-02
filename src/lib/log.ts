type Fields = Record<string, string | number | boolean | null | undefined>;

function quote(v: string | number | boolean | null | undefined) {
  if (v === null || v === undefined) return "";
  if (typeof v === "string" && /\s/.test(v)) return `"${v.replace(/"/g, '\\"')}"`;
  return String(v);
}

export function logEvent(event: string, fields: Fields = {}) {
  const parts = [`event=${event}`];
  for (const [k, v] of Object.entries(fields)) {
    if (v === undefined || v === null) continue;
    parts.push(`${k}=${quote(v)}`);
  }
  console.log(parts.join(" "));
}
