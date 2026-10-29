const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz'

/** Short, stable, random ID (nanoid-style). */
export function newId(prefix = ''): string {
  let id = ''
  const bytes = new Uint8Array(12)
  crypto.getRandomValues(bytes)
  for (const b of bytes) id += ALPHABET[b % ALPHABET.length]
  return prefix ? `${prefix}_${id}` : id
}

/** Turn a label into a case-data key, e.g. "Lead sponsor" -> "leadSponsor". */
export function keyFromLabel(label: string): string {
  const words = label
    .replace(/[^a-zA-Z0-9 ]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (words.length === 0) return 'field'
  return words
    .map((w, i) =>
      i === 0 ? w.toLowerCase() : w[0].toUpperCase() + w.slice(1).toLowerCase()
    )
    .join('')
}
