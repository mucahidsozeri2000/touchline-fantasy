export function initialsOf(name: string): string {
  const parts = name
    .replace(/[^\p{L}\s-]/gu, "")
    .split(/[\s-]+/)
    .filter(Boolean);
  if (!parts.length) return "";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function randomToken(): string {
  return [...crypto.getRandomValues(new Uint8Array(24))].map((b) => b.toString(16).padStart(2, "0")).join("");
}
