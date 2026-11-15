/** 比較用に文字列を正規化する（全角半角・大文字小文字・カタカナひらがなの違いを吸収） */
export function normalizeText(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[ァ-ヶ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60))
    .replace(/\s+/g, " ")
    .trim();
}

/** 名前の重複判定用 */
export function sameName(a: string, b: string): boolean {
  return normalizeText(a) === normalizeText(b);
}

export function cleanName(value: string): string {
  return value.normalize("NFC").replace(/\s+/g, " ").trim();
}

export function newId(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  // http接続の端末など randomUUID が使えない環境向け
  const bytes = new Uint8Array(16);
  c.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return "未確認";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "未確認";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
